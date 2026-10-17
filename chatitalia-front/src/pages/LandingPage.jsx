import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import PlanFeatureList from '../components/PlanFeatureList'
import SiteFooter from '../components/SiteFooter'
import { FREE_FEATURES, PAID_FEATURES, PREMIUM_PRICE, TRIAL_DAYS } from '../data/plans'
import { COMPANY } from '../data/company'

const FEATURES = [
  {
    icon: '💬',
    title: 'Conversação com IA que corrige',
    text: 'Fale em italiano e receba a correção na hora — erro por erro, com o certo ao lado e uma explicação curta. Sem virar aula chata de gramática.',
  },
  {
    icon: '📚',
    title: 'Conteúdo baseado em livros da consolidados',
    text: 'As lições e os temas saem de bibliografia consolidada de italiano. Nada de conteúdo genérico inventado por um chatbot.',
  },
  {
    icon: '📈',
    title: 'Progressão acompanhada',
    text: 'Cada tema e cada lição concluída fica registrada. Você só avança quando realmente domina — e a IA monitora isso por você.',
  },
  {
    icon: '📝',
    title: 'Lições que são resumos dos livros',
    text: 'Cada capítulo do livro vira um resumo claro e direto, pronto para estudar em minutos antes de partir para a conversa.',
  },
  {
    icon: '🎯',
    title: 'Conversa pelos temas da lição',
    text: 'Depois de ler, você pratica exatamente sobre aquele tema. Leitura e fala andam juntas, no mesmo assunto.',
  },
]

// O que o plano premium leva pro WhatsApp do aluno.
const WHATSAPP_FEATURES = [
  {
    icon: '🖼️',
    title: 'Verbo do dia',
    text: 'Um cartão com a conjugação completa do verbo, uma frase de exemplo em cada tempo e o áudio do Don lendo tudo.',
  },
  {
    icon: '❓',
    title: 'Pergunta do dia',
    text: 'O Don pergunta sobre os temas das suas lições, sempre com um assunto diferente, e manda o link direto para a lição.',
  },
  {
    icon: '🎙️',
    title: 'Responda por texto ou áudio',
    text: 'Você responde como preferir e o Don corrige os seus erros na hora, no nível em que você está.',
  },
  {
    icon: '⏰',
    title: 'No seu horário',
    text: 'Você escolhe os dias da semana, o horário e o fuso de cada envio. O progresso nos temas continua no app.',
  },
]

const SHOTS = [
  { src: '/screenshots/shot-1.jpg', alt: 'Don Italiano avisando que o tema atual foi concluído' },
  { src: '/screenshots/shot-2.jpg', alt: 'Lição concluída, com as considerações finais da IA' },
  { src: '/screenshots/shot-3.jpg', alt: 'Progresso da lição: temas já conversados e os que faltam' },
  { src: '/screenshots/shot-4.jpg', alt: 'Resumo da lição em texto, pronto para estudar' },
  { src: '/screenshots/shot-5.jpg', alt: 'Tela Seu momento pronta para gravar o áudio' },
]

function hideBrokenImage(event) {
  event.currentTarget.style.display = 'none'
}

