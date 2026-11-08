import { Link, Navigate } from 'react-router-dom'
import { SignUp, useAuth } from '@clerk/react'
import LoadingSpinner from '../components/LoadingSpinner'
import { COMPANY } from '../data/company'

// Para onde a pessoa vai depois do cadastro: o curso gratuito.
const AFTER_SIGNUP = '/lesson-time'

const POINTS = [
  { icon: '📚', text: 'Lições curtas baseadas nos livros didáticos, do A1 ao B1' },
  { icon: '🗣️', text: 'Converse por voz com o Don Italiano sobre cada tema' },
  { icon: '🆓', text: 'Grátis e sem cartão' },
]

// Como o curso grátis funciona, em três passos.
const STEPS = [
  {
    icon: '📝',
    title: '1. Leia o resumo',
    text: 'Cada capítulo dos livros didáticos mais usados vira um resumo curto, para estudar em poucos minutos.',
  },
  {
    icon: '🎙️',
    title: '2. Converse com o Don',
    text: 'Fale em italiano sobre o tema da lição. O Don corrige cada erro na hora e explica o porquê.',
  },
  {
    icon: '📈',
    title: '3. Avance de tema',
    text: 'Você só passa para o próximo tema quando domina o atual, seguindo os critérios do CELI.',
  },
]

// Prints do sistema, na ordem de uso, com a legenda visível.
const SHOTS = [
  { src: '/screenshots/shot-3.jpg', caption: 'O resumo da lição, pronto para estudar' },
  { src: '/screenshots/shot-5.jpg', caption: 'Fale em italiano: grave a sua resposta' },
  { src: '/screenshots/shot-4.jpg', caption: 'Confira o texto da sua fala antes de enviar' },
  { src: '/screenshots/shot-1.jpg', caption: 'O Don corrige a sua fala e continua a conversa' },
  { src: '/screenshots/shot-2.jpg', caption: 'O Don explica o tema da lição' },
  // Print do celular (em pé): fica centralizado num cartão do mesmo tamanho.
  { src: '/screenshots/shot-whatsapp.jpg', caption: 'No Premium, o Don corrige e responde no seu WhatsApp', phone: true },
]

function hideBrokenImage(event) {
  event.currentTarget.closest('figure').style.display = 'none'
}

// Porta de entrada (/comece): a pessoa chega, lê o essencial e se cadastra
// na hora, com o formulário do Clerk já na tela. O celular é um campo do
// próprio cadastro do Clerk; o webhook user.created (API) salva o número como
// o WhatsApp do aluno, e as mensagens do Don começam quando ele assinar.
function StartPage() {
  const { isLoaded, isSignedIn } = useAuth()

  if (isSignedIn) return <Navigate to={AFTER_SIGNUP} replace />

  return (
    <div className="lp start-page">
      <header className="lp-header start-header">
        <Link to="/" className="lp-brand lp-brand-link">
          <img src="/logo-yourlessonia.png" alt="" aria-hidden="true" />
          <span>{COMPANY.brand}</span>
        </Link>
      </header>

      <main className="start-main">
        <section className="start-pitch">
          <span className="lp-kicker lp-kicker-green">Curso grátis</span>
          <h1 className="start-title">Aprenda italiano de graça com o Don Italiano.</h1>
          <ul className="start-points">
            {POINTS.map((point) => (
              <li key={point.text}>
                <span aria-hidden="true">{point.icon}</span>
                {point.text}
              </li>
            ))}
          </ul>
          <p className="start-hint">
            No cadastro, use o celular com WhatsApp: ele já fica salvo para quando você quiser o Don por lá.
          </p>
        </section>

        <section className="start-form" id="cadastro">
          {isLoaded ? (
            <SignUp
              routing="path"
              path="/comece"
              signInUrl={`/sign-in?redirect=${AFTER_SIGNUP}`}
              forceRedirectUrl={AFTER_SIGNUP}
            />
          ) : (
            <div className="start-loading">
              <LoadingSpinner size={32} color="var(--red-vivid)" />
            </div>
          )}
        </section>
      </main>

      <section className="lp-section start-section">
        <h2 className="lp-section-title">Como funciona</h2>
        <div className="lp-features">
          {STEPS.map((step) => (
            <article className="lp-feature" key={step.title}>
              <span className="lp-feature-icon" aria-hidden="true">{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section start-section">
        <h2 className="lp-section-title">Veja por dentro</h2>
        <div className="start-shots">
          {SHOTS.map((shot) => (
            <figure className={`start-shot${shot.phone ? ' start-shot-phone' : ''}`} key={shot.src}>
              <div className="start-shot-frame">
                <img src={shot.src} alt={shot.caption} loading="lazy" onError={hideBrokenImage} />
              </div>
              <figcaption>{shot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="lp-final start-final">
        <h2>Comece hoje, de graça.</h2>
        <a href="#cadastro" className="lp-btn lp-btn-primary lp-btn-lg">
          Criar minha conta
        </a>
      </section>

      <p className="start-legal">
        Ao criar a conta, você aceita os <Link to="/termos">Termos de uso</Link> e a{' '}
        <Link to="/privacidade">Política de privacidade</Link>.
      </p>
    </div>
  )
}

export default StartPage
