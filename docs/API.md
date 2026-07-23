# API Reference

The backend listens on port `3000` and mounts routes below `/api`. JSON endpoints use `Content-Type: application/json`.

## Authentication

Protected REST endpoints require:

```http
Authorization: Bearer <jwt>
```

Authentication verifies the JWT, loads the current user's role and `is_active` state, and derives the acting user ID from the token subject. Disabled accounts receive `403`. Admin endpoints additionally require the current `admin` role.

### Register

```http
POST /api/auth/register

{
  "user_name": "student",
  "email": "student@example.com",
  "password": "at-least-choose-a-safe-password"
}
```

Returns `201` with the public user DTO:

```json
{
  "id": "<uuid>",
  "user_name": "student",
  "email": "student@example.com",
  "role": "User",
  "total_score": 0,
  "avatar_url": null
}
```

Internal fields such as `password_hash` are never serialized by this DTO.

### Login

```http
POST /api/auth/login

{
  "email": "student@example.com",
  "password": "secret"
}
```

Success:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "<uuid>",
    "user_name": "student",
    "email": "student@example.com",
    "role": "User",
    "total_score": 30,
    "avatar_url": null
  }
}
```

Login rejects invalid credentials and disabled accounts. `total_score` is calculated from progress `earned_points`.

## Legacy users route

```http
GET /api/users/
Authorization: Bearer <admin-jwt>
```

Returns public user DTOs and requires Admin. New Admin UI functionality uses `/api/admin/users`.

## Academy public reads

```http
GET /api/academy/courses/
GET /api/academy/courses/:id/full
```

The list returns published courses. The full endpoint returns:

```json
{
  "id": "<course-uuid>",
  "title": "Linux Basics",
  "slug": "linux-basics",
  "description": "...",
  "difficulty": "Beginner",
  "is_published": true,
  "created_at": "<timestamp>",
  "sections": [
    {
      "id": "<section-uuid>",
      "title": "Introduction",
      "order_index": 1,
      "tasks": [
        {
          "id": "<task-uuid>",
          "section_id": "<section-uuid>",
          "scenario_id": null,
          "title": "Welcome",
          "content": "...",
          "task_type": "LESSON",
          "order_index": 1,
          "points": 10
        }
      ]
    }
  ]
}
```

The full endpoint currently resolves any known course ID and does not independently enforce `is_published`.

## Academy administration

All routes in this section require an Admin JWT.

### Courses

```http
GET    /api/academy/admin/courses
POST   /api/academy/admin/courses
PUT    /api/academy/admin/courses/:id
DELETE /api/academy/admin/courses/:id
```

Create:

```json
{
  "title": "Linux Basics",
  "slug": "linux-basics",
  "description": "Optional",
  "difficulty": "Beginner"
}
```

New courses start unpublished. Update requires the complete course form:

```json
{
  "title": "Linux Basics",
  "slug": "linux-basics",
  "description": "Optional",
  "difficulty": "Beginner",
  "is_published": true
}
```

### Sections

```http
POST   /api/academy/admin/sections
GET    /api/academy/admin/sections/:id
PUT    /api/academy/admin/sections/:id
DELETE /api/academy/admin/sections/:id
GET    /api/academy/admin/courses/:course_id/sections
```

Create:

```json
{
  "course_id": "<uuid>",
  "title": "Introduction",
  "description": "Optional",
  "order_index": 1
}
```

Update fields are optional: `title`, `description`, `order_index`.

### Tasks

```http
POST   /api/academy/admin/tasks
GET    /api/academy/admin/tasks/:id
PUT    /api/academy/admin/tasks/:id
DELETE /api/academy/admin/tasks/:id
GET    /api/academy/admin/sections/:section_id/tasks
```

Create:

```json
{
  "section_id": "<uuid>",
  "scenario_id": null,
  "title": "Read the guide",
  "content": "...",
  "task_type": "LESSON",
  "order_index": 1,
  "points": 10
}
```

Update fields are optional: `title`, `content`, `task_type`, `scenario_id`, `order_index`, `points`. Send `"scenario_id": null` to clear the relationship. Supported types are `LESSON`, `PRACTICE` and `LAB`; Lab tasks require an active scenario.

## Task progress

All progress routes require a JWT and use its subject as the user.

```http
GET  /api/task-progress/courses/:course_id
POST /api/task-progress/tasks/:task_id/start
POST /api/task-progress/tasks/:task_id/complete
```

Start and complete have no request body. All three return the current course progress:

```json
{
  "course_id": "<uuid>",
  "course_title": "Linux Basics",
  "total_tasks": 3,
  "completed_tasks": 1,
  "progress_percentage": 33.33,
  "total_points": 30,
  "earned_points": 10,
  "tasks": [
    {
      "task_id": "<uuid>",
      "task_title": "Welcome",
      "task_type": "LESSON",
      "task_order_index": 1,
      "section_id": "<uuid>",
      "section_title": "Introduction",
      "section_order_index": 1,
      "points": 10,
      "progress_status": "COMPLETED",
      "access_status": "AVAILABLE",
      "started_at": "<timestamp>",
      "completed_at": "<timestamp>"
    }
  ]
}
```

Progress statuses are `NOT_STARTED`, `IN_PROGRESS` and `COMPLETED`. Access statuses are only `AVAILABLE` and `LOCKED`; completion is represented by `progress_status: COMPLETED`, not a third access-status value.

Only the first incomplete task is available. Lab tasks cannot use `/complete`; they complete through correct flag submission.

## Dashboard

```http
GET /api/dashboard/
Authorization: Bearer <jwt>
```

Returns:

```json
{
  "user": {
    "user_name": "student",
    "total_score": 30
  },
  "statistics": {
    "active_courses": 1,
    "completed_courses": 0,
    "completed_tasks": 2
  },
  "continue_learning": [
    {
      "course_id": "<uuid>",
      "course_title": "Linux Basics",
      "course_description": "...",
      "difficulty": "Beginner",
      "completed_tasks": 2,
      "total_tasks": 5,
      "progress_percentage": 40.0,
      "earned_points": 20,
      "total_points": 50,
      "current_task": {
        "task_id": "<uuid>",
        "task_title": "Permissions",
        "task_type": "LESSON"
      }
    }
  ],
  "available_courses": [],
  "completed_courses": []
}
```

Available-course items contain course identity, description/difficulty and total tasks/points. Completed-course items contain the same progress totals as continue-learning items but no `current_task`.

## Profile

All routes require a JWT.

### Get/update profile

```http
GET /api/profile/

