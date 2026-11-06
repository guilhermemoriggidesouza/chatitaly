import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import LoadingSpinner from '../components/LoadingSpinner'
import { enablePremium, getUser, getWhatsConfig, saveWhatsConfig } from '../infra/httpClient'
import { PREMIUM_PRICE_VALUE } from '../data/plans'
import { trackEvent } from '../services/analytics'
import { formatSavedPhone, isPhoneComplete, maskPhone, PHONE_PREFIX } from '../services/phoneMask'
import { useUserStore } from '../stores/userStore'

// WhatsApp de contato pra dúvidas (só dígitos, com DDI).
const SUPPORT_WHATSAPP = '5519984544889'
const SUPPORT_URL = `https://wa.me/${SUPPORT_WHATSAPP}`

// Página pra onde o aluno volta depois de assinar: pede pra API ativar o
// premium (o que também avisa o admin no WhatsApp e já deixa os envios
// padrão configurados), agradece e pede o celular, se ainda não tiver.
export default function EnablePremiumPage() {
  const { userId } = useAuth()
  const setUser = useUserStore((state) => state.setUser)
  const [status, setStatus] = useState('loading') // 'loading' | 'done' | 'error'
  const [whatsConfig, setWhatsConfig] = useState(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function activate() {
      try {
        const result = await enablePremium(userId)
        // Conversão dos anúncios: começo da assinatura (14 dias grátis). Só
        // na ativação, não quando a página é recarregada.
        if (!result?.alreadyActive) {
          trackEvent('StartTrial', { value: PREMIUM_PRICE_VALUE, currency: 'BRL', predicted_ltv: PREMIUM_PRICE_VALUE })
        }
        // Atualiza o usuário da sessão: libera os recursos premium na hora.
        const user = await getUser(userId)
        if (cancelled) return
        if (user) setUser(user)
        // Sem a configuração, a página só agradece (o aluno ajusta em /whatsapp).
        const data = await getWhatsConfig().catch(() => null)
        if (cancelled) return
        setWhatsConfig(data?.whatsConfig ?? null)
        setStatus('done')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    activate()

    return () => {
      cancelled = true
    }
  }, [userId, setUser])

  if (status === 'loading') {
    return (
      <main className="thanks-page">
        <LoadingSpinner size={32} color="var(--green-italia)" />
      </main>
    )
  }

  const failed = status === 'error'

  return (
    <main className="thanks-page">
      <section className="thanks-card">
        {failed ? (
          <>
            <h1>Não conseguimos ativar sua assinatura</h1>
            <p>Me chame no WhatsApp que eu resolvo para você.</p>
          </>
        ) : (
          <>
            <svg className="thanks-check" viewBox="0 0 96 96" role="img" aria-label="Assinatura confirmada">
              <circle cx="48" cy="48" r="46" />
              <path d="M28 50l14 14 27-30" />
            </svg>
            <h1>Obrigado por assinar!</h1>
            <p>Sua assinatura do YourLesson IA está ativa. Em caso de dúvidas, é só me chamar no WhatsApp.</p>
            {whatsConfig && <ThanksWhatsAppSetup whatsConfig={whatsConfig} onSaved={setWhatsConfig} />}
          </>
        )}

        <a className="thanks-whatsapp" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
          Falar no WhatsApp
        </a>
      </section>
    </main>
  )
}

// O Don já fica agendado (seg a sex, verbo às 8:00 e pergunta às 8:30): aqui
// o aluno só informa o celular. Quem já tinha número salvo vê o resumo.
function ThanksWhatsAppSetup({ whatsConfig, onSaved }) {
  const [phone, setPhone] = useState(PHONE_PREFIX)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isPhoneComplete(phone)) {
      setError('Informe o número com DDD.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const data = await saveWhatsConfig({ ...whatsConfig, phone })
      onSaved(data.whatsConfig)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (whatsConfig.phone) {
    return (
      <div className="thanks-setup">
        <p className="thanks-setup-done" role="status">
          Tudo pronto: o Don vai falar com você no {formatSavedPhone(whatsConfig.phone)}.
        </p>
        <p className="thanks-setup-note">
          Verbo do dia às 8:00 e pergunta do dia às 8:30, de segunda a sexta.{' '}
          <Link to="/whatsapp">Mudar dias e horários</Link>
        </p>
      </div>
    )
  }

  return (
    <form className="thanks-setup" onSubmit={handleSubmit}>
      <h2>Para onde o Don manda as mensagens?</h2>
      <p className="thanks-setup-note">
        Já deixamos tudo agendado: verbo do dia às 8:00 e pergunta do dia às 8:30, de segunda a sexta.
        Só falta o seu WhatsApp.
      </p>
      <label className="thanks-setup-field">
        <span>Seu WhatsApp</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(maskPhone(event.target.value, phone))}
          placeholder="+55 (11) 99999-9999"
        />
      </label>
      {error && <p className="thanks-setup-error" role="alert">{error}</p>}
      <button type="submit" className="thanks-setup-save" disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar meu WhatsApp'}
      </button>
      <Link to="/whatsapp" className="thanks-setup-link">Prefiro escolher outros horários</Link>
    </form>
  )
}
