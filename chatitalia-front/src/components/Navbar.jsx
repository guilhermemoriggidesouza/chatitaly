import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useClerk } from '@clerk/react'

const NAV_LINKS = [
  { to: '/lesson-time', label: 'Lições' },
  { to: '/your-time', label: 'Seu momento' },
]

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { signOut } = useClerk()

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
            <span>ChatItalia</span>
          </NavLink>

          <nav className="navbar-links" aria-label="Navegação principal">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `navbar-link ${isActive ? 'is-active' : ''}`}
              >
                {link.label}
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
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                className={({ isActive }) => `navbar-drawer-link ${isActive ? 'is-active' : ''}`}
              >
                {link.label}
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
