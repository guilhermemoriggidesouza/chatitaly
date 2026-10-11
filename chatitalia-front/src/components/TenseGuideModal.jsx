import { useEffect, useRef } from 'react'
import { TENSE_GUIDE } from '../services/tenseGuide'

// "Ieri *ho parlato* con Maria." -> o trecho entre asteriscos em destaque.
function Example({ text }) {
  return text
    .split('*')
    .map((chunk, index) => (index % 2 === 1 ? <strong key={index}>{chunk}</strong> : <span key={index}>{chunk}</span>))
}

// Colinha dos tempos verbais. Usa <dialog> nativo: foco preso no modal, Esc
// fecha e ele fica na camada do topo (não é afetado pela animação da rota).
function TenseGuideModal({ open, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="tense-guide"
      aria-labelledby="tense-guide-title"
      onClose={onClose}
      // Clique fora do conteúdo (no fundo escuro) fecha.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className="tense-guide-content">
        <header className="tense-guide-header">
          <h2 id="tense-guide-title">O que cada tempo significa</h2>
          <button type="button" className="tense-guide-close" aria-label="Fechar" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="tense-guide-body">
          {TENSE_GUIDE.map((mood) => (
            <section key={mood.id} className="tense-guide-mood">
              <h3>{mood.label}</h3>
              <p className="tense-guide-summary">{mood.summary}</p>

              <ul>
                {mood.tenses.map((tense) => (
                  <li key={tense.original} className="tense-guide-item">
                    <h4>
                      {tense.label} <span lang="it">{tense.original}</span>
                    </h4>
                    <p>{tense.use}</p>
                    <p className="tense-guide-example" lang="it">
                      <Example text={tense.example.it} />
                    </p>
                    <p className="tense-guide-translation">{tense.example.pt}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  )
}

export default TenseGuideModal
