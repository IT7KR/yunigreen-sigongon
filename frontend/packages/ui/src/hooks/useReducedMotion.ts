"use client"

import { useEffect, useState } from "react"

export function useReducedMotion(): boolean {
  // Default to true on SSR for safe hydration
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)

    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return prefersReducedMotion
}
