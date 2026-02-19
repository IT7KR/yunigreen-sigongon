"use client"

import { useEffect, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname, useSearchParams } from "next/navigation"
import { useReducedMotion } from "../hooks"
import { motionDurations, motionEasings } from "../lib/motion"
import { cn } from "../lib/utils"
import {
  NavigationProgress,
  NavigationProgressProvider,
  useNavigationProgress,
} from "./NavigationProgress"

interface RouteTransitionShellProps {
  children: ReactNode
  className?: string
}

function RouteTransitionContent({
  children,
  className,
}: RouteTransitionShellProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const prefersReducedMotion = useReducedMotion()
  const { done, isNavigating } = useNavigationProgress()
  const routeKey = `${pathname}?${searchParams.toString()}`

  useEffect(() => {
    done()
  }, [done, routeKey])

  return (
    <>
      <NavigationProgress />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={routeKey}
          className={cn(className)}
          data-navigating={isNavigating ? "true" : "false"}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
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
            y: prefersReducedMotion ? 0 : -4,
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
    </>
  )
}

export function RouteTransitionShell({
  children,
  className,
}: RouteTransitionShellProps) {
  return (
    <NavigationProgressProvider>
      <RouteTransitionContent className={className}>
        {children}
      </RouteTransitionContent>
    </NavigationProgressProvider>
  )
}
