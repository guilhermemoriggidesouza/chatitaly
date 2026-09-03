import { create } from 'zustand'

// Estado do download do modelo de voz (Whisper). Controla o gate de entrada
// na área logada: enquanto não estiver 'ready', o app fica bloqueado.
export const useModelStore = create((set) => ({
  status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
  progress: 0,
  start: () => set({ status: 'loading', progress: 0 }),
  setProgress: (progress) => set({ progress }),
  ready: () => set({ status: 'ready', progress: 100 }),
  fail: () => set({ status: 'error' }),
}))
