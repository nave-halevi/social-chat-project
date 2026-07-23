# Backend

## Stack and structure

The backend uses Rust 2024, Axum 0.7, Tokio, SQLx/PostgreSQL, bcrypt, JWT, `ssh2` and VirtualBox command-line integration.

```text
src/
├── routes/        route groups and middleware attachment
├── middleware/    JWT/current-user and Admin authorization
├── handlers/      HTTP and WebSocket request mapping
├── services/      validation and orchestration
├── repositories/  SQL queries and transactions
├── models/        entities, DTOs and statuses
├── utils/         VirtualBox, SSH, ports and host helpers
└── errors/        shared application errors
```

The server binds `0.0.0.0:3000` and mounts all application routes under `/api`.

## Route groups

- `/api/auth`: registration and login.
- `/api/users`: legacy Admin-only user list.
- `/api/academy`: public course reads and Admin content CRUD.
- `/api/task-progress`: course progress, start and complete.
- `/api/dashboard`: authenticated learning Dashboard.
- `/api/profile`: profile, password and avatar.
- `/api/lab`: lifecycle, status, active Lab, flag and terminal.
- `/api/admin`: operational Dashboard, users, Labs, flags, scenarios and activity.

See [API](API.md) for contracts.

## Authentication and authorization

REST authentication expects `Authorization: Bearer <token>`. JWT claims contain `sub`, expiration and role, but middleware also loads `role` and `is_active` from `users` on every protected request. Missing/invalid users receive `401`; disabled users receive `403`.

Admin middleware runs after authentication and requires the refreshed `admin` role. Academy Admin and `/api/admin` routes use both layers.

The terminal accepts the JWT through `?token=` because browser WebSockets cannot set the Authorization header. It validates the account and verifies that the environment belongs to the token subject.

## Academy and progress

Public Academy reads expose published courses and full course hierarchies. Admin services validate titles, slugs, ordering, task types and scenario relationships.

Progress status values are `NOT_STARTED`, `IN_PROGRESS` and `COMPLETED`. Access status values are `AVAILABLE` and `LOCKED`; a completed task is represented as `progress_status: COMPLETED` with `access_status: AVAILABLE`.

Non-Lab tasks can be completed through `/task-progress/tasks/:id/complete`. Lab tasks reject that endpoint and require a correct flag.

## Scoring

`user_task_progress.earned_points` is the score source of truth. Dashboard, profile, login and Admin user queries calculate total score as the sum of these rows. The legacy `users.total_score` column remains for schema compatibility but is not updated or used as the authoritative displayed score.

Completion stores `tasks.points`; `flags.points` is currently administrative metadata and is not used by the scoring calculation.

## Lab lifecycle

The service allows one active Lab globally per user. It provisions synchronously, tracks environment/instance states and returns `expires_at`. Status and active-Lab reads remove an already expired Lab before responding.

Environment states modeled by the code are `Building`, `Running`, `Stopping`, `Stopped`, `Destroyed` and `Failed`. Instance states are `Starting`, `Running`, `Stopping`, `Stopped`, `Destroyed` and `Failed`.

Lab deletion is idempotent for an already destroyed environment. It transitions through stopping states, deletes the VirtualBox VM and records `Destroyed`.

## Idle expiration

`LAB_IDLE_TIMEOUT_MINUTES` controls the positive timeout and defaults to 20. A background Tokio task scans every minute and deletes up to ten expired active environments. Terminal input and flag submissions refresh activity.

## Flag submission

Submission validates:

- JWT-derived ownership;
- running environment;
- task/scenario relationship;
- sequential task access;
- non-empty exact flag value.

Correct flag insertion and progress completion share one database transaction. Duplicate `user_flags` entries are ignored by the unique constraint and do not award points again.

## Configuration

Required:

- `DATABASE_URL`
- `JWT_SECRET`

Optional:

- `LAB_IDLE_TIMEOUT_MINUTES` (positive integer, default `20`)

VirtualBox must be installed and scenario template names must resolve. SSH credentials are currently hard-coded development values in the terminal handler and must be externalized for production.

## Known backend limitations

- Provisioning is synchronous and can hold a request for up to 120 seconds.
- Port availability is discovered before use but is not reserved atomically.
- Error bodies/status codes are not uniform across all handlers.
- Admin activity logging is best-effort and does not fail the primary operation.
- The cleanup loop does not perform full database/VirtualBox reconciliation after restart.
- No prepared SQLx offline metadata or meaningful automated test suite is committed.
