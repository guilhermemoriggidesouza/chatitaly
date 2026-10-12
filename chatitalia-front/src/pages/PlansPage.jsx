// Link de pagamento da assinatura no Mercado Pago. Vem do ambiente
// (VITE_MERCADO_PAGO_URL); enquanto não estiver definido, o botão fica
// desabilitado.
const CHECKOUT_URL = import.meta.env.VITE_MERCADO_PAGO_URL || ''

const FREE_FEATURES = [
  'Lista de lições',
  'Conversação em tempo real com o Don Italiano no site',
]

const PAID_FEATURES = [
  'Tudo do plano gratuito',
  'Lições e verbos enviados todos os dias no seu WhatsApp',
  'Você configura os dias e o horário em que quer receber',
  'Conversa com o Don Italiano pelo WhatsApp',
  'Lista de verbos com a conjugação completa no site',
]

function FeatureList({ items }) {
  return (
    <ul className="plans-features">
      {items.map((item) => (
        <li key={item}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PlansPage() {
  const goToCheckout = () => {
    window.location.href = CHECKOUT_URL
  }

  return (
    <main className="plans-page">
      <header className="plans-header">
        <span className="lesson-badge">Planos</span>
        <h1>Leve o Don Italiano para o seu WhatsApp</h1>
        <p>
          Continue estudando de graça no site ou receba lições e verbos todos os dias no WhatsApp, nos dias e
          no horário que você escolher.
        </p>
      </header>

      <div className="plans-grid">
        <section className="plans-card">
          <h2>Gratuito</h2>
          <p className="plans-price">
            <strong>R$ 0</strong>
          </p>
          <p className="plans-note">O que você já tem hoje.</p>
          <FeatureList items={FREE_FEATURES} />
        </section>

        <section className="plans-card is-featured">
          <span className="plans-promo">14 dias grátis</span>
          <h2>WhatsApp</h2>
          <p className="plans-price">
            <strong>R$ 14,99</strong>
            <span>/mês</span>
          </p>
          <p className="plans-note">Os primeiros 14 dias são por nossa conta.</p>
          <FeatureList items={PAID_FEATURES} />
          <button type="button" className="plans-cta" onClick={goToCheckout} disabled={!CHECKOUT_URL}>
            Começar 14 dias grátis
          </button>
        </section>
      </div>
    </main>
  )
}
