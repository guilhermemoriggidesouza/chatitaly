import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'

// Rotas em que o convite não aparece: a página de planos e a de retorno da
// assinatura (lá o premium está sendo ativado).
const HIDDEN_ON = ['/plans', '/enable-premium']
// "Agora não" vale até fechar a aba; na próxima visita o convite volta.
const DISMISSED_KEY = 'whatsapp-invite-dismissed'

const wasDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

// Envolve o app (igual ao DonItaliano) e mostra, em qualquer tela logada, um
// convite pra receber as lições no WhatsApp enquanto o usuário não for
// premium. Usa <dialog> nativo: foco preso, Esc fecha, fica na
// camada do topo.
function WhatsAppInvite({ children }) {
  const user = useUserStore((state) => state.user)
  const location = useLocation()
  const navigate = useNavigate()
  const dialogRef = useRef(null)
  const [dismissed, setDismissed] = useState(wasDismissed)

  // Só depois que o usuário carregou (userId) e se ele não é premium.
  const shouldShow =
    Boolean(user?.userId) && !user?.premium && !dismissed && !HIDDEN_ON.includes(location.pathname)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (shouldShow && !dialog.open) dialog.showModal()
    if (!shouldShow && dialog.open) dialog.close()
  }, [shouldShow])

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      /* sem sessionStorage: some só até recarregar */
    }
    setDismissed(true)
  }

  const goToPlans = () => {
    dismiss()
    navigate('/plans')
  }

  return (
    <>
      {children}

      <dialog
        ref={dialogRef}
        className="wa-invite"
        aria-labelledby="wa-invite-title"
        onClose={dismiss}
        onClick={(event) => {
          if (event.target === dialogRef.current) dismiss()
        }}
      >
        <div className="wa-invite-content">
          <span className="wa-invite-badge">14 dias grátis</span>
          <h2 id="wa-invite-title">Receba o italiano no seu WhatsApp</h2>
          <p>
            Cadastre seu celular e receba no WhatsApp uma pergunta do Don Italiano sobre a sua lição e o
            verbo do dia para praticar. Você responde, ele corrige. Os dias e o horário é você quem escolhe.
          </p>
          <div className="wa-invite-actions">
            <button type="button" className="wa-invite-primary" onClick={goToPlans}>
              Quero receber
            </button>
            <button type="button" className="wa-invite-secondary" onClick={dismiss}>
              Agora não
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}

export default WhatsAppInvite
