#!/usr/bin/env bash
# Sync fitness + bodycomp data from source dirs into public/ for Vercel builds
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Bodycomp data
rsync -a --delete /Users/dan/clawd/bodycomp/data/ "$REPO_DIR/public/bodycomp-data/"
# Bodycomp photos
rsync -a --delete /Users/dan/clawd/bodycomp/photos/ "$REPO_DIR/public/photos/"
# Fitness data
rsync -a --delete /Users/dan/clawd/fitness/data/ "$REPO_DIR/public/fitness-data/"

# Regenerate index files (exclude non-date files)
cd "$REPO_DIR/public/bodycomp-data"
ls 20*.json 2>/dev/null | jq -R . | jq -s . > index.json

cd "$REPO_DIR/public/fitness-data"
ls 20*.json 2>/dev/null | jq -R . | jq -s . > index.json

echo "Synced data to public/"
