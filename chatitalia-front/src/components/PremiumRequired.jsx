import { Link } from 'react-router-dom'

// Aviso mostrado quando um usuário não assinante entra num recurso premium.
function PremiumRequired() {
  return (
    <main className="premium-required-page">
      <section className="premium-required" role="alert">
        <h1>Recurso para assinantes</h1>
        <p>Para entrar neste recurso, você precisa virar assinante.</p>
        <Link className="premium-required-cta" to="/plans">
          Ver assinatura
        </Link>
      </section>
    </main>
  )
}

export default PremiumRequired
