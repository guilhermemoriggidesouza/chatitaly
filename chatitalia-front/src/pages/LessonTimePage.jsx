import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getLessonsByBookId, sendChat } from '../infra/httpClient'
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
  const contextChatStore = useContextChatStore()
  const user = useUserStore((state) => state.user)
  const pushUserMessage = useMessageStore((state) => state.pushUserMessage)
  const donStore = useDonStore()
  const navigate = useNavigate()
  const [error, setError] = useState(null)


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
      contextChatStore.setContext({
        lessonId: selectedLessonId,
        lessonTitle: selectedLesson.title,
      })
      pushUserMessage(newMessage)

      const response = await sendChat({
        userId: user.userId,
        level: user.level,
        lessonId: selectedLessonId,
        newMessage,
        history: [...messages, { role: 'user', content: newMessage }],
      })
      const finalResponse = response.finalResponse
      const questionsText = Array.isArray(finalResponse.questions)
        ? finalResponse.questions.join('\n')
        : ''

      contextChatStore.setContext({
        lessonId: selectedLessonId,
        lessonTitle: selectedLesson.title,
        themeId: finalResponse.themeId,
        theme: finalResponse.theme,
      })
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

    setLoading(true)
    setError(null)
    try {
      const response = await getLessonsByBookId(normalizedBookId)
      setLessons(response.lessons || [])
      setSelectedLessonId(response.lessons?.[0]?.lessonId || null)
      localStorage.setItem('chatitalia.bookId', normalizedBookId)
      setSearchParams({ bookId: normalizedBookId })
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
  }, [])

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
              className={`lesson-list-item ${lesson.lessonId === selectedLessonId ? 'is-selected' : ''}`}
              onClick={() => setSelectedLessonId(lesson.lessonId)}
            >
              <span className="lesson-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="lesson-list-copy">
                <strong>{lesson.title}</strong>
                <small>{lesson.level?.toUpperCase() || 'LIÇÃO'}</small>
              </span>
            </button>
          ))}
          {!loading && bookIdInput && !lessons.length && !error && (
            <p className="lesson-empty">Nenhuma lição encontrada para este livro.</p>
          )}
        </div>
      </aside>

      <section className="lesson-content" aria-live="polite">
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
              <button
                type="button"
                className="lesson-chat-button"
                onClick={askAboutLesson}
                disabled={isStartingLesson}
              >
                {isStartingLesson ? 'Iniciando...' : 'Selecionar Lição'}
              </button>
            </header>
            {selectedLesson.lessonContent ? (
              <ReactMarkdown>{selectedLesson.lessonContent}</ReactMarkdown>
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
