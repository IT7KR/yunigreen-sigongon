"use client"

import { type ReactNode } from "react"
import { motion, type HTMLMotionProps, type TargetAndTransition } from "framer-motion"
import { useReducedMotion } from "../hooks"
import { motionDurations, motionEasings } from "../lib/motion"
import { cn } from "../lib/utils"

type RevealDirection = "up" | "down" | "left" | "right"

export interface RevealProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  distance?: number
  direction?: RevealDirection
  blur?: boolean
  inView?: boolean
  once?: boolean
}

function getHiddenState(
  direction: RevealDirection,
  distance: number,
  blur: boolean,
): TargetAndTransition {
  const state: TargetAndTransition = { opacity: 0 }

  switch (direction) {
    case "up":
      state.y = distance
      break
    case "down":
      state.y = -distance
      break
    case "left":
      state.x = distance
      break
    case "right":
      state.x = -distance
      break
  }

  if (blur) {
    state.filter = "blur(8px)"
  }

  return state
}

function Reveal({
  children,
  className,
  delay = 0,
  duration = motionDurations.base,
  distance = 12,
  direction = "up",
  blur = false,
  inView = false,
  once = true,
  ...props
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return (
      <div className={cn(className)} {...(props as any)}>
        {children}
      </div>
    )
  }

  const hidden = getHiddenState(direction, distance, blur)
  const visible: TargetAndTransition = {
    opacity: 1,
    x: 0,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration,
      delay,
      ease: motionEasings.entrance,
    },
  }

  const animationProps = inView
    ? {
        initial: hidden,
        whileInView: visible,
        viewport: { once },
      }
    : {
        initial: hidden,
        animate: visible,
      }

  return (
    <motion.div className={cn(className)} {...animationProps} {...props}>
      {children}
    </motion.div>
  )
}

export { Reveal, type RevealDirection }
