# syntax=docker/dockerfile:1

# ---------- build: compila TS -> dist/ ----------
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- deps: só dependências de produção ----------
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# ---------- runtime ----------
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Piper TTS: binário + voz italiana (it_IT-riccardo). Fala local, sem custo.
# (STT é remoto via OpenRouter — não precisa de binário aqui.)
ARG PIPER_VERSION=2023.11.14-2
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates libgomp1 \
 && ARCH="$(dpkg --print-architecture)" \
 && case "$ARCH" in \
      arm64) PIPER_ARCH=aarch64 ;; \
      amd64) PIPER_ARCH=x86_64 ;; \
      *) echo "arch não suportada: $ARCH" && exit 1 ;; \
    esac \
 && curl -fsSL "https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_${PIPER_ARCH}.tar.gz" \
    | tar -xz -C /opt \
 && ln -s /opt/piper/piper /usr/local/bin/piper \
 && mkdir -p /opt/voices \
 && curl -fsSL -o /opt/voices/it_IT-riccardo-x_low.onnx \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/riccardo/x_low/it_IT-riccardo-x_low.onnx" \
 && curl -fsSL -o /opt/voices/it_IT-riccardo-x_low.onnx.json \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/riccardo/x_low/it_IT-riccardo-x_low.onnx.json" \
 && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY package.json ./

# pasta de uploads (montada como volume no compose para persistir na VM)
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 8080
CMD ["node", "dist/index.js"]
