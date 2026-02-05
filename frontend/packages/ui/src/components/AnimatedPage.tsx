"use client"

import { type ReactNode } from "react"
import { motion } from "framer-motion"
import { useReducedMotion } from "../hooks"
import { pageEnter, reducedMotion } from "../lib/motion"
import { cn } from "../lib/utils"

interface AnimatedPageProps {
  children: ReactNode
  className?: string
}

function AnimatedPage({ children, className }: AnimatedPageProps) {
  const prefersReducedMotion = useReducedMotion()
  const variants = prefersReducedMotion ? reducedMotion : pageEnter

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

export { AnimatedPage, type AnimatedPageProps }
