# Guia de Integração - Presigned URL Upload

## 📋 Passo a Passo para o Frontend

### Passo 1: Gerar Presigned URL

Mande uma requisição POST para obter a URL de upload:

```javascript
async function generatePresignedUrl(filename) {
  const response = await fetch('http://localhost:8080/upload/presigned', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: filename
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate presigned URL');
  }

  return await response.json();
  // Retorna: { presignedUrl, expiresIn, token }
}
```

### Passo 2: Fazer Upload do Arquivo

Use a presigned URL para fazer upload com streaming (ideal para arquivos grandes):

```javascript
async function uploadFile(presignedUrl, file) {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream'
    },
    body: file // File object ou Blob
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return await response.json();
  // Retorna: { message, filepath, size, filename }
}
```

### Passo 3: Integração Completa (Com Progresso)

```javascript
async function handleFileUpload(file, onProgress) {
  try {
    // Step 1: Gerar presigned URL
    console.log('Gerando presigned URL...');
    const { presignedUrl, expiresIn } = await generatePresignedUrl(file.name);
    console.log(`✅ URL válida por ${expiresIn / 1000 / 60} minutos`);

    // Step 2: Upload com progresso
    console.log('Iniciando upload...');
    const uploadResponse = await uploadFileWithProgress(
      presignedUrl, 
      file, 
      onProgress
    );
    
    console.log('✅ Upload completo!');
    console.log('Arquivo salvo em:', uploadResponse.filepath);
    console.log('Tamanho:', formatBytes(uploadResponse.size));

    return uploadResponse;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  }
}

// Com rastreamento de progresso
async function uploadFileWithProgress(presignedUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Progresso do upload
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        if (onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent: percentComplete
          });
        }
        console.log(`${percentComplete.toFixed(2)}% enviado`);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload error'));
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.send(file);
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
```

## 🎯 Exemplo Completo em React

```jsx
import { useState } from 'react';

export function FileUploadComponent() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      // Gerar presigned URL
      const presignedRes = await fetch('http://localhost:8080/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name })
      });

      const { presignedUrl } = await presignedRes.json();

      // Upload com progresso
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress((e.loaded / e.total) * 100);
        }
      };

      xhr.onload = async () => {
        const uploadRes = JSON.parse(xhr.responseText);
        setResult(uploadRes);
        setUploading(false);
      };

      xhr.onerror = () => {
        alert('Erro no upload!');
        setUploading(false);
      };

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.send(file);
    } catch (error) {
      alert('Erro: ' + error.message);
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Upload de Arquivo</h2>
      <input 
        type="file" 
        onChange={handleFileChange} 
        disabled={uploading}
      />
      
      {uploading && (
        <div>
          <p>Upload em progresso...</p>
          <progress value={progress} max="100" style={{ width: '100%' }} />
          <p>{progress.toFixed(2)}%</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e8f5e9' }}>
          <h3>✅ Upload Realizado!</h3>
          <p><strong>Arquivo:</strong> {result.filename}</p>
          <p><strong>Tamanho:</strong> {(result.size / 1024 / 1024).toFixed(2)} MB</p>
          <p><strong>Local:</strong> {result.filepath}</p>
        </div>
      )}
    </div>
  );
}
```

## 🔑 Exemplo Completo em TypeScript

```typescript
interface PresignedUrlResponse {
  presignedUrl: string;
  expiresIn: number;
  token: string;
}

interface UploadResponse {
  message: string;
  filepath: string;
  size: number;
  filename: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

class FileUploadService {
  private apiBaseUrl = 'http://localhost:8080';

  async generatePresignedUrl(filename: string): Promise<PresignedUrlResponse> {
    const response = await fetch(`${this.apiBaseUrl}/upload/presigned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate presigned URL: ${response.statusText}`);
    }

    return response.json();
  }

  async uploadFile(
    presignedUrl: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent: (event.loaded / event.total) * 100
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.send(file);
    });
  }

  async handleUpload(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    const { presignedUrl } = await this.generatePresignedUrl(file.name);
    return this.uploadFile(presignedUrl, file, onProgress);
  }
}

// Uso:
const uploadService = new FileUploadService();

async function uploadVideo(videoFile: File) {
  try {
    const result = await uploadService.handleUpload(videoFile, (progress) => {
      console.log(`${progress.percent.toFixed(2)}% enviado`);
    });
    console.log('✅ Sucesso!', result);
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}
```

## 📊 Fluxo de Dados

```
Frontend                          Backend
   |                                |
   |------- POST /presigned ------->|
   |    { filename: "video.mp4" }   |
   |                                |
   |<----- Presigned URL + Token ----|
   |  { presignedUrl, expiresIn }   |
   |                                |
   |------- PUT /upload/:token ----->|
   |     [FILE STREAM - GIGABYTES]   |
   |        (streaming support)      |
   |                                |
   |<----- Upload Response ---------|
   |  { filepath, size, filename }  |
```

## ⚙️ Configurações Importantes

### Tamanho Máximo de Upload
- Não há limite de tamanho (streaming support)
- Ajuste conforme necessário no Express (default: sem limite com streaming)

### Timeout do Token
- Padrão: **1 hora (3.600.000 ms)**
- Edite em `src/routes/upload.ts` linha 23:
```typescript
const expiresIn = 3600000; // Altere aqui
```

### Diretório de Upload
- Padrão: `./uploads/` na raiz do projeto
- Edite em `src/routes/upload.ts` linha 10:
```typescript
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
```

## 🧪 Teste com cURL

```bash
# 1. Gerar presigned URL
curl -X POST http://localhost:8080/upload/presigned \
  -H "Content-Type: application/json" \
  -d '{"filename": "video.mp4"}' | jq

# 2. Upload (com arquivo de teste)
dd if=/dev/zero bs=1M count=100 of=test.bin
curl -X PUT http://localhost:8080/upload/TOKEN_AQUI \
  -H "Content-Type: application/octet-stream" \
  --data-binary @test.bin

# 3. Verifique no diretório
ls -lh uploads/
```

## 🚀 Deployment

Para produção:
1. Use S3/CloudFront presigned URLs (em vez de local)
2. Altere `UPLOAD_DIR` para S3 bucket
3. Adicione rate limiting
4. Use Redis para tokens (em vez de Map em memória)
5. Implemente cleanup de arquivos órfãos
