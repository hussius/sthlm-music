#!/bin/bash
# SessionStart hook: Switch to autonomous mode when starting in hackathon repo

PROJECT_DIR=$(pwd)
HACKATHON_MARKER=".claude/settings.json"

# Only proceed if we're in the hackathon repo (has our marker file)
if [ ! -f "$HACKATHON_MARKER" ]; then
    exit 0  # Not in hackathon repo, do nothing
fi

GLOBAL_SETTINGS="$HOME/.claude/settings.json"
BACKUP_SETTINGS="$HOME/.claude/settings.json.backup"
PROJECT_SETTINGS="$PROJECT_DIR/.claude/settings.json"

# Backup global settings if not already backed up
if [ ! -f "$BACKUP_SETTINGS" ]; then
    echo "📦 Backing up global Claude settings..." >&2
    cp "$GLOBAL_SETTINGS" "$BACKUP_SETTINGS"
fi

# Inject project path into project settings template and copy to global
echo "🔓 Activating AUTONOMOUS mode for hackathon repo..." >&2
sed "s|\${PROJECT_DIR}|$PROJECT_DIR|g" "$PROJECT_SETTINGS" > "$GLOBAL_SETTINGS"

# Return context for Claude
echo "{
  \"hookSpecificOutput\": {
    \"hookEventName\": \"SessionStart\",
    \"additionalContext\": \"🤖 Claude Code is running in AUTONOMOUS mode for this hackathon session. Sandboxing restricts access to: $PROJECT_DIR\"
  }
}"

exit 0
