#!/usr/bin/env bash
# Копирует все видео-скиллы из этого репозитория в ~/.claude/skills,
# чтобы они работали в Claude Code в любом проекте.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)/.claude/skills"
DST="${HOME}/.claude/skills"
mkdir -p "$DST"
for d in "$SRC"/*/; do
  n="$(basename "$d")"
  rm -rf "${DST:?}/$n"
  cp -R "$d" "$DST/$n"
  echo "installed: $n"
done
echo "Готово. Перезапустите Claude Code."
