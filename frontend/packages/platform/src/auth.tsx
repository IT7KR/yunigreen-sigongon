"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@sigongon/types";

export interface AuthUserBase {
  id: string;
  username?: string;
  email?: string;
  name: string;
  phone?: string;
  role: UserRole;
  organization?: {
    id: string;
    name: string;
  };
  created_at?: string;
  last_login_at?: string;
}

interface LoginSuccessPayload<TUser> {
  access_token: string;
  refresh_token: string;
  user: TUser;
}

interface APIResult<TData> {
  success: boolean;
  data?: TData;
  error?: {
    message?: string;
  };
}

export interface AuthAPI<TUser> {
  setAccessToken(token: string | null): void;
  login(identifier: string, password: string): Promise<APIResult<LoginSuccessPayload<TUser>>>;
  getMe(): Promise<APIResult<TUser>>;
}

interface AuthState<TUser> {
  user: TUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue<TUser> extends AuthState<TUser> {
  login: (
    identifier: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface UseRequireAuthOptions {
  redirectTo?: string;
  allowedRoles?: UserRole[];
}

export interface CreateAuthModuleOptions<TUser extends AuthUserBase> {
  api: AuthAPI<TUser>;
  loginPath?: string;
}

export function createAuthModule<TUser extends AuthUserBase>(
  options: CreateAuthModuleOptions<TUser>,
) {
  const { api, loginPath = "/login" } = options;
  const AuthContext = createContext<AuthContextValue<TUser> | null>(null);

  function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [state, setState] = useState<AuthState<TUser>>({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });

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

        api.setAccessToken(accessToken);

        try {
          const response = await api.getMe();

          if (response.success && response.data) {
            setState({
              user: response.data,
              isLoading: false,
              isAuthenticated: true,
            });
            return;
          }

          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          api.setAccessToken(null);
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        } catch (error) {
          console.error("Auth initialization failed:", error);
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

    const login = useCallback(
      async (identifier: string, password: string) => {
        try {
          const response = await api.login(identifier, password);

          if (response.success && response.data) {
            const { access_token, refresh_token, user } = response.data;

            if (typeof window !== "undefined") {
              localStorage.setItem("access_token", access_token);
              localStorage.setItem("refresh_token", refresh_token);
              document.cookie = `access_token=${access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
            }

            setState({
              user,
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
      },
      [api],
    );

    const logout = useCallback(() => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        document.cookie = "access_token=; path=/; max-age=0";
      }

      api.setAccessToken(null);

      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      router.push(loginPath);
    }, [router]);

    const refreshUser = useCallback(async () => {
      if (!state.isAuthenticated) {
        return;
      }

      try {
        const response = await api.getMe();

        if (response.success && response.data) {
          const user = response.data;
          setState((prev) => ({
            ...prev,
            user,
          }));
        }
      } catch (error) {
        console.error("Failed to refresh user:", error);
      }
    }, [state.isAuthenticated]);

    const value = useMemo<AuthContextValue<TUser>>(
      () => ({
        ...state,
        login,
        logout,
        refreshUser,
      }),
      [state, login, logout, refreshUser],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
      throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
  }

  function useRequireAuth(options: UseRequireAuthOptions = {}) {
    const { redirectTo = loginPath, allowedRoles } = options;
    const router = useRouter();
    const { user, isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
      if (isLoading) {
        return;
      }

      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        router.push("/");
      }
    }, [isLoading, isAuthenticated, user, allowedRoles, redirectTo, router]);

    return {
      user,
      isLoading,
      isAuthenticated,
      hasRequiredRole: allowedRoles
        ? Boolean(user && allowedRoles.includes(user.role))
        : true,
    };
  }

  return {
    AuthProvider,
    useAuth,
    useRequireAuth,
  };
}
