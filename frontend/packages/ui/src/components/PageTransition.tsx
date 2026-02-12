"use client"

import { type ReactNode } from "react"
import { motion, type HTMLMotionProps, type Variants } from "framer-motion"
import { useReducedMotion } from "../hooks"
import {
  fadeIn,
  motionDurations,
  motionEasings,
  pageEnter,
  reducedMotion,
} from "../lib/motion"
import { cn } from "../lib/utils"

const gentleRise: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDurations.base,
      ease: motionEasings.entrance,
    },
  },
}

const variantsByStyle: Record<PageTransitionStyle, Variants> = {
  "slide-up": pageEnter,
  fade: fadeIn,
  "gentle-rise": gentleRise,
}

type PageTransitionStyle = "slide-up" | "fade" | "gentle-rise"

export interface PageTransitionProps
  extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
  className?: string
  styleType?: PageTransitionStyle
}

function PageTransition({
  children,
  className,
  styleType = "slide-up",
  ...props
}: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion()
  const variants = prefersReducedMotion
    ? reducedMotion
    : variantsByStyle[styleType]

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export { PageTransition, type PageTransitionStyle }

