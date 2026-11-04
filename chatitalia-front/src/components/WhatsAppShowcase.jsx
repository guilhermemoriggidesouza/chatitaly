import { TESTIMONIALS } from '../data/testimonials'
import { WHATSAPP_SAMPLE_CHAT, WHATSAPP_VIDEO } from '../data/whatsapp'

// Peças da landing e da página de venda do Don no WhatsApp.

// Vídeo do anúncio numa moldura de celular. Só toca quando a pessoa aperta o
// play (sem autoplay: o arquivo tem ~5 MB).
export function WhatsAppVideo() {
  return (
    <figure className="wa-video">
      <video
        src={WHATSAPP_VIDEO.src}
        poster={WHATSAPP_VIDEO.poster}
        controls
        playsInline
        preload="none"
        aria-label="Vídeo: o Don Italiano conversando com um aluno no WhatsApp"
      />
    </figure>
  )
}

// Conversa de exemplo, com cara de WhatsApp: o aluno erra e o Don corrige no
// padrão "Você disse X, mas na verdade é Y, porque...".
export function WhatsAppSampleChat() {
  return (
    <div className="wa-chat" aria-label="Exemplo de conversa com o Don Italiano">
      <div className="wa-chat-header">
        <img src="/don-italiano.png" alt="" aria-hidden="true" />
        <div>
          <strong>Don Italiano</strong>
          <small>online</small>
        </div>
      </div>
      <div className="wa-chat-body">
        <p className="wa-bubble wa-bubble-out">{WHATSAPP_SAMPLE_CHAT.student}</p>
        {WHATSAPP_SAMPLE_CHAT.don.map((line) => (
          <p className="wa-bubble wa-bubble-in" key={line}>{line}</p>
        ))}
        <p className="wa-bubble wa-bubble-in wa-bubble-question">{WHATSAPP_SAMPLE_CHAT.question}</p>
      </div>
    </div>
  )
}

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

// Relatos (data/testimonials.js).
export function Testimonials() {
  return (
    <div className="testimonials">
      {TESTIMONIALS.map((item) => (
        <figure className="testimonial" key={item.name}>
          <blockquote>
            <p>“{item.text}”</p>
          </blockquote>
          <figcaption>
            {item.photo ? (
              <img className="testimonial-avatar" src={item.photo} alt="" aria-hidden="true" />
            ) : (
              <span className="testimonial-avatar" aria-hidden="true">{initials(item.name)}</span>
            )}
            <span>
              <strong>{item.name}</strong>
              {item.role && <small>{item.role}</small>}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
