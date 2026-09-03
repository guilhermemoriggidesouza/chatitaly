import { pipeline, env, read_audio } from '@huggingface/transformers'

// Modelo (whisper-tiny) e binários do runtime vêm de CDN e ficam em cache no
// navegador (Cache API). ~40MB no primeiro uso.
env.allowLocalModels = false

const MODEL = 'Xenova/whisper-tiny'
const SAMPLE_RATE = 16000

let asrPromise = null

function getAsr(onProgress) {
  if (!asrPromise) {
    console.info('[whisper] carregando modelo', MODEL)
    asrPromise = pipeline('automatic-speech-recognition', MODEL, {
      quantized: true,
      progress_callback: onProgress,
    })
      .then((asr) => {
        console.info('[whisper] modelo pronto')
        return asr
      })
      .catch((error) => {
        console.error('[whisper] falha ao carregar o modelo', error)
        asrPromise = null // deixa tentar de novo depois
        throw error
      })
  }
  return asrPromise
}

// Pré-carrega o modelo (chame quando o usuário entra na área logada).
export function warmUpWhisper(onProgress) {
  return getAsr(onProgress).then(
    () => true,
    () => false
  )
}

// `input` pode ser um Blob, um object URL, ou já um Float32Array mono @16kHz.
export async function transcribe(input, onProgress) {
  const asr = await getAsr(onProgress)

  let audio = input
  if (input instanceof Blob) {
    const url = URL.createObjectURL(input)
    try {
      audio = await read_audio(url, SAMPLE_RATE)
    } finally {
      URL.revokeObjectURL(url)
    }
  } else if (typeof input === 'string') {
    audio = await read_audio(input, SAMPLE_RATE)
  }

  if (!audio || !audio.length) {
    console.warn('[whisper] áudio vazio')
    return ''
  }

  console.info('[whisper] transcrevendo', audio.length, 'amostras')
  const output = await asr(audio, {
    language: 'italian',
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
  })

  const text = Array.isArray(output) ? output.map((part) => part.text).join(' ') : output?.text
  console.info('[whisper] resultado:', text)
  return (text || '').trim()
}
