#!/usr/bin/env bash
#
# Deploy da chatitalia-api para a VM Oracle.
#
#   1. builda a imagem Docker (linux/arm64 = Ampere A1) localmente
#   2. exporta com `docker save` e envia por SSH (sem registry)
#   3. na VM: `docker load` + `docker compose up -d` (API + Redis)
#
# MongoDB NÃO entra aqui -> use o Atlas e coloque a connection string
# neste diretório em .env (MONGODB_URI=...). Lembre de liberar o IP da VM
# no "Network Access" do Atlas.
#
# Uso (a partir de chatitalia-api/):
#   ./deploy.sh
#
# Config: exporte variáveis no shell ou crie um arquivo ./deploy.config
# (git-ignored) com, por exemplo:
#   VM_HOST=123.45.67.89
#   SSH_KEY=../ssh-keys/minha-chave.key
#
set -euo pipefail
cd "$(dirname "$0")"

# ---------------------------------------------------------------------------
# Config (com defaults; sobrescreva via env ou ./deploy.config)
# ---------------------------------------------------------------------------
[ -f ./deploy.config ] && source ./deploy.config

VM_HOST="${VM_HOST:-}"                       # IP público da VM  (obrigatório)
VM_USER="${VM_USER:-ubuntu}"                 # ubuntu | opc (Oracle Linux)
SSH_KEY="${SSH_KEY:-}"                       # ex.: ../ssh-keys/minha-chave.key
REMOTE_DIR="${REMOTE_DIR:-/home/$VM_USER/chatitalia-api}"
PLATFORM="${PLATFORM:-linux/arm64}"          # linux/amd64 se pegou VM AMD
IMAGE="${IMAGE:-chatitalia-api}"
TAG="${TAG:-latest}"

ENV_FILE="${ENV_FILE:-.env.prod}"           # env de produção (enviado como .env na VM)
COMPOSE_FILE="docker-compose.prod.yml"
KEYS_DIRS=("ssh-keys" "../ssh-keys")         # procura em chatitalia-api/ e na raiz do projeto
TARBALL="$(mktemp -t chatitalia-api-XXXX).tar.gz"
trap 'rm -f "$TARBALL"' EXIT

# ---------------------------------------------------------------------------
# Validações
# ---------------------------------------------------------------------------
[ -n "$VM_HOST" ] || { echo "ERRO: defina VM_HOST (IP da VM)."; exit 1; }

if [ -z "$SSH_KEY" ]; then
  # pega a primeira chave privada encontrada nas pastas ssh-keys
  for d in "${KEYS_DIRS[@]}"; do
    SSH_KEY="$(find "$d" -maxdepth 1 -type f ! -name '*.pub' 2>/dev/null | head -n1 || true)"
    [ -n "$SSH_KEY" ] && break
  done
fi
[ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ] || { echo "ERRO: chave SSH não encontrada. Coloque-a em ssh-keys/ (ou defina SSH_KEY no deploy.config)."; exit 1; }
chmod 600 "$SSH_KEY"

[ -f "$ENV_FILE" ] || { echo "ERRO: falta $ENV_FILE (com MONGODB_URI do Atlas + chaves Clerk)."; exit 1; }
grep -qE '^[A-Z_]+=.*SUA_SENHA_AQUI' "$ENV_FILE" && { echo "ERRO: troque SUA_SENHA_AQUI pela senha real do Atlas em $ENV_FILE."; exit 1; }
grep -qE '^CLERK_WEBHOOK_SECRET=whsec_xxx' "$ENV_FILE" && { echo "ERRO: defina CLERK_WEBHOOK_SECRET (whsec_...) do Clerk Dashboard em $ENV_FILE."; exit 1; }

SSH=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VM_USER@$VM_HOST")
SCP=(scp -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)

echo "==> Alvo: $VM_USER@$VM_HOST:$REMOTE_DIR  (plataforma $PLATFORM)"

# ---------------------------------------------------------------------------
# 1. Build
# ---------------------------------------------------------------------------
echo "==> Buildando $IMAGE:$TAG ..."
docker buildx build \
  --platform "$PLATFORM" \
  -t "$IMAGE:$TAG" \
  --load \
  .

# ---------------------------------------------------------------------------
# 2. Exporta a imagem e envia arquivos
# ---------------------------------------------------------------------------
echo "==> Exportando imagem (docker save) ..."
docker save "$IMAGE:$TAG" | gzip > "$TARBALL"
echo "    $(du -h "$TARBALL" | cut -f1)"

echo "==> Garantindo Docker na VM ..."
"${SSH[@]}" 'command -v docker >/dev/null || (curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER)'

echo "==> Enviando artefatos ..."
"${SSH[@]}" "mkdir -p '$REMOTE_DIR'"
"${SCP[@]}" "$TARBALL"       "$VM_USER@$VM_HOST:$REMOTE_DIR/image.tar.gz"
"${SCP[@]}" "$COMPOSE_FILE"  "$VM_USER@$VM_HOST:$REMOTE_DIR/docker-compose.prod.yml"
"${SCP[@]}" "$ENV_FILE"      "$VM_USER@$VM_HOST:$REMOTE_DIR/.env"

# ---------------------------------------------------------------------------
# 3. Sobe na VM
# ---------------------------------------------------------------------------
echo "==> Subindo containers na VM ..."
"${SSH[@]}" bash -s <<EOF
set -euo pipefail
cd "$REMOTE_DIR"
gunzip -c image.tar.gz | docker load
rm -f image.tar.gz
mkdir -p uploads redis_data
API_IMAGE="$IMAGE:$TAG" docker compose -f docker-compose.prod.yml up -d
docker image prune -f
echo "--- containers ---"
docker compose -f docker-compose.prod.yml ps
EOF

# ---------------------------------------------------------------------------
# 4. Health check
# ---------------------------------------------------------------------------
echo "==> Checando a API (/health) ..."
ok=""
for _ in $(seq 1 10); do
  if "${SSH[@]}" 'curl -sf -o /dev/null http://127.0.0.1:8080/health'; then
    ok=1; break
  fi
  sleep 3
done
if [ -n "$ok" ]; then
  echo "    /health OK em 127.0.0.1:8080 (dentro da VM)."
else
  echo "    !! /health não respondeu. Veja os logs:"
  echo "       ssh -i $SSH_KEY $VM_USER@$VM_HOST 'cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml logs --tail=50 api'"
  exit 1
fi

echo "==> Deploy concluído."
