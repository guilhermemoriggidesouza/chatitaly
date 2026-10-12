#!/usr/bin/env bash
#
# Acompanha os logs de um container na VM (Ctrl+C pra sair).
#
#   ./vm-logs.sh api      -> chatitalia-api
#   ./vm-logs.sh worker   -> chatitalia-worker
#   ./vm-logs.sh waha     -> chatitalia-waha
#
# Usa a mesma config do deploy.sh (./deploy.config: VM_HOST, VM_USER, SSH_KEY).
# LINES=500 ./vm-logs.sh api  -> muda quantas linhas antigas aparecem (padrão 200).
#
set -euo pipefail
cd "$(dirname "$0")"

SERVICE="${1:-api}"
LINES="${LINES:-200}"

[ -f ./deploy.config ] && source ./deploy.config
VM_HOST="${VM_HOST:-}"
VM_USER="${VM_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-}"

[ -n "$VM_HOST" ] || { echo "ERRO: defina VM_HOST no deploy.config."; exit 1; }
if [ -z "$SSH_KEY" ]; then
  for d in ssh-keys ../ssh-keys; do
    SSH_KEY="$(find "$d" -maxdepth 1 -type f ! -name '*.pub' 2>/dev/null | head -n1 || true)"
    [ -n "$SSH_KEY" ] && break
  done
fi
[ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ] || { echo "ERRO: chave SSH não encontrada (ssh-keys/ ou SSH_KEY no deploy.config)."; exit 1; }

# Os logs da API/worker saem em JSON (pino); o pino-pretty deixa legível.
# O WAHA já loga em texto, então passa direto.
if [ "$SERVICE" = "waha" ]; then
  ssh -i "$SSH_KEY" "$VM_USER@$VM_HOST" "docker logs -f --tail $LINES chatitalia-$SERVICE" 2>&1
else
  ssh -i "$SSH_KEY" "$VM_USER@$VM_HOST" "docker logs -f --tail $LINES chatitalia-$SERVICE" 2>&1 | npx pino-pretty
fi
