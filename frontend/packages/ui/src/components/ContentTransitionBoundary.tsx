"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { useReducedMotion } from "../hooks"
import { motionDurations, motionEasings } from "../lib/motion"
import { cn } from "../lib/utils"
import { useNavigationProgress } from "./NavigationProgress"

export interface ContentTransitionBoundaryProps {
  children: ReactNode
  className?: string
  loadingOverlay?: ReactNode
  mode?: "sync" | "wait" | "popLayout"
  overlayDelayMs?: number
}

export function ContentTransitionBoundary({
  children,
  className,
  loadingOverlay,
  mode = "wait",
  overlayDelayMs = 120,
}: ContentTransitionBoundaryProps) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()
  const { done, isNavigating } = useNavigationProgress()
  const [showOverlay, setShowOverlay] = useState(false)
  const routeKey = pathname

  useEffect(() => {
    done()
  }, [done, routeKey])

  useEffect(() => {
    if (!isNavigating) {
      setShowOverlay(false)
      return
    }

    if (overlayDelayMs <= 0) {
      setShowOverlay(true)
      return
    }

    const timer = setTimeout(() => {
      setShowOverlay(true)
    }, overlayDelayMs)

    return () => {
      clearTimeout(timer)
    }
  }, [isNavigating, overlayDelayMs])

  return (
    <div className="relative" data-navigating={isNavigating ? "true" : "false"}>
      <AnimatePresence mode={mode} initial={false}>
        <motion.div
          key={routeKey}
          className={cn(className)}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: motionDurations.base,
                  ease: motionEasings.entrance,
                },
          }}
          exit={{
            opacity: prefersReducedMotion ? 1 : 0,
            y: prefersReducedMotion ? 0 : -6,
            transition: prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: motionDurations.fast,
                  ease: motionEasings.exit,
                },
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showOverlay && loadingOverlay ? (
          <motion.div
            key={`overlay-${routeKey}`}
            className="pointer-events-none absolute inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: prefersReducedMotion
                ? { duration: 0 }
                : { duration: motionDurations.fast, ease: motionEasings.entrance },
            }}
            exit={{
              opacity: 0,
              transition: prefersReducedMotion
                ? { duration: 0 }
                : { duration: motionDurations.fast, ease: motionEasings.exit },
            }}
          >
            {loadingOverlay}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
