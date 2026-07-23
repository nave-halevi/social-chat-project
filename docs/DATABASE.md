# Database

PostgreSQL stores users, Academy content, progress, Lab lifecycle, flags and Admin activity. UUIDs are primary keys.

## Relationships

```text
users
  ├── user_task_progress ── tasks ── sections ── courses
  ├── user_flags ── flags ── scenarios
  ├── environments ── scenarios
  │        └── instances
  └── admin_activity_logs

tasks ── optional scenario
```

## Tables

### `users`

`id`, `user_name`, unique `email`, `password_hash`, timestamps, `role`, legacy `total_score`, optional `avatar_url` and `is_active`.

Displayed score is not read from `users.total_score`; current queries sum `user_task_progress.earned_points`. The column remains for compatibility with the earlier schema.

### `courses`, `sections`, `tasks`

Courses have title, unique slug, description, difficulty, publication state and creation time. Sections belong to courses and have a unique `order_index` within each course. Tasks belong to sections, optionally reference a scenario, and store content, type, order and points. Task order is unique within a section.

Current task types are `LESSON`, `PRACTICE` and `LAB`.

### `user_task_progress`

One row per user/task, enforced by a unique constraint. It stores status, start/completion timestamps and `earned_points`. Statuses written by the application are `IN_PROGRESS` and `COMPLETED`; absence of a row is exposed as `NOT_STARTED`.

When first completed, a task copies `tasks.points` into `earned_points`. Later completion calls preserve the existing points, preventing duplicate scoring.

### `scenarios`

`title`, optional difficulty/description, required `vm_template_name`, `estimated_time_minutes`, `max_score` and `is_active`. Only active scenarios can start a Lab. `max_score` and flag points are currently metadata; task points drive user scoring.

### `environments`

User/scenario ownership, status, `created_at`, optional `started_at`/`stopped_at`, required `last_activity` and optional `expires_at`.

Active states are `Building`, `Running` and `Stopping`. A partial unique index on `user_id` allows only one active environment per user. Another partial index supports expiration scans.

Early schemas included required `network_name`; current code does not use or insert it. The compatibility migration makes the legacy column nullable when present.

### `instances`

Environment, unique VM name, entry-point flag, optional internal IP, optional host SSH port, status, creation time and last activity. Indexes support environment/status lookup, and a partial unique index protects SSH ports used by `Starting` or `Running` instances.

### `flags` and `user_flags`

Flags belong to scenarios and store exact values plus a points metadata field. `user_flags` records solves and is unique per user/flag.

Flag values are plaintext and should be protected differently for production. Current scoring uses the related task's points rather than `flags.points`.

### `admin_activity_logs`

Stores Admin actor, action, entity type/ID, optional JSON details and timestamp. Indexes support recent activity, actor and entity-type filters. Activity insertion is best-effort.

## Atomic flag completion

Correct flag recording and progress completion run in one transaction. `user_flags` uses `ON CONFLICT DO NOTHING`; the same transaction upserts `COMPLETED` progress and earned task points. Any write error rolls back both operations.

## Migration sequence

`20260715005000_complete_runtime_schema.sql` intentionally sorts before `20260715010000_score_and_lab_policy.sql`. It adds the scenario, environment and instance columns required by repositories before the later migration reads `last_activity`.

It uses `IF NOT EXISTS` and data backfills so it can also run on databases where these columns were previously added manually. Applied migration files were not modified, preserving SQLx checksums.

The later score/Lab-policy migration adds:

- `user_task_progress.earned_points`;
- `environments.expires_at`;
- the global one-active-Lab partial unique index;
- the active-expiration index.

## Important constraints and indexes

- unique user email and course slug;
- unique section order per course;
- unique task order per section;
- unique progress per user/task;
- unique solved flag per user/flag;
- one active environment per user;
- unique VM name;
- unique active SSH port;
- lookup indexes for environment user/scenario/status and instance environment/status.
