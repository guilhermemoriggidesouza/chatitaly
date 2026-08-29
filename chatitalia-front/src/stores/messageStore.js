import { create } from 'zustand'

const initialMessages = [
  {
    role: 'system',
    content: 'Ciao! Io sono Don Italiano. Ti guiderò durante la pratica e ti aiuterò a migliorare la tua pronuncia.',
  },
]

const USER_INTERACTIONS_LIMIT = 4

export const useMessageStore = create((set, get) => ({
  messages: initialMessages,
  clearMessages: () => set({ messages: initialMessages }),
  userInteractionsCount: () =>
    get().messages.filter((message) => message.role === 'user').length,
  hasReachedInteractionsLimit: () =>
    get().messages.filter((message) => message.role === 'user').length >= USER_INTERACTIONS_LIMIT,
  // Limpa o histórico e recomeça com a última fala do agente (a "primeira
  // interação" da nova rodada), descartando as trocas anteriores.
  resetKeepingLastAgentMessage: () =>
    set((state) => {
      const lastAgentMessage = [...state.messages]
        .reverse()
        .find((message) => message.role === 'system')
      return { messages: [lastAgentMessage ?? initialMessages[0]] }
    }),
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