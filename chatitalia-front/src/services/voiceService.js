export const voiceService = {
  createSpeechRecognition(callbacks = {}) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      return null
    }

    const recognition = new SpeechRecognition()
    // `continuous = false`: uma frase por gravação. No mobile (Android/iOS) o
    // modo contínuo reinicia a sessão sozinho e acumula resultado em cima de
    // resultado, dando a impressão de loop.
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'it-IT'
    // Flag interna para não iniciar uma sessão em cima de outra.
    recognition._active = false

    recognition.onstart = (event) => {
      recognition._active = true
      callbacks.onStart?.(event)
    }

    if (callbacks.onResult) {
      recognition.onresult = (event) => {
        const transcriptText = voiceService.extractTranscript(event)
        callbacks.onResult({ transcriptText, event })
      }
    }

    recognition.onerror = (event) => {
      recognition._active = false
      callbacks.onError?.(event)
    }

    recognition.onend = (event) => {
      recognition._active = false
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
    utterance.rate = 0.9
    utterance.pitch = 0.4 // pitch baixo = voz masculina

    // Uma voz masculina italiana fixa, se o navegador/SO tiver alguma.
    // (a API exige um objeto de getVoices(), não aceita string)
    const maleVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => /^it/i.test(voice.lang) && /diego|luca|cosimo|male|masch/i.test(voice.name))
    if (maleVoice) {
      utterance.voice = maleVoice
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
