import { create } from 'zustand'


export const useContextChatStore = create((set) => ({
  context: {
    lessonId: undefined,
    lessonTitle: undefined,
    themeId: undefined,
    theme: undefined,
  },
  setContext: (context) =>
    set({
      context
    }),
}))