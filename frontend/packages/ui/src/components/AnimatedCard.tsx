"use client"

import { forwardRef, type HTMLAttributes } from "react"
import { motion } from "framer-motion"
import { useReducedMotion } from "../hooks"
import { cn } from "../lib/utils"

interface AnimatedCardProps extends HTMLAttributes<HTMLDivElement> {
  hoverScale?: number
  hoverShadow?: boolean
}

const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ hoverScale = 1.02, hoverShadow = true, className, children, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion()

    if (prefersReducedMotion) {
      return (
        <div
          ref={ref}
          className={cn(
            "rounded-xl border border-slate-200 bg-white shadow-sm",
            hoverShadow && "hover:shadow-md",
            className
          )}
          {...props}
        >
          {children}
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-xl border border-slate-200 bg-white shadow-sm",
          className
        )}
        whileHover={{ scale: hoverScale, boxShadow: hoverShadow ? "0 4px 12px rgba(0,0,0,0.1)" : undefined }}
        transition={{ duration: 0.2 }}
        {...(props as any)}
      >
        {children}
      </motion.div>
    )
  }
)
AnimatedCard.displayName = "AnimatedCard"

export { AnimatedCard, type AnimatedCardProps }
