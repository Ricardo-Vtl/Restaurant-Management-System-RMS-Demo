#!/usr/bin/env bash
# Sincroniza cambios de CÓDIGO desde el repositorio original (upstream/dev).
# Las rutas excluidas (docs internos, AGENTS.md, configs de agentes) nunca se
# importan ni se publican. Los cambios locales de la demo se conservan mediante
# merge 3-way (git apply -3).
#
# Uso: ./scripts/sync-upstream.sh
set -euo pipefail

EXCLUDES=(
  ':(exclude)docs'
  ':(exclude)AGENTS.md'
  ':(exclude).agents'
  ':(exclude).opencode'
  ':(exclude).playwright-mcp'
  # README, LICENSE y assets son propios de la demo (vitrina pública): excluidos
  # para que un cambio de upstream no los sobrescriba.
  ':(exclude)README.md'
  ':(exclude)LICENSE'
  ':(exclude)assets'
)

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: hay cambios sin commitear. Commitea o stashea antes de sincronizar." >&2
  exit 1
fi

git fetch upstream

if ! git rev-parse -q --verify upstream-sync >/dev/null; then
  echo "ERROR: falta el tag upstream-sync (base de sincronización)." >&2
  exit 1
fi

BASE=$(git rev-parse upstream-sync)
UPSTREAM_HEAD=$(git rev-parse upstream/dev)

if [ "$BASE" = "$UPSTREAM_HEAD" ]; then
  echo "Ya estás al día con upstream/dev ($BASE)."
  exit 0
fi

# Mensaje del commit: deja registro de QUÉ se integró, no solo que hubo sync.
# Vive en .git/ para poder reutilizarlo si hay conflictos y el commit lo
# termina haciendo una persona.
MSG_FILE=".git/SYNC_MSG"
{
  echo "chore: sync upstream dev"
  echo
  echo "Integrates upstream/dev ($BASE -> $UPSTREAM_HEAD):"
  git log --pretty='- %h %s' "$BASE..upstream/dev" -- . "${EXCLUDES[@]}"
  echo
  git diff --shortstat "$BASE..upstream/dev" -- . "${EXCLUDES[@]}"
} > "$MSG_FILE"

echo "Aplicando cambios de upstream/dev ($BASE -> $UPSTREAM_HEAD)..."
PATCH=$(mktemp)
git diff --binary "$BASE..upstream/dev" -- . "${EXCLUDES[@]}" > "$PATCH"

if [ ! -s "$PATCH" ]; then
  echo "Sin cambios de código (solo hubo cambios en rutas excluidas)."
  git tag -f upstream-sync upstream/dev >/dev/null
  rm -f "$PATCH"
  exit 0
fi

if ! git apply -3 "$PATCH"; then
  rm -f "$PATCH"
  echo
  echo "CONFLICTOS: revisa los archivos con marcadores, resuélvelos y luego:"
  echo "  git add -A"
  echo "  git commit -F $MSG_FILE"
  echo "  git tag -f upstream-sync upstream/dev && git push origin main"
  exit 1
fi

rm -f "$PATCH"
git add -A
git commit -F "$MSG_FILE"
git tag -f upstream-sync upstream/dev
git push origin main
echo "Listo: demo actualizada y desplegada."
