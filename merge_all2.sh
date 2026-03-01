#!/bin/bash
set -e

awk '{print $2}' pr_list2.txt | while read branch; do
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
