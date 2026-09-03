import { create } from 'zustand'

const initialPayload = {
  toListen: '',
  lessonId: '',
  audio: '', // data URI de áudio (TTS do servidor); se vazio, usa speechSynthesis
}

export const useDonStore = create((set) => ({
  donEvent: initialPayload,
  triggerDon: (payload) =>
    set({
      donEvent: {
        toListen: payload?.toListen ?? '',
        lessonId: payload?.lessonId ?? '',
        audio: payload?.audio ?? '',
      },
    }),
  resetDonEvent: () => set({ donEvent: initialPayload }),
}))
