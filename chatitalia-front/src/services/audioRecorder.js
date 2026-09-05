// Grava áudio do microfone com MediaRecorder (sem timeout de silêncio) e
// converte o resultado para WAV 16kHz mono, formato aceito por qualquer STT.

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

  // Para a gravação e resolve com o Blob bruto do áudio (webm/mp4).
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

  // Para a gravação e resolve com um Blob WAV 16kHz mono, sem os silêncios
  // das pontas (o Whisper alucina "Grazie." etc. em cima de silêncio).
  async stopAsWav() {
    const raw = await this.stop()
    if (!raw || !raw.size) return null
    const pcm = trimSilence(await blobToPcm16k(raw), 16000)
    if (!pcm.length) return null
    return pcmToWav(pcm, 16000)
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

// Decodifica um Blob de áudio -> Float32Array mono a 16kHz.
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

// Corta silêncio no início e no fim (RMS por janela de 20ms). Mantém uma
// pequena folga de 100ms de cada lado para não cortar o ataque das palavras.
export function trimSilence(pcm, sampleRate, threshold = 0.006) {
  if (!pcm || pcm.length === 0) return pcm

  const win = Math.max(1, Math.floor(sampleRate * 0.02))
  const pad = Math.floor(sampleRate * 0.1)

  const loud = (start) => {
    let sum = 0
    const end = Math.min(pcm.length, start + win)
    for (let i = start; i < end; i += 1) sum += pcm[i] * pcm[i]
    return Math.sqrt(sum / (end - start)) > threshold
  }

  let first = 0
  while (first < pcm.length && !loud(first)) first += win

  let last = pcm.length
  while (last > first && !loud(Math.max(0, last - win))) last -= win

  if (first >= last) return new Float32Array(0)
  return pcm.subarray(Math.max(0, first - pad), Math.min(pcm.length, last + pad))
}

// Float32Array PCM [-1,1] -> Blob WAV (PCM 16-bit).
export function pcmToWav(float32, sampleRate) {
  const bytesPerSample = 2
  const buffer = new ArrayBuffer(44 + float32.length * bytesPerSample)
  const view = new DataView(buffer)

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + float32.length * bytesPerSample, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true) // subchunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true) // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, float32.length * bytesPerSample, true)

  let offset = 44
  for (let i = 0; i < float32.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += bytesPerSample
  }

  return new Blob([buffer], { type: 'audio/wav' })
}
