#!/usr/bin/env bash
# push-to-github.sh
# Creates the GitHub repo (if not exists) and pushes the project.
# Uses git credential.helper — token is never embedded in the remote URL.
#
# Usage:
#   export GITHUB_TOKEN=ghp_your_token_here
#   bash push-to-github.sh

set -euo pipefail

REPO_NAME="${REPO_NAME:-algo-rhythm-dashboard}"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "ERROR: Set GITHUB_TOKEN before running this script."
  echo "  export GITHUB_TOKEN=ghp_your_token_here"
  exit 1
fi

# Get GitHub username from the API
GITHUB_USER=$(curl -sf -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/user | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])")
echo "GitHub user: $GITHUB_USER"

# Create repo (idempotent — ignores 422 if it already exists)
HTTP_STATUS=$(curl -so /dev/null -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{\"name\": \"$REPO_NAME\", \"private\": false, \"description\": \"Algo-Rhythm Lane B Strategy Review Dashboard\"}")

if [ "$HTTP_STATUS" = "201" ]; then
  echo "Repository created: https://github.com/$GITHUB_USER/$REPO_NAME"
elif [ "$HTTP_STATUS" = "422" ]; then
  echo "Repository already exists: https://github.com/$GITHUB_USER/$REPO_NAME"
else
  echo "ERROR: Unexpected status $HTTP_STATUS creating repo. Check your token and try again."
  exit 1
fi

# Configure credential helper (no token in remote URL)
git config credential.helper "!f() { echo username=$GITHUB_USER; echo password=$GITHUB_TOKEN; }; f"

REMOTE_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"

git remote remove github 2>/dev/null || true
git remote add github "$REMOTE_URL"

git add -A
git commit -m "feat: Vercel deployment configuration + Algo-Rhythm dashboard" --allow-empty

git push github HEAD:main

# Clean up credential helper after push
git config --unset credential.helper 2>/dev/null || true

echo ""
echo "Done. Repo: https://github.com/$GITHUB_USER/$REPO_NAME"
echo "Next: import it in Vercel — see VERCEL_DEPLOY.md"
