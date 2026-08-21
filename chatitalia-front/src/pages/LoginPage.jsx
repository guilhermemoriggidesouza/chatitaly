import { SignIn } from '@clerk/react'
import { Link } from 'react-router-dom'

function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-page-brand">
        <span className="auth-page-back">Chat Italia</span>
        <p>Continue sua pratica de italiano.</p>
      </div>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </main>
  )
}

export default LoginPage