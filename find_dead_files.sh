#!/bin/bash
# Finds JS/CSS/HTML files in the project that aren't referenced by any other file.
# Run this from the project root: bash find_dead_files.sh

set -e

echo "Scanning project for candidate files..."
echo "======================================="
echo ""

# Collect candidate files (skip node_modules, .git, backups already deleted)
CANDIDATES=$(find . -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) \
  -not -path "./.git/*" \
  -not -path "./node_modules/*" \
  -not -path "./backend/*" \
  | sort)

DEAD_FILES=()

for file in $CANDIDATES; do
  # Get just the filename (basename) to search for references
  base=$(basename "$file")
  relpath="${file#./}"

  # Count how many OTHER files reference this file's name
  # Search across html/js/css for the filename string (handles relative paths like ../assets/js/x.js)
  refcount=$(grep -rl --include="*.html" --include="*.js" --include="*.css" -F "$base" . \
    --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=backend 2>/dev/null \
    | grep -v -F "$file" | wc -l)

  if [ "$refcount" -eq 0 ]; then
    DEAD_FILES+=("$relpath")
  fi
done

echo "Files with ZERO references found anywhere else:"
echo "-------------------------------------------------"
if [ ${#DEAD_FILES[@]} -eq 0 ]; then
  echo "None found."
else
  for f in "${DEAD_FILES[@]}"; do
    echo "  $f"
  done
fi

echo ""
echo "NOTE: This is a heuristic (filename string search across html/js/css)."
echo "It can miss files loaded dynamically (e.g. via JS string concatenation"
echo "or a backend route), and can false-flag files referenced only from"
echo "backend/ (excluded above) or from outside this repo (e.g. a CDN config,"
echo "external cron job, or an admin-only tool). Review each one manually"
echo "before deleting — do not delete blindly."
