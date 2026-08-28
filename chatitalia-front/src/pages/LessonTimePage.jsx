import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getLesson, getLessonsByBookId, resetLesson, sendChat } from '../infra/httpClient'
import { useDonStore } from '../stores/donStore'
import { useContextChatStore } from '../stores/contextChatStore'
import { useMessageStore } from '../stores/messageStore'
import { useUserStore } from '../stores/userStore'

function LessonTimePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [bookIdInput, setBookIdInput] = useState(
    searchParams.get('bookId') || localStorage.getItem('chatitalia.bookId') || ''
  )
  const [lessons, setLessons] = useState([])
  const [selectedLessonId, setSelectedLessonId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isStartingLesson, setIsStartingLesson] = useState(false)
  const [isResettingLesson, setIsResettingLesson] = useState(false)
  const [loadingContentId, setLoadingContentId] = useState(null)
  const contextChatStore = useContextChatStore()
  const user = useUserStore((state) => state.user)
  const pushUserMessage = useMessageStore((state) => state.pushUserMessage)
  const pushSystemMessage = useMessageStore((state) => state.pushSystemMessage)
  const donStore = useDonStore()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const contentRef = useRef(null)

  // Busca o markdown de uma lição sob demanda (a lista não traz `lessonContent`).
  const loadLessonContent = async (lessonId, sourceList) => {
    if (!lessonId) return

    const list = sourceList || lessons
    const existing = list.find((lesson) => lesson.lessonId === lessonId)
    if (!existing || existing.lessonContent) return

    try {
      setLoadingContentId(lessonId)
      const fullLesson = await getLesson(lessonId)
      setLessons((previous) =>
        previous.map((lesson) =>
          lesson.lessonId === lessonId ? { ...lesson, ...fullLesson } : lesson
        )
      )
    } catch (contentError) {
      setError(contentError.message || 'Não foi possível carregar o conteúdo da lição.')
    } finally {
      setLoadingContentId((current) => (current === lessonId ? null : current))
    }
  }

  const selectLesson = (lessonId) => {
    setSelectedLessonId(lessonId)
    loadLessonContent(lessonId)

    // Volta o conteúdo para o topo e, no layout empilhado (mobile/tablet),
    // rola a página até a lição escolhida.
    const content = contentRef.current
    if (!content) return
    content.scrollTop = 0
    if (window.matchMedia('(max-width: 980px)').matches) {
      content.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }


  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.lessonId === selectedLessonId) || null,
    [lessons, selectedLessonId]
  )

  const askAboutLesson = async () => {
    if (!selectedLesson) return

    const newMessage = `Spiegami la lezione: ${selectedLesson.title}.`
    const { messages } = useMessageStore.getState()

    try {
      setIsStartingLesson(true)

      pushUserMessage(newMessage)
      const response = await sendChat({
        userId: user.userId,
        level: user.level,
        lesson: selectedLesson.title,
        lessonId: selectedLessonId,
        newMessage,
        history: [...messages, { role: 'user', content: newMessage }],
      })
      const finalResponse = response.finalResponse
      const questionsText = Array.isArray(finalResponse.questions)
        ? finalResponse.questions.join('\n')
        : ''
      contextChatStore.setContext({
        lessonId: response.current.lessonId,
        lessonTitle: response.current.lesson,
        themeId: response.current.themeId,
        theme: response.current.theme,
        userId: user.userId,
      })
      pushSystemMessage(`${finalResponse.response}. \n${questionsText}`)
      donStore.triggerDon({
        toListen: `${finalResponse.response}. \n${questionsText}`,
        lessonId: selectedLessonId,
      })
      navigate('/your-time')
    } catch (chatError) {
      setError(chatError.message || 'Não foi possível iniciar a conversa sobre a lição.')
    } finally {
      setIsStartingLesson(false)
    }
  }

  const loadLessons = async (bookId) => {
    const normalizedBookId = bookId.trim()
    if (!normalizedBookId) return
    if (!user?.userId) return

    setLoading(true)
    setError(null)
    try {
      const response = await getLessonsByBookId(normalizedBookId, user?.userId)
      const nextLessons = response.lessons || []
      const nextSelectedId = nextLessons.some((lesson) => lesson.lessonId === selectedLessonId)
        ? selectedLessonId
        : nextLessons[0]?.lessonId || null

      setLessons(nextLessons)
      setSelectedLessonId(nextSelectedId)
      localStorage.setItem('chatitalia.bookId', normalizedBookId)
      setSearchParams({ bookId: normalizedBookId })

      if (nextSelectedId) loadLessonContent(nextSelectedId, nextLessons)
    } catch (loadError) {
      setLessons([])
      setSelectedLessonId(null)
      setError(loadError.message || 'Não foi possível carregar as lições.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const bookId = searchParams.get('bookId') || localStorage.getItem('chatitalia.bookId')
    if (bookId) loadLessons(bookId)
    // Recarrega quando o usuário fica disponível para trazer o progresso (considerações finais).
  }, [user?.userId])

  const redoLesson = async () => {
    if (!selectedLesson || !user?.userId) return

    try {
      setIsResettingLesson(true)
      setError(null)
      await resetLesson(user.userId, selectedLesson.lessonId)
      const bookId =
        bookIdInput.trim() ||
        searchParams.get('bookId') ||
        localStorage.getItem('chatitalia.bookId') ||
        ''
      await loadLessons(bookId)
    } catch (resetError) {
      setError(resetError.message || 'Não foi possível refazer a lição.')
    } finally {
      setIsResettingLesson(false)
    }
  }

  return (
    <main className="lesson-library">
      <aside className="lesson-sidebar" aria-label="Lista de lições">
        <div className="lesson-sidebar-header">
          <span className="lesson-badge">Biblioteca</span>
          <h1>Suas lições</h1>
          <p>Escolha um capítulo para estudar.</p>
        </div>

        <form className="book-form" onSubmit={(event) => {
          event.preventDefault()
          loadLessons(bookIdInput)
        }}>
          <label htmlFor="book-id">Book ID</label>
          <div className="book-input-row">
            <input
              id="book-id"
              value={bookIdInput}
              onChange={(event) => setBookIdInput(event.target.value)}
              placeholder="Cole o bookId"
            />
            <button type="submit" disabled={loading || !bookIdInput.trim()}>
              {loading ? '...' : 'Abrir'}
            </button>
          </div>
        </form>

        <div className="lesson-list" aria-live="polite">
          {lessons.map((lesson, index) => (
            <button
              type="button"
              key={lesson.lessonId}
              className={`lesson-list-item ${lesson.lessonId === selectedLessonId ? 'is-selected' : ''} ${lesson.finalConsiderations ? 'is-done' : ''}`}
              onClick={() => selectLesson(lesson.lessonId)}
            >
              <span className="lesson-number">
                {lesson.finalConsiderations ? '✓' : String(index + 1).padStart(2, '0')}
              </span>
              <span className="lesson-list-copy">
                <strong>{lesson.title}</strong>
                <small>{lesson.finalConsiderations ? 'CONCLUÍDA' : lesson.level?.toUpperCase() || 'LIÇÃO'}</small>
              </span>
            </button>
          ))}
          {!loading && bookIdInput && !lessons.length && !error && (
            <p className="lesson-empty">Nenhuma lição encontrada para este livro.</p>
          )}
        </div>
      </aside>

      <section className="lesson-content" aria-live="polite" ref={contentRef}>
        {error && <p className="lesson-error">{error}</p>}
        {!selectedLesson && !error && (
          <div className="lesson-content-empty">
            <span className="lesson-content-kicker">Hora da lição</span>
            <h2>Abra um livro para começar.</h2>
            <p>Informe um bookId na lateral e selecione um capítulo.</p>
          </div>
        )}
        {selectedLesson && (
          <article className="markdown-lesson">
            <header className="markdown-lesson-header">
              <span className="lesson-content-kicker">{selectedLesson.level?.toUpperCase() || 'LIÇÃO'}</span>
              <h2>{selectedLesson.title}</h2>
              <span className={`lesson-status status-${selectedLesson.status?.toLowerCase()}`}>
                {selectedLesson.status || 'PENDING'}
              </span>
              {selectedLesson.finalConsiderations ? (
                <button
                  type="button"
                  className="lesson-chat-button lesson-redo-button"
                  onClick={redoLesson}
                  disabled={isResettingLesson}
                >
                  {isResettingLesson ? 'Limpando...' : 'Refazer lição'}
                </button>
              ) : (
                <button
                  type="button"
                  className="lesson-chat-button"
                  onClick={askAboutLesson}
                  disabled={isStartingLesson}
                >
                  {isStartingLesson ? 'Iniciando...' : 'Selecionar Lição'}
                </button>
              )}
            </header>
            {selectedLesson.finalConsiderations && (
              <section className="lesson-final-considerations">
                <span className="lesson-content-kicker">Considerações finais</span>
                <ReactMarkdown>{selectedLesson.finalConsiderations}</ReactMarkdown>
              </section>
            )}
            {selectedLesson.lessonContent ? (
              <ReactMarkdown>{selectedLesson.lessonContent}</ReactMarkdown>
            ) : loadingContentId === selectedLesson.lessonId ? (
              <p className="lesson-pending">Carregando conteúdo da lição...</p>
            ) : (
              <p className="lesson-pending">Esta lição ainda está sendo preparada.</p>
            )}
          </article>
        )}
      </section>
    </main>
  )
}

export default LessonTimePage
