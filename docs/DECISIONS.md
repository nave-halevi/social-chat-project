# Technical Decisions

## Rust, Axum, Tokio and PostgreSQL

Rust provides memory safety for long-running infrastructure operations. Axum supplies REST and WebSocket routing, Tokio runs asynchronous work and blocking VirtualBox/SSH operations are isolated from the async executor. PostgreSQL and SQLx provide relational constraints, typed queries and transactions.

## Layered backend

Routes attach middleware, handlers map HTTP data, services contain validation/orchestration and repositories own SQL. Cross-write atomicity, such as flag completion, belongs in the repository transaction boundary.

## JWT plus current database state

JWTs identify the subject and expire after 24 hours. Protected middleware also loads current `role` and `is_active` from PostgreSQL on each request. This makes account disabling and role changes immediate and prevents stale role claims from authorizing Admin operations.

## JWT-derived resource ownership

Lab REST routes derive the acting user from JWT claims. Client requests carry scenario, environment or task resource identifiers, never a trusted acting `user_id`.

The browser WebSocket API cannot set an Authorization header, so terminal connections pass the JWT in the query string. The handler repeats authentication/account checks and enforces environment ownership.

## Environment and instance separation

An environment represents a user's scenario session; an instance represents a VM within it. The current flow creates one entry-point instance but the schema can represent more later.

## One active Lab globally

A user may have one environment in `Building`, `Running` or `Stopping`, regardless of scenario. Service checks improve error messages and a partial unique database index protects concurrent requests.

## Idle expiration

Active environments store `last_activity` and `expires_at`. The timeout defaults to 20 minutes and is configurable. Terminal input and flag submission extend the deadline; a periodic worker uses the normal deletion flow for expired Labs.

## Synchronous provisioning

VM provisioning remains inside the create request and waits up to 120 seconds for SSH. This is simple but limits progress reporting, cancellation and retry; background jobs remain planned.

## Progress-based scoring

`user_task_progress.earned_points` is the score source of truth. A task awards its own `tasks.points` the first time it becomes completed. Dashboard, Profile, Login and Admin queries sum progress points. `users.total_score`, scenario `max_score` and `flags.points` remain legacy/metadata fields rather than competing live totals.

## Atomic flag completion

The accepted flag row and completed progress row commit in one transaction. A duplicate flag uses `ON CONFLICT DO NOTHING`, still ensures progress is completed and preserves existing earned points.

## Forward-only schema repair

Previously applied migration files retain their checksums. A new migration version was placed between existing versions so clean databases create `last_activity` before the later policy migration uses it, while established databases can apply the idempotent repair safely.
