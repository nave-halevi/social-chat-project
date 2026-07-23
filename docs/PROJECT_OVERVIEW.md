# Project Overview

Home Lab Manager is a self-hosted cybersecurity learning platform. It combines structured courses, persistent learning progress, isolated VirtualBox laboratories, CTF exercises, user profiles and administrative operations.

## Main domains

### Authentication and profiles

Users register and log in with email and password. Login returns a 24-hour JWT containing user identity and role. Protected backend middleware re-reads the current role and active state from PostgreSQL, so disabling a user or changing a role takes effect without waiting for the JWT to expire.

Authenticated users can edit their name and email, change their password and store a PNG, JPEG or WebP avatar as a data URL.

### Academy and progress

Published courses contain ordered sections and tasks:

- `LESSON`: content that the user completes explicitly.
- `PRACTICE`: a two-panel learning layout whose interaction model is still partial.
- `LAB`: content connected to a scenario, VM, terminal and flag.

Progress is sequential. Tasks are `NOT_STARTED`, `IN_PROGRESS` or `COMPLETED`; incomplete tasks after the first incomplete task are `LOCKED`. Completed and currently reachable tasks are `AVAILABLE`. Completing a non-Lab content task or solving a Lab flag records the task's points in `user_task_progress.earned_points`.

### Dashboard

The Dashboard is backed by live API data. It shows the user's score, active/completed/task statistics, courses to continue, available courses and completed courses.

### Lab engine

Starting a Lab creates environment and instance records, clones a configured VirtualBox template, starts it and waits up to 120 seconds for SSH. A user may have only one `Building`, `Running` or `Stopping` environment globally.

Active Labs carry `last_activity` and `expires_at`. The default idle timeout is 20 minutes, configurable with `LAB_IDLE_TIMEOUT_MINUTES`. Terminal input and flag submissions refresh activity. A background worker scans expired environments every minute and deletes up to ten per pass.

### Terminal and flags

The browser terminal opens an authenticated WebSocket using an environment ID and JWT query parameter. The backend validates the token, active account, environment ownership and running states before bridging to SSH.

Correct flag submission atomically inserts `user_flags` and completes the related task. Duplicate flag solves do not award points twice. Task points, persisted as `earned_points`, are the score source of truth.

### Administration

Admin routes require both a valid JWT and the current `admin` role. The Admin UI provides:

- platform statistics and recent activity;
- searchable/paginated users, role and status changes, password reset and user details;
- Academy course, section and task editing;
- scenario and flag management;
- Lab operations and forced termination;
- filtered administrative activity logs.

## Current maturity

The core authentication, profile, Dashboard, Academy progress, Lab, terminal, flag and Admin flows are implemented. Practice interaction, additional content widgets, leaderboard, asynchronous provisioning, broad automated tests and production operations remain incomplete.
