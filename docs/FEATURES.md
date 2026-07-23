# Features

## Implemented

### Identity and profile

- Registration and bcrypt password hashing.
- Email/password login and 24-hour JWTs.
- Current role and active-account checks on protected REST requests.
- Browser session restoration.
- User name/email editing.
- Password change with current-password verification.
- PNG/JPEG/WebP avatar upload/removal.

### Dashboard

- Live score and course/task statistics.
- Continue-learning courses and current task.
- Available and completed course lists.

### Academy

- Published catalog and full ordered course workspace.
- Admin CRUD for courses, sections and tasks.
- `LESSON`, `PRACTICE` and `LAB` rendering.
- Persistent `NOT_STARTED`, `IN_PROGRESS` and `COMPLETED` progress.
- Sequential `AVAILABLE`/`LOCKED` access.
- Progress percentage and earned/total points.
- Explicit non-Lab content completion.

### Lab and terminal

- Active scenario validation.
- One active environment globally per user.
- Environment/instance state and timestamps.
- VirtualBox clone/start/delete and SSH readiness.
- Active Lab restoration by scenario and global active lookup.
- Idle expiration, activity refresh and periodic cleanup.
- Authenticated, ownership-checked WebSocket terminal.
- Navbar countdown and Stop Lab action.

### Flags and score

- Ownership, running-state, scenario and task-access validation.
- Exact flag matching.
- Atomic `user_flags` insertion and task completion.
- Duplicate solve protection.
- `earned_points` source-of-truth scoring.

### Administration

- Admin route guard and backend role authorization.
- Statistics/recent activity Dashboard.
- User search, pagination, details, enable/disable, role and password reset.
- Protection for self-actions and the final active Admin.
- Course/section/task editor.
- Scenario CRUD and activation.
- Flag CRUD with masked list values.
- Lab listing and forced termination.
- Filtered activity log.

## Partial or prototype

- Practice layout exists without a complete interaction model.
- Video, download and hint widgets are placeholders.
- Machines uses hard-coded scenarios and is separate from Academy.
- Leaderboard is a placeholder.
- Provisioning is synchronous with a general loading state.
- Navbar polling provides global Lab visibility, but there is no unified application-wide Lab store.
- Cleanup handles expired database environments but not complete restart reconciliation/orphan discovery.

## Missing

- Video/YouTube lesson support.
- Complete Practice, video, download and hint experiences.
- Real leaderboard.
- Certificates and achievements.
- Background provisioning jobs, progress polling, retry and cancellation.
- Comprehensive structured logging, tracing and metrics.
- Automated backend, frontend and end-to-end tests.
- Production deployment, backup, recovery and secret-management documentation.
