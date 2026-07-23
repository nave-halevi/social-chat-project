# Home Lab Manager Frontend

React 19/Vite frontend for Home Lab Manager. It contains authentication, the live Dashboard, user profiles, Academy course progress, VirtualBox Lab controls, an xterm.js terminal and the Admin panel.

## Configuration

The frontend uses `VITE_API_URL` for every REST client and derives the WebSocket origin from it. Without configuration it uses `http://localhost:3000`.

```dotenv
VITE_API_URL=http://localhost:3000
```

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run build
```

## Structure

- `src/config`: shared API origin.
- `src/context`: authentication state.
- `src/features`: Auth, Dashboard, Profile, Academy, Labs, CTF and Admin.
- `src/layouts`: public and authenticated application shells.
- `src/routes`: authentication and Admin route guards.
- `src/shared`: reusable UI.

Practice interaction, video/download/hint widgets, the Machines prototype and leaderboard are not complete.
