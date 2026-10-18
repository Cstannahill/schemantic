#!/usr/bin/env bash
set -euo pipefail
# Compatibility wrapper. Preparation never commits, tags, pushes or publishes.
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR/.."
exec node scripts/release.cjs prepare "$@"
