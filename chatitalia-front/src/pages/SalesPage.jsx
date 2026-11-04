import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import LandingHeader from '../components/LandingHeader'
import PlanFeatureList from '../components/PlanFeatureList'
import SiteFooter from '../components/SiteFooter'
import WhatsAppTrial from '../components/WhatsAppTrial'
import { Testimonials, WhatsAppSampleChat, WhatsAppVideo } from '../components/WhatsAppShowcase'
import { PAID_FEATURES, PREMIUM_PRICE, TRIAL_DAYS } from '../data/plans'
import { WHATSAPP_FEATURES, WHATSAPP_STEPS } from '../data/whatsapp'

// O problema: quem tem rotina corrida não acha tempo para praticar.
const PROBLEMS = [
  {
    icon: '⏰',
    title: 'Curso com horário fixo',
    text: 'A aula das 19h não cabe numa semana em que o trabalho, o trânsito e a casa já ocupam tudo.',
  },
  {
    icon: '📱',
    title: 'Aplicativo esquecido',
    text: 'Você baixa, faz três dias de exercícios e ele vira só mais um ícone perdido na tela.',
  },
  {
    icon: '🗣️',
    title: 'Ninguém para praticar',
    text: 'Ler e decorar até dá. Mas sem conversar e ser corrigido, o italiano não sai da boca.',
  },
]

const FAQ = [
  {
    question: 'Preciso instalar alguma coisa?',
    answer: 'Não. O Don fala com você pelo WhatsApp que você já usa. Você só cria a conta e informa o seu número.',
  },
  {
    question: 'Posso responder por áudio?',
    answer: 'Pode. Fale em italiano como conseguir: o Don transcreve, corrige e responde em texto e em áudio.',
  },
  {
    question: 'Serve para o meu nível?',
    answer:
      'Serve do A1 ao C2. No começo, o Don explica as correções em português e usa frases bem simples. Do B1 em diante, a conversa é toda em italiano.',
  },
  {
    question: 'E se eu não gostar?',
    answer: `Os primeiros ${TRIAL_DAYS} dias são grátis, e você pode cancelar quando quiser pela página da sua conta.`,
  },
]

// Página de venda do Don Italiano no WhatsApp: problema (falta de tempo
// para praticar) -> solução (o Don no WhatsApp) -> prova (teste de 1 dia,
// relatos) -> oferta.
function SalesPage() {
  const { isSignedIn } = useAuth()
  const subscribeTo = isSignedIn ? '/plans' : '/sign-up?redirect=/plans'

  return (
    <div className="lp">
      <LandingHeader />

      <section className="lp-hero sp-hero">
        <div className="lp-hero-copy">
          <span className="lp-kicker">Para quem tem a rotina corrida</span>
          <h1 className="lp-title">
            Sem tempo para estudar italiano? <span className="lp-title-accent">Ele cabe no seu WhatsApp.</span>
          </h1>
          <p className="lp-lead">
            O <strong>Don Italiano</strong> é um professor que fala com você onde você já está todo dia. Ele
            manda a lição, você responde quando der, por texto ou áudio, e ele corrige cada erro.
          </p>
          <div className="lp-cta-row">
            <Link to={subscribeTo} className="lp-btn lp-btn-primary">Testar {TRIAL_DAYS} dias grátis</Link>
            <a href="#prove" className="lp-btn lp-btn-ghost">Provar hoje, sem cartão</a>
          </div>
        </div>
        <WhatsAppVideo />
      </section>

      <section className="lp-section" id="problema">
        <h2 className="lp-section-title">Você quer aprender. O que falta é tempo.</h2>
        <div className="lp-features">
          {PROBLEMS.map((problem) => (
            <article className="lp-feature" key={problem.title}>
              <span className="lp-feature-icon" aria-hidden="true">{problem.icon}</span>
              <h3>{problem.title}</h3>
              <p>{problem.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section sp-solution" id="como-funciona">
        <span className="lp-kicker lp-kicker-green">A solução</span>
        <h2 className="lp-section-title">O italiano vai até você</h2>
        <div className="sp-solution-grid">
          <ol className="wa-steps">
            {WHATSAPP_STEPS.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <WhatsAppSampleChat />
        </div>
      </section>

      <section className="lp-section">
        <h2 className="lp-section-title">O que chega no seu WhatsApp</h2>
        <div className="lp-features">
          {WHATSAPP_FEATURES.map((feature) => (
            <article className="lp-feature" key={feature.title}>
              <span className="lp-feature-icon" aria-hidden="true">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <WhatsAppTrial />

      <section className="lp-section" id="relatos">
        <h2 className="lp-section-title">Quem já fala com o Don</h2>
        <Testimonials />
      </section>

      <section className="lp-section lp-plans" id="oferta">
        <h2 className="lp-section-title">Comece hoje</h2>
        <div className="sp-offer">
          <section className="plans-card is-featured">
            <span className="plans-promo">{TRIAL_DAYS} dias grátis</span>
            <h3>Don Italiano no WhatsApp</h3>
            <p className="plans-price">
              <strong>{PREMIUM_PRICE}</strong>
              <span>/mês</span>
            </p>
            <p className="plans-note">Os primeiros {TRIAL_DAYS} dias são por nossa conta. Cancele quando quiser.</p>
            <PlanFeatureList items={PAID_FEATURES} />
            <Link to={subscribeTo} className="lp-btn lp-btn-primary lp-plans-cta">
              Assinar com {TRIAL_DAYS} dias grátis
            </Link>
          </section>
        </div>
      </section>

      <section className="lp-section sp-faq" id="perguntas">
        <h2 className="lp-section-title">Perguntas frequentes</h2>
        <div className="sp-faq-list">
          {FAQ.map((item) => (
            <details className="sp-faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <h2>Cinco minutos por dia. No seu WhatsApp.</h2>
        <div className="lp-cta-row lp-final-ctas">
          <Link to={subscribeTo} className="lp-btn lp-btn-primary lp-btn-lg">
            Testar {TRIAL_DAYS} dias grátis
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

export default SalesPage
