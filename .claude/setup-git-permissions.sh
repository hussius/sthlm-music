#!/usr/bin/env bash
# Setup git automation permissions for Claude Code

set -e

SETTINGS_FILE="$HOME/.claude/settings.json"
PROJECT_SETTINGS=".claude/settings.json"

echo ""
echo "🤖 Claude Code Git Automation Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Choose how Claude Code should handle git operations:"
echo ""
echo "  1) Safe Mode (default)"
echo "     • Claude prompts for every commit and push"
echo "     • Maximum control, slower workflow"
echo "     • ✅ Recommended for: Production work, shared repos"
echo ""
echo "  2) Hackathon Mode (recommended for this workshop)"
echo "     • Claude auto-commits without prompts"
echo "     • Claude still asks before pushing"
echo "     • ⚡ Fast iteration, safe collaboration"
echo "     • ✅ Recommended for: Hackathons, rapid prototyping"
echo ""
echo "  3) Full Autonomous"
echo "     • Claude auto-commits AND auto-pushes"
echo "     • No prompts for git operations"
echo "     • ⚠️  Use with caution - can push broken code"
echo "     • ✅ Recommended for: Solo projects, personal repos"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get user choice
while true; do
    read -p "Enter your choice (1/2/3) [default: 1]: " choice
    choice=${choice:-1}

    case $choice in
        1|2|3)
            break
            ;;
        *)
            echo "Invalid choice. Please enter 1, 2, or 3."
            ;;
    esac
done

echo ""
echo "📝 Updating permissions..."

# Backup existing settings if they exist
if [ -f "$SETTINGS_FILE" ]; then
    BACKUP_FILE="$SETTINGS_FILE.backup.$(date +%s)"
    cp "$SETTINGS_FILE" "$BACKUP_FILE"
    echo "✓ Backed up existing settings to: $BACKUP_FILE"
fi

# Read current project settings
CURRENT_SETTINGS=$(cat "$PROJECT_SETTINGS")

# Update settings based on choice
case $choice in
    1)
        # Safe Mode - no git automation
        echo "✓ Configured: Safe Mode"
        echo "  • Git commits: will prompt ❓"
        echo "  • Git pushes: will prompt ❓"
        # No changes needed - already prompts by default
        ;;
    2)
        # Hackathon Mode - auto-commit, prompt for push
        echo "✓ Configured: Hackathon Mode"
        echo "  • Git commits: auto-allowed ✅"
        echo "  • Git pushes: will prompt ❓"

        # Add git commit to allow list, but keep push in ask list
        CURRENT_SETTINGS=$(echo "$CURRENT_SETTINGS" | python3 -c "
import sys, json
settings = json.load(sys.stdin)
if 'permissions' not in settings:
    settings['permissions'] = {}
if 'allow' not in settings['permissions']:
    settings['permissions']['allow'] = []
if 'ask' not in settings['permissions']:
    settings['permissions']['ask'] = []

        # Add git commit patterns to allow list
allow_patterns = [
    'Bash(git commit *)',
    'Bash(git add *)',
    'Bash(git status *)',
    'Bash(git diff *)'
]
for pattern in allow_patterns:
    if pattern not in settings['permissions']['allow']:
        settings['permissions']['allow'].append(pattern)

# Add git push to ask list (explicit confirmation)
push_patterns = ['Bash(git push *)']
for pattern in push_patterns:
    if pattern not in settings['permissions']['ask']:
        settings['permissions']['ask'].append(pattern)

print(json.dumps(settings, indent=2))
")
        ;;
    3)
        # Full Autonomous - auto-commit and auto-push
        echo "✓ Configured: Full Autonomous Mode"
        echo "  • Git commits: auto-allowed ✅"
        echo "  • Git pushes: auto-allowed ✅"
        echo ""
        echo "⚠️  WARNING: Claude can now push code without confirmation!"
        echo "   Make sure you review changes before they happen."

        # Add all git operations to allow list
        CURRENT_SETTINGS=$(echo "$CURRENT_SETTINGS" | python3 -c "
import sys, json
settings = json.load(sys.stdin)
if 'permissions' not in settings:
    settings['permissions'] = {}
if 'allow' not in settings['permissions']:
    settings['permissions']['allow'] = []

        # Add all git patterns to allow list
allow_patterns = [
    'Bash(git commit *)',
    'Bash(git push *)',
    'Bash(git add *)',
    'Bash(git status *)',
    'Bash(git diff *)'
]
for pattern in allow_patterns:
    if pattern not in settings['permissions']['allow']:
        settings['permissions']['allow'].append(pattern)

print(json.dumps(settings, indent=2))
")
        ;;
esac

# Write updated settings to project-local config (takes priority over global)
mkdir -p "$(dirname "$PROJECT_SETTINGS")"
echo "$CURRENT_SETTINGS" > "$PROJECT_SETTINGS"

echo ""
echo "✅ Git automation configured!"
echo ""
echo "📝 Settings saved to: $PROJECT_SETTINGS (project-local)"
echo ""
echo "💡 You can change this anytime by running:"
echo "   make setup-git-automation"
echo ""
