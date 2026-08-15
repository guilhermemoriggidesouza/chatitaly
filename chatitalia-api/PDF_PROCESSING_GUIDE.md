# PDF Processing Routes

## 📋 Overview

Sistema de processamento de PDFs que:
1. Recebe um arquivo PDF previamente salvo via `/upload`
2. Extrai as primeiras 5-20 páginas
3. Usa IA para identificar o sumário/índice
4. Quebre o PDF em lessons (um por capítulo)
5. Salva cada lesson no MongoDB com metadados

## 🏗️ Fluxo

```
1. Upload PDF
   POST /upload/presigned → Gera token
   PUT /upload/:token → Salva arquivo (retorna fileUri)

2. Processar PDF
   POST /pdf/process → Envia fileUri
   ↓
   - Extrai 5-20 primeiras páginas
   - IA extrai sumário/table of contents
   - Cria lessons para cada capítulo
   - Salva no MongoDB

3. Recuperar Lessons
   GET /pdf/lessons/:fileUri → Todas as lessons do PDF
   GET /pdf/lessons → Todas as lessons
```

## 🔌 Endpoints

### POST /pdf/process
**Processar um PDF e criar lessons a partir do sumário**

```bash
curl -X POST http://localhost:8080/pdf/process \
  -H "Content-Type: application/json" \
  -d '{
    "fileUri": "uploads/1723814400000-book.pdf",
    "maxPages": 20
  }'
```

**Request:**
```json
{
  "fileUri": "uploads/1723814400000-book.pdf",  // URI retornado do /upload
  "maxPages": 20                                   // (opcional) páginas para extrair (default: 20)
}
```

**Response (201 Created):**
```json
{
  "message": "PDF processed successfully",
  "chaptersFound": 5,
  "lessons": [
    {
      "fileUri": "uploads/1723814400000-book.pdf",
      "title": "Introduction",
      "lessonId": "uuid-1",
      "pages": [5, 12],
      "status": "PROCESSED",
      "createdAt": "2026-08-15T20:00:00.000Z"
    },
    {
      "fileUri": "uploads/1723814400000-book.pdf",
      "title": "Chapter 1: Basics",
      "lessonId": "uuid-2",
      "pages": [13, 28],
      "status": "PROCESSED",
      "createdAt": "2026-08-15T20:00:00.000Z"
    }
  ]
}
```

**Possíveis Erros:**
```json
// Arquivo não encontrado
{ "error": "File not found" }

// Arquivo não é PDF
{ "error": "File must be a PDF" }

// Sem sumário no PDF
{ 
  "error": "No table of contents found in PDF",
  "tocFound": false
}

// Erro na IA
{
  "error": "Failed to extract PDF summary",
  "detail": "..."
}
```

### GET /pdf/lessons/:fileUri
**Recuperar todas as lessons de um PDF específico**

```bash
curl http://localhost:8080/pdf/lessons/1723814400000-book.pdf
```

**Response:**
```json
{
  "fileUri": "1723814400000-book.pdf",
  "totalLessons": 5,
  "lessons": [
    {
      "fileUri": "1723814400000-book.pdf",
      "title": "Introduction",
      "lessonId": "uuid-1",
      "pages": [5, 12],
      "status": "PROCESSED",
      "createdAt": "2026-08-15T20:00:00.000Z"
    }
    // ... mais lessons
  ]
}
```

### GET /pdf/lessons
**Recuperar TODAS as lessons de todos os PDFs**

```bash
curl http://localhost:8080/pdf/lessons
```

**Response:**
```json
{
  "total": 10,
  "lessons": [
    {
      "fileUri": "1723814400000-book1.pdf",
      "title": "Chapter 1",
      "lessonId": "uuid-1",
      "pages": [5, 12],
      "status": "PROCESSED",
      "createdAt": "2026-08-15T20:00:00.000Z"
    },
    {
      "fileUri": "1723814400000-book2.pdf",
      "title": "Lesson A",
      "lessonId": "uuid-2",
      "pages": [1, 10],
      "status": "ON_PROCESS",
      "createdAt": "2026-08-15T20:05:00.000Z"
    }
  ]
}
```

### PUT /pdf/lessons/:lessonId
**Atualizar status de uma lesson**

```bash
curl -X PUT http://localhost:8080/pdf/lessons/uuid-1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ON_PROCESS",
    "error": null
  }'
```

**Request:**
```json
{
  "status": "PROCESSED | ON_PROCESS | ERROR_PROCESSING",
  "error": "String com descrição de erro (opcional)"
}
```

**Response:**
```json
{
  "message": "Lesson updated",
  "lesson": {
    "fileUri": "1723814400000-book.pdf",
    "title": "Introduction",
    "lessonId": "uuid-1",
    "pages": [5, 12],
    "status": "ON_PROCESS",
    "createdAt": "2026-08-15T20:00:00.000Z"
  }
}
```

## 📊 Lesson Schema

