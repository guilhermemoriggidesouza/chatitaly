// Ferramentas de análise e de anúncios: Microsoft Clarity (mapa de calor e
// gravação de sessões) e Meta Pixel (conversões dos anúncios).
//
// Os dois são carregados por um script inline no <head> do index.html, antes
// do React, em modo de consentimento: até a pessoa aceitar os cookies, o
// Clarity grava sem cookies e o Pixel não envia eventos (fbq consent revoke).
// Aqui só ficam o aviso de consentimento e os eventos do app, usando o
// window.fbq / window.clarity globais. No localhost o script do <head> não
// carrega nada, então essas funções não fazem nada.
const CONSENT_KEY = 'cookie-consent' // 'accepted' | 'rejected'

// O navegador pode bloquear o localStorage (aba anônima, cookies desligados,
// algumas WebViews): sem ele, o aviso aparece de novo a cada visita.
export const getConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY)
  } catch {
    return null
  }
}

export const saveConsent = (value) => {
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {
    /* sem localStorage: vale só até recarregar */
  }
}

// Repassa a escolha do aviso de cookies para o Clarity e o Pixel.
export function applyConsent(value) {
  const granted = value === 'accepted'
  const state = granted ? 'granted' : 'denied'
  try {
    window.clarity?.('consentv2', { ad_Storage: state, analytics_Storage: state })
    window.fbq?.('consent', granted ? 'grant' : 'revoke')
  } catch {
    /* ferramenta bloqueada (ex.: bloqueador de anúncios) */
  }
}

// Evento padrão do Meta Pixel (PageView, Lead, CompleteRegistration,
// StartTrial...). Sem consentimento o Pixel segura o evento.
export function trackEvent(name, params) {
  if (typeof window.fbq !== 'function') return
  try {
    if (params) window.fbq('track', name, params)
    else window.fbq('track', name)
  } catch {
    /* ignora */
  }
}

// Erro de tela (ErrorBoundary): vai para o console e vira evento no Clarity,
// para achar a gravação da sessão que quebrou.
export function reportError(error, where) {
  console.error(`[${where}]`, error)
  try {
    window.clarity?.('event', 'react_error')
    window.clarity?.('set', 'react_error', `${where}: ${error?.message || error}`.slice(0, 200))
  } catch {
    /* ignora */
  }
}
