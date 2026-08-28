const API_BASE = 'http://localhost:8080'

// Token de sessão do Clerk para as rotas protegidas do backend.
// `window.Clerk` é populado pelo ClerkProvider (@clerk/react).
async function authHeaders(extra = {}) {
  let token
  try {
    token = await window.Clerk?.session?.getToken?.()
  } catch {
    token = undefined
  }

  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

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

export async function uploadToPresignedUrl(presignedUrl, file, onProgress) {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file
    })

    if (!response.ok) {
      throw new Error(`Upload falhou com status ${response.status}`)
    }

    try {
      return await response.json()
    } catch (e) {
      return { message: 'Upload concluído' }
    }
  } catch (error) {
    throw new Error(`Erro ao fazer upload: ${error.message}`)
  }
}

export async function processPdf(fileUri, level = 'a1', theme = 'general', userId = 'system') {
  const res = await fetch(`${API_BASE}/pdf/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileUri, level, theme, userId, maxPages: 20 })
  })

  if (!res.ok) {
    throw new Error(`Falha ao processar PDF: ${res.statusText}`)
  }

  return res.json()
}

export async function getUserLessons() {
  const res = await fetch(`${API_BASE}/user/lessons`, { headers: await authHeaders() })

  if (!res.ok) {
    throw new Error(`Falha ao buscar lições: ${res.statusText}`)
  }

  return res.json()
}

export async function getLesson(lessonId) {
  const res = await fetch(`${API_BASE}/pdf/lessons/${encodeURIComponent(lessonId)}`, {
    headers: await authHeaders(),
  })

  if (!res.ok) {
    throw new Error(`Falha ao carregar a lição: ${res.statusText}`)
  }

  return res.json()
}

export async function resetLesson(userId, lessonId) {
  const res = await fetch(
    `${API_BASE}/user/${encodeURIComponent(userId)}/lessons/${encodeURIComponent(lessonId)}/reset`,
    { method: 'POST', headers: await authHeaders() }
  )

  if (!res.ok) {
    throw new Error(`Falha ao refazer lição: ${res.statusText}`)
  }

  return res.json()
}

export async function sendChat(payload) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    throw new Error('Erro na requisição de chat')
  }

  return res.json()
}

export async function getUser(userId) {
  const res = await fetch(`${API_BASE}/user/${encodeURIComponent(userId)}`, {
    headers: await authHeaders(),
  })

  if (!res.ok) {
    throw new Error('Erro na requisição de user')
  }

  return res.json()
}

export default { API_BASE, generatePresignedUrl, uploadToPresignedUrl, processPdf, getUserLessons, getLesson, resetLesson, sendChat }
