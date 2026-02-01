# Coworker

Where AI feels like a team you already know how to work with.

## Developer quick start

Prereqs:
- Node.js 22+
- pnpm 10+
- Docker Desktop

From the repo root:

```bash
pnpm boot
```

That single command will:
1. Start the PostgreSQL Docker container
2. Run Prisma generate + migrations
3. Start the API and App in dev mode (via pm2)

Use `pnpm pm2:status` and `pnpm pm2:logs` to manage dev processes.

## Docs

- `docs/boot.md` for boot details and troubleshooting
- `docs/api_project.md` for API architecture and workflows
- `docs/app_project.md` for the desktop app architecture and workflows
- `scripts.md` for scripting conventions and common helpers
