import { create } from 'zustand'

const initialRecordingRequest = {
  toListen: '',
  lessonId: '',
}

export const useRecordingStore = create((set) => ({
  recordingRequest: initialRecordingRequest,
  triggerRecording: (payload) =>
    set({
      recordingRequest: {
        toListen: payload?.toListen ?? '',
        lessonId: payload?.lessonId ?? '',
      },
    }),
  resetRecordingRequest: () => set({ recordingRequest: initialRecordingRequest }),
}))