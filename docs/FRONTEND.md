# Frontend

## Stack

- React 19 and JavaScript/JSX
- React Router
- Vite 8 and Tailwind CSS 4
- Fetch API
- xterm.js with `@xterm/addon-fit`

## Routes

Public:

- `/`
- `/login`
- `/register`

Authenticated through `RequireAuth`:

- `/dashboard`
- `/academy`
- `/academy/:courseId`
- `/machines`
- `/profile`
- `/leaderboard` (placeholder)

Admin through `RequireAuth` and `RequireAdmin`:

- `/admin`
- `/admin/academy`
- `/admin/academy/courses/:courseId`
- `/admin/scenarios`
- `/admin/users`
- `/admin/users/:userId`
- `/admin/labs`
- `/admin/flags`
- `/admin/activity`

There is no catch-all 404 route.

## API configuration

`src/config/api.js` is the single API-origin definition. Auth, Academy, Task Progress, Dashboard, Profile, Admin and Lab services all use:

```text
VITE_API_URL or http://localhost:3000
```

Trailing slashes are removed. The terminal changes the configured `http`/`https` scheme to `ws`/`wss`.

## Authentication

`AuthContext` stores the user and token in state and `localStorage`, restores them on page load, and exposes login, registration, logout and stored-user updates. `RequireAuth` protects application navigation and `RequireAdmin` checks the stored role for Admin navigation. Backend authorization remains authoritative.

## Dashboard

The Dashboard loads live data from `/api/dashboard`: current score and statistics, continue-learning cards with current tasks, available courses and completed courses.

## Profile

The profile page loads and edits name/email, changes passwords and uploads/removes a PNG, JPEG or WebP avatar. Avatar data is stored as a data URL and reflected in `AuthContext` and the Navbar.

## Academy and progress

The course workspace combines the course hierarchy with `/api/task-progress` data. It:

- selects the first available incomplete task;
- marks a new selection `IN_PROGRESS`;
- displays completed/total tasks, percentage and points;
- prevents selection of `LOCKED` tasks;
- advances to the next available task after completion.

`LESSON` tasks have an explicit completion action. `LAB` tasks require flag submission. `PRACTICE` has a layout but its interaction is incomplete.

## Lab and terminal

`useLabs` restores the active environment for a scenario, creates and deletes it and exposes loading/error state. The Navbar separately polls the user's global active Lab every minute, displays its countdown and can stop it.

The terminal opens:

```text
ws(s)://<api-origin>/api/lab/terminal/<environment-id>?token=<encoded-jwt>
```

It forwards xterm input/output and cleans up listeners, socket and terminal on unmount.

## Administration

The Admin UI contains overview statistics, Academy content editing, scenarios, searchable/paginated users, user details and operations, Labs and termination, flags and activity logs. Client-side Admin routing supplements the backend's JWT/Admin middleware.

## Legacy and incomplete UI

- `LabsPage`, `LabWorkspace`, `LabList` and `CreateLabButton` are not part of the main routed Academy flow.
- `/machines` uses hard-coded scenario UUIDs.
- `/leaderboard` is a placeholder.
- `VideoWidget`, `DownloadWidget` and `HintWidget` return no functional experience.
- Practice does not connect to a complete active interaction environment.
- Lab state is not centralized in one application-wide context.
- Development console logging remains in some components.
