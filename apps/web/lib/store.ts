import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  business_name: string;
}

interface AuthStore {
  user: User | null;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", accessToken);
          localStorage.setItem("refresh_token", refreshToken);
        }
        set({ user });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.clear();
        }
        set({ user: null });
      },
    }),
    { name: "bizflow-auth" }
  )
);