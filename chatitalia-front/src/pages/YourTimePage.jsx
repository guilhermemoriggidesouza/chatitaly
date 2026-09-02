import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDonStore } from '../stores/donStore'
import { useMessageStore } from '../stores/messageStore'
import { useRecordingStore } from '../stores/recordingStore'
import { useUserStore } from '../stores/userStore'
import { voiceService } from '../services/voiceService'
import LoadingSpinner from '../components/LoadingSpinner'
import httpClient from '../infra/httpClient'
import { useContextChatStore } from '../stores/contextChatStore'
import { useAchievementStore } from '../stores/achievementStore'

const bars = [26, 60, 18, 82, 36, 94, 44, 66, 24, 88, 52, 70, 28, 78, 40, 58]

const MIN_WORDS = 5

const countWords = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length

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
  const [isEditing, setIsEditing] = useState(false)
  const [status, setStatus] = useState('Pronto para gravar')
  const [isRequesting, setIsRequesting] = useState(false)
  const [toListenText, setToListenText] = useState('')
  const [pulseHeights, setPulseHeights] = useState(bars)
  const [lessonProgress, setLessonProgress] = useState(null)
  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const contextChatStore = useContextChatStore()
  const currentLessonId = contextChatStore.context.lessonId
  const navigate = useNavigate()

  const loadLessonProgress = async (lessonId) => {
    if (!lessonId) {
      setLessonProgress(null)
      return
    }
    try {
      const response = await httpClient.getUserLessons()
      const lesson = (response.lessons || []).find((item) => item.lessonId === lessonId)
      setLessonProgress(lesson || null)
    } catch {
      // silencioso: a barra some se não conseguir carregar
    }
  }

  useEffect(() => {
    const recognition = voiceService.createSpeechRecognition({
      onStart: () => {
        setIsListening(true)
        setIsSpeaking(false)
        setIsEditing(false)
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
          setIsEditing(true)
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
    loadLessonProgress(currentLessonId)
  }, [currentLessonId])

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

    const words = countWords(newMessage)
    if (words < MIN_WORDS) {
      setStatus(`Formule uma frase maior: mínimo de ${MIN_WORDS} palavras (você tem ${words}).`)
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

      if (
        response.plannerLogic === 'lesson_completed'
      ) {
        // Lição atual terminada: leva para a tela de lições exibindo essa lição.
        const completedLessonId =
          contextChatStore.context.lessonId || response.current?.lessonId

        navigate(
          completedLessonId
            ? `/lesson-time?lessonId=${encodeURIComponent(completedLessonId)}`
            : '/lesson-time'
        )
        
        return
      }

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

      // Atualiza a barra de progresso (o backend pode ter marcado um tema como feito).
      loadLessonProgress(response.current?.lessonId || currentLessonId)

      // Tema concluído: modal de parabéns por cima do Don Italiano.
      if (
        response.plannerLogic === 'theme_completed'
      ) {
        useAchievementStore.getState().showThemeCompleted(response.current?.theme)
      }

      const themeChanged =
        Boolean(response.current.themeId) && response.current.themeId !== previousThemeId
      const messageState = useMessageStore.getState()
      if (themeChanged || messageState.hasReachedInteractionsLimit()) {
        messageState.clearMessages()
      }
      pushSystemMessage(messageStr)


      setSavedTranscript('')
      setIsEditing(false)
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

  const wordCount = countWords(savedTranscript)
  const meetsMinWords = wordCount >= MIN_WORDS

  return (
    <main className="page-shell">
      <div className="center-stack">
        {(contextChatStore.context.lessonTitle ||
          contextChatStore.context.theme ||
          lessonProgress?.themesTotal > 0) && (
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
            {lessonProgress?.themesTotal > 0 && (
              <div className="learning-context-progress">
                <span>Progresso</span>
                <div
                  className="lesson-progress-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={lessonProgress.themesTotal}
                  aria-valuenow={lessonProgress.themesDoneCount}
                >
                  <div
                    className="lesson-progress-fill"
                    style={{ width: `${Math.round((lessonProgress.progress || 0) * 100)}%` }}
                  />
                </div>
                <strong>
                  {lessonProgress.themesDoneCount}/{lessonProgress.themesTotal} temas
                </strong>
              </div>
            )}
          </aside>
        )}

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

          {isEditing && <button
            type="button"
            className="record-button"
            onClick={sendResponse}
            disabled={isRequesting || isListening || !meetsMinWords}
          >
            {isRequesting ? <LoadingSpinner size={18} /> : 'Enviar resposta'}
          </button>}
        </div>

        {donStore.toListen ? (
          <p className="don-prompt">Don Italiano: {donStore.toListen}</p>
        ) : null}

        <div className="transcript-block">
          <p className="status-text">{status}</p>
          {isEditing && !isListening ? (
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
              <p className={`transcript-hint ${meetsMinWords ? '' : 'is-short'}`}>
                {meetsMinWords
                  ? `${wordCount} palavras — pode enviar.`
                  : `Frase de no mínimo ${MIN_WORDS} palavras (você tem ${wordCount}). Capriche, sem medo dos erros.`}
              </p>
            </>
          ) : (
            <p className="transcript-text">{transcript || 'Sua fala aparecerá aqui...'}</p>
          )}
        </div>
        <div className="pep-talk">
          <h2>Não tenha medo de errar, tenha medo de nunca tentar!</h2>
          <p>
            Tente formular a frase o mais complexa possível, não tenha medo dos erros, o Don está aqui
            para ajudá-lo, os erros são parte do aprendizado.
          </p>
        </div>
      </div>
    </main>
  )
}

export default YourTimePage
