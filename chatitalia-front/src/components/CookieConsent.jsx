import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/react'
import { getConsent, loadAnalytics, saveConsent, trackEvent } from '../services/analytics'

// Conta criada há até 10 min = acabou de se cadastrar (o Clerk não avisa o
// fim do cadastro). Uma marca no navegador evita contar a mesma conta de novo.
const NEW_ACCOUNT_MS = 10 * 60 * 1000
const registrationKey = (userId) => `meta-registration-${userId}`

const alreadyTracked = (userId) => {
  try {
    return localStorage.getItem(registrationKey(userId)) === '1'
  } catch {
    return true // sem localStorage não dá pra garantir uma vez só: não conta
  }
}

const markTracked = (userId) => {
  try {
    localStorage.setItem(registrationKey(userId), '1')
  } catch {
    /* sem localStorage */
  }
}

// Aviso de cookies (LGPD): faixa presa embaixo da tela até a pessoa escolher.
// As ferramentas de análise e o Meta Pixel (services/analytics) só carregam
// com o "Aceitar". Com elas carregadas, conta cada troca de página (o site é
// SPA: o Pixel só vê a primeira sozinho) e o fim do cadastro.
function CookieConsent() {
  const [consent, setConsent] = useState(getConsent)
  const location = useLocation()
  const { user } = useUser()
  const lastPath = useRef(null)

  const accepted = consent === 'accepted'

  useEffect(() => {
    if (accepted) loadAnalytics()
  }, [accepted])

  // A primeira página já vai no PageView do carregamento do Pixel.
  useEffect(() => {
    if (!accepted) return
    if (lastPath.current !== null && lastPath.current !== location.pathname) trackEvent('PageView')
    lastPath.current = location.pathname
  }, [accepted, location.pathname])

  useEffect(() => {
    if (!accepted || !user?.id || !user.createdAt) return
    if (Date.now() - new Date(user.createdAt).getTime() > NEW_ACCOUNT_MS) return
    if (alreadyTracked(user.id)) return
    markTracked(user.id)
    trackEvent('CompleteRegistration')
  }, [accepted, user])

  if (consent) return null

  const choose = (value) => {
    saveConsent(value)
    setConsent(value)
  }

  return (
    <div className="cookie-consent" role="region" aria-label="Aviso de cookies">
      <p>
        Usamos cookies para entender como o site é usado, melhorar a sua experiência e medir os nossos anúncios.{' '}
        <Link to="/privacidade">Saiba mais</Link>
      </p>
      <div className="cookie-consent-actions">
        <button type="button" className="cookie-consent-reject" onClick={() => choose('rejected')}>
          Recusar
        </button>
        <button type="button" className="cookie-consent-accept" onClick={() => choose('accepted')}>
          Aceitar
        </button>
      </div>
    </div>
  )
}

export default CookieConsent
