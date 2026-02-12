import { APIClient } from "@sigongon/api";

export interface CreateApiBindingOptions<TMockClient> {
  mockClient: TMockClient;
  apiBaseUrl?: string;
  useMocks?: boolean;
  loginPath?: string;
}

function getStoredValue(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(key);
}

function setStoredValue(key: string, value: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (value === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value);
  }
}

function setAccessTokenCookie(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (token === null) {
    document.cookie = "access_token=; path=/; max-age=0";
    return;
  }

  document.cookie = `access_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function createApiBinding<TMockClient>(
  options: CreateApiBindingOptions<TMockClient>,
) {
  const {
    mockClient,
    apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
    useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true",
    loginPath = "/login",
  } = options;

  const realApi = new APIClient({
    baseURL: apiBaseUrl,
    onUnauthorized: () => {
      if (typeof window === "undefined") {
        return;
      }

      setStoredValue("access_token", null);
      setStoredValue("refresh_token", null);
      setAccessTokenCookie(null);

      const currentPath = window.location.pathname;
      if (currentPath !== loginPath) {
        window.location.href = `${loginPath}?redirect=${encodeURIComponent(currentPath)}`;
      }
    },
    getRefreshToken: () => getStoredValue("refresh_token"),
    onTokenRefresh: (accessToken: string) => {
      setStoredValue("access_token", accessToken);
      setAccessTokenCookie(accessToken);
    },
  });

  const api = (useMocks ? mockClient : realApi) as unknown as TMockClient;

  if (typeof window !== "undefined" && !useMocks) {
    const accessToken = getStoredValue("access_token");
    const refreshToken = getStoredValue("refresh_token");

    if (accessToken) {
      realApi.setAccessToken(accessToken);
    }

    if (refreshToken) {
      realApi.setRefreshToken(refreshToken);
    }
  }

  return {
    api,
    realApi,
    useMocks,
  };
}
