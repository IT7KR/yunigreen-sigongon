"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@sigongon/types";
import { api } from "./api";

// ============================================
// Types
// ============================================

interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  organization?: {
    id: string;
    name: string;
  };
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ============================================
// Context
// ============================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === "undefined") {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const accessToken = localStorage.getItem("access_token");

      if (!accessToken) {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        return;
      }

      // Set token in API client
      api.setAccessToken(accessToken);

      try {
        // Fetch current user
        const response = await api.getMe();

        if (response.success && response.data) {
          setState({
            user: response.data as AuthUser,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          // Token invalid, clear storage
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          api.setAccessToken(null);
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        // Clear invalid tokens
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        api.setAccessToken(null);
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);

      if (response.success && response.data) {
        const { access_token, refresh_token, user } = response.data;

        // Store tokens in localStorage and cookies
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", refresh_token);
          // Set cookie for middleware (httpOnly: false for client access)
          document.cookie = `access_token=${access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        }

        // Update state
        setState({
          user: user as AuthUser,
          isLoading: false,
          isAuthenticated: true,
        });

        return { success: true };
      }

      return {
        success: false,
        error: response.error?.message || "로그인에 실패했어요",
      };
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        error: "로그인 중 오류가 발생했어요. 다시 시도해 주세요.",
      };
    }
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      document.cookie = "access_token=; path=/; max-age=0";
    }
    api.setAccessToken(null);

    // Update state
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    // Redirect to login
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    if (!state.isAuthenticated) return;

    try {
      const response = await api.getMe();

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          user: response.data as AuthUser,
        }));
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [state.isAuthenticated]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// ============================================
// Auth Guard Hook
// ============================================

interface UseRequireAuthOptions {
  redirectTo?: string;
  allowedRoles?: UserRole[];
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { redirectTo = "/login", allowedRoles } = options;
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // User doesn't have required role
      router.push("/");
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, redirectTo, router]);

  return {
    user,
    isLoading,
    isAuthenticated,
    hasRequiredRole: allowedRoles
      ? user && allowedRoles.includes(user.role)
      : true,
  };
}
