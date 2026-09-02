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

    // Estado interno:
    // _active       -> há uma sessão de reconhecimento no ar
    // _manualStop   -> o usuário (ou um erro fatal) pediu para parar
    // _finalText    -> texto já finalizado em sessões ANTERIORES (o mobile
    //                  encerra a sessão sozinho após alguns segundos; a gente
    //                  reinicia e continua acumulando aqui)
    // _sessionFinal -> texto finalizado na sessão atual
    recognition._active = false
    recognition._manualStop = false
    recognition._finalText = ''
    recognition._sessionFinal = ''

    const FATAL = ['not-allowed', 'service-not-allowed', 'audio-capture']

    recognition.onstart = (event) => {
      recognition._active = true
      callbacks.onStart?.(event)
    }

    recognition.onresult = (event) => {
      let sessionFinal = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript
        if (event.results[i].isFinal) sessionFinal += chunk
        else interim += chunk
      }
      recognition._sessionFinal = sessionFinal

      const transcriptText = [recognition._finalText, sessionFinal, interim]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      callbacks.onResult?.({ transcriptText, event })
    }

    recognition.onerror = (event) => {
      recognition._active = false
      if (FATAL.includes(event.error)) recognition._manualStop = true
      callbacks.onError?.(event)
    }

    recognition.onend = (event) => {
      recognition._active = false

      // Guarda o que foi finalizado nesta sessão.
      if (recognition._sessionFinal) {
        recognition._finalText = [recognition._finalText, recognition._sessionFinal]
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        recognition._sessionFinal = ''
      }

      // Mobile encerra a sessão sozinho após alguns segundos de fala/pausa.
      // Enquanto o usuário não apertar "Parar", reinicia e segue gravando —
      // sem limite de silêncio.
      if (!recognition._manualStop) {
        setTimeout(() => {
          if (recognition._manualStop || recognition._active) return
          try {
            recognition.start()
          } catch {
            callbacks.onEnd?.(event)
          }
        }, 250)
        return
      }

      callbacks.onEnd?.(event)
    }

    return recognition
  },

  startListening(recognition) {
    // Já gravando: ignora (evita empilhar sessões e o áudio duplicado no mobile).
    if (!recognition || recognition._active) {
      return false
    }

    // Corta qualquer fala do Don em andamento para o microfone não captá-la.
    voiceService.stopSpeaking()

    recognition._manualStop = false
    recognition._finalText = ''
    recognition._sessionFinal = ''

    try {
      recognition.start()
      return true
    } catch {
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
