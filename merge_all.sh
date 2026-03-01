#!/bin/bash
set -e

# Fetch PR branches
PR_BRANCHES=$(curl -s https://api.github.com/repos/n24q02m/better-godot-mcp/pulls | jq -r '.[].head.ref')

for branch in $PR_BRANCHES; do
  echo "======================================"
  echo "Attempting to merge origin/$branch"
  echo "======================================"
  
  if git merge "origin/$branch" -m "Merge branch '$branch'"; then
    echo "Merge successful, running tests..."
    if npm run build && npm test; then
      echo "Tests passed! Keeping merge."
    else
      echo "Tests failed! Reverting merge."
      git reset --hard HEAD~1
    fi
  else
    echo "Merge conflict! Aborting merge."
    git merge --abort
  fi
done
