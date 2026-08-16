import { useState } from 'react'
import { generatePresignedUrl, uploadToPresignedUrl, processPdf } from '../infra/httpClient'

export default function UploadPdfPage() {
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [processResult, setProcessResult] = useState(null)
  const [error, setError] = useState(null)
  const [uploadedFileName, setUploadedFileName] = useState(null)

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    setUploading(true)
    setProgress(0)
    setResult(null)
    setError(null)
    setProcessResult(null)

    try {
      console.log('Gerando presigned URL para:', file.name)
      const presignedResponse = await generatePresignedUrl(file.name)
      console.log('Presigned URL response:', presignedResponse)
      const { presignedUrl } = presignedResponse

      console.log('Iniciando upload para:', presignedUrl)
      const uploadRes = await uploadToPresignedUrl(presignedUrl, file, (p) => {
        console.log('Progresso:', p)
        setProgress(p.percent)
      })

      console.log('Upload concluído:', uploadRes)
      setResult(uploadRes)
      setUploadedFileName(uploadRes.filepath || file.name)
    } catch (err) {
      console.error('Erro:', err)
      setError(err.message || String(err))
    } finally {
      setUploading(false)
    }
  }

  const handleProcessPdf = async () => {
    if (!uploadedFileName) return

    setProcessing(true)
    setProcessResult(null)
    setError(null)

    try {
      console.log('Processando PDF:', uploadedFileName)
      const response = await processPdf(uploadedFileName)
      console.log('PDF processado:', response)
      setProcessResult(response)
    } catch (err) {
      console.error('Erro ao processar PDF:', err)
      setError(err.message || String(err))
    } finally {
      setProcessing(false)
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
          
          <button
            onClick={handleProcessPdf}
            disabled={processing}
            style={{
              marginTop: 12,
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: processing ? 'not-allowed' : 'pointer',
              opacity: processing ? 0.6 : 1
            }}
          >
            {processing ? 'Processando PDF...' : 'Processar PDF'}
          </button>
        </div>
      )}

      {processResult && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#e3f2fd' }}>
          <h3>📚 Resultado do Processamento</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(processResult, null, 2)}</pre>
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
