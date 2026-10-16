import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '@clerk/react'
import './App.css'
import LessonTimePage from './pages/LessonTimePage'
import YourTimePage from './pages/YourTimePage'
import UploadPdfPage from './pages/UploadPdfPage'
import VerbsPage from './pages/VerbsPage'
import VerbCardPage from './pages/VerbCardPage'
import PlansPage from './pages/PlansPage'
import EnablePremiumPage from './pages/EnablePremiumPage'
import WhatsAppPage from './pages/WhatsAppPage'
import CancelSubscriptionPage from './pages/CancelSubscriptionPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import LandingPage from './pages/LandingPage'
import AboutPage from './pages/AboutPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import DonItaliano from './components/DonItaliano'
import WhatsAppInvite from './components/WhatsAppInvite'
import LoadingSpinner from './components/LoadingSpinner'
import Navbar from './components/Navbar'
import { useEffect } from 'react'
import { useUserStore } from './stores/userStore'
import { getUser } from './infra/httpClient'

function AppRoutes() {
  const location = useLocation()

  return (
    <div className="app-shell">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          className="route-page"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/sign-in/*" element={<LoginPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            {/* Páginas institucionais: públicas, linkadas no rodapé. */}
            <Route path="/quem-somos" element={<AboutPage />} />
            <Route path="/termos" element={<TermsPage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />
            {/* Cartão do verbo: público, pra abrir sem conta e pra gerar a imagem do WhatsApp. */}
            <Route path="/verbs/card" element={<VerbCardPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/your-time" element={<YourTimePage />} />
              <Route path="/lesson-time" element={<LessonTimePage />} />
              <Route path="/upload" element={<UploadPdfPage />} />
              <Route path="/verbs" element={<VerbsPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/enable-premium" element={<EnablePremiumPage />} />
              <Route path="/whatsapp" element={<WhatsAppPage />} />
              <Route path="/cancel-subscription" element={<CancelSubscriptionPage />} />
            </Route>
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ProtectedRoute() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const userStore = useUserStore()

  useEffect(() => {
    async function setUser() {
      try {
        const user = await getUser(userId)
        if (user) userStore.setUser(user)
      } catch (err) {
        console.warn('Não foi possível carregar o usuário:', err?.message)
      }
    }
    if (isSignedIn && userId) {
      setUser()
    }
  }, [isSignedIn, userId])

  if (!isLoaded) return <LoadingSpinner />
  if (!Boolean(isSignedIn)) return <Navigate to="/sign-in" replace />

  return <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

function AppContent() {
  const { isSignedIn } = useAuth()
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <DonItaliano>
      <WhatsAppInvite>
        {isSignedIn && !isLanding && <Navbar />}
        <AppRoutes />
      </WhatsAppInvite>
    </DonItaliano>
  )
}

export default App