PUT /api/profile/
{
  "user_name": "new-name",
  "email": "new@example.com"
}
```

Profile responses include `id`, `user_name`, `email`, `role`, calculated `total_score`, timestamps and optional `avatar_url`. User names must be 3–50 characters and email must be unique and syntactically valid.

### Change password

```http
PUT /api/profile/password

{
  "current_password": "old-password",
  "new_password": "new-password",
  "confirm_password": "new-password"
}
```

The new password must be at least eight characters, match confirmation and differ from the current password.

### Update/remove avatar

```http
PUT /api/profile/avatar

{
  "avatar_url": "data:image/png;base64,..."
}
```

Accepted prefixes are PNG, JPEG and WebP data URLs. Send `null` to remove the avatar. The profile router accepts bodies up to 3 MiB and the service limits the stored string to 2,800,000 characters.

## Lab engine

All Lab REST endpoints require a JWT and derive ownership from it.

### Create

```http
POST /api/lab/create

{
  "scenario_id": "<uuid>"
}
```

Success: `201 Created`

```json
{
  "message": "The lab was set up and is running successfully!",
  "ssh_port": 2201,
  "env_id": "<environment-uuid>",
  "expires_at": "<timestamp>"
}
```

Only one active Lab is allowed per user across all scenarios. Existing active Lab and inactive/missing scenario errors return `400`; unexpected provisioning errors return `500`. Provisioning is synchronous and may wait up to 120 seconds.

### Delete

```http
POST /api/lab/delete

{
  "env_id": "<environment-uuid>"
}
```

Returns `200` after deletion. Deleting an already destroyed owned environment is successful. Missing/not-owned environments return `404`; other failures currently return `500`.

### Active Lab

```http
GET /api/lab/active
GET /api/lab/active/:scenario_id
```

The first route returns the user's active Lab globally. The second returns it only for a scenario. Both return `null` when none exists. An expired result is deleted before returning `null`.

### Status

```http
GET /api/lab/status/:environment_id
```

Success:

```json
{
  "environment_id": "<uuid>",
  "scenario_id": "<uuid>",
  "environment_status": "Running",
  "instance_id": "<uuid-or-null>",
  "vm_name": "lab-...",
  "ssh_port": 2201,
  "instance_status": "Running",
  "is_entry_point": true,
  "created_at": "<timestamp>",
  "started_at": "<timestamp-or-null>",
  "stopped_at": null,
  "last_activity": "<timestamp>",
  "expires_at": "<timestamp-or-null>"
}
```

Lookup/service errors are currently collapsed to `404` with `null`.

### Submit flag

```http
POST /api/lab/submit

