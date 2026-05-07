#!/usr/bin/env bash
MSG=$(head -1 "$1")
if [[ "$MSG" =~ ^(feat|fix|docs|style|refactor|perf|test|chore|ci|build)(\(.+\))?:.+ ]]; then
  exit 0
fi
echo "ERROR: Commit blocked. Only Conventional Commit prefixes (feat, fix, docs, etc.) are allowed."
echo "Got: $MSG"
exit 1
