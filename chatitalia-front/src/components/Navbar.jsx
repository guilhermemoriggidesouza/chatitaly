import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useClerk } from '@clerk/react'
import { useUserStore } from '../stores/userStore'

const NAV_LINKS = [
  { to: '/lesson-time', label: 'Lições' },
  { to: '/your-time', label: 'Seu momento' },
  { to: '/verbs', label: 'Verbos', premium: true },
  { to: '/whatsapp', label: 'Configurar WhatsApp', premium: true },
  // Só aparece pra quem assina.
  { to: '/cancel-subscription', label: 'Cancelar assinatura', onlyPremium: true }]

// Cadeado ao lado dos recursos de assinante, pra quem ainda não assina.
function LockIcon() {
  return (
    <svg className="navbar-lock" viewBox="0 0 24 24" width="14" height="14" role="img" aria-label="Só para assinantes">
      <rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { signOut } = useClerk()
  const isPremium = useUserStore((state) => state.user.premium)

  const links = NAV_LINKS.filter((link) => !link.onlyPremium || isPremium)
  const closeMenu = () => setIsOpen(false)

  // Trava o scroll do body enquanto o drawer mobile estiver aberto.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <NavLink to="/lesson-time" className="navbar-brand" onClick={closeMenu}>
            <img className="navbar-logo" src="/chatitalia-logo.png" alt="" aria-hidden="true" />
            <span>YourLesson IA</span>
          </NavLink>

          <nav className="navbar-links" aria-label="Navegação principal">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `navbar-link ${isActive ? 'is-active' : ''}`}
              >
                {link.label}
                {link.premium && !isPremium && <LockIcon />}
              </NavLink>
            ))}
            <button
              type="button"
              className="navbar-signout"
              onClick={() => signOut()}
            >
              Sair
            </button>
          </nav>

          <button
            type="button"
            className="navbar-toggle"
            aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
          >
            <span className={`navbar-toggle-bar ${isOpen ? 'is-open' : ''}`} />
            <span className={`navbar-toggle-bar ${isOpen ? 'is-open' : ''}`} />
            <span className={`navbar-toggle-bar ${isOpen ? 'is-open' : ''}`} />
          </button>
        </div>

        <div className={`navbar-drawer ${isOpen ? 'is-open' : ''}`}>
          <nav className="navbar-drawer-links" aria-label="Navegação móvel">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                className={({ isActive }) => `navbar-drawer-link ${isActive ? 'is-active' : ''}`}
              >
                {link.label}
                {link.premium && !isPremium && <LockIcon />}
              </NavLink>
            ))}
            <button
              type="button"
              className="navbar-drawer-signout"
              onClick={() => {
                closeMenu()
                signOut()
              }}
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      {isOpen && (
        <button
          type="button"
          className="navbar-backdrop"
          aria-label="Fechar menu"
          onClick={closeMenu}
        />
      )}
    </>
  )
}

export default Navbar
