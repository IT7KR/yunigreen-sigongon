import { APIClient } from "@yunigreen/api"
import { mockApiClient } from "./mocks/mockApi"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true"

const realApi = new APIClient({
  baseURL: API_BASE_URL,
  onUnauthorized: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      document.cookie = "access_token=; path=/; max-age=0"
      
      const currentPath = window.location.pathname
      if (currentPath !== "/login") {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
      }
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

export const api = (USE_MOCKS ? mockApiClient : realApi) as unknown as APIClient

if (typeof window !== "undefined" && !USE_MOCKS) {
  const accessToken = localStorage.getItem("access_token")
  const refreshToken = localStorage.getItem("refresh_token")
  if (accessToken) {
    realApi.setAccessToken(accessToken)
  }
  if (refreshToken) {
    realApi.setRefreshToken(refreshToken)
  }
}
