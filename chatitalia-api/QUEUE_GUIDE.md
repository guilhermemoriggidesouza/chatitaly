# Bull MQ - Lesson Queue Documentation

## 📋 Overview

Um sistema de fila distribuída para processar lessons de forma assíncrona e escalável usando Bull MQ (baseado em Redis).

**Arquitetura:**
- **API** (`src/index.ts`): Enfileira lessons
- **Worker** (`src/workers/lesson-processor.ts`): Processa 5 jobs simultâneos
- **Queue** (`src/infra/queue.ts`): Configuração e tipos
- **Redis**: Backend de persistência (rodando no Docker)

## 🚀 Iniciar Tudo

### 1. Inicie os serviços (MongoDB + Redis)

```bash
docker compose up -d
```

Verifique:
```bash
docker compose ps
```

### 2. Terminal 1: Inicie a API

```bash
npm run dev
```

Ficará ouvindo em `http://localhost:8080`

### 3. Terminal 2: Inicie os Workers (5 simultâneos)

```bash
npm run worker:dev
```

Você verá:
```
✅ All lesson workers are running and listening for jobs
```

## 📤 Enfileirar Lesson

**Endpoint:** `POST /lessons/process`

```bash
curl -X POST http://localhost:8080/lessons/process \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "lesson-001",
    "userId": "user-123",
    "level": "b1",
    "theme": "comidas e culinaria",
    "content": "Qual é seu prato favorito?",
    "metadata": {
      "history": [...]
    },
    "priority": 0
  }'
```

**Response (202 Accepted):**
```json
{
  "message": "Lesson queued for processing",
  "jobId": "1",
  "lessonId": "lesson-001",
  "statusUrl": "/lessons/status/1"
}
```

## 📊 Verificar Status

**Endpoint:** `GET /lessons/status/:jobId`

```bash
curl http://localhost:8080/lessons/status/1
```

**Possíveis estados:**
- `waiting`: Aguardando processamento
- `active`: Sendo processado
- `completed`: Concluído
- `failed`: Falha
- `delayed`: Agendado para depois

**Response:**
```json
{
  "jobId": "1",
  "id": "1",
  "state": "completed",
  "progress": 100,
  "data": {
    "lessonId": "lesson-001",
    "userId": "user-123",
    ...
  },
  "result": {
    "lessonId": "lesson-001",
    "status": "completed",
    "data": {...}
  },
  "failedReason": null,
  "attempts": 1
}
```

## 🧪 Teste de Carga

Envie múltiplas lessons para testar os 5 workers:

```bash
#!/bin/bash

for i in {1..10}; do
  curl -X POST http://localhost:8080/lessons/process \
    -H "Content-Type: application/json" \
    -d "{
      \"lessonId\": \"lesson-$i\",
      \"userId\": \"user-123\",
      \"level\": \"b1\",
      \"theme\": \"comidas e culinaria\",
      \"content\": \"Question $i?\"
    }" &
done

wait
echo "✅ All jobs enqueued!"
```

Observe os logs dos workers processando 5 jobs em paralelo.

## 🔄 Processamento Síncrono (Backward Compatibility)

Para clientes que precisam de resposta imediata, use:

**Endpoint:** `POST /lessons/process-sync`

```bash
curl -X POST http://localhost:8080/lessons/process-sync \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "level": "b1",
    "theme": "comidas e culinaria",
    "history": [],
    "newMessage": "Qual é seu prato favorito?"
  }'
```

⚠️ **Timeout:** 30 segundos (aguarda o job ser processado)

## 🛠️ Configuração

### Alterar número de workers

Edite `src/workers/lesson-processor.ts` linha 8:

```typescript
const NUM_WORKERS = 5; // Altere aqui
```

Reinicie o worker.

### Tentar novamente e backoff

Edite `src/infra/queue.ts` linhas 58-62:

```typescript
const job = await lessonQueue.add(data, {
  attempts: 3,              // Número de tentativas
  backoff: {
    type: 'exponential',
    delay: 2000,           // Atraso inicial (ms)
  },
  timeout: 600000,         // Timeout do job (ms)
});
```

