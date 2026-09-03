import LoadingSpinner from './LoadingSpinner'

// Tela de bloqueio enquanto o modelo de voz baixa. Sem saída até terminar;
// se falhar, a pessoa não entra no app (só recarregar).
export default function ModelGate({ status, progress }) {
  const isError = status === 'error'

  return (
    <div className="model-gate" role="alertdialog" aria-modal="true" aria-live="polite">
      <div className="model-gate-card">
        {isError ? (
          <>
            <h2>Não foi possível preparar o app</h2>
            <p>
              O download do modelo de voz falhou. Verifique sua conexão e tente novamente.
            </p>
            <button
              type="button"
              className="model-gate-button"
              onClick={() => window.location.reload()}
            >
              Tentar de novo
            </button>
          </>
        ) : (
          <>
            <LoadingSpinner size={30} />
            <h2>Preparando o app...</h2>
            <div className="model-gate-bar" aria-hidden="true">
              <div className="model-gate-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="model-gate-pct">{progress}%</span>
          </>
        )}
      </div>
    </div>
  )
}
