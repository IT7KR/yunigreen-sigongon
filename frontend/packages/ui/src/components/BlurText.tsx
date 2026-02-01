"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "../hooks/useReducedMotion"
import { cn } from "../lib/utils"

interface BlurTextProps {
  text: string
  className?: string
  delay?: number
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span"
}

export function BlurText({
  text,
  className,
  delay = 0,
  as: Component = "span",
}: BlurTextProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <Component className={className}>{text}</Component>
  }

  return (
    <motion.span
      className={cn("inline-block", className)}
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{
        duration: 0.6,
        delay,
        ease: "easeOut",
      }}
    >
      {text}
    </motion.span>
  )
}