{
  "env_id": "<environment-uuid>",
  "task_id": "<task-uuid>",
  "flag": "CTF{example}"
}
```

Correct, incorrect and duplicate flags return `200` with a message. Validation failures return `400`.

```json
{ "message": "✅ Correct! You earned 10 points." }
```

```json
{ "message": "❌ Incorrect flag. Keep trying!" }
```

```json
{ "message": "⚠️ You already submitted this flag!" }
```

Correct flag recording and task completion are atomic. Awarded points come from `tasks.points`; `flags.points` is not currently used by scoring.

### Terminal WebSocket

```text
ws://localhost:3000/api/lab/terminal/:environment_id?token=<url-encoded-jwt>
```

The handler validates the JWT, active account, environment ownership and environment/instance running state before opening SSH. It returns `401`, `403`, `404` or `409` before upgrade when appropriate. Terminal text input refreshes Lab activity at most once per minute.

## Admin operations

All `/api/admin` routes require an Admin JWT.

### Dashboard

```http
GET /api/admin/dashboard
```

Returns `statistics` and the eight most recent activity items. Statistics include users, active/disabled/Admin users, courses/published courses, scenarios/active scenarios, running Labs, completed tasks and submitted flags.

### Users

```http
GET /api/admin/users?page=1&page_size=20&search=&status=
GET /api/admin/users/:user_id
PUT /api/admin/users/:user_id/status
PUT /api/admin/users/:user_id/role
PUT /api/admin/users/:user_id/password
```

List status filters: `active`, `disabled`, `admin`, `user`. Page size is capped at 100.

Request bodies:

```json
{ "is_active": false }
```

```json
{ "role": "admin" }
```

```json
{
  "new_password": "new-password",
  "confirm_password": "new-password"
}
```

User details include the user, activity summary and ten recent Labs. Admins cannot change their own status/role here, reset their own password here, or disable/demote the final active Admin.

### Labs

```http
GET  /api/admin/labs?page=1&page_size=20&search=&status=
POST /api/admin/labs/:environment_id/terminate
```

Status filters: `building`, `running`, `stopping`, `failed`, `destroyed`. Termination accepts Building, Running or Failed Labs and is idempotent for Destroyed Labs.

### Flags

```http
GET    /api/admin/flags?page=1&page_size=20&search=&scenario_id=
POST   /api/admin/flags
GET    /api/admin/flags/:id
PUT    /api/admin/flags/:id
DELETE /api/admin/flags/:id
```

Create/update:

```json
{
  "scenario_id": "<uuid>",
  "flag_value": "CTF{example}",
  "points": 10
}
```

Flag list responses mask values; detail responses include the exact value. A solved flag cannot be deleted.

### Scenarios

```http
GET    /api/admin/scenarios
POST   /api/admin/scenarios
PUT    /api/admin/scenarios/:id
DELETE /api/admin/scenarios/:id
```

Create/update require the complete form:

```json
{
  "title": "Linux Target",
  "description": "Optional",
  "difficulty": "Beginner",
  "vm_template_name": "Ubuntu_Base_Template",
  "estimated_time_minutes": 30,
  "max_score": 100,
  "is_active": true
}
```

A scenario referenced by tasks, Labs or flags cannot be deleted; deactivate it instead.

### Activity

```http
GET /api/admin/activity?page=1&page_size=20&admin_user_id=&action=&entity_type=&order=desc
```

`order` accepts `asc` or `desc`. Items include actor identity, action, entity, optional JSON details and timestamp.

### Paginated response

User, Lab, flag and activity lists return:

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total_items": 0,
  "total_pages": 0
}
```

## Error behavior

Shared `AppError` responses use `{ "message": "..." }`, but authentication and Lab handlers still use some different shapes and mappings. The API does not yet expose one uniform error envelope or fully semantic statuses for every failure.
