import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '@clerk/react'
import './App.css'
import LessonTimePage from './pages/LessonTimePage'
import YourTimePage from './pages/YourTimePage'
import UploadPdfPage from './pages/UploadPdfPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import DonItaliano from './components/DonItaliano'
import LoadingSpinner from './components/LoadingSpinner'
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
            <Route path="/sign-in/*" element={<LoginPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/your-time" element={<YourTimePage />} />
              <Route path="/lesson-time" element={<LessonTimePage />} />
              <Route path="/upload" element={<UploadPdfPage />} />
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
      const user = await getUser(userId)
      userStore.setUser(user)
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
  const navigate = useNavigate()
  const { isSignedIn } = useAuth()

  return (
    <DonItaliano>
      {isSignedIn && (<>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/lesson-time')}
        >
          Ir para página de lição
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/your-time')}
        >
          Ir para página de your time
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/upload')}
        >
          Ir para página de upload
        </button>
      </>)}
      <AppRoutes />
    </DonItaliano>
  )
}

export default App
