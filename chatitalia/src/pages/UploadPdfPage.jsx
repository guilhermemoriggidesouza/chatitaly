import { useState } from 'react'
import { generatePresignedUrl, uploadToPresignedUrl } from '../infra/httpClient'

export default function UploadPdfPage() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    setUploading(true)
    setProgress(0)
    setResult(null)
    setError(null)

    try {
      const { presignedUrl } = await generatePresignedUrl(file.name)

      const uploadRes = await uploadToPresignedUrl(presignedUrl, file, (p) => {
        setProgress(p.percent)
      })

      setResult(uploadRes)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload de PDF (livro em italiano)</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {uploading && (
        <div style={{ marginTop: 12 }}>
          <p>Upload em progresso...</p>
          <progress value={progress} max="100" style={{ width: '100%' }} />
          <p>{progress.toFixed(2)}%</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#e8f5e9' }}>
          <h3>✅ Upload realizado</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#ffebee' }}>
          <strong>Erro:</strong> {error}
        </div>
      )}
    </div>
  )
}
