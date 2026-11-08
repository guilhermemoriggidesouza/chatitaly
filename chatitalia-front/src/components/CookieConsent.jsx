import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/react'
import { applyConsent, getConsent, saveConsent, trackEvent } from '../services/analytics'

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
// O Clarity e o Meta Pixel já vêm do <head> (index.html) em modo de
// consentimento; o "Aceitar" libera os cookies e o envio de eventos do Pixel.
// Também conta cada troca de página (o site é SPA: o PageView do <head> só
// cobre a primeira) e o fim do cadastro.
function CookieConsent() {
  const [consent, setConsent] = useState(getConsent)
  const location = useLocation()
  const { user } = useUser()
  const lastPath = useRef(null)

  const accepted = consent === 'accepted'

  // A primeira página já foi no PageView do <head>: só conta as trocas.
  useEffect(() => {
    if (lastPath.current !== null && lastPath.current !== location.pathname) trackEvent('PageView')
    lastPath.current = location.pathname
  }, [location.pathname])

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
    applyConsent(value)
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
