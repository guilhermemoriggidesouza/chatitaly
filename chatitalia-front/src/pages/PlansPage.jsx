import PlanFeatureList from '../components/PlanFeatureList'
import { FREE_FEATURES, PAID_FEATURES, PREMIUM_PRICE, TRIAL_DAYS } from '../data/plans'

// Link de pagamento da assinatura no Mercado Pago. Vem do ambiente
// (VITE_MERCADO_PAGO_URL); enquanto não estiver definido, o botão fica
// desabilitado.
const CHECKOUT_URL = import.meta.env.VITE_MERCADO_PAGO_URL || ''

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
          Continue estudando de graça no site ou pratique no WhatsApp com a pergunta do dia e o verbo do dia,
          nos dias e no horário que você escolher.
        </p>
      </header>

      <div className="plans-grid">
        <section className="plans-card">
          <h2>Gratuito</h2>
          <p className="plans-price">
            <strong>R$ 0</strong>
          </p>
          <p className="plans-note">O que você já tem hoje.</p>
          <PlanFeatureList items={FREE_FEATURES} />
        </section>

        <section className="plans-card is-featured">
          <span className="plans-promo">{TRIAL_DAYS} dias grátis</span>
          <h2>WhatsApp</h2>
          <p className="plans-price">
            <strong>{PREMIUM_PRICE}</strong>
            <span>/mês</span>
          </p>
          <p className="plans-note">Os primeiros {TRIAL_DAYS} dias são por nossa conta.</p>
          <PlanFeatureList items={PAID_FEATURES} />
          <button type="button" className="plans-cta" onClick={goToCheckout} disabled={!CHECKOUT_URL}>
            Começar {TRIAL_DAYS} dias grátis
          </button>
        </section>
      </div>
    </main>
  )
}
