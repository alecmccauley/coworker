# Scripts

We keep all project scripts in the `scripts/` folder. Each script should feel like part of the product: clear, calm, and human.

## Conventions

- Source `scripts/common.sh` for consistent styling.
- Prefer `pnpm` workspace commands over `cd`-heavy scripts.
- Use `pm2` for long-running dev processes.
- **PM2 daemon stale after reinstall:** If you see `MODULE_NOT_FOUND` for `pm2/.../ProcessContainerFork.js`, the daemon is using an old path. From repo root run `pnpm pm2:kill`, then start again. If that fails (e.g. node_modules broken), use a global PM2: `pm2 kill` (install with `npm install -g pm2` if needed), then `pnpm install` and re-run boot or dev.
- Be explicit about dependencies (Docker, pnpm, etc.).
- Keep output warm and helpful. No shouting. No noise.

## Distribution Scripts

- `pnpm dist:upload:mac` uploads the macOS DMGs in `coworker-app/dist/` to Vercel
  Blob and updates the public `releases.json` manifest used by the Pilot
  landing page.

## Using `common.sh`

`common.sh` provides:
- Brand-aligned colors for terminal output
- Emoji helpers (with opt-out)
- A standard Coworker welcome banner
- Consistent log helpers: `section`, `step`, `info`, `success`, `warn`, `error`

### Example

```bash
#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT_DIR/scripts/common.sh"

banner
section "Example script"
step "Doing the thing"
```

### Opting out

- Disable color: `NO_COLOR=1 ./scripts/boot.sh`
- Disable emoji: `NO_EMOJI=1 ./scripts/boot.sh`
