import { SignUp } from '@clerk/react'
import { Link } from 'react-router-dom'

function SignUpPage() {
  return (
    <main className="auth-page">
      <div className="auth-page-brand">
        <span className="auth-page-back">ChatItaly</span>
        <p>Crie sua conta para comecar a praticar.</p>
      </div>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </main>
  )
}

export default SignUpPage