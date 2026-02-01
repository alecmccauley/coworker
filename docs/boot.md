# Boot Script

The boot script brings the full Coworker dev environment online in one step.
It is designed to feel calm, clear, and trustworthy while doing the heavy lifting.

## What it does

1. Installs all workspace dependencies at the root (`pnpm install`).
2. Starts the PostgreSQL Docker container.
3. Generates the Prisma client and runs migrations.
4. Starts the API and App in development mode via pm2.

## Usage

```bash
pnpm boot
```

You can also run the script directly:

```bash
./scripts/boot.sh
```

## Prerequisites

- Docker Desktop (must be running before boot)
- Node.js ≥22 and pnpm ≥10 (see root `package.json` engines)

## Behavior

- Runs from the repo root (regardless of where you call it from).
- Waits briefly for the database to accept connections.
- Starts both dev servers under pm2 for easy management.

## Managing processes

```bash
# See status
pnpm pm2:status

# Follow logs
pnpm pm2:logs

# Restart or stop all
pnpm pm2:restart:all
pnpm pm2:stop:all
pnpm pm2:delete:all
```

## Troubleshooting

- If Docker is not running, start it and re-run `pnpm boot`.
- If the database is slow to start, the script will warn and continue.
