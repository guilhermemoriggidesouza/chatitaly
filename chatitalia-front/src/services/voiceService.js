// getVoices() costuma vir vazio na 1ª chamada (carrega assíncrono).
// Mantemos um cache e atualizamos no evento `voiceschanged`.
let cachedVoices = []

function refreshVoices() {
  if (!('speechSynthesis' in window)) return
  const list = window.speechSynthesis.getVoices()
  if (list && list.length) cachedVoices = list
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
}

// Melhor voz italiana disponível: 1º uma masculina de verdade, senão qualquer
// voz `it-*`, senão qualquer voz cujo idioma comece com "it".
function pickItalianVoice() {
  const voices = cachedVoices.length ? cachedVoices : (window.speechSynthesis?.getVoices() || [])
  const isIt = (v) => /^it([-_]|$)/i.test(v.lang || '')
  return (
    voices.find((v) => isIt(v) && /diego|luca|cosimo|paolo|male|maschile|man\b/i.test(v.name || '')) ||
    voices.find((v) => isIt(v)) ||
    voices.find((v) => /^it/i.test(v.lang || '')) ||
    null
  )
}

export const voiceService = {
  createSpeechRecognition(callbacks = {}) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      return null
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'it-IT'

    // _manualStop -> o usuário apertou "Parar" (ou erro fatal de microfone)
    recognition._manualStop = false

    recognition.onstart = (event) => {
      callbacks.onStart?.(event)
    }

    recognition.onresult = (event) => {
      // Sem acumular nada: reporta o transcript da sessão atual como está.
      callbacks.onResult?.({ transcriptText: voiceService.extractTranscript(event), event })
    }

    recognition.onerror = (event) => {
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
        recognition._manualStop = true
      }
      callbacks.onError?.(event)
    }

    recognition.onend = (event) => {
      // O mobile encerra a sessão sozinho após alguns segundos. Se o usuário
      // não pediu para parar, reinicia e segue gravando (sem limite).
      if (!recognition._manualStop) {
        try {
          recognition.start()
        } catch {
          callbacks.onEnd?.(event)
        }
        return
      }
      callbacks.onEnd?.(event)
    }

    return recognition
  },

  startListening(recognition) {
    if (!recognition) {
      return false
    }

    // Corta qualquer fala do Don em andamento para o microfone não captá-la.
    voiceService.stopSpeaking()

    recognition._manualStop = false

    try {
      recognition.start()
      return true
    } catch {
      // start() lança se já houver uma sessão ativa — nesse caso já está gravando.
      return false
    }
  },

  stopListening(recognition) {
    if (!recognition) {
      return
    }

    recognition._manualStop = true

    try {
      recognition.stop()
    } catch {
      // stop() lança se não houver sessão ativa — ignorar.
    }
  },

  extractTranscript(event) {
    let transcriptText = ''

    for (let i = 0; i < event.results.length; i += 1) {
      transcriptText += event.results[i][0].transcript
    }

    return transcriptText.trim()
  },

  speakItalian(text, callbacks = {}) {
    if (!('speechSynthesis' in window) || !text) {
      return null
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    utterance.rate = 1
    // pitch bem baixo (0.4) distorce a voz em vários motores (Samsung/Android).
    // 0.9 já soa um pouco mais grave sem "esganiçar".
    utterance.pitch = 0.9

    const voice = pickItalianVoice()
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang || 'it-IT'
    }

    if (callbacks.onStart) {
      utterance.onstart = callbacks.onStart
    }

    if (callbacks.onEnd) {
      utterance.onend = callbacks.onEnd
    }

    if (callbacks.onError) {
      utterance.onerror = callbacks.onError
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)

    return utterance
  },

  stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  },
  
}
