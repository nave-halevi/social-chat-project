# Roadmap

## Completed foundations

- Rust/Axum/PostgreSQL backend and React frontend.
- Registration, login, JWT/current-account authorization and Admin roles.
- Profile editing, password change and avatars.
- Live Dashboard and progress-based scoring.
- Academy course/section/task management and frontend workspace.
- Sequential task progress and locked/available behavior.
- VirtualBox Lab provisioning, deletion and restoration.
- One active Lab per user.
- Idle expiration, Navbar countdown and periodic cleanup.
- Authenticated WebSocket-to-SSH terminal.
- Atomic flag recording and task completion.
- Admin users, Academy, scenarios, flags, Labs and activity views.
- Migration compatibility repair for repository-required Lab columns.

## Immediate correctness and security

- Move SSH credentials out of source code.
- Standardize API errors and semantic status codes.
- Add validation constraints for status/type values to migrations where appropriate.
- Prepare SQLx offline metadata or document the required compile-time database workflow.

## Lab reliability and UX

- Move VM provisioning to background jobs.
- Expose detailed building/running/stopping/failure progress.
- Add cancellation, retry and explicit terminal reconnect behavior.
- Reconcile PostgreSQL with VirtualBox state after restart.
- Detect and clean orphaned VMs.
- Reserve host ports atomically.
- Improve cleanup observability and failure retry.

## Academy experience

- Complete Practice interaction.
- Add lesson video/YouTube support.
- Implement download and hint widgets.
- Replace or remove the hard-coded Machines prototype.
- Remove unused legacy Lab components and development logs.

## User and community

- Real leaderboard from progress-based scores.
- Learning-history detail and completion analytics.
- Achievements and certificates.

## Quality and operations

- Backend unit/integration tests.
- Frontend component/hook tests.
- End-to-end Academy, Lab and flag tests.
- Structured request tracing and metrics.
- Deployment, backup and disaster-recovery guidance.
- Production secrets and configuration management.
