import { Link } from 'react-router-dom'
import { COMPANY, fill } from '../data/company'

// Rodapé do site: landing page e páginas institucionais.
function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link to="/" className="lp-brand">
            <img src="/chatitalia-logo.png" alt="" aria-hidden="true" />
            <span>{COMPANY.product}</span>
          </Link>
          <p>Conversação e leitura de novas línguas, guiadas por conteúdo real.</p>
        </div>

        <nav className="site-footer-links" aria-label="Institucional">
          <Link to="/quem-somos">Quem somos</Link>
          <Link to="/termos">Termos de uso</Link>
          <Link to="/privacidade">Política de privacidade</Link>
          <Link to="/#planos">Planos</Link>
          {COMPANY.contactEmail && <a href={`mailto:${COMPANY.contactEmail}`}>Contato</a>}
        </nav>
      </div>

      <p className="site-footer-legal">
        © {new Date().getFullYear()} {COMPANY.product}
      </p>
    </footer>
  )
}

export default SiteFooter
