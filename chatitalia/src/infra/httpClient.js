const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080'

export async function generatePresignedUrl(filename) {
  const res = await fetch(`${API_BASE}/upload/presigned`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  })

  if (!res.ok) {
    throw new Error('Falha ao gerar presigned URL')
  }

  return res.json()
}

export function uploadToPresignedUrl(presignedUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({ loaded: event.loaded, total: event.total, percent: (event.loaded / event.total) * 100 })
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const json = xhr.responseText ? JSON.parse(xhr.responseText) : { message: 'Upload concluído' }
          resolve(json)
        } catch (e) {
          resolve({ message: 'Upload concluído (sem corpo JSON)' })
        }
      } else {
        reject(new Error(`Upload falhou com status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Erro no upload')))

    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.send(file)
  })
}

export async function sendChat(payload) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    throw new Error('Erro na requisição de chat')
  }

  return res.json()
}

export default { API_BASE, generatePresignedUrl, uploadToPresignedUrl, sendChat }
