"use client"

import { forwardRef, type HTMLAttributes } from "react"
import { motion } from "framer-motion"
import { useReducedMotion } from "../hooks"
import { motionDurations, motionEasings } from "../lib/motion"
import { cn } from "../lib/utils"

export interface InteractiveCardProps extends HTMLAttributes<HTMLDivElement> {
  hoverScale?: number
  tapScale?: number
  hoverShadow?: boolean
}

const InteractiveCard = forwardRef<HTMLDivElement, InteractiveCardProps>(
  (
    {
      hoverScale = 1.01,
      tapScale = 0.995,
      hoverShadow = true,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const prefersReducedMotion = useReducedMotion()

    const baseClassName = cn(
      "rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow",
      hoverShadow && "hover:shadow-md",
      className,
    )

    if (prefersReducedMotion) {
      return (
        <div ref={ref} className={baseClassName} {...props}>
          {children}
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        className={baseClassName}
        whileHover={{
          scale: hoverScale,
          boxShadow: hoverShadow
            ? "0 10px 25px -14px rgb(15 23 42 / 0.45)"
            : undefined,
        }}
        whileTap={{ scale: tapScale }}
        transition={{
          duration: motionDurations.fast,
          ease: motionEasings.standard,
        }}
        {...(props as any)}
      >
        {children}
      </motion.div>
    )
  },
)

InteractiveCard.displayName = "InteractiveCard"

export { InteractiveCard }
