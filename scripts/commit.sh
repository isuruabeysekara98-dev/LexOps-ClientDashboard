#!/bin/bash
set -e

# Get the diff summary
DIFF=$(git diff --staged --stat 2>/dev/null || git diff --stat HEAD 2>/dev/null)
FILES_CHANGED=$(git diff --name-only HEAD 2>/dev/null | head -20)

# Stage all changes
git add -A

# Generate commit message using Claude API
COMMIT_MSG=$(curl -s https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d "{
    \"model\": \"claude-haiku-4-5-20251001\",
    \"max_tokens\": 200,
    \"messages\": [{
      \"role\": \"user\",
      \"content\": \"Generate a concise git commit message (max 72 chars for subject line, then bullet points for details) for these changed files in a legal ops client portal project:\n\nFiles changed:\n$FILES_CHANGED\n\nFormat:\ntype: short description\n\n- bullet point detail\n- bullet point detail\n\nTypes: feat, fix, refactor, style, chore\"
    }]
  }" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).content[0].text)}catch(e){}})" 2>/dev/null)

# Fallback if API call fails
if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="chore: update portal — $(date '+%Y-%m-%d %H:%M')"
fi

echo "Generated commit message:"
echo "$COMMIT_MSG"
echo ""

# Update CHANGELOG.md
DATE=$(date '+%Y-%m-%d')
CHANGELOG_ENTRY="## [$(git rev-list --count HEAD 2>/dev/null || echo '0').$(date '+%m%d')] — $DATE\n$COMMIT_MSG\n"

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