```typescript
interface PDFLesson {
  fileUri: string;                       // URI do arquivo salvo
  title: string;                         // Título exato do capítulo no sumário
  lessonId: string;                      // UUID único da lesson
  pages: [number, number];               // [página início, página fim]
  status: 'PROCESSED' | 'ON_PROCESS' | 'ERROR_PROCESSING';
  createdAt: string;                     // ISO 8601
  error?: string;                        // Mensagem de erro se falhou
}
```

## 🔄 Workflow Completo

### 1. Upload do PDF

```bash
# Gerar presigned URL
curl -X POST http://localhost:8080/upload/presigned \
  -H "Content-Type: application/json" \
  -d '{"filename": "kotlin-guide.pdf"}'

# Response:
# {
#   "presignedUrl": "http://localhost:8080/upload/uuid-token",
#   "expiresIn": 3600000,
#   "token": "uuid-token"
# }
```

```bash
# Upload do arquivo
curl -X PUT http://localhost:8080/upload/uuid-token \
  -H "Content-Type: application/octet-stream" \
  --data-binary @kotlin-guide.pdf

# Response:
# {
#   "message": "File uploaded successfully",
#   "filepath": "/Users/.../uploads/1723814400000-kotlin-guide.pdf",
#   "size": 5368709120,
#   "filename": "kotlin-guide.pdf"
# }
```

### 2. Processar PDF

```bash
curl -X POST http://localhost:8080/pdf/process \
  -H "Content-Type: application/json" \
  -d '{
    "fileUri": "1723814400000-kotlin-guide.pdf",
    "maxPages": 25
  }'
```

**Resposta:**
- Extrai 5-25 primeiras páginas do PDF
- IA analisa e encontra o Table of Contents
- Cria lessons (uma por capítulo)
- Salva no MongoDB
- Retorna array de lessons criadas

### 3. Usar Lessons

Agora você pode:
- Listar todas as lessons: `GET /pdf/lessons`
- Buscar lessons de um PDF: `GET /pdf/lessons/:fileUri`
- Atualizar status: `PUT /pdf/lessons/:lessonId`
- Enfileirar para processamento (integração com Queue)

## 🤖 Como a IA Extrai o Sumário

O prompt (`src/prompts/pdf-summary-agent.ts`):
1. Recebe o texto das primeiras 5-20 páginas
2. Procura por "Table of Contents", "Índice", "Sumário", etc.
3. Extrai:
   - Título do capítulo (exato)
   - Página inicial
   - Página final (estimada)
   - Ordem
4. Retorna JSON estruturado

**Exemplo de resposta esperada:**
```json
{
  "chapters": [
    {
      "title": "Introduction to Kotlin",
      "start_page": 5,
      "end_page": 12,
      "order": 1
    },
    {
      "title": "Basic Syntax",
      "start_page": 13,
      "end_page": 28,
      "order": 2
    }
  ],
  "toc_found": true,
  "total_chapters": 2
}
```

## 📁 Estrutura de Arquivos

```
src/
├── routes/
│   ├── pdf.ts                    # ← Rotas PDF (novo)
│   ├── upload.ts                 # Upload presigned URLs
│   └── ...
├── prompts/
│   ├── pdf-summary-agent.ts      # ← Prompt para extrair sumário (novo)
│   └── ...
├── infra/
│   ├── llm.ts                    # Adiciona método extractPdfSummary
│   └── mongodb.ts                # MockMongo com collection 'lessons'
└── index.ts
```

## ⚙️ Configuração

**Páginas a extrair:**
O padrão é 20. Para mudar, envie `maxPages` no body:
```json
{ "fileUri": "...", "maxPages": 30 }
```

**Onde os PDFs são salvos:**
Diretório padrão: `./uploads/` (na raiz do projeto)

**Database:**
MockMongo em `db.json` (para desenvolvimento)
Em produção, conectar a MongoDB real

## 🧪 Teste Completo

```bash
# 1. Gerar presigned URL
TOKEN=$(curl -s -X POST http://localhost:8080/upload/presigned \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.pdf"}' | jq -r '.presignedUrl')

echo "Upload URL: $TOKEN"

# 2. Upload (com arquivo de teste)
curl -X PUT "$TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @test.pdf

# 3. Processar PDF
curl -X POST http://localhost:8080/pdf/process \
  -H "Content-Type: application/json" \
  -d '{
    "fileUri": "local-filename-from-upload.pdf",
    "maxPages": 20
  }'

# 4. Ver lessons criadas
curl http://localhost:8080/pdf/lessons
```

## 🚫 Limitações Atuais

- Apenas suporta PDF com texto (não scanned images)
- Sumário deve estar nas primeiras 20 páginas
- IA pode não extrair 100% corretamente se sumário é não-padrão
- Páginas são estimadas (baseado no sumário)

## ✅ Produção

Para produção:
1. Usar MongoDB real (não MockMongo)
2. Usar S3 para armazenar PDFs
3. Implementar rate limiting
4. Adicionar autenticação nas rotas
5. Logs persistidos
