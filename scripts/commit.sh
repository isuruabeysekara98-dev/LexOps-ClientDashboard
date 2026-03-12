#!/bin/bash
set -e

# Get the diff summary
DIFF=$(git diff --staged --stat 2>/dev/null || git diff --stat HEAD 2>/dev/null)
FILES_CHANGED=$(git diff --name-only HEAD 2>/dev/null | head -20)

# Stage all changes
git add -A

# Generate commit message using Claude API (via Node.js to access Replit secrets)
COMMIT_MSG=$(node -e "
const https = require('https');
const files = process.argv[1];
const data = JSON.stringify({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 200,
  messages: [{ role: 'user', content: 'Generate a concise git commit message for these changed files in a legal ops client portal:\n' + files + '\n\nFormat: type: short description\n\n- detail\n- detail\n\nTypes: feat, fix, refactor, style, chore' }]
});
const options = {
  hostname: 'api.anthropic.com',
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-length': Buffer.byteLength(data)
  }
};
const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try { process.stdout.write(JSON.parse(body).content[0].text); } catch(e) { process.stdout.write(''); }
  });
});
req.on('error', () => process.stdout.write(''));
req.write(data);
req.end();
" "$FILES_CHANGED" 2>/dev/null)

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
