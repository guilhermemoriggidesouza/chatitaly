import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import LoadingSpinner from '../components/LoadingSpinner'
import { cancelSubscription, getUser } from '../infra/httpClient'
import { CANCEL_REASONS } from '../data/cancel-reasons'

const formatDate = (iso) => new Date(iso).toLocaleDateString('pt-BR')

// Pedido de cancelamento da assinatura. A API registra o pedido e avisa o
// admin no WhatsApp; a cobrança é cancelada no Mercado Pago depois.
export default function CancelSubscriptionPage() {
  const { userId } = useAuth()
  const dialogRef = useRef(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    getUser(userId)
      .then((data) => !cancelled && setUser(data))
      .catch(() => !cancelled && setError('Não foi possível carregar a sua assinatura.'))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (modalOpen && !dialog.open) dialog.showModal()
    if (!modalOpen && dialog.open) dialog.close()
  }, [modalOpen])

  const handleConfirm = async (event) => {
    event.preventDefault()
    if (!reason) {
      setError('Escolha um motivo.')
      return
    }

    setSending(true)
    setError(null)
    try {
      await cancelSubscription(userId, { reason, comment })
      setUser(await getUser(userId))
      setModalOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <main className="cancel-page cancel-page-centered">
        <LoadingSpinner size={32} color="var(--red-vivid)" />
      </main>
    )
  }

  const request = user?.premiumCancelRequest

  return (
    <main className="cancel-page">
      <header>
        <span className="lesson-badge">Assinatura</span>
        <h1>Cancelar assinatura</h1>
      </header>

      {request ? (
        <section className="cancel-card">
          <h2>Pedido de cancelamento recebido</h2>
          <p>
            Recebemos o seu pedido em {formatDate(request.at)}. A cobrança será cancelada e você continua com o
            Premium até o fim do período já pago.
          </p>
        </section>
      ) : !user?.premium ? (
        <section className="cancel-card">
          <h2>Você não tem uma assinatura ativa</h2>
          <p>
            Conheça o Premium na <Link to="/plans">página de planos</Link>.
          </p>
        </section>
      ) : (
        <section className="cancel-card">
          <p>
            Ao cancelar, as mensagens do Don no WhatsApp e a lista de verbos deixam de ficar disponíveis no fim do
            período já pago. As suas lições e o seu progresso continuam salvos.
          </p>
          <button type="button" className="cancel-button" onClick={() => setModalOpen(true)}>
            Cancelar assinatura
          </button>
        </section>
      )}

      {error && !modalOpen && <p className="cancel-error" role="alert">{error}</p>}

      <dialog
        ref={dialogRef}
        className="cancel-modal"
        aria-labelledby="cancel-modal-title"
        onClose={() => setModalOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setModalOpen(false)
        }}
      >
        <form className="cancel-modal-content" onSubmit={handleConfirm}>
          <h2 id="cancel-modal-title">Deseja mesmo cancelar?</h2>
          <p>Conte o que mais pesou na sua decisão. Isso nos ajuda a melhorar.</p>

          <fieldset className="cancel-reasons">
            <legend>Motivo</legend>
            {CANCEL_REASONS.map((item) => (
              <label key={item} className="cancel-reason">
                <input
                  type="radio"
                  name="reason"
                  value={item}
                  checked={reason === item}
                  onChange={() => setReason(item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </fieldset>

          <label className="cancel-comment">
            <span>Quer contar mais? (opcional)</span>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} rows={3} />
          </label>

          {error && <p className="cancel-error" role="alert">{error}</p>}

          <div className="cancel-modal-actions">
            <button type="submit" className="cancel-button" disabled={sending}>
              {sending ? 'Cancelando...' : 'Sim, cancelar assinatura'}
            </button>
            <button type="button" className="cancel-back" onClick={() => setModalOpen(false)}>
              Voltar
            </button>
          </div>
        </form>
      </dialog>
    </main>
  )
}
