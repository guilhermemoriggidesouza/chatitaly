import { useEffect, useRef, useState } from 'react'
import { useDonStore } from '../stores/donStore'
import { useMessageStore } from '../stores/messageStore'
import { useRecordingStore } from '../stores/recordingStore'
import { useUserStore } from '../stores/userStore'
import { voiceService } from '../services/voiceService'
import LoadingSpinner from '../components/LoadingSpinner'
import httpClient from '../infra/httpClient'
import { useContextChatStore } from '../stores/contextChatStore'

const bars = [26, 60, 18, 82, 36, 94, 44, 66, 24, 88, 52, 70, 28, 78, 40, 58]

function YourTimePage() {
  const donStore = useDonStore()
  const pushUserMessage = useMessageStore((state) => state.pushUserMessage)
  const pushSystemMessage = useMessageStore((state) => state.pushSystemMessage)
  const recordingRequest = useRecordingStore((state) => state.recordingRequest)
  const resetRecordingRequest = useRecordingStore((state) => state.resetRecordingRequest)
  const user = useUserStore((state) => state.user)
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
  const contextChatStore = useContextChatStore()

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
          setStatus('Revise ou edite sua fala e clique em "Enviar resposta".')
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
      const response = await httpClient.sendChat({
        userId: user.userId,
        lesson: contextChatStore.context.lessonTitle,
        lessonId: contextChatStore.context.lessonId,
        themeId: contextChatStore.context.themeId,
        theme: contextChatStore.context.theme,
        newMessage,
        history,
      })

      const previousThemeId = contextChatStore.context.themeId

      const questionsText = Array.isArray(response.finalResponse.questions)
        ? response.finalResponse.questions.join('\n')
        : ''
      const messageStr = `${response.finalResponse.response}. \n${questionsText}`
      contextChatStore.setContext({
        lessonId: response.current.lessonId,
        lessonTitle: response.current.lesson,
        themeId: response.current.themeId,
        theme: response.current.theme,
      })
      donStore.triggerDon({
        toListen: messageStr,
        lessonId: 'mock-lesson',
      })
      pushSystemMessage(messageStr)

      // Se o tema mudou, começa uma rodada nova. Se o aluno ainda está no mesmo
      // tema e já fez 4 interações, ele "empacou": limpamos o histórico e
      // recomeçamos com a última fala do Don sobre este tema.
      const themeChanged =
        Boolean(response.current.themeId) && response.current.themeId !== previousThemeId
      const messageState = useMessageStore.getState()
      if (themeChanged || messageState.hasReachedInteractionsLimit()) {
        messageState.resetKeepingLastAgentMessage()
      }

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
      {(contextChatStore.context.lessonTitle || contextChatStore.context.theme) && (
        <aside className="learning-context" aria-label="Contexto da conversa">
          {contextChatStore.context.lessonTitle && (
            <div>
              <span>Lição</span>
              <strong>{contextChatStore.context.lessonTitle}</strong>
            </div>
          )}
          {contextChatStore.context.theme && (
            <div>
              <span>Tema</span>
              <strong>{contextChatStore.context.theme}</strong>
            </div>
          )}
        </aside>
      )}

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
          {savedTranscript && !isListening ? (
            <>
              <textarea
                className="transcript-edit"
                value={savedTranscript}
                onChange={(event) => setSavedTranscript(event.target.value)}
                disabled={isRequesting}
                rows={3}
                aria-label="Edite sua fala antes de enviar"
                placeholder="Edite sua fala antes de enviar..."
              />
              <p className="transcript-hint">
                Ajuste o texto se precisar — por exemplo, adicione um “?” no fim da frase.
              </p>
            </>
          ) : (
            <p className="transcript-text">{transcript || 'Sua fala aparecerá aqui...'}</p>
          )}
        </div>
      </div>
    </main>
  )
}

export default YourTimePage
