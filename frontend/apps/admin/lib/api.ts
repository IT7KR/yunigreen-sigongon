import { APIClient } from "@yunigreen/api"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export const api = new APIClient({
  baseURL: API_BASE_URL,
  onUnauthorized: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      document.cookie = "access_token=; path=/; max-age=0"
      window.location.href = "/login"
    }
  },
  getRefreshToken: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh_token")
    }
    return null
  },
  onTokenRefresh: (accessToken: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", accessToken)
      document.cookie = `access_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
    }
  },
})

if (typeof window !== "undefined") {
  const accessToken = localStorage.getItem("access_token")
  const refreshToken = localStorage.getItem("refresh_token")
  if (accessToken) {
    api.setAccessToken(accessToken)
  }
  if (refreshToken) {
    api.setRefreshToken(refreshToken)
  }
}
