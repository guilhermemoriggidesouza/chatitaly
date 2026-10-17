import { SignUp } from '@clerk/react'
import { useSearchParams } from 'react-router-dom'
import { COMPANY } from '../data/company'

function SignUpPage() {
  // `?redirect=/plans`: pra onde ir depois de entrar. Só caminhos internos
  // do site (começando com "/"), nunca outro domínio.
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const redirectUrl = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : undefined
  return (
    <main className="auth-page">
      <div className="auth-page-brand">
        <span className="auth-page-back">{COMPANY.brand}</span>
        <p>Crie sua conta para comecar a praticar.</p>
      </div>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={redirectUrl ? `/sign-in?redirect=${redirectUrl}` : '/sign-in'}
        forceRedirectUrl={redirectUrl}
      />
    </main>
  )
}

export default SignUpPage