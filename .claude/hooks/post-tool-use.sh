#!/bin/bash
# Post-tool-use hook: Auto-format and check code after edits

TOOL_NAME="$1"
TOOL_INPUT="$2"
TOOL_OUTPUT="$3"
EXIT_CODE="$4"

# Only run after successful Edit or Write operations
if [ "$EXIT_CODE" -ne 0 ]; then
    exit 0
fi

if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then
    exit 0
fi

# Extract file path from the tool input JSON
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Determine the project root by looking for Makefile
PROJECT_ROOT=$(dirname "$FILE_PATH")
while [ "$PROJECT_ROOT" != "/" ]; do
    if [ -f "$PROJECT_ROOT/Makefile" ]; then
        break
    fi
    PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

# If no Makefile found, skip
if [ ! -f "$PROJECT_ROOT/Makefile" ]; then
    exit 0
fi

# Check if Makefile has format and check targets
if ! grep -q "^format:" "$PROJECT_ROOT/Makefile" 2>/dev/null; then
    exit 0
fi

# Run format and check in the project directory
cd "$PROJECT_ROOT" || exit 0

echo ""
echo "🔧 Auto-formatting and checking code..."
echo ""

# Run format (suppress output unless it fails)
if make format >/dev/null 2>&1; then
    echo "✓ Code formatted"
else
    echo "⚠️  Format failed (continuing anyway)"
fi

# Run check (show output since it's informative)
if make check 2>&1 | grep -E "(error|Error|ERROR|warning|Warning|WARNING)" | head -20; then
    echo ""
    echo "⚠️  Some checks failed - review above"
else
    echo "✓ All checks passed"
fi

echo ""

exit 0
