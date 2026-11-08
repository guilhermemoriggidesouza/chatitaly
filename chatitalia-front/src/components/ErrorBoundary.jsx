import { Component } from 'react'
import { reportError } from '../services/analytics'

// Segura erros de renderização das páginas públicas (landing e venda): em vez
// de tela branca, mostra um aviso com "Tentar de novo" e manda o erro para o
// console e para o Clarity (services/analytics).
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    reportError(error, this.props.name || 'ErrorBoundary')
    if (info?.componentStack) console.error(info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="error-fallback" role="alert">
        <h2>Ops, algo deu errado.</h2>
        <p>Não conseguimos abrir esta página. Tente carregar de novo.</p>
        <button type="button" className="error-fallback-button" onClick={() => window.location.reload()}>
          Tentar de novo
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