### Conexão Redis customizada

Edite `src/infra/queue.ts` linhas 19-24:

```typescript
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  // ...
};
```

Ou via environment:
```bash
REDIS_HOST=redis.example.com REDIS_PORT=6380 npm run worker:dev
```

## 📈 Monitorar Fila

### 1. Verificar tamanho da fila

```bash
node -e "
const Queue = require('bull');
const q = new Queue('lessons', { host: 'localhost', port: 6379 });
q.count().then(count => {
  console.log('Jobs na fila:', count);
  process.exit(0);
});
"
```

### 2. Limpar fila (cuidado!)

```bash
node -e "
const Queue = require('bull');
const q = new Queue('lessons', { host: 'localhost', port: 6379 });
q.clean(0).then(count => {
  console.log('Jobs limpos:', count);
  process.exit(0);
});
"
```

### 3. Usar Bull Board (UI de monitoramento)

Instale:
```bash
npm install bull-board express-router
```

Adicione em `src/index.ts`:

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { lessonQueue } from './infra/queue';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(lessonQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

Acesse: http://localhost:8080/admin/queues

## 📝 Logs Exemplo

### Worker iniciando:
```
[INFO] Starting lesson queue workers {"numWorkers":5}
[INFO] Worker initialized {"workerId":1}
[INFO] Worker initialized {"workerId":2}
...
[INFO] ✅ All lesson workers are running and listening for jobs
```

### Job sendo processado:
```
[INFO] Lesson enqueued for processing {"jobId":"1","lessonId":"lesson-001"}
[INFO] Worker processing job {"workerId":1,"jobId":"1"}
[INFO] Processing lesson {"lessonId":"lesson-001","userId":"user-123","level":"b1","theme":"comidas e culinaria"}
[INFO] Lesson processed successfully {"lessonId":"lesson-001","userId":"user-123"}
[INFO] Job completed {"jobId":"1"}
```

### Falha com retry:
```
[WARN] Job failed {"jobId":"1","error":"Connection timeout","attemptsMade":1}
[INFO] Worker processing job {"workerId":2,"jobId":"1"} // Retry
[WARN] Job stalled {"jobId":"1"}
```

## 🔌 Integração com as Rotas

### Chat atual (síncrono)
```
/chat  →  Processa imediatamente  →  Retorna resposta
```

### Novo (assíncrono com queue)
```
/lessons/process  →  Enfileira  →  Retorna jobId (202)
                     ↓
            Worker processa
                     ↓
        /lessons/status/:jobId  →  Poll para resultado
```

## 🚫 Troubleshooting

### "Cannot connect to Redis"
```bash
# Verifique se Redis está rodando
docker compose ps

# Reinicie
docker compose restart redis
```

### "Worker não processa jobs"
```bash
# Verifique logs do worker
npm run worker:dev

# Verifique conexão
redis-cli ping  # Deve retornar "PONG"
```

### Jobs travados em "active"
```bash
# Limpar jobs travados
node -e "
const Queue = require('bull');
const q = new Queue('lessons');
q.clean(0, 'active').then(count => {
  console.log('Cleaned:', count);
  process.exit(0);
});
"
```

## 📦 Estrutura de Diretórios

```
src/
├── infra/
│   └── queue.ts              # Configuração Bull MQ
├── routes/
│   ├── upload.ts
│   └── lessons.ts            # Rotas de enfileiramento
├── workers/
│   └── lesson-processor.ts   # Workers (5 simultâneos)
└── index.ts                  # API principal
```

## ✅ Checklist Deploy

- [ ] Redis rodando
- [ ] API iniciada (`npm run dev`)
- [ ] Workers iniciados (`npm run worker:dev`)
- [ ] Testar `/lessons/process`
- [ ] Verificar status com `/lessons/status/:jobId`
- [ ] Monitorar logs
- [ ] Ajustar `NUM_WORKERS` conforme necessário
