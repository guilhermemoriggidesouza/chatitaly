import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import WhatsAppIcon from './WhatsAppIcon'
import { startWhatsTrial } from '../infra/httpClient'
import { isPhoneComplete, maskPhone, PHONE_PREFIX } from '../services/phoneMask'

// Os três níveis do teste: o Don usa o nível pra escolher a complexidade e
// a língua (iniciante recebe as explicações em português).
const LEVELS = [
  { value: 'A1', label: 'Iniciante' },
  { value: 'B1', label: 'Intermediário' },
  { value: 'C1', label: 'Avançado' },
]

// "Não acredita? Clique aqui e prove": a pessoa deixa o nome, o celular e o
// nível e ganha o dia de hoje com o Don no WhatsApp. Ao cadastrar, o Don já
// chama ela com o verbo e a pergunta do dia.
// <dialog> nativo: folha embaixo no celular, centralizado em telas maiores.
function WhatsAppTrial() {
  const dialogRef = useRef(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState(PHONE_PREFIX)
  const [level, setLevel] = useState('A1')
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  // Depois do cadastro: o Don já está chamando. `whatsappUrl` abre a conversa
  // com ele (pode vir vazio se a API não souber o número do Don).
  const [started, setStarted] = useState(false)
  const [whatsappUrl, setWhatsappUrl] = useState('')

  const open = () => dialogRef.current?.showModal()
  const close = () => dialogRef.current?.close()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim()) return setError('Diga o seu nome.')
    if (!isPhoneComplete(phone)) return setError('Informe o seu WhatsApp com DDD.')
    if (!consent) return setError('Marque que aceita receber as mensagens do Don hoje.')

    setSending(true)
    setError('')
    try {
      const data = await startWhatsTrial({ name, phone, level, consent })
      setWhatsappUrl(data.whatsappUrl || '')
      setStarted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="lp-section wa-trial" id="prove">
      <span className="lp-kicker lp-kicker-green">Grátis por 1 dia</span>
      <h2 className="lp-section-title">Não acredita? Clique aqui e prove.</h2>
      <p className="lp-section-lead">
        Deixe o seu WhatsApp e passe o dia de hoje com o Don Italiano: ele manda o verbo do dia e uma
        pergunta, e corrige tudo o que você responder. Sem cartão, sem criar conta.
      </p>
      <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={open}>
        <WhatsAppIcon className="wa-trial-icon" />
        Quero provar hoje
      </button>

      <dialog
        ref={dialogRef}
        className="wa-trial-dialog"
        aria-labelledby="wa-trial-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) close()
        }}
      >
        <div className="wa-trial-content">
          <button type="button" className="wa-trial-close" onClick={close} aria-label="Fechar">
            ×
          </button>

          {started ? (
            <>
              <h2 id="wa-trial-title">Pronto, {name.trim().split(/\s+/)[0]}! O Don já está te chamando.</h2>
              <p>
                Em instantes chega no seu WhatsApp a mensagem do Don, com o verbo e a pergunta do dia. É só
                responder por texto ou áudio.
              </p>
              <p className="wa-trial-note">O acesso vale até o fim de hoje (horário de Brasília).</p>
              {whatsappUrl && (
                <a className="lp-btn lp-btn-primary wa-trial-submit" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="wa-trial-icon" />
                  Abrir o WhatsApp
                </a>
              )}
            </>
          ) : (
            <form className="wa-trial-form" onSubmit={handleSubmit} noValidate>
              <h2 id="wa-trial-title">Prove o Don hoje</h2>

              <label className="wa-trial-field">
                <span>Seu primeiro nome</span>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Maria"
                />
              </label>

              <label className="wa-trial-field">
                <span>Seu WhatsApp</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(maskPhone(event.target.value, phone))}
                  placeholder="+55 (11) 99999-9999"
                />
              </label>

              <fieldset className="wa-trial-field">
                <legend>Seu italiano hoje</legend>
                <div className="wa-trial-levels">
                  {LEVELS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`wa-trial-level ${level === option.value ? 'is-active' : ''}`}
                      aria-pressed={level === option.value}
                      onClick={() => setLevel(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="wa-trial-consent">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                <span>
                  Aceito receber mensagens do Don Italiano no WhatsApp hoje. Li os{' '}
                  <Link to="/termos" target="_blank">termos</Link> e a{' '}
                  <Link to="/privacidade" target="_blank">política de privacidade</Link>.
                </span>
              </label>

              {error && <p className="wa-trial-error" role="alert">{error}</p>}

              <button type="submit" className="lp-btn lp-btn-primary wa-trial-submit" disabled={sending}>
                {sending ? 'Liberando...' : 'Liberar meu dia grátis'}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </section>
  )
}

export default WhatsAppTrial
