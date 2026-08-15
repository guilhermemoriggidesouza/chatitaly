import { useEffect, useRef, useState } from 'react'
import { useDonStore } from '../stores/donStore'
import { useMessageStore } from '../stores/messageStore'
import { useRecordingStore } from '../stores/recordingStore'
import { voiceService } from '../services/voiceService'
import LoadingSpinner from '../components/LoadingSpinner'

const bars = [26, 60, 18, 82, 36, 94, 44, 66, 24, 88, 52, 70, 28, 78, 40, 58]

function YourTimePage() {
  const donStore = useDonStore()
  const pushUserMessage = useMessageStore((state) => state.pushUserMessage)
  const recordingRequest = useRecordingStore((state) => state.recordingRequest)
  const resetRecordingRequest = useRecordingStore((state) => state.resetRecordingRequest)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [savedTranscript, setSavedTranscript] = useState('')
  const [status, setStatus] = useState('Pronto para gravar')
  const [isRequesting, setIsRequesting] = useState(false)
  const [toListenText, setToListenText] = useState('')
  const [pulseHeights, setPulseHeights] = useState(bars)
  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')

  useEffect(() => {
    const recognition = voiceService.createSpeechRecognition({
      onStart: () => {
        setIsListening(true)
        setIsSpeaking(false)
        setStatus('Gravando áudio...')
      },
      onResult: ({ transcriptText }) => {
        transcriptRef.current = transcriptText
        setTranscript(transcriptText)
        if (transcriptText.trim().length > 0) {
          setIsSpeaking(true)
          setStatus('Ouvindo...')
        }
      },
      onError: (event) => {
        setStatus(`Erro de gravação: ${event.error}`)
        setIsListening(false)
        setIsSpeaking(false)
      },
      onEnd: async () => {
        setIsListening(false)
        setIsSpeaking(false)
        setStatus('Gravação encerrada')
        setPulseHeights(bars)
        // Save the final transcript for later sending
        const finalText = transcriptRef.current.trim()
        if (finalText) {
          setSavedTranscript(finalText)
          setStatus('Gravação salva. Clique em "Enviar resposta" para enviar.')
        }
      },
    })

    if (!recognition) {
      setStatus('Seu navegador não suporta reconhecimento de voz.')
      return undefined
    }

    recognitionRef.current = recognition

    return () => {
      voiceService.stopListening(recognition)
    }
  }, [])

  useEffect(() => {
    if (!isListening || !isSpeaking) {
      setPulseHeights(bars)
      return undefined
    }

    const interval = setInterval(() => {
      setPulseHeights((previous) =>
        previous.map((height, index) => {
          const base = bars[index] ?? 26
          const variance = Math.random() * 54 + 8
          return Math.min(120, base + variance)
        })
      )
    }, 180)

    return () => clearInterval(interval)
  }, [isListening, isSpeaking])

  useEffect(() => {
    if (!recordingRequest.toListen && !recordingRequest.lessonId) {
      return
    }

    setToListenText(recordingRequest.toListen)

    const recognition = recognitionRef.current

    if (!recognition) {
      return
    }

    const hasStarted = voiceService.startListening(recognition)

    if (!hasStarted) {
      setStatus('Microfone já está em uso.')
    }

    resetRecordingRequest()
  }, [recordingRequest, resetRecordingRequest])

  const toggleListening = () => {
    const recognition = recognitionRef.current

    if (!recognition) {
      setStatus('Reconhecimento de voz indisponível no navegador.')
      return
    }

    if (isListening) {
      voiceService.stopListening(recognition)
      return
    }

    const hasStarted = voiceService.startListening(recognition)

    if (!hasStarted) {
      setStatus('Microfone já está em uso.')
    }
  }

  const sendResponse = async () => {
    const newMessage = (savedTranscript || '').trim()
    if (!newMessage) {
      setStatus('Nada para enviar.')
      return
    }

    const { messages } = useMessageStore.getState()
    const history = [
      ...messages,
      {
        role: 'user',
        content: newMessage,
      },
    ]

    pushUserMessage(newMessage)

    try {
      setIsRequesting(true)
      const response = await (await import('../infra/httpClient')).sendChat({
        userId: '1',
        newMessage,
        history,
      })

      const questionsText = Array.isArray(response.finalResponse.questions)
        ? response.finalResponse.questions.join('\n')
        : ''
      const messageStr = `${response.finalResponse.response}. \n${questionsText}`
      donStore.triggerDon({
        toListen: messageStr,
        lessonId: 'mock-lesson',
      })

      // clear saved transcript after sending
      setSavedTranscript('')
      setTranscript('')
      transcriptRef.current = ''
      setStatus('Resposta enviada')
    } catch (err) {
      console.error(err)
      alert('Ocorreu um erro, tente novamente mais tarde')
    } finally {
      setIsRequesting(false)
    }
  }

  return (
    <main className="page-shell">
      <button
        type="button"
        className="settings-button"
        aria-label="Configurações"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.18l-2.39.96a7.12 7.12 0 0 0-1.63-.94L14.5 2.5a.5.5 0 0 0-.5-.5h-3.99a.5.5 0 0 0-.5.5l-.35 2.5c-.58.24-1.12.57-1.63.94l-2.39-.96a.5.5 0 0 0-.6.18L2.71 9.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.18l2.39-.96c.51.37 1.05.7 1.63.94l.35 2.5c.04.28.26.5.5.5h3.99c.24 0 .46-.22.5-.5l.35-2.5c.58-.24 1.12-.57 1.63-.94l2.39.96a.5.5 0 0 0 .6-.18l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58Zm-7.14 2.56a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
        </svg>
      </button>

      <div className="center-stack">
        <div
          className={`equalizer ${isListening ? 'is-recording' : ''} ${isListening ? 'is-speaking' : ''}`}
          aria-label="Equalizador de áudio"
        >
          {pulseHeights.map((height, index) => (
            <span
              key={index}
              className="bar"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {!isRequesting &&
            <button
              type="button"
              className={`record-button ${isRequesting ? 'is-loading' : ''}`}
              onClick={toggleListening}
              disabled={isRequesting}
            >
              {(isListening ? 'Parar gravação' : 'Iniciar gravação')}
            </button>
          }

          {savedTranscript && <button
            type="button"
            className="record-button"
            onClick={sendResponse}
            disabled={isRequesting || isListening}
          >
            {isRequesting ? <LoadingSpinner size={18} /> : 'Enviar resposta'}
          </button>}
        </div>

        {donStore.toListen ? (
          <p className="don-prompt">Don Italiano: {donStore.toListen}</p>
        ) : null}

        <div className="transcript-block">
          <p className="status-text">{status}</p>
          <p className="transcript-text">{transcript || 'Sua fala aparecerá aqui...'}</p>
        </div>
      </div>
    </main>
  )
}

export default YourTimePage
