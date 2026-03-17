#!/bin/bash
set -e

# Stage all changes
git add -A

# Generate descriptive commit message from changed files
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null | head -20)
INSERTIONS=$(git diff --stat HEAD 2>/dev/null | tail -1 | grep -o '[0-9]* insertion' | grep -o '[0-9]*')
DELETIONS=$(git diff --stat HEAD 2>/dev/null | tail -1 | grep -o '[0-9]* deletion' | grep -o '[0-9]*')

# If nothing staged, try staged diff
if [ -z "$CHANGED_FILES" ]; then
  CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null | head -20)
  INSERTIONS=$(git diff --cached --stat 2>/dev/null | tail -1 | grep -o '[0-9]* insertion' | grep -o '[0-9]*')
  DELETIONS=$(git diff --cached --stat 2>/dev/null | tail -1 | grep -o '[0-9]* deletion' | grep -o '[0-9]*')
fi

# Categorise changes
HAS_DASHBOARD=$(echo "$CHANGED_FILES" | grep -c "Dashboard" || true)
HAS_ADMIN=$(echo "$CHANGED_FILES" | grep -c "AdminPanel" || true)
HAS_SERVER=$(echo "$CHANGED_FILES" | grep -c "server/" || true)
HAS_EMAIL=$(echo "$CHANGED_FILES" | grep -c "email" || true)
HAS_PROPOSAL=$(echo "$CHANGED_FILES" | grep -c "roposal" || true)
HAS_STYLES=$(echo "$CHANGED_FILES" | grep -c "css\|style\|tailwind" || true)

# Build description
PARTS=""
[ "$HAS_DASHBOARD" -gt 0 ] && PARTS="$PARTS dashboard"
[ "$HAS_ADMIN" -gt 0 ] && PARTS="$PARTS admin-panel"
[ "$HAS_SERVER" -gt 0 ] && PARTS="$PARTS server"
[ "$HAS_EMAIL" -gt 0 ] && PARTS="$PARTS email"
[ "$HAS_PROPOSAL" -gt 0 ] && PARTS="$PARTS proposal-flow"
[ "$HAS_STYLES" -gt 0 ] && PARTS="$PARTS styles"

PARTS=$(echo "$PARTS" | xargs | tr ' ' ', ')
DATE=$(date '+%Y-%m-%d %H:%M')

COMMIT_MSG="fix: update ${PARTS:-portal} — ${DATE}

Files changed:
$(echo "$CHANGED_FILES" | sed 's/^/  - /')

+${INSERTIONS:-0} insertions, -${DELETIONS:-0} deletions"

echo "Generated commit message:"
echo "$COMMIT_MSG"
echo ""

# Update CHANGELOG.md
CHANGELOG_ENTRY="## [$(git rev-list --count HEAD 2>/dev/null)] — $DATE
### Changes
$(echo "$CHANGED_FILES" | sed 's/^/- /')
+${INSERTIONS:-0} insertions, -${DELETIONS:-0} deletions
"

# Prepend to changelog
if [ -f CHANGELOG.md ]; then
  TEMP=$(mktemp)
  echo -e "# LexOps Client Portal — Changelog\n\n$CHANGELOG_ENTRY" > "$TEMP"
  tail -n +2 CHANGELOG.md >> "$TEMP"
  mv "$TEMP" CHANGELOG.md
else
  echo -e "# LexOps Client Portal — Changelog\n\n$CHANGELOG_ENTRY" > CHANGELOG.md
fi

# Commit and push
git add -A
git commit -m "$COMMIT_MSG"
git push origin main

echo "✅ Committed and pushed to GitHub"