function LandingPage() {
  const { isSignedIn } = useAuth()
  const location = useLocation()

  // Links como "/#planos" (do rodapé de outras páginas): rola até a seção.
  useEffect(() => {
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash])

  const primaryCta = isSignedIn
    ? { to: '/lesson-time', label: 'Ir para as lições' }
    : { to: '/sign-up', label: 'Começar agora' }

  // Assinar: quem já tem conta vai direto pros planos; quem não tem cria a
  // conta e cai nos planos logo em seguida.
  const subscribeTo = isSignedIn ? '/plans' : '/sign-up?redirect=/plans'

  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-brand">
          <img src="/logo-yourlessonia.png" alt="" aria-hidden="true" />
          <span>{COMPANY.brand}</span>
        </div>
        <nav className="lp-header-nav">
          {isSignedIn ? (
            <Link to="/lesson-time" className="lp-btn lp-btn-primary lp-btn-sm">
              Entrar no app
            </Link>
          ) : (
            <>
              <Link to="/sign-in" className="lp-link">Entrar</Link>
              <Link to="/sign-up" className="lp-btn lp-btn-primary lp-btn-sm">Criar conta</Link>
            </>
          )}
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-kicker">Italiano de verdade</span>
          <h1 className="lp-title">
            Não é só conversar. <span className="lp-title-accent">É evoluir.</span>
          </h1>
          <p className="lp-lead">
            Evolua baseado em conteúdo real, monitorado e ajudado pela IA. Você lê o
            resumo da lição, conversa sobre o tema com o <strong>Don Italiano</strong> e
            só avança quando domina de verdade.
          </p>
          <div className="lp-cta-row">
            <Link to={primaryCta.to} className="lp-btn lp-btn-primary">{primaryCta.label}</Link>
            <a href="#whatsapp" className="lp-btn lp-btn-ghost">Don no WhatsApp</a>
          </div>
          <p className="lp-note">
            Leia o resumo, converse sobre o tema e avance quando dominar.
          </p>
        </div>

        <div className="lp-shots" aria-hidden={false}>
          {SHOTS.map((shot, index) => (
            <figure className={`lp-shot lp-shot-${index + 1}`} key={shot.src}>
              <img src={shot.src} alt={shot.alt} loading="lazy" onError={hideBrokenImage} />
            </figure>
          ))}
        </div>
      </section>

      <section className="lp-section" id="features">
        <h2 className="lp-section-title">Tudo que o YourLesson IA faz por você</h2>
        <div className="lp-features">
          {FEATURES.map((feature) => (
            <article className="lp-feature" key={feature.title}>
              <span className="lp-feature-icon" aria-hidden="true">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-whatsapp" id="whatsapp">
        <span className="lp-kicker lp-kicker-green">Novo · Premium</span>
        <h2 className="lp-section-title">O Don Italiano no seu WhatsApp</h2>
        <p className="lp-section-lead">
          Pratique todo dia sem abrir o app: o Don manda o verbo do dia e uma pergunta sobre a sua lição, e
          você responde ali mesmo.
        </p>
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

      <section className="lp-section lp-plans" id="planos">
        <h2 className="lp-section-title">Planos</h2>
        <div className="plans-grid">
          <section className="plans-card">
            <h3>Gratuito</h3>
            <p className="plans-price">
              <strong>R$ 0</strong>
            </p>
            <p className="plans-note">Para estudar no site.</p>
            <PlanFeatureList items={FREE_FEATURES} />
            <Link to={primaryCta.to} className="lp-btn lp-btn-ghost lp-plans-cta">
              {isSignedIn ? 'Ir para as lições' : 'Criar conta grátis'}
            </Link>
          </section>

          <section className="plans-card is-featured">
            <span className="plans-promo">{TRIAL_DAYS} dias grátis</span>
            <h3>Premium</h3>
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
        </div>
      </section>

      <section className="lp-don">
        <img className="lp-don-img" src="/don-italiano.png" alt="Don Italiano" />
        <div className="lp-don-copy">
          <span className="lp-kicker lp-kicker-green">O seu professor</span>
          <p className="lp-quote">
            O Don Italiano não é só uma IA — é um professor especializado, com
            conhecimento autêntico e baseado em livros consolidados.
          </p>
          <p className="lp-don-text">
            Ele corrige, explica, puxa o assunto e acompanha a sua evolução tema a
            tema, sempre dentro do conteúdo da lição que você está estudando.
          </p>
        </div>
      </section>

      <section className="lp-band">
        <p>Prática intensa de conversação e leitura, por temas.</p>
      </section>

      <section className="lp-final">
        <h2>Pronto para falar italiano de verdade?</h2>
        <div className="lp-cta-row lp-final-ctas">
          <Link to={primaryCta.to} className="lp-btn lp-btn-primary lp-btn-lg">
            {primaryCta.label}
          </Link>
          <Link to={subscribeTo} className="lp-btn lp-btn-ghost lp-btn-lg">
            Assinar o Premium
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

export default LandingPage
