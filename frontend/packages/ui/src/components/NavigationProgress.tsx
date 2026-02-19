"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { AnimatePresence, motion } from "framer-motion"
import { motionDurations, motionEasings } from "../lib/motion"
import { cn } from "../lib/utils"
import { useReducedMotion } from "../hooks"

interface NavigationProgressContextValue {
  isNavigating: boolean
  start: () => void
  done: () => void
}

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null)

interface NavigationProgressProviderProps {
  children: ReactNode
  minVisibleMs?: number
}

export function NavigationProgressProvider({
  children,
  minVisibleMs = 160,
}: NavigationProgressProviderProps) {
  const [isNavigating, setIsNavigating] = useState(false)
  const startedAtRef = useRef(0)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHideTimer = useCallback(() => {
    if (!hideTimerRef.current) {
      return
    }

    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = null
  }, [])

  const clearSafetyTimer = useCallback(() => {
    if (!safetyTimerRef.current) {
      return
    }

    clearTimeout(safetyTimerRef.current)
    safetyTimerRef.current = null
  }, [])

  const start = useCallback(() => {
    clearHideTimer()
    clearSafetyTimer()
    startedAtRef.current = Date.now()
    setIsNavigating(true)
    safetyTimerRef.current = setTimeout(() => {
      setIsNavigating(false)
      safetyTimerRef.current = null
    }, 6000)
  }, [clearHideTimer, clearSafetyTimer])

  const done = useCallback(() => {
    const elapsed = Date.now() - startedAtRef.current
    const remain = Math.max(minVisibleMs - elapsed, 0)

    clearHideTimer()
    clearSafetyTimer()
    hideTimerRef.current = setTimeout(() => {
      setIsNavigating(false)
      hideTimerRef.current = null
    }, remain)
  }, [clearHideTimer, clearSafetyTimer, minVisibleMs])

  useEffect(
    () => () => {
      clearHideTimer()
      clearSafetyTimer()
    },
    [clearHideTimer, clearSafetyTimer]
  )

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target as Element | null
      const anchor = target?.closest("a")

      if (
        !anchor ||
        !anchor.href ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return
      }

      const nextUrl = new URL(anchor.href, window.location.href)
      const currentUrl = new URL(window.location.href)
      const nextPathWithSearch = `${nextUrl.pathname}${nextUrl.search}`
      const currentPathWithSearch = `${currentUrl.pathname}${currentUrl.search}`

      if (
        nextUrl.origin !== currentUrl.origin ||
        nextPathWithSearch === currentPathWithSearch
      ) {
        return
      }

      start()
    }

    document.addEventListener("click", handleClick, true)
    return () => {
      document.removeEventListener("click", handleClick, true)
    }
  }, [start])

  const value = useMemo(
    () => ({
      isNavigating,
      start,
      done,
    }),
    [done, isNavigating, start]
  )

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
    </NavigationProgressContext.Provider>
  )
}

export function useNavigationProgress(): NavigationProgressContextValue {
  const context = useContext(NavigationProgressContext)

  if (!context) {
    throw new Error(
      "useNavigationProgress must be used within NavigationProgressProvider"
    )
  }

  return context
}

interface NavigationProgressProps {
  className?: string
}

export function NavigationProgress({ className }: NavigationProgressProps) {
  const prefersReducedMotion = useReducedMotion()
  const { isNavigating } = useNavigationProgress()

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          key="navigation-progress"
          className={cn(
            "pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden",
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: motionDurations.fast },
          }}
        >
          {prefersReducedMotion ? (
            <div className="h-full w-full bg-brand-point-500" />
          ) : (
            <motion.div
              className="h-full origin-left bg-brand-point-500"
              initial={{ scaleX: 0.12 }}
              animate={{ scaleX: [0.12, 0.45, 0.72, 0.88] }}
              exit={{
                scaleX: 1,
                transition: {
                  duration: motionDurations.fast,
                  ease: motionEasings.entrance,
                },
              }}
              transition={{
                duration: 1.2,
                ease: motionEasings.standard,
                repeat: Infinity,
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
