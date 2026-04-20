import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, getAdminToken, setAdminSession } from "@/lib/api";

interface Admin {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  admin: Admin | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.admin.me()
      .then((res) => {
        setAdmin({
          id: res.admin.adminId,
          name: res.admin.name,
          email: res.admin.email,
        });
      })
      .catch(() => {
        setAdminSession(null, null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.admin.login(email, password);
    setAdminSession(res.token, res.refreshToken);
    setAdmin(res.admin);
  };

  const logout = async () => {
    await api.admin.logout().catch(() => {});
    setAdminSession(null, null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
