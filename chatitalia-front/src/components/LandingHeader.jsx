import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { COMPANY } from '../data/company'

// Cabeçalho das páginas públicas de venda (landing e /don-no-whatsapp).
function LandingHeader() {
  const { isSignedIn } = useAuth()

  return (
    <header className="lp-header">
      <Link to="/" className="lp-brand lp-brand-link">
        <img src="/logo-yourlessonia.png" alt="" aria-hidden="true" />
        <span>{COMPANY.brand}</span>
      </Link>
      <nav className="lp-header-nav">
        {isSignedIn ? (
          <Link to="/lesson-time" className="lp-btn lp-btn-primary lp-btn-sm">
            Entrar no app
          </Link>
        ) : (
          <>
            <Link to="/sign-in" className="lp-link">Entrar</Link>
            <Link to="/sign-up?redirect=/plans" className="lp-btn lp-btn-primary lp-btn-sm">Assinar</Link>
          </>
        )}
      </nav>
    </header>
  )
}

export default LandingHeader
