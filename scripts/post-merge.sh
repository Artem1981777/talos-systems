#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Auto-sync to GitHub after each Replit checkpoint
if [ -n "$GITHUB_TOKEN" ]; then
  echo "Pushing to GitHub (github.com/Artem1981777/talos-systems)..."
  if git push "https://x-access-token:${GITHUB_TOKEN}@github.com/Artem1981777/talos-systems.git" HEAD:main; then
    echo "GitHub sync succeeded."
  else
    echo "WARNING: GitHub sync FAILED. Check that GITHUB_TOKEN has repo write permission and is not expired."
  fi
else
  echo "WARNING: GITHUB_TOKEN is not set — skipping GitHub sync."
fi
