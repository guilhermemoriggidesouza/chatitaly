import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import LandingHeader from '../components/LandingHeader'
import PlanFeatureList from '../components/PlanFeatureList'
import SiteFooter from '../components/SiteFooter'
import WhatsAppTrial from '../components/WhatsAppTrial'
import { Testimonials, WhatsAppSampleChat, WhatsAppVideo } from '../components/WhatsAppShowcase'
import { FREE_FEATURES, PAID_FEATURES, PREMIUM_PRICE, TRIAL_DAYS } from '../data/plans'
import { WHATSAPP_FEATURES, WHATSAPP_STEPS } from '../data/whatsapp'

// O que vem junto com o Don no WhatsApp: o site, as lições e o CELI. Os
// critérios do CELI são só referência pedagógica: nada aqui pode soar como
// certificação oficial ou parceria com a Università per Stranieri di Perugia
// (o aviso fica no rodapé).
const EXTRAS = [
  {
    icon: '📚',
    title: 'Lições baseadas em livros',
    text: 'Cada capítulo dos livros didáticos mais usados vira um resumo curto, e a pergunta do dia sai dos temas dele.',
  },
  {
    icon: '🎓',
    title: 'Alinhado ao CELI',
    text: 'A gramática e o vocabulário de cada nível seguem o que a prova do CELI cobra, útil para a cidadania (B1).',
  },
  {
    icon: '💻',
    title: 'Conversa no site',
    text: 'No computador, converse com o Don por voz sobre cada tema da lição e acompanhe o seu progresso.',
  },
  {
    icon: '📖',
    title: 'Lista de verbos',
    text: 'A conjugação completa dos verbos mais usados, com o guia de cada tempo, sempre à mão.',
  },
]

function LandingPage() {
  const { isSignedIn } = useAuth()
  const location = useLocation()

  // Links como "/#planos" (do rodapé de outras páginas): rola até a seção.
  useEffect(() => {
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash])

  // Assinar: quem já tem conta vai direto pros planos; quem não tem cria a
  // conta e cai nos planos logo em seguida.
  const subscribeTo = isSignedIn ? '/plans' : '/sign-up?redirect=/plans'
  const freeTo = isSignedIn ? '/lesson-time' : '/sign-up'

  return (
    <div className="lp">
      <LandingHeader />

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-kicker lp-kicker-green">Don Italiano no WhatsApp</span>
          <h1 className="lp-title">
            O seu professor de italiano, <span className="lp-title-accent">direto no WhatsApp.</span>
          </h1>
          <p className="lp-lead">
            Todo dia o <strong>Don Italiano</strong> manda um verbo e uma pergunta para você praticar. Você
            responde por texto ou áudio, quando der, e ele corrige cada erro explicando o porquê. Feito para
            quem quer aprender italiano e não tem tempo sobrando.
          </p>
          <div className="lp-cta-row">
            <Link to={subscribeTo} className="lp-btn lp-btn-primary">Testar {TRIAL_DAYS} dias grátis</Link>
            <Link to="/don-no-whatsapp" className="lp-btn lp-btn-ghost">Ver como funciona</Link>
          </div>
          <p className="lp-note">
            Ainda em dúvida? <a href="#prove">Prove hoje, sem cartão.</a>
          </p>
        </div>

        <WhatsAppVideo />
      </section>

      <section className="lp-section sp-solution" id="whatsapp">
        <h2 className="lp-section-title">Como funciona</h2>
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

      <section className="lp-section lp-plans" id="planos">
        <h2 className="lp-section-title">Planos</h2>
        <div className="plans-grid">
          <section className="plans-card is-featured">
            <span className="plans-promo">{TRIAL_DAYS} dias grátis</span>
            <h3>Don Italiano no WhatsApp</h3>
            <p className="plans-price">
              <strong>{PREMIUM_PRICE}</strong>
              <span>/mês</span>
            </p>
            <p className="plans-note">Os primeiros {TRIAL_DAYS} dias são por nossa conta.</p>
            <PlanFeatureList items={PAID_FEATURES} />
            <Link to={subscribeTo} className="lp-btn lp-btn-primary lp-plans-cta">
              Assinar com {TRIAL_DAYS} dias grátis
            </Link>
          </section>

          <section className="plans-card lp-plan-free">
            <h3>Prefere começar pelo site?</h3>
            <p className="plans-price">
              <strong>R$ 0</strong>
            </p>
            <p className="plans-note">Só no site, sem WhatsApp.</p>
            <PlanFeatureList items={FREE_FEATURES} />
            <Link to={freeTo} className="lp-btn lp-btn-ghost lp-plans-cta">
              {isSignedIn ? 'Ir para as lições' : 'Criar conta grátis'}
            </Link>
          </section>
        </div>
      </section>

      <section className="lp-section lp-extras" id="extras">
        <h2 className="lp-section-title">E ainda tem mais</h2>
        <div className="lp-extras-grid">
          {EXTRAS.map((extra) => (
            <article className="lp-extra" key={extra.title}>
              <span className="lp-feature-icon" aria-hidden="true">{extra.icon}</span>
              <div>
                <h3>{extra.title}</h3>
                <p>{extra.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-don">
        <img className="lp-don-img" src="/don-italiano.png" alt="Don Italiano" />
        <div className="lp-don-copy">
          <span className="lp-kicker lp-kicker-green">O seu professor</span>
          <p className="lp-quote">
            O Don Italiano não é só uma IA: é um professor paciente, que sabe o seu nível e fala com você
            todo dia.
          </p>
          <p className="lp-don-text">
            Ele corrige, explica, puxa o assunto e acompanha a sua evolução, sempre dentro do conteúdo das
            lições que você está estudando.
          </p>
        </div>
      </section>

      <section className="lp-final">
        <h2>Cinco minutos por dia. No seu WhatsApp.</h2>
        <div className="lp-cta-row lp-final-ctas">
          <Link to={subscribeTo} className="lp-btn lp-btn-primary lp-btn-lg">
            Testar {TRIAL_DAYS} dias grátis
          </Link>
          <a href="#prove" className="lp-btn lp-btn-ghost lp-btn-lg">
            Provar hoje, sem cartão
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

export default LandingPage
