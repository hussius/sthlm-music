#!/bin/bash
# SessionEnd hook: Restore global settings when exiting hackathon repo

GLOBAL_SETTINGS="$HOME/.claude/settings.json"
BACKUP_SETTINGS="$HOME/.claude/settings.json.backup"

# Restore global settings if backup exists
if [ -f "$BACKUP_SETTINGS" ]; then
    echo "🔒 Restoring global Claude settings..." >&2
    cp "$BACKUP_SETTINGS" "$GLOBAL_SETTINGS"
    echo "✓ Global settings restored" >&2
fi

exit 0
