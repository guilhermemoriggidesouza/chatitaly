import { useEffect, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import PremiumRequired from '../components/PremiumRequired'
import { getWhatsConfig, saveWhatsConfig } from '../infra/httpClient'

// Segunda a domingo; os valores seguem o backend (0 = domingo ... 6 = sábado).
const WEEKDAYS = [
  { value: 1, short: 'Seg', label: 'Segunda' },
  { value: 2, short: 'Ter', label: 'Terça' },
  { value: 3, short: 'Qua', label: 'Quarta' },
  { value: 4, short: 'Qui', label: 'Quinta' },
  { value: 5, short: 'Sex', label: 'Sexta' },
  { value: 6, short: 'Sáb', label: 'Sábado' },
  { value: 0, short: 'Dom', label: 'Domingo' },
]

// Os dois envios que o aluno pode habilitar.
const SCHEDULES = [
  { type: 'verbs', title: 'Verbo do dia', description: 'Um verbo com a conjugação e um desafio para praticar.' },
  { type: 'lesson', title: 'Pergunta do dia', description: 'O Don pergunta sobre o tema que você está estudando e corrige a sua resposta.' },
]

// Fuso do navegador: é o valor inicial pra quem ainda não escolheu.
const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
  } catch {
    return 'America/Sao_Paulo'
  }
}

// "America/Sao_Paulo" -> "America/Sao_Paulo (GMT-3)".
const timezoneLabel = (timezone) => {
  try {
    const offset = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value
    return offset ? `${timezone} (${offset})` : timezone
  } catch {
    return timezone
  }
}

// Todos os fusos que o navegador conhece; os do Brasil vêm primeiro.
const BRAZIL_TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Cuiaba',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/Bahia',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Noronha',
]
const allTimezones = () => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
}
const TIMEZONES = [...new Set([...BRAZIL_TIMEZONES, browserTimezone(), ...allTimezones()])]

const HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const emptySchedule = () => ({ enabled: false, weekDays: [], hour: '' })

// Máscara de hora: só dígitos, com os dois pontos no meio ("0830" -> "08:30").
const maskHour = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
}

// O assinante configura aqui o celular e os envios de verbos e lições.
// Quem não é premium vê o aviso com o link pra assinatura.
export default function WhatsAppPage() {
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState(browserTimezone)
  const [schedules, setSchedules] = useState({ verbs: emptySchedule(), lesson: emptySchedule() })
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', text }

  // whatsConfig nulo = nada configurado: tudo fica sem valor.
  const fillFrom = (whatsConfig) => {
    setPhone(whatsConfig?.phone || '')
    setTimezone(whatsConfig?.timezone || browserTimezone())
    const next = { verbs: emptySchedule(), lesson: emptySchedule() }
    for (const config of whatsConfig?.configs ?? []) {
      if (next[config.type]) {
        next[config.type] = { enabled: true, weekDays: config.weekDays ?? [], hour: config.hour ?? '' }
      }
    }
    setSchedules(next)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getWhatsConfig()
        if (!cancelled) fillFrom(data.whatsConfig)
      } catch (err) {
        if (cancelled) return
        if (err.code === 'premium_required') setLocked(true)
        else setFeedback({ type: 'error', text: err.message })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [])

  const updateSchedule = (type, changes) => {
    setSchedules((current) => ({ ...current, [type]: { ...current[type], ...changes } }))
  }

  const toggleDay = (type, day) => {
    const { weekDays } = schedules[type]
    updateSchedule(type, {
      weekDays: weekDays.includes(day) ? weekDays.filter((d) => d !== day) : [...weekDays, day],
    })
  }

  const handleSave = async (event) => {
    event.preventDefault()

    if (phone.replace(/\D/g, '').length < 10) {
      setFeedback({ type: 'error', text: 'Informe o número com DDD.' })
      return
    }
    for (const { type, title } of SCHEDULES) {
      const schedule = schedules[type]
      if (!schedule.enabled) continue
      if (!schedule.weekDays.length) {
        setFeedback({ type: 'error', text: `${title}: escolha pelo menos um dia.` })
        return
      }
      if (!HOUR_PATTERN.test(schedule.hour)) {
        setFeedback({ type: 'error', text: `${title}: informe um horário válido, como 08:30.` })
        return
      }
    }

    const configs = SCHEDULES.filter(({ type }) => schedules[type].enabled).map(({ type }) => ({
      type,
      weekDays: schedules[type].weekDays,
      hour: schedules[type].hour,
    }))

    setSaving(true)
    setFeedback(null)
    try {
      const data = await saveWhatsConfig({ phone, timezone, configs })
      fillFrom(data.whatsConfig)
      setFeedback({ type: 'success', text: 'Configuração salva.' })
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="configure-whatsapp-page configure-whatsapp-centered">
        <LoadingSpinner size={32} color="var(--green-italia)" />
      </main>
    )
  }

  if (locked) return <PremiumRequired />

  return (
    <main className="configure-whatsapp-page">
      <header>
        <span className="lesson-badge">Assinantes</span>
        <h1>Configurar WhatsApp</h1>
        <p>Informe o seu celular e escolha o que quer receber, em quais dias e a que horas.</p>
      </header>

      <form className="configure-whatsapp-form" onSubmit={handleSave}>
        <label className="configure-whatsapp-field">
          <span>Seu WhatsApp</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(11) 99999-9999"
          />
          <small>Com DDD. Fora do Brasil, inclua o código do país.</small>
        </label>

        <label className="configure-whatsapp-field">
          <span>Seu fuso horário</span>
          <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {timezoneLabel(zone)}
              </option>
            ))}
          </select>
          <small>Os horários abaixo valem nesse fuso.</small>
        </label>

        {SCHEDULES.map(({ type, title, description }) => {
          const schedule = schedules[type]
          return (
            <section key={type} className="configure-whatsapp-schedule">
              <label className="configure-whatsapp-switch">
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={(event) => updateSchedule(type, { enabled: event.target.checked })}
                />
                <span className="configure-whatsapp-switch-track" aria-hidden="true" />
                <span className="configure-whatsapp-switch-text">
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
              </label>

              {schedule.enabled && (
                <>
                  <fieldset className="configure-whatsapp-field">
                    <legend>Dias da semana</legend>
                    <div className="configure-whatsapp-days">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          className={`configure-whatsapp-day ${schedule.weekDays.includes(day.value) ? 'is-active' : ''}`}
                          aria-pressed={schedule.weekDays.includes(day.value)}
                          aria-label={day.label}
                          onClick={() => toggleDay(type, day.value)}
                        >
                          {day.short}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="configure-whatsapp-field">
                    <span>Horário</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="configure-whatsapp-hour"
                      value={schedule.hour}
                      onChange={(event) => updateSchedule(type, { hour: maskHour(event.target.value) })}
                      placeholder="08:30"
                      maxLength={5}
                    />
                  </label>
                </>
              )}
            </section>
          )
        })}

        {feedback && (
          <p className={`configure-whatsapp-feedback is-${feedback.type}`} role="status">
            {feedback.text}
          </p>
        )}

        <button type="submit" className="configure-whatsapp-save" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </main>
  )
}
