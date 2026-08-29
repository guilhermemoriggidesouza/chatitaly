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

    if (callbacks.onStart) {
      recognition.onstart = callbacks.onStart
    }

    if (callbacks.onResult) {
      recognition.onresult = (event) => {
        const transcriptText = voiceService.extractTranscript(event)
        callbacks.onResult({ transcriptText, event })
      }
    }

    if (callbacks.onError) {
      recognition.onerror = callbacks.onError
    }

    if (callbacks.onEnd) {
      recognition.onend = callbacks.onEnd
    }

    return recognition
  },

  startListening(recognition) {
    if (!recognition) {
      return false
    }

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

    recognition.stop()
  },

  extractTranscript(event) {
    let transcriptText = ''

    for (let i = 0; i < event.results.length; i += 1) {
      transcriptText += event.results[i][0].transcript
    }

    return transcriptText
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
