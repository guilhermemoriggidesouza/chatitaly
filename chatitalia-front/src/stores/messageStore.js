import { create } from 'zustand'

const initialMessages = [
  {
    role: 'system',
    content: 'Ciao! Io sono Don Italiano. Ti guiderò durante la pratica e ti aiuterò a migliorare la tua pronuncia.',
  },
]

export const useMessageStore = create((set) => ({
  messages: initialMessages,
  clearMessages: () => set({ messages: initialMessages }),
  pushUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          role: 'user',
          content,
        },
      ],
    })),
  pushSystemMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          role: 'system',
          content,
        },
      ],
    })),
}))