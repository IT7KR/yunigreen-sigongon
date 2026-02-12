"use client"

import { forwardRef } from "react"
import { InteractiveCard, type InteractiveCardProps } from "./InteractiveCard"

interface AnimatedCardProps extends Omit<InteractiveCardProps, "tapScale"> {}

const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ hoverScale = 1.02, hoverShadow = true, ...props }, ref) => {
    return (
      <InteractiveCard
        ref={ref}
        hoverScale={hoverScale}
        hoverShadow={hoverShadow}
        {...props}
      />
    )
  },
)

AnimatedCard.displayName = "AnimatedCard"

export { AnimatedCard, type AnimatedCardProps }
