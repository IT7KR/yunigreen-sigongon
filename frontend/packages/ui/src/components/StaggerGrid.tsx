"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "../hooks"
import { gridItem, gridStagger, motionThresholds } from "../lib/motion"
import { cn } from "../lib/utils"

interface StaggerGridProps<T> {
  items: T[]
  keyExtractor: (item: T, index: number) => string
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  itemClassName?: string
  threshold?: number
}

function StaggerGrid<T>({
  items,
  keyExtractor,
  renderItem,
  className,
  itemClassName,
  threshold = motionThresholds.grid,
}: StaggerGridProps<T>) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = !prefersReducedMotion && items.length <= threshold

  if (!shouldAnimate) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={keyExtractor(item, index)} className={itemClassName}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      className={cn(className)}
      variants={gridStagger}
      initial="hidden"
      animate="visible"
    >
      {items.map((item, index) => (
        <motion.div
          key={keyExtractor(item, index)}
          className={itemClassName}
          variants={gridItem}
          layout
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </motion.div>
  )
}

export { StaggerGrid, type StaggerGridProps }

