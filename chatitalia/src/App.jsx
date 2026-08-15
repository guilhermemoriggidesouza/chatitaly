import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import './App.css'
import LessonTimePage from './pages/LessonTimePage'
import YourTimePage from './pages/YourTimePage'
import UploadPdfPage from './pages/UploadPdfPage'
import DonItaliano from './components/DonItaliano'

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
            <Route path="/" element={<Navigate to="/your-time" replace />} />
            <Route path="/your-time" element={<YourTimePage />} />
            <Route path="/lesson-time" element={<LessonTimePage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  )
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

  return (
    <DonItaliano>
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
      <AppRoutes />
    </DonItaliano>
  )
}

export default App
