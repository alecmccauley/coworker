# Scripts

We keep all project scripts in the `scripts/` folder. Each script should feel like part of the product: clear, calm, and human.

## Conventions

- Source `scripts/common.sh` for consistent styling.
- Prefer `pnpm` workspace commands over `cd`-heavy scripts.
- Use `pm2` for long-running dev processes.
- Be explicit about dependencies (Docker, pnpm, etc.).
- Keep output warm and helpful. No shouting. No noise.

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
