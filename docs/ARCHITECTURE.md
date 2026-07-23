# System Architecture

## Runtime overview

```text
React application
    | REST/JSON + Authorization: Bearer <JWT>
    v
Axum routes -> auth/admin middleware -> handlers -> services -> repositories
                                                               |
                                                               v
                                                           PostgreSQL

Browser xterm.js
    | WebSocket /api/lab/terminal/:environment_id?token=<JWT>
    v
Terminal handler -> ownership/state checks -> SSH -> VirtualBox Lab VM
```

## Frontend

The React application is organized by feature:

- `features/auth`: registration, login and session restoration.
- `features/dashboard`: live learning summary.
- `features/profile`: identity, password and avatar management.
- `features/academy`: catalog, workspace and course progress.
- `features/labs`: Lab lifecycle clients and state hooks.
- `features/ctf`: terminal behavior.
- `features/admin`: protected operational and content-management UI.
- `config/api.js`: shared REST and WebSocket origin configuration.

`RequireAuth` protects authenticated browser routes and `RequireAdmin` protects `/admin`. These guards are UX boundaries; backend middleware remains authoritative.

## Backend layers

- Routes define `/api` groups and attach middleware.
- Authentication middleware verifies the Bearer JWT, loads the current user role/state and adds refreshed claims to the request.
- Admin middleware requires `Role::Admin`.
- Handlers deserialize requests and map service results to HTTP responses.
- Services implement validation, orchestration and Lab lifecycle rules.
- Repositories own SQL and transactions.

Route groups cover auth, users, Academy, task progress, Dashboard, profile, Lab and Admin operations.

## Identity and authorization

Protected REST handlers derive user identity from verified JWT claims; they do not accept an acting `user_id` from the client. Disabled accounts receive `403`. Admin actions use the current role loaded by authentication middleware rather than trusting the role embedded in an older token.

The terminal cannot use an HTTP Authorization header from the browser WebSocket API, so it accepts `token` in the query string and performs equivalent validation directly. It also verifies environment ownership.

## Course-progress model

Course tasks are ordered by section and task indexes. The first incomplete task is `AVAILABLE`; later incomplete tasks are `LOCKED`. Selecting an available new task marks it `IN_PROGRESS`. Non-Lab tasks can be completed through the progress API. Lab tasks can only be completed through correct flag submission.

## Lab creation sequence

```text
POST /api/lab/create
    -> derive user from JWT
    -> reject another non-expired active Lab for the user
    -> delete an expired active Lab if found
    -> validate active scenario
    -> insert Building environment with expires_at
    -> allocate host SSH port and insert Starting instance
    -> clone and start the configured VirtualBox template
    -> wait up to 120 seconds for SSH
    -> mark instance and environment Running
    -> return environment ID, SSH port and expiration
```

A partial unique index on `environments(user_id)` enforces one active Lab per user for `Building`, `Running` and `Stopping` states.

## Activity and cleanup

Terminal text input refreshes Lab activity at most once per minute. Flag submission also refreshes it. Each refresh sets `last_activity = now()` and extends `expires_at` by `LAB_IDLE_TIMEOUT_MINUTES`.

The backend starts a cleanup loop that runs every 60 seconds. Each pass selects up to ten expired active environments and uses the normal Lab deletion flow to remove the VM and mark records destroyed.

## Atomic flag completion

After ownership, state, scenario, task access and flag checks, one PostgreSQL transaction:

1. inserts `user_flags` with `ON CONFLICT DO NOTHING`;
2. upserts the task as `COMPLETED` and stores `tasks.points` in `earned_points`;
3. commits both changes together.

An error in either write rolls back both. A previously inserted flag still repairs/completes missing task progress without adding score twice.
