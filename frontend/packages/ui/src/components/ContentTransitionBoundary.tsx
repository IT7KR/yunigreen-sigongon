"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, type ReactNode } from "react"
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
  overlayDelayMs: _overlayDelayMs = 120,
}: ContentTransitionBoundaryProps) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()
  const { done, isNavigating } = useNavigationProgress()
  const routeKey = pathname

  useEffect(() => {
    done()
  }, [done, routeKey])

  return (
    <div className="relative" data-navigating={isNavigating ? "true" : "false"}>
      {/* 네비게이팅 중 이전 콘텐츠를 즉시 숨기고 skeleton을 표시 */}
      <div
        style={{
          opacity: isNavigating ? 0 : undefined,
          pointerEvents: isNavigating ? "none" : undefined,
        }}
      >
        <AnimatePresence mode={mode} initial={false}>
          <motion.div
            key={routeKey}
            className={cn(className)}
            style={{ willChange: "auto" }}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{
              opacity: 1,
              transition: prefersReducedMotion
                ? { duration: 0 }
                : {
                    duration: motionDurations.base,
                    ease: motionEasings.entrance,
                  },
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 네비게이팅 시 즉시(딜레이 없이) skeleton 표시 */}
      <AnimatePresence>
        {isNavigating && loadingOverlay ? (
          <motion.div
            key="loading-overlay"
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
