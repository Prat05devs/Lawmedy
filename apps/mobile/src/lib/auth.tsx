import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { ApiError, api, publicApi, setToken, setUnauthorizedHandler } from "./api";
import type { User } from "./types";

type AuthState = {
  user: User | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  signup(fullName: string, email: string, password: string): Promise<void>;
  google(idToken: string): Promise<void>;
  logout(): Promise<void>;
};
const Ctx = createContext<AuthState | null>(null);
const KEY = "lawmedy_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const finish = useCallback(async (result: { accessToken: string; user: User }) => {
    setToken(result.accessToken);
    await SecureStore.setItemAsync(KEY, result.accessToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { void logout(); });
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(KEY);
        if (saved) {
          setToken(saved);
          setUser(await api<User>("/users/me"));
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await logout();
      } finally {
        setLoading(false);
      }
    })();
  }, [logout]);

  const value: AuthState = {
    user,
    loading,
    login: async (email, password) =>
      finish(await publicApi("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), password }) })),
    signup: async (fullName, email, password) =>
      finish(await publicApi("/auth/signup", { method: "POST", body: JSON.stringify({ fullName: fullName.trim(), email: email.trim().toLowerCase(), password }) })),
    google: async (idToken) => finish(await publicApi("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) })),
    logout,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
