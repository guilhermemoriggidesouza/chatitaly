import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import { getVerb } from '../infra/httpClient'
import { conjugate } from '../services/conjugator'

// Tempos principais do cartão: os 3 mais usados na conversa + o futuro.
const CARD_TENSES = [
  ['indicativo', 'presente'],
  ['indicativo', 'passato-prossimo'],
  ['indicativo', 'imperfetto'],
  ['indicativo', 'futuro-semplice'],
]

// Seção "Como pedir e como dar instruções": aqui o título do quadro é o uso
// (pedir / instrução) e o nome do tempo vai no subtítulo.
const CARD_ACTIONS = [
  { mood: 'condizionale', tense: 'presente', title: 'Pedir', subtitle: 'Condicional presente' },
  { mood: 'imperativo', tense: 'presente', title: 'Instrução', subtitle: 'Imperativo' },
]

// Formas únicas da faixa de cima (só a forma "presente" de cada uma; do
// particípio vale a passada, que é a que forma os tempos compostos).
const CARD_FORMS = [
  ['infinito', 0],
  ['participio', 1],
  ['gerundio', 0],
]

function VerbForm({ parts }) {
  return (
    <span className="verbs-form">
      {parts.map((part, index) =>
        part.highlight ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>
      )}
    </span>
  )
}

// Um quadro do cartão: título, subtítulo e as 6 pessoas.
function TenseBox({ title, subtitle, rows }) {
  return (
    <section className="verb-card-tense">
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <dl>
        {rows.map((row) => (
          <div key={row.pronoun}>
            <dt>{row.pronoun}</dt>
            <dd>
              <VerbForm parts={row.parts} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// Cartão de um verbo (/verbs/card?verb=parlare) feito pra virar imagem e ser
// enviado no WhatsApp: proporção 9:16 (tela cheia de celular), sem navbar,
// tudo numa tela só. Página pública — não exige login.
export default function VerbCardPage() {
  const [searchParams] = useSearchParams()
  const requestedVerb = (searchParams.get('verb') ?? '').trim().toLowerCase()
  const [verb, setVerb] = useState(null)
  const [loading, setLoading] = useState(Boolean(requestedVerb))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!requestedVerb) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getVerb(requestedVerb)
        if (!cancelled) setVerb(data)
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
  }, [requestedVerb])

  const conjugation = useMemo(() => (verb ? conjugate(verb) : null), [verb])

  const findTense = (moodId, tenseId) =>
    conjugation.moods.find((mood) => mood.id === moodId).tenses.find((tense) => tense.id === tenseId)

  if (loading) {
    return (
      <main className="verb-card-page">
        <LoadingSpinner size={32} color="var(--green-italia)" />
      </main>
    )
  }

  if (!conjugation) {
    return (
      <main className="verb-card-page">
        <p className="verbs-message">
          {error ??
            (requestedVerb
              ? `O verbo “${requestedVerb}” ainda não está cadastrado.`
              : 'Informe o verbo na URL, por exemplo /verbs/card?verb=parlare.')}
        </p>
      </main>
    )
  }

  return (
    <main className="verb-card-page">
      <article className="verb-card">
        <header className="verb-card-header">
          <div>
            <h1>
              <VerbForm parts={[{ text: conjugation.stem }, { text: verb.infinitive.slice(-3), highlight: true }]} />
            </h1>
            <p>{verb.translation}</p>
          </div>
          <div className="verb-card-brand">
            <img src="/chatitalia-logo.png" alt="" aria-hidden="true" />
            <span>ChatItaly</span>
          </div>
        </header>

        <dl className="verb-card-forms">
          {CARD_FORMS.map(([tenseId, rowIndex]) => {
            const tense = findTense('forme-nominali', tenseId)
            return (
              <div key={tenseId}>
                <dt>{tense.label}</dt>
                <dd>
                  <VerbForm parts={tense.rows[rowIndex].parts} />
                </dd>
              </div>
            )
          })}
        </dl>

        <div className="verb-card-tenses">
          {CARD_TENSES.map(([moodId, tenseId]) => {
            const tense = findTense(moodId, tenseId)
            return <TenseBox key={tenseId} title={tense.label} subtitle={tense.original} rows={tense.rows} />
          })}
        </div>

        <h2 className="verb-card-section">Como pedir e como dar instruções</h2>
        <div className="verb-card-tenses verb-card-actions">
          {CARD_ACTIONS.map((action) => (
            <TenseBox
              key={action.mood}
              title={action.title}
              subtitle={action.subtitle}
              rows={findTense(action.mood, action.tense).rows}
            />
          ))}
        </div>

        <p className="verb-card-legend">
          O radical não muda. O que está em <strong>destaque</strong> é a conjugação.
        </p>
      </article>
    </main>
  )
}
