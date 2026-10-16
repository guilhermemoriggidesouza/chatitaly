import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SiteFooter from './SiteFooter'
import { COMPANY } from '../data/company'

// Layout das páginas institucionais: cabeçalho simples, o texto e o rodapé.
function LegalPage({ title, updated = true, children }) {
  // Ao entrar numa dessas páginas (vindo do rodapé), começa do topo.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [title])

  return (
    <div className="legal-shell">
      <header className="lp-header">
        <Link to="/" className="lp-brand">
          <img src="/chatitalia-logo.png" alt="" aria-hidden="true" />
          <span>{COMPANY.product}</span>
        </Link>
      </header>

      <main className="legal-page">
        <h1>{title}</h1>
        {updated && <p className="legal-updated">Última atualização: {COMPANY.lastUpdated}</p>}
        {children}
      </main>

      <SiteFooter />
    </div>
  )
}

export default LegalPage
