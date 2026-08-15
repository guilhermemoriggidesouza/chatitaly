# Queue Application - Isolated Queue System

**Um aplicativo separado e independente para processar lessons de forma assíncrona usando Bull MQ.**

## 🏗️ Arquitetura

```
┌─────────────────────┐               ┌──────────────────┐
│   API Application   │               │  Queue Application
│   (port 8080)       │   Redis       │  (separate process)
│                     │  Persistence  │
│  - POST /chat       ├─────────────┬─┤  - 5 Workers
│  - POST /upload     │             │ │  - Job Processor
│  - PUT /upload/:id  │             │ │  - Auto Retry
└─────────────────────┘             └──────────────────┘
        API                          QUEUE SYSTEM
```

## 🚀 Quick Start

### Terminal 1: Start API

```bash
npm run dev
# 🚀 Server listening on port 8080
```

### Terminal 2: Start Queue Application

```bash
npm run queue:dev
# [Queue App] 🚀 Starting Queue Application
# [Worker] ✅ All 5 workers running and listening for jobs
```

### Terminal 3: Send Jobs

```bash
# Add a lesson job
curl -X POST http://localhost:6379/RPUSH/lessons \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "lesson-001",
    "userId": "user-123",
    "level": "b1",
    "theme": "comidas",
    "content": "Seu prato favorito?"
  }'
```

## 📁 Project Structure

```
src/
├── queue/                          # ← ISOLATED QUEUE APPLICATION
│   ├── index.ts                    # Entry point for queue app
│   ├── queue.ts                    # Bull MQ configuration
│   └── workers/
│       └── lesson-processor.ts     # 5 concurrent workers
│
├── index.ts                        # API (independent)
├── routes/
│   └── upload.ts                   # Upload routes only
└── infra/                          # Shared infrastructure
    ├── llm.ts
    ├── mongodb.ts
    └── (no queue.ts - moved to queue/)
```

## 🔌 How to Integrate Queue with API

The queue is **completely isolated** from the API. To enqueue jobs from the API:

```typescript
// In your API route (e.g., /chat endpoint)
import { addLessonJob } from '../queue/queue.ts';

app.post('/chat', async (req, res) => {
  // Option 1: Process immediately (old way)
  // const response = await graph.invoke(...);
  
  // Option 2: Enqueue for async processing (new way)
  const job = await addLessonJob({
    lessonId: 'lesson-' + Date.now(),
    userId: req.body.userId,
    level: req.body.level,
    theme: req.body.theme,
    content: req.body.newMessage,
    metadata: { history: req.body.history }
  });

  res.status(202).json({
    message: 'Job queued',
    jobId: job.id
  });
});
```

## 🧪 Testing

### Add a single job

```bash
node -e "
const { addLessonJob } = require('./build/src/queue/queue.js');
addLessonJob({
  lessonId: 'test-1',
  userId: 'user-123',
  level: 'b1',
  theme: 'comidas',
  content: 'Test content'
}).then(job => console.log('Job added:', job.id));
"
```

### Monitor queue status

```bash
# Watch Redis queue
redis-cli

> LRANGE jobs:lessons:wait 0 -1
> LRANGE jobs:lessons:active 0 -1
> LRANGE jobs:lessons:completed 0 -1
```

### Stress test (10 concurrent jobs)

```bash
#!/bin/bash
for i in {1..10}; do
  node -e "
    const { addLessonJob } = require('./build/src/queue/queue.js');
    addLessonJob({
      lessonId: 'stress-$i',
      userId: 'user-123',
      level: 'b1',
      theme: 'comidas',
      content: 'Stress test $i'
    }).then(() => console.log('Job $i added'));
  " &
done
wait
echo "✅ All jobs sent"
```

Watch workers process 5 jobs simultaneously.

## ⚙️ Configuration

### Number of Workers

Edit `src/queue/workers/lesson-processor.ts` line 5:

```typescript
const NUM_WORKERS = 5; // Change this
```

Restart queue app.

### Redis Connection

Set environment variables:

```bash
REDIS_HOST=redis.prod.com REDIS_PORT=6380 npm run queue:dev
```

Or edit `src/queue/queue.ts` line 19.

### Job Retries & Timeout

Edit `src/queue/queue.ts` line 49:

```typescript
const job = await lessonQueue.add(data, {
  attempts: 3,              // Number of retries
  backoff: {
    type: 'exponential',
    delay: 2000,           // Retry delay (ms)
  },
  timeout: 600000,         // Job timeout (ms)
});
```

## 📊 Monitoring

### Queue Health

```typescript
// Check queue status
const count = await lessonQueue.count();
const waiting = await lessonQueue.getWaitingCount();
const active = await lessonQueue.getActiveCount();
const completed = await lessonQueue.getCompletedCount();
const failed = await lessonQueue.getFailedCount();

console.log({ count, waiting, active, completed, failed });
```

### Logs Example

```
[Queue App] 🚀 Starting Queue Application
[Queue App] Redis: localhost:6379
[Worker] 🚀 Starting 5 lesson queue workers
[Worker #1] Processing job 1
[Worker] Processing lesson lesson-001 for user user-123
[Worker] ✅ Lesson lesson-001 processed successfully
[Queue Info] Job 1 completed
[Worker #2] Processing job 2
...
[Worker] ✅ All 5 workers running and listening for jobs
```

## 🔄 Job Lifecycle

```
1. API calls addLessonJob()
   ↓
2. Job added to Redis queue (waiting state)
   ↓
3. Worker picks up job (active state)
   ↓
4. processLesson() executes
   ↓
5. Job completed or failed (retry on fail)
   ↓
6. Result stored, job cleaned up
```

## 🚭 Graceful Shutdown

Both API and Queue support graceful shutdown:

```bash
# Press Ctrl+C
[Worker] 🛑 SIGINT received, shutting down gracefully...
[Worker] ✅ Queue closed
```

Jobs in progress will complete before shutdown.

## 🐳 Docker Deployment

Queue application as separate service:

```yaml
services:
  api:
    build: .
    command: npm run start
    ports:
      - "8080:8080"
    depends_on:
      - redis

  queue:
    build: .
    command: npm run queue:start
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

Run both services:

```bash
docker-compose up
```

## 📝 Production Checklist

- [ ] Redis running (managed separately)
- [ ] API started (`npm run start`)
- [ ] Queue app started in separate process (`npm run queue:start`)
- [ ] Environment variables set (`REDIS_HOST`, `REDIS_PORT`)
- [ ] Monitoring/alerting configured
- [ ] Graceful shutdown enabled
- [ ] Job logs captured
- [ ] Auto-restart on failure (systemd/supervisord)
