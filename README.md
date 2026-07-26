# Home Lab Manager

Home Lab Manager is a self-hosted cybersecurity learning platform inspired by hands-on training products such as Hack The Box and TryHackMe. It combines structured Academy courses, progress tracking, isolated VirtualBox machines, an SSH-backed browser terminal, CTF exercises, user profiles and an administrative control panel.

> [!WARNING]
> The project is under active development and is not production-ready. VM provisioning is synchronous, several learning widgets are incomplete, automated test coverage is minimal and the terminal still uses development SSH credentials from source code.

## Implemented features

- Registration, login, JWT sessions and disabled-account enforcement.
- User profiles, password changes and PNG/JPEG/WebP avatars.
- Real dashboard data for available, active and completed courses.
- Ordered courses, sections and `LESSON`, `PRACTICE` and `LAB` tasks.
- Optional privacy-enhanced YouTube video for `LESSON` tasks.
- Persistent task progress, sequential locking and points.
- Scenario-backed VirtualBox provisioning and active Lab restoration.
- One active Lab per user, idle expiration and periodic cleanup.
- Authenticated WebSocket-to-SSH browser terminal.
- Atomic flag recording and Lab-task completion.
- Admin dashboard, users, Academy content, scenarios, flags, Labs and activity logs.

Partial experiences include Practice interaction, download/hint widgets, the standalone Machines prototype and the leaderboard. See [Feature Status](docs/FEATURES.md) and [Roadmap](docs/ROADMAP.md).

## Architecture

```text
React + xterm.js
    | REST/JSON + Bearer JWT
    | authenticated WebSocket
    v
Axum -> middleware -> handlers -> services -> repositories -> PostgreSQL
                                 |
                                 +-> VirtualBox -> SSH -> Lab VM
```

REST routes use JWT claims as the acting user identity. Admin routes additionally require the current database role to be `admin`. The terminal receives the JWT as a WebSocket query parameter, validates account state and verifies environment ownership before connecting to SSH.

See [System Architecture](docs/ARCHITECTURE.md) for the full design.

## Technology stack

### Frontend

- React 19, JavaScript/JSX and React Router
- Vite 8 and Tailwind CSS 4
- xterm.js with the fit addon
- Browser Fetch and WebSocket APIs

### Backend

- Rust 2024, Axum 0.7 and Tokio
- PostgreSQL and SQLx
- JWT and bcrypt
- `ssh2`, WebSockets and `VBoxManage`

## Prerequisites

- Node.js and npm compatible with Vite 8
- A current stable Rust toolchain and Cargo
- PostgreSQL
- SQLx CLI for command-line migrations
- VirtualBox with `VBoxManage` on `PATH`
- SSH-enabled VM templates matching scenario `vm_template_name` values

Authentication, profiles, Dashboard, Academy and Admin development do not require a running VM. Lab creation and terminal access do.

## Configuration

Create `backend/.env`:

```dotenv
DATABASE_URL=postgres://<user>:<password>@localhost:5432/<database>
JWT_SECRET=<long-random-secret>

# Optional; positive integer, defaults to 20
LAB_IDLE_TIMEOUT_MINUTES=20
```

Create `frontend/.env` only when the backend does not use the default origin:

```dotenv
VITE_API_URL=http://localhost:3000
```

All frontend API clients use this origin and fall back to `http://localhost:3000`. The terminal derives `ws://` or `wss://` from the same value.

Do not commit real credentials. The repository does not currently include sanitized `.env.example` files. The terminal handler also contains development SSH credentials that must move to scenario configuration or a secret store before deployment.

## Database setup

Create a PostgreSQL database, configure `DATABASE_URL`, then run:

```bash
cd backend
sqlx migrate run
```

The migration chain includes a compatibility migration placed before the score/Lab-policy migration. It creates the runtime columns required by the repositories while remaining safe for databases where those columns had previously been added manually. The obsolete `environments.network_name` column may remain on older schemas, but is nullable and is not used by current code.

See [Database](docs/DATABASE.md) for the schema and scoring model.

## Running locally

Backend:

```bash
cd backend
cargo run
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

The API listens on `http://localhost:3000`; open the URL printed by Vite for the browser application.

## Development commands

```bash
cd backend
cargo fmt --check
cargo check
cargo test
```

SQLx compile-time query checking requires a reachable database with the current schema unless offline metadata is prepared.

```bash
cd frontend
npm run lint
npm run build
```

## Project structure

```text
home-lab-manager/
├── backend/
│   ├── migrations/
│   └── src/
│       ├── routes/
│       ├── middleware/
│       ├── handlers/
│       ├── services/
│       ├── repositories/
│       ├── models/
│       └── utils/
├── frontend/
│   └── src/
│       ├── config/
│       ├── context/
│       ├── features/
│       ├── layouts/
│       ├── routes/
│       └── shared/
└── docs/
```

## Documentation

- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Backend](docs/BACKEND.md)
- [Frontend](docs/FRONTEND.md)
- [Database](docs/DATABASE.md)
- [API Reference](docs/API.md)
- [Feature Status](docs/FEATURES.md)
- [Roadmap](docs/ROADMAP.md)
- [Technical Decisions](docs/DECISIONS.md)

## Known limitations

- VM provisioning remains a synchronous request and can wait up to 120 seconds for SSH.
- Practice tasks do not have a complete interaction model.
- Download and hint widgets are placeholders.
- Video playback is optional and does not track watch completion or duration.
- The standalone Machines page uses hard-coded scenario UUIDs.
- The leaderboard is a placeholder.
- Lab state is coordinated through page hooks and Navbar polling rather than one application-wide state container.
- Port discovery is not reserved atomically before VirtualBox configuration.
- Cleanup does not reconcile arbitrary orphaned VirtualBox state after a backend restart.
- API error shapes and status mappings are not fully uniform.
- Automated backend, frontend and end-to-end test coverage is missing.
- Deployment, backup, recovery, metrics and production secret-management guidance are incomplete.
