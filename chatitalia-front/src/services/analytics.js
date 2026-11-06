// Ferramentas de análise e de anúncios: Microsoft Clarity (mapa de calor e
// gravação de sessões) e Meta Pixel (conversões dos anúncios). Só são
// carregadas depois que a pessoa aceita os cookies (CookieConsent) e só no
// site publicado: os testes no localhost não entram nos relatórios.
const CLARITY_ID = 'z9j0z8dhny'
const META_PIXEL_ID = '2163935964194767'
const CONSENT_KEY = 'cookie-consent' // 'accepted' | 'rejected'

// O navegador pode bloquear o localStorage (aba anônima, cookies desligados):
// sem ele, o aviso aparece de novo e nada é carregado sem o "Aceitar".
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

let loaded = false

const loadScript = (src) => {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

// Microsoft Clarity: o mesmo trecho que o painel do Clarity manda colar no <head>.
function loadClarity() {
  window.clarity =
    window.clarity ||
    function (...args) {
      ;(window.clarity.q = window.clarity.q || []).push(args)
    }
  loadScript(`https://www.clarity.ms/tag/${CLARITY_ID}`)
}

// Meta Pixel: o trecho do Gerenciador de Eventos, sem o <noscript> (sem
// JavaScript não há aviso de cookies, então nada é carregado).
function loadMetaPixel() {
  if (window.fbq) return
  const fbq = function (...args) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  }
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  window.fbq = fbq
  window._fbq = window._fbq || fbq
  loadScript('https://connect.facebook.net/en_US/fbevents.js')

  fbq('init', META_PIXEL_ID)
  fbq('track', 'PageView')
}

export function loadAnalytics() {
  if (loaded || !import.meta.env.PROD) return
  loaded = true
  loadClarity()
  loadMetaPixel()
}

// Evento padrão do Meta Pixel (PageView, Lead, CompleteRegistration,
// StartTrial...). Sem consentimento (Pixel não carregado), não faz nada.
export function trackEvent(name, params) {
  if (!loaded || !window.fbq) return
  if (params) window.fbq('track', name, params)
  else window.fbq('track', name)
}
