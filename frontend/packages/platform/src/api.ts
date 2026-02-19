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

// Parse per-domain real API overrides from environment.
// NEXT_PUBLIC_REAL_DOMAINS is a comma-separated list of method-name prefixes
// that should use the real API even when NEXT_PUBLIC_USE_MOCKS=true.
// Example: NEXT_PUBLIC_REAL_DOMAINS=auth,fieldRepresentatives
const _realDomainsEnv = process.env.NEXT_PUBLIC_REAL_DOMAINS ?? "";
const _realDomains = _realDomainsEnv
  ? new Set(_realDomainsEnv.split(",").map((d) => d.trim()).filter(Boolean))
  : new Set<string>();

function shouldUseMock(useMocks: boolean, methodName: string): boolean {
  if (!useMocks) return false;
  // If the method belongs to a "real" domain, bypass mock for that method.
  for (const domain of _realDomains) {
    if (methodName.startsWith(domain)) return false;
  }
  return true;
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

  // When per-domain overrides are configured, wrap with a Proxy so each
  // property access can decide independently whether to use mock or real API.
  // When no overrides are configured this path is never taken, preserving
  // identical behaviour to the previous simple ternary assignment.
  let api: TMockClient;
  if (useMocks && _realDomains.size > 0) {
    api = new Proxy(mockClient as object, {
      get(target, prop, receiver) {
        const methodName = typeof prop === "string" ? prop : "";
        if (shouldUseMock(useMocks, methodName)) {
          return Reflect.get(target, prop, receiver);
        }
        return Reflect.get(realApi as object, prop, realApi);
      },
    }) as unknown as TMockClient;

    // Ensure tokens are loaded for the real API when per-domain overrides exist.
    if (typeof window !== "undefined") {
      const accessToken = getStoredValue("access_token");
      const refreshToken = getStoredValue("refresh_token");

      if (accessToken) {
        realApi.setAccessToken(accessToken);
      }

      if (refreshToken) {
        realApi.setRefreshToken(refreshToken);
      }
    }
  } else {
    api = (useMocks ? mockClient : realApi) as unknown as TMockClient;
  }

  return {
    api,
    realApi,
    useMocks,
  };
}
