// Gravação de áudio do microfone com MediaRecorder — SEM timeout de silêncio.
// Grava até chamarem stop(). Depois o áudio é transcrito no navegador (Whisper).

let mediaRecorder = null
let chunks = []
let stream = null

export const audioRecorder = {
  isRecording() {
    return Boolean(mediaRecorder && mediaRecorder.state === 'recording')
  },

  async start() {
    if (this.isRecording()) return

    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    chunks = []

    const mime =
      (window.MediaRecorder?.isTypeSupported?.('audio/webm') && 'audio/webm') ||
      (window.MediaRecorder?.isTypeSupported?.('audio/mp4') && 'audio/mp4') ||
      ''

    mediaRecorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream)

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size) chunks.push(event.data)
    }
    mediaRecorder.start()
  },

  // Para a gravação e resolve com o Blob do áudio.
  stop() {
    return new Promise((resolve) => {
      const mr = mediaRecorder
      if (!mr) {
        resolve(null)
        return
      }
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
        stream?.getTracks().forEach((track) => track.stop())
        mediaRecorder = null
        stream = null
        chunks = []
        resolve(blob)
      }
      try {
        mr.stop()
      } catch {
        resolve(null)
      }
    })
  },

  cancel() {
    try {
      mediaRecorder?.stop()
    } catch {
      // ignore
    }
    stream?.getTracks().forEach((track) => track.stop())
    mediaRecorder = null
    stream = null
    chunks = []
  },
}

// Decodifica um Blob de áudio e devolve Float32Array mono a 16kHz,
// que é o formato de entrada esperado pelo Whisper.
export async function blobToPcm16k(blob) {
  if (!blob) return new Float32Array(0)

  const arrayBuffer = await blob.arrayBuffer()
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  const decodeCtx = new AudioCtx()
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer)
  decodeCtx.close?.()

  const targetRate = 16000
  const frames = Math.max(1, Math.ceil(decoded.duration * targetRate))
  const offline = new OfflineAudioContext(1, frames, targetRate)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()

  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}
