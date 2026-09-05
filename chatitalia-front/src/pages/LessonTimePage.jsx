import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getBooks, getLesson, getUserLessons, resetLesson, sendChat, switchUserBook } from '../infra/httpClient'
import { useDonStore } from '../stores/donStore'
import { useContextChatStore } from '../stores/contextChatStore'
import { useMessageStore } from '../stores/messageStore'
import { useUserStore } from '../stores/userStore'

function LessonTimePage() {
  const [lessons, setLessons] = useState([])
  const [selectedLessonId, setSelectedLessonId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isStartingLesson, setIsStartingLesson] = useState(false)
  const [isResettingLesson, setIsResettingLesson] = useState(false)
  const [loadingContentId, setLoadingContentId] = useState(null)
  const [books, setBooks] = useState([])
  const [lessonsBookId, setLessonsBookId] = useState(null)
  const [switchingBookId, setSwitchingBookId] = useState(null)
  const contextChatStore = useContextChatStore()
  const user = useUserStore((state) => state.user)
  const pushUserMessage = useMessageStore((state) => state.pushUserMessage)
  const pushSystemMessage = useMessageStore((state) => state.pushSystemMessage)
  const donStore = useDonStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
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

  // Enquanto uma lição está iniciando / sendo refeita / trocando de livro,
  // a navegação pela lista de lições fica bloqueada.
  const busy = isStartingLesson || isResettingLesson || Boolean(switchingBookId)

  const selectLesson = (lessonId) => {
    if (busy) return

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

  const switchBook = async (book) => {
    // Já é o livro atual, ou não há usuário, ou já está trocando: ignora.
    if (!user?.userId || switchingBookId || book.bookId === lessonsBookId) return

    const confirmed = window.confirm(
      `Trocar para o livro "${book.label}" vai APAGAR todo o seu progresso atual ` +
        `(lições concluídas e temas conversados) e recomeçar do zero. Deseja continuar?`
    )
    if (!confirmed) return

    try {
      setSwitchingBookId(book.bookId)
      setError(null)
      await switchUserBook(user.userId, book.bookId)
      setSelectedLessonId(null)
      await loadLessons()
    } catch (switchError) {
      setError(switchError.message || 'Não foi possível trocar de livro.')
    } finally {
      setSwitchingBookId(null)
    }
  }

  const askAboutLesson = async () => {
    if (!selectedLesson) return

    // Próximo tema da lição ainda não concluído (cai no 1º tema, ou no título).
    const nextTheme = selectedLesson.themesRemaining?.[0] || selectedLesson.themes?.[0] || null
    const newMessage = `Parliamo del tema: ${nextTheme?.theme ?? selectedLesson.title}.`

    try {
      setIsStartingLesson(true)

      // Nova lição = conversa nova: descarta qualquer histórico anterior.
      const messageStore = useMessageStore.getState()
      messageStore.clearMessages()
      const { messages } = useMessageStore.getState()

      pushUserMessage(newMessage)
      const response = await sendChat({
        userId: user.userId,
        level: user.level,
        lesson: selectedLesson.title,
        lessonId: selectedLessonId,
        themeId: nextTheme?.themeId,
        theme: nextTheme?.theme,
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
      useMessageStore.getState().clearMessages()
      pushSystemMessage(`${finalResponse.response}. \n${questionsText}`)
      donStore.triggerDon({
        toListen: `${finalResponse.response}. \n${questionsText}`,
        lessonId: selectedLessonId,
        audio: response.donAudio || '',
      })
      navigate('/your-time')
    } catch (chatError) {
      setError(chatError.message || 'Não foi possível iniciar a conversa sobre a lição.')
    } finally {
      setIsStartingLesson(false)
    }
  }

  const loadLessons = async () => {
    if (!user?.userId) return

    setLoading(true)
    setError(null)
    try {
      const response = await getUserLessons()
      const nextLessons = response.lessons || []
      setLessonsBookId(response.bookId || null)

      // `?lessonId=...` (ex.: vindo de uma lição recém concluída) tem prioridade na seleção.
      const paramLessonId = searchParams.get('lessonId')
      const paramMatches =
        paramLessonId && nextLessons.some((lesson) => lesson.lessonId === paramLessonId)

      const nextSelectedId = paramMatches
        ? paramLessonId
        : nextLessons.some((lesson) => lesson.lessonId === selectedLessonId)
        ? selectedLessonId
        : nextLessons[0]?.lessonId || null

      setLessons(nextLessons)
      setSelectedLessonId(nextSelectedId)

      if (nextSelectedId) loadLessonContent(nextSelectedId, nextLessons)

      // Consome o query param depois de aplicar, para não travar a navegação seguinte.
      if (paramLessonId) {
        setSearchParams((current) => {
          current.delete('lessonId')
          return current
        }, { replace: true })
      }
    } catch (loadError) {
      setLessons([])
      setSelectedLessonId(null)
      setError(loadError.message || 'Não foi possível carregar as lições.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Carrega assim que o usuário estiver disponível (traz o progresso: considerações finais).
    if (user?.userId) loadLessons()
  }, [user?.userId])

  useEffect(() => {
    // Livros disponíveis para os botões de nível (sempre até 3).
    if (!user?.userId) return
    getBooks()
      .then((data) => setBooks(data.books || []))
      .catch(() => setBooks([]))
  }, [user?.userId])

  const redoLesson = async () => {
    if (!selectedLesson || !user?.userId) return

    try {
      setIsResettingLesson(true)
      setError(null)
      await resetLesson(user.userId, selectedLesson.lessonId)
      await loadLessons()
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
          <p>{loading ? 'Carregando suas lições...' : 'Escolha um capítulo para estudar.'}</p>

          {books.length > 0 && (
            <div className="lesson-level-filter" role="group" aria-label="Trocar de livro por nível">
              <span className="lesson-level-filter-label">Níveis</span>
              <div className="lesson-level-buttons">
                {books.map((book) => {
                  const isCurrent = book.bookId === lessonsBookId
                  const isSwitching = switchingBookId === book.bookId
                  return (
                    <button
                      type="button"
                      key={book.bookId}
                      className={`lesson-level-button ${isCurrent ? 'is-active' : ''}`}
                      onClick={() => switchBook(book)}
                      disabled={isCurrent || busy}
                      aria-pressed={isCurrent}
                    >
                      {isSwitching ? 'Trocando...' : book.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="lesson-list" aria-live="polite">
          {lessons.map((lesson, index) => (
            <button
              type="button"
              key={lesson.lessonId}
              className={`lesson-list-item ${lesson.lessonId === selectedLessonId ? 'is-selected' : ''} ${lesson.finalConsiderations ? 'is-done' : ''}`}
              onClick={() => selectLesson(lesson.lessonId)}
              disabled={busy}
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
          {!loading && !lessons.length && !error && (
            <p className="lesson-empty">Nenhuma lição encontrada.</p>
          )}
        </div>
      </aside>

      <section className="lesson-content" aria-live="polite" ref={contentRef}>
        {error && <p className="lesson-error">{error}</p>}
        {!selectedLesson && !error && (
          <div className="lesson-content-empty">
            <span className="lesson-content-kicker">Hora da lição</span>
            <h2>Selecione um capítulo para começar.</h2>
            <p>Escolha uma lição na lateral.</p>
          </div>
        )}
        {selectedLesson && (
          <article className="markdown-lesson">
            <div className="lesson-action-bar">
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
                  {isStartingLesson ? 'Iniciando...' : 'Conversar sobre Lição'}
                </button>
              )}
            </div>
            <span className="lesson-content-kicker">{selectedLesson.level?.toUpperCase() || 'LIÇÃO'}</span>

            {selectedLesson.themesTotal > 0 && (
              <section className="lesson-progress-block" aria-label="Progresso da lição">
                <div className="lesson-progress-top">
                  <span className="lesson-content-kicker">Progresso da lição</span>
                  <strong>
                    {selectedLesson.themesDoneCount}/{selectedLesson.themesTotal} temas
                  </strong>
                </div>
                <div
                  className="lesson-progress-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={selectedLesson.themesTotal}
                  aria-valuenow={selectedLesson.themesDoneCount}
                >
                  <div
                    className="lesson-progress-fill"
                    style={{ width: `${Math.round((selectedLesson.progress || 0) * 100)}%` }}
                  />
                </div>

                <div className="lesson-theme-lists">
                  {selectedLesson.themesDone?.length > 0 && (
                    <div className="lesson-theme-group">
                      <small>Já conversados</small>
                      <ul>
                        {selectedLesson.themesDone.map((theme) => (
                          <li key={theme.themeId} className="is-done">✓ {theme.theme}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedLesson.themesRemaining?.length > 0 && (
                    <div className="lesson-theme-group">
                      <small>Faltam conversar</small>
                      <ul>
                        {selectedLesson.themesRemaining.map((theme) => (
                          <li key={theme.themeId}>{theme.theme}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {selectedLesson.finalConsiderations && (
              <section className="lesson-final-considerations">
                <span className="lesson-content-kicker">Considerações finais</span>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedLesson.finalConsiderations}</ReactMarkdown>
              </section>
            )}
            {selectedLesson.lessonContent ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedLesson.lessonContent}</ReactMarkdown>
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
