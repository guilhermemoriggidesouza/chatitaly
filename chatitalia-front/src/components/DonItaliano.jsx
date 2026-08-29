import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { voiceService } from '../services/voiceService'
import { isTranslatorSupported, translateToPtBr } from '../services/translator'
import { useDonStore } from '../stores/donStore'
import { useRecordingStore } from '../stores/recordingStore'
import { useAchievementStore } from '../stores/achievementStore'

const DON_IMAGE_SRC = '/don-italiano.png'

function DonItaliano({
  children,
}) {
  const navigate = useNavigate()
  const [message, setMessage] = useState()
  const donEvent = useDonStore((state) => state.donEvent)
  const resetDonEvent = useDonStore((state) => state.resetDonEvent)
  const triggerRecording = useRecordingStore((state) => state.triggerRecording)
  const achievement = useAchievementStore((state) => state.achievement)
  const clearAchievement = useAchievementStore((state) => state.clearAchievement)
  const [isOpen, setIsOpen] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [translation, setTranslation] = useState(null)
  const [showTranslation, setShowTranslation] = useState(false)
  // 'idle' | 'loading' | 'ready' | 'error' | 'unsupported'
  const [translationState, setTranslationState] = useState('idle')
  const translatorSupported = isTranslatorSupported()

  const handleTranslate = async (event) => {
    event.stopPropagation()
    if (translationState === 'loading') return

    if (translation) {
      setShowTranslation((visible) => !visible)
      return
    }

    setTranslationState('loading')
    try {
      const translated = await translateToPtBr(message)
      if (translated) {
        setTranslation(translated)
        setShowTranslation(true)
        setTranslationState('ready')
      } else {
        setTranslationState('unsupported')
      }
    } catch {
      setTranslationState('error')
    }
  }

  const closeDonModal = () => {
    setIsOpen(false)
    voiceService.stopSpeaking()
    setIsSpeaking(false)
  }

  const speakMessage = (message) => {
    voiceService.speakItalian(message, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => { setIsSpeaking(false) },
      onError: () => setIsSpeaking(false),
    })
  }

  useEffect(() => {
    console.log(donEvent.toListen)
    if (!donEvent.toListen && !donEvent.lessonId) {
      return
    }

    setMessage(donEvent.toListen)
    setTranslation(null)
    setShowTranslation(false)
    setTranslationState('idle')
    setIsOpen(true)
    speakMessage(donEvent.toListen)
    resetDonEvent()
  }, [donEvent, speakMessage, resetDonEvent])

  return (
    <>
      {children}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="don-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={closeDonModal}
          >
            <motion.div
              className="don-guide"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              onClick={closeDonModal}
            >
              <button
                type="button"
                className="don-close"
                onClick={(event) => {
                  event.stopPropagation()
                  closeDonModal()
                }}
                aria-label="Fechar guia"
              >
                ×
              </button>

              <img className="don-image" src={DON_IMAGE_SRC} alt="Don Italiano" />
              <div className="don-response-actions">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={showTranslation ? 'pt' : 'it'}
                    className={`don-message ${showTranslation ? 'is-translation' : ''}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {showTranslation && translation ? translation : message}
                  </motion.p>
                </AnimatePresence>

                {translatorSupported && (
                  <button
                    type="button"
                    className="don-translate-button"
                    onClick={handleTranslate}
                    disabled={translationState === 'loading' || translationState === 'unsupported'}
                  >
                    {translationState === 'loading'
                      ? 'Traduzindo...'
                      : translationState === 'error'
                        ? 'Tentar traduzir de novo'
                        : translationState === 'unsupported'
                          ? 'Tradução indisponível'
                          : showTranslation
                            ? 'Ver original'
                            : 'Traduzir para PT-BR'}
                  </button>
                )}

                <button
                  type="button"
                  className="don-lesson-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    triggerRecording({
                      toListen: message,
                      lessonId: donEvent.lessonId,
                    })
                    closeDonModal()
                    navigate('/your-time')
                  }}
                >
                  Responder
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {achievement && (
          <motion.div
            className="achievement-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={clearAchievement}
          >
            <motion.div
              className="achievement-card"
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="achievement-text">
                Parabéns, você concluiu o tema atual!!
                agora vamos falar de: <strong>{achievement.newTheme}</strong>
              </p>
              <button type="button" className="achievement-button" onClick={clearAchievement}>
                Continuar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {message && (
        <button
          type="button"
          className="floating-replay"
          onClick={() => {
            setIsOpen(true)
            speakMessage(message)
          }}
        >
          {isSpeaking ? 'Escutando...' : 'Escutar novamente'}
        </button>
      )}
    </>
  )
}

export default DonItaliano
