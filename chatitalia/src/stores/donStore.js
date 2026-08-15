import { create } from 'zustand'

const initialPayload = {
  toListen: '',
  lessonId: '',
}

export const useDonStore = create((set) => ({
  donEvent: initialPayload,
  triggerDon: (payload) =>
    set({
      donEvent: {
        toListen: payload?.toListen ?? '',
        lessonId: payload?.lessonId ?? '',
      },
    }),
  resetDonEvent: () => set({ donEvent: initialPayload }),
}))
