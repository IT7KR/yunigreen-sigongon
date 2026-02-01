"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "../hooks/useReducedMotion"

interface CountUpProps {
  end: number
  start?: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  separator?: string
  className?: string
  formatter?: (value: number) => string
}

export function CountUp({
  end,
  start = 0,
  duration = 1.5,
  decimals = 0,
  prefix = "",
  suffix = "",
  separator = ",",
  className,
  formatter,
}: CountUpProps) {
  const [count, setCount] = useState(start)
  const countRef = useRef(start)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    // Skip animation for reduced motion or zero value
    if (prefersReducedMotion || end === 0) {
      setCount(end)
      return
    }

    const startTime = Date.now()
    const startValue = countRef.current

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const current = startValue + (end - startValue) * easedProgress

      countRef.current = current
      setCount(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [end, duration, prefersReducedMotion])

  const formatNumber = (num: number): string => {
    if (formatter) return formatter(num)

    const fixed = num.toFixed(decimals)
    const [whole, decimal] = fixed.split(".")
    const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator)

    return `${prefix}${formatted}${decimal ? `.${decimal}` : ""}${suffix}`
  }

  return <span className={className}>{formatNumber(count)}</span>
}
