# chatitalia-api

Servidor Express mínimo com uma rota POST na porta 8080.

Instalação:

```bash
npm install
```

Executar:

```bash
npm start
```

Teste rápido (exemplo):

```bash
curl -X POST http://localhost:8080/ -H "Content-Type: application/json" -d '{"hello":"world"}'
```

Langgraph demo
--------------

Um demo local que constrói e executa um grafo no modelo `plain -> execute -> response`.

Rodar demo:

```bash
npm run demo
```

Executar servidor em modo desenvolvimento (TypeScript):

```bash
npm run dev
```
