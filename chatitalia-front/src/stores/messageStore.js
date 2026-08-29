import { create } from 'zustand'

const initialMessages = [
]

const USER_INTERACTIONS_LIMIT = 10

// Acumula o histórico, mas NUNCA adiciona uma mensagem repetida
// (mesmo role + mesmo content já presente no array).
const appendUnique = (state, role, content) => {
  const alreadyExists = state.messages.some(
    (message) => message.role === role && message.content === content
  )
  if (alreadyExists) {
    return state
  }
  return { messages: [...state.messages, { role, content }] }
}

export const useMessageStore = create((set, get) => ({
  messages: initialMessages,
  clearMessages: () => set({ messages: initialMessages }),
  hasReachedInteractionsLimit: () =>
    get().messages.filter((message) => message.role === 'user').length >= USER_INTERACTIONS_LIMIT,
  pushUserMessage: (content) => set((state) => appendUnique(state, 'user', content)),
  pushSystemMessage: (content) => set((state) => appendUnique(state, 'system', content)),
}))
