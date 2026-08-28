// Tradução italiano -> português usando a Translator API nativa do navegador
// (Chrome/Edge 138+). Roda 100% on-device; sem servidor nem chave de API.
// Em navegadores sem suporte, as funções retornam null e a UI esconde o botão.

let translatorPromise = null

export function isTranslatorSupported() {
  return typeof window !== 'undefined' && 'Translator' in window
}

async function getTranslator() {
  if (!isTranslatorSupported()) return null

  if (!translatorPromise) {
    translatorPromise = (async () => {
      const options = { sourceLanguage: 'it', targetLanguage: 'pt' }
      const availability = await window.Translator.availability(options)

      if (availability === 'unavailable') return null

      // Se for 'downloadable', o modelo é baixado agora (fica em cache depois).
      return window.Translator.create({
        ...options,
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', (event) => {
            console.debug('translator model', Math.round((event.loaded ?? 0) * 100) + '%')
          })
        },
      })
    })().catch((error) => {
      translatorPromise = null
      throw error
    })
  }

  return translatorPromise
}

export async function translateToPtBr(text) {
  if (!text) return null

  const translator = await getTranslator()
  if (!translator) return null

  return translator.translate(text)
}
