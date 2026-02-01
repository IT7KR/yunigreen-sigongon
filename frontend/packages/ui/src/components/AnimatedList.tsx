"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "../hooks/useReducedMotion"
import { ANIMATION_LIST_THRESHOLD, staggerContainer, staggerItem } from "../lib/motion"

interface AnimatedListProps<T> {
  items: T[]
  keyExtractor: (item: T) => string
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}

export function AnimatedList<T>({
  items,
  keyExtractor,
  renderItem,
  className,
}: AnimatedListProps<T>) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = !prefersReducedMotion && items.length <= ANIMATION_LIST_THRESHOLD

  if (!shouldAnimate) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={keyExtractor(item)}>{renderItem(item, index)}</div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item)}
            variants={staggerItem}
            layout
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
