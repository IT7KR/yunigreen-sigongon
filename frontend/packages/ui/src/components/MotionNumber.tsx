"use client"

import { useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react"
import { useReducedMotion } from "../hooks"

const easeOutCubic = (progress: number): number => 1 - (1 - progress) ** 3

export interface MotionNumberProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number
  from?: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  separator?: string
  locale?: string
  formatter?: (value: number) => string
  easing?: (progress: number) => number
}

function MotionNumber({
  value,
  from,
  duration = 1.2,
  decimals = 0,
  prefix = "",
  suffix = "",
  separator = ",",
  locale,
  formatter,
  easing = easeOutCubic,
  className,
  ...props
}: MotionNumberProps) {
  const prefersReducedMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState(value)
  const latestValueRef = useRef(from ?? value)

  useEffect(() => {
    const targetValue = Number.isFinite(value) ? value : 0

    if (prefersReducedMotion || duration <= 0) {
      setDisplayValue(targetValue)
      latestValueRef.current = targetValue
      return
    }

    const startValue = Number.isFinite(from ?? latestValueRef.current)
      ? (from ?? latestValueRef.current)
      : 0

    if (startValue === targetValue) {
      setDisplayValue(targetValue)
      latestValueRef.current = targetValue
      return
    }

    let frameId = 0
    const startAt = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startAt
      const progress = Math.min(elapsed / (duration * 1000), 1)
      const easedProgress = easing(progress)
      const nextValue = startValue + (targetValue - startValue) * easedProgress
      setDisplayValue(nextValue)

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate)
        return
      }

      latestValueRef.current = targetValue
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [value, from, duration, easing, prefersReducedMotion])

  const displayText = useMemo(() => {
    const roundedValue = Number.isFinite(displayValue) ? displayValue : 0

    if (formatter) {
      return formatter(roundedValue)
    }

    if (locale) {
      const localized = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(roundedValue)
      return `${prefix}${localized}${suffix}`
    }

    const fixed = roundedValue.toFixed(decimals)
    const [whole, decimal] = fixed.split(".")
    const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    return `${prefix}${formattedWhole}${decimal ? `.${decimal}` : ""}${suffix}`
  }, [decimals, displayValue, formatter, locale, prefix, separator, suffix])

  return (
    <span className={className} {...props}>
      {displayText}
    </span>
  )
}

export { MotionNumber }

