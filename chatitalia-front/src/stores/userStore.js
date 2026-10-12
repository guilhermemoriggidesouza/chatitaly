import { create } from 'zustand'

const initialUser = {
  userId: undefined,
  level: undefined,
  // Assinante do plano pago. Sem isso, aparece o convite do WhatsApp.
  premium: false,
}

export const useUserStore = create((set) => ({
  user: initialUser,
  setUser: (user) =>
    set({
      user: {
        userId: user?.userId ?? initialUser.userId,
        level: user?.level,
        premium: Boolean(user?.premium),
      },
    }),
}))