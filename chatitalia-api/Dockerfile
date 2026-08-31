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

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY package.json ./

# pasta de uploads (montada como volume no compose para persistir na VM)
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 8080
CMD ["node", "dist/index.js"]
