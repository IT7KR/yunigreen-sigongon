"use client"

import { MotionNumber } from "./MotionNumber"

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

function CountUp({
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
  return (
    <MotionNumber
      value={end}
      from={start}
      duration={duration}
      decimals={decimals}
      prefix={prefix}
      suffix={suffix}
      separator={separator}
      className={className}
      formatter={formatter}
    />
  )
}

export { CountUp, type CountUpProps }
