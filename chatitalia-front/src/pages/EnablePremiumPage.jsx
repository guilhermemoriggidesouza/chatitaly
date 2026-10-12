import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import LoadingSpinner from '../components/LoadingSpinner'
import { enablePremium, getUser } from '../infra/httpClient'
import { useUserStore } from '../stores/userStore'

// WhatsApp de contato pra dúvidas (só dígitos, com DDI).
const SUPPORT_WHATSAPP = '5519984544889'
const SUPPORT_URL = `https://wa.me/${SUPPORT_WHATSAPP}`

// Página pra onde o aluno volta depois de assinar. Só faz uma coisa: pede
// pra API ativar o premium (o que também avisa o admin no WhatsApp) e
// agradece.
export default function EnablePremiumPage() {
  const { userId } = useAuth()
  const setUser = useUserStore((state) => state.setUser)
  const [status, setStatus] = useState('loading') // 'loading' | 'done' | 'error'

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function activate() {
      try {
        await enablePremium(userId)
        // Atualiza o usuário da sessão: libera os recursos premium na hora.
        const user = await getUser(userId)
        if (cancelled) return
        if (user) setUser(user)
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
          </>
        )}

        <a className="thanks-whatsapp" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
          Falar no WhatsApp
        </a>
      </section>
    </main>
  )
}
