#!/usr/bin/env bash
# push-to-github.sh
# Run this script once you have a GitHub personal access token.
# It creates the repo (if not exists) and pushes the project.
#
# Usage:
#   export GITHUB_TOKEN=ghp_your_token_here
#   bash push-to-github.sh

set -euo pipefail

REPO_NAME="${REPO_NAME:-algo-rhythm-dashboard}"
GITHUB_USER="${GITHUB_USER:-}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: Set GITHUB_TOKEN before running this script."
  echo "  export GITHUB_TOKEN=ghp_your_token_here"
  exit 1
fi

if [ -z "$GITHUB_USER" ]; then
  GITHUB_USER=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
    https://api.github.com/user | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])")
  echo "GitHub user: $GITHUB_USER"
fi

# Create repo if it doesn't exist
echo "Creating GitHub repo: $GITHUB_USER/$REPO_NAME ..."
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{\"name\": \"$REPO_NAME\", \"private\": false, \"description\": \"Algo-Rhythm Lane B Strategy Review Dashboard\"}" \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print('Repo:', r.get('html_url', r.get('errors', r)))"

# Set remote and push
git remote remove github 2>/dev/null || true
git remote add github "https://$GITHUB_USER:$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git"

git add -A
git commit -m "feat: Vercel deployment configuration + Algo-Rhythm rebrand" --allow-empty

git push github HEAD:main --force

echo ""
echo "Done! Repo: https://github.com/$GITHUB_USER/$REPO_NAME"
echo "Now import it into Vercel — see VERCEL_DEPLOY.md for full instructions."
