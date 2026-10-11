import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import TenseGuideModal from '../components/TenseGuideModal'
import { getVerbs } from '../infra/httpClient'
import { conjugate } from '../services/conjugator'

const GROUP_LABELS = {
  are: '-are',
  ere: '-ere',
  ire: '-ire',
  isc: '-ire (-isc-)',
}

// Busca sem diferenciar maiúsculas nem acentos ("e" acha "è").
const normalize = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

// Uma forma conjugada: o radical normal e a conjugação em destaque.
function VerbForm({ parts }) {
  return (
    <span className="verbs-form">
      {parts.map((part, index) =>
        part.highlight ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>
      )}
    </span>
  )
}

export default function VerbsPage() {
  const [verbs, setVerbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [moodId, setMoodId] = useState('indicativo')
  const [guideOpen, setGuideOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const listRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getVerbs()
        if (cancelled) return
        setVerbs(data.verbs ?? [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredVerbs = useMemo(() => {
    const term = normalize(query)
    if (!term) return verbs
    return verbs.filter(
      (verb) => normalize(verb.infinitive).includes(term) || normalize(verb.translation).includes(term)
    )
  }, [verbs, query])

  // O verbo selecionado vem da URL (/verbs?verb=parlare), então o link de um
  // verbo pode ser compartilhado. Sem o parâmetro (ou se ele não existir na
  // lista), abre no primeiro.
  const requestedVerb = normalize(searchParams.get('verb'))
  const verbFromUrl = requestedVerb
    ? verbs.find((verb) => normalize(verb.infinitive) === requestedVerb) ?? null
    : null
  const selectedVerb = verbFromUrl ?? verbs[0] ?? null
  const selectedId = selectedVerb?.verbId ?? null
  const unknownVerb = requestedVerb && verbs.length > 0 && !verbFromUrl ? searchParams.get('verb') : null

  // `replace` pra trocar de verbo não encher o histórico do navegador.
  const selectVerb = (verb) => setSearchParams({ verb: verb.infinitive }, { replace: true })

  // Deixa o verbo selecionado visível na lista (ex.: veio pela URL e está lá
  // embaixo). Rola só a caixa da lista, não a página.
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector('.verbs-item.is-active')
    if (!list || !item) return
    const top = item.offsetTop - list.offsetTop
    const isVisible = top >= list.scrollTop && top + item.offsetHeight <= list.scrollTop + list.clientHeight
    if (!isVisible) list.scrollTop = top
  }, [selectedId, loading])

  const conjugation = useMemo(() => (selectedVerb ? conjugate(selectedVerb) : null), [selectedVerb])
  const mood = conjugation?.moods.find((item) => item.id === moodId) ?? conjugation?.moods[0]

  if (loading) {
    return (
      <main className="verbs-page verbs-page-centered">
        <LoadingSpinner size={32} color="var(--green-italia)" />
      </main>
    )
  }

  return (
    <main className="verbs-page">
      <section className="verbs-picker" aria-label="Escolha um verbo">
        <header className="verbs-picker-header">
          <span className="lesson-badge">Verbos regulares</span>
          <h1>Conjugação</h1>
        </header>

        <input
          type="search"
          className="verbs-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar verbo ou tradução"
          aria-label="Buscar verbo"
        />

        {error && <p className="verbs-message is-error">{error}</p>}
        {!error && verbs.length === 0 && <p className="verbs-message">Nenhum verbo cadastrado ainda.</p>}
        {!error && verbs.length > 0 && filteredVerbs.length === 0 && (
          <p className="verbs-message">Nenhum verbo encontrado para “{query}”.</p>
        )}

        {unknownVerb && (
          <p className="verbs-message">O verbo “{unknownVerb}” ainda não está cadastrado.</p>
        )}

        {filteredVerbs.length > 0 && (
          <ul className="verbs-list" ref={listRef}>
            {filteredVerbs.map((verb) => (
              <li key={verb.verbId}>
                <button
                  type="button"
                  className={`verbs-item ${verb.verbId === selectedId ? 'is-active' : ''}`}
                  aria-pressed={verb.verbId === selectedId}
                  onClick={() => selectVerb(verb)}
                >
                  <span className="verbs-item-name">{verb.infinitive}</span>
                  <span className="verbs-item-translation">{verb.translation}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedVerb && conjugation && (
        <section className="verbs-detail" aria-live="polite">
          <header className="verbs-detail-header">
            <h2>
              <VerbForm parts={[{ text: conjugation.stem }, { text: selectedVerb.infinitive.slice(-3), highlight: true }]} />
            </h2>
            <p className="verbs-detail-translation">{selectedVerb.translation}</p>
            <ul className="verbs-tags">
              <li>Grupo {GROUP_LABELS[conjugation.group]}</li>
              <li>Auxiliar {conjugation.auxiliary}</li>
              <li>Radical {conjugation.stem}-</li>
            </ul>
            <p className="verbs-legend">
              O radical não muda. O que está em <strong>destaque</strong> é a conjugação.
            </p>
            <div className="verbs-actions">
            <button type="button" className="verbs-help" onClick={() => setGuideOpen(true)}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M9.4 9.4a2.7 2.7 0 1 1 3.9 2.4c-.8.5-1.3 1-1.3 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="17" r="1.1" fill="currentColor" />
              </svg>
              O que cada tempo significa
            </button>
            <Link className="verbs-card-link" to={`/verbs/card?verb=${encodeURIComponent(selectedVerb.infinitive)}`}>
              Ver cartão para print
            </Link>
            </div>
          </header>

          <div className="verbs-moods" role="tablist" aria-label="Modos verbais">
            {conjugation.moods.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === mood.id}
                className={`verbs-mood ${item.id === mood.id ? 'is-active' : ''}`}
                onClick={() => setMoodId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="verbs-tenses">
            {mood.tenses.map((tense) => (
              <article key={tense.id} className="verbs-tense">
                <h3>{tense.label}</h3>
                <p className="verbs-tense-original" lang="it">
                  {tense.original}
                </p>
                <dl>
                  {tense.rows.map((row) => (
                    <div key={row.pronoun} className="verbs-row">
                      <dt>{row.pronoun}</dt>
                      <dd>
                        <VerbForm parts={row.parts} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      <TenseGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </main>
  )
}
