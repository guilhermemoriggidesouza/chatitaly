import { create } from 'zustand'

const initialUser = {
  userId: '1',
  level: undefined,
}

export const useUserStore = create((set) => ({
  user: initialUser,
  setUser: (user) =>
    set({
      user: {
        userId: user?.userId ?? initialUser.userId,
        level: user?.level,
      },
    }),
}))