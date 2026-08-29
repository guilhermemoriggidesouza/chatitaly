import { create } from 'zustand'

// Evento de "tema concluído": dispara o modal de parabéns sobre o Don Italiano.
export const useAchievementStore = create((set) => ({
  achievement: null, // { newTheme: string } | null
  showThemeCompleted: (newTheme) => set({ achievement: { newTheme: newTheme || '' } }),
  clearAchievement: () => set({ achievement: null }),
}))
