#!/usr/bin/env bash
set -e

echo "🔍 Checking working tree..."
if [[ -n $(git status --porcelain) ]]; then
  echo "❌ You have uncommitted changes. Commit or stash before releasing."
  exit 1
fi

echo "📦 Pulling latest main..."
git checkout main
git pull origin main

echo "🧪 Building and testing..."
npm run build
npm test

# Choose bump type (patch, minor, major)
BUMP=${1:-minor}

echo "🏷️ Bumping version ($BUMP)..."
npm version $BUMP -m "chore(release): bump version to %s"

echo "🚀 Pushing main and tags..."
git push origin main
git push origin --tags

echo "📤 Publishing to npm and GitHub Packages..."
npm run publish:both

echo "✅ Release complete!"
