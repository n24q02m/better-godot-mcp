#!/bin/bash
PAGE=1
while true; do
  DATA=$(curl -s "https://api.github.com/repos/n24q02m/better-godot-mcp/pulls?per_page=100&page=$PAGE")
  LENGTH=$(echo "$DATA" | jq '. | length')
  if [ "$LENGTH" -eq 0 ]; then
    break
  fi
  echo "$DATA" | jq -r '.[] | "\(.number) \(.head.ref) \(.title)"'
  PAGE=$((PAGE+1))
done
