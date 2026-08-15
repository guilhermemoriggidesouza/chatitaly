import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { voiceService } from '../services/voiceService'
import { useDonStore } from '../stores/donStore'
import { useRecordingStore } from '../stores/recordingStore'

const DON_IMAGE_SRC = '/don-italiano.png'

function DonItaliano({
  children,
}) {
  const navigate = useNavigate()
  const [message, setMessage] = useState()
  const donEvent = useDonStore((state) => state.donEvent)
  const resetDonEvent = useDonStore((state) => state.resetDonEvent)
  const triggerRecording = useRecordingStore((state) => state.triggerRecording)
  const [isOpen, setIsOpen] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

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
              <p className="don-message">{message}</p>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        className="floating-replay"
        onClick={() => {
          setIsOpen(true)
          if (message) speakMessage(message)
        }}
      >
        {isSpeaking ? 'Escutando...' : 'Escutar novamente'}
      </button>
    </>
  )
}

export default DonItaliano
