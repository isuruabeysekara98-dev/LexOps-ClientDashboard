#!/bin/bash
set -e

git add -A

CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null | head -20)
DATE=$(date '+%Y-%m-%d %H:%M')
VERSION=$(git rev-list --count HEAD 2>/dev/null || echo '0')

if [ -n "$1" ]; then
  DESCRIPTION="$1"
else
  # Auto-detect from files
  HAS_DASHBOARD=$(echo "$CHANGED_FILES" | grep -c "Dashboard" || true)
  HAS_ADMIN=$(echo "$CHANGED_FILES" | grep -c "AdminPanel" || true)
  HAS_SERVER=$(echo "$CHANGED_FILES" | grep -c "server/" || true)
  HAS_PROPOSAL=$(echo "$CHANGED_FILES" | grep -c "roposal" || true)
  PARTS=""
  [ "$HAS_DASHBOARD" -gt 0 ] && PARTS="$PARTS dashboard"
  [ "$HAS_ADMIN" -gt 0 ] && PARTS="$PARTS admin panel"
  [ "$HAS_SERVER" -gt 0 ] && PARTS="$PARTS server"
  [ "$HAS_PROPOSAL" -gt 0 ] && PARTS="$PARTS proposal flow"
  PARTS=$(echo "$PARTS" | xargs | tr ' ' ', ')
  DESCRIPTION="Updated ${PARTS:-portal}"
fi

COMMIT_MSG="[$VERSION] $DESCRIPTION"

# Update CHANGELOG.md
TEMP=$(mktemp)
echo "# LexOps Client Portal — Changelog" > "$TEMP"
echo "" >> "$TEMP"
echo "## [$VERSION] — $DATE" >> "$TEMP"
echo "$DESCRIPTION" >> "$TEMP"
echo "" >> "$TEMP"
if [ -f CHANGELOG.md ]; then
  tail -n +2 CHANGELOG.md >> "$TEMP"
fi
mv "$TEMP" CHANGELOG.md

git add -A
git commit -m "$COMMIT_MSG"
git push origin main

echo "✅ Pushed: $COMMIT_MSG"
