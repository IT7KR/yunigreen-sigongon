import type { Variants } from "framer-motion"

// Shared motion tokens
export const motionDurations = {
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
} as const

export const motionEasings = {
  standard: [0.2, 0.8, 0.2, 1],
  entrance: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
} as const

export const motionStagger = {
  fast: 0.04,
  base: 0.06,
  slow: 0.1,
} as const

export const motionThresholds = {
  list: 20,
  grid: 24,
} as const

// Backward-compatible threshold for existing list animations
export const ANIMATION_LIST_THRESHOLD = motionThresholds.list

// Standard animation variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: motionDurations.fast, ease: motionEasings.standard },
  },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDurations.base, ease: motionEasings.entrance },
  },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: motionStagger.fast,
      delayChildren: motionStagger.base,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDurations.fast, ease: motionEasings.entrance },
  },
}

// Reduced motion variants (instant transitions)
export const reducedMotion: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0 } },
}

// Page enter animation
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDurations.base, ease: motionEasings.entrance },
  },
}

// Card hover effect
export const cardHover: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: motionDurations.fast, ease: motionEasings.standard },
  },
}

// Grid stagger (for card grids)
export const gridStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: motionStagger.base,
      delayChildren: motionStagger.fast,
    },
  },
}

// Grid item
export const gridItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDurations.base, ease: motionEasings.entrance },
  },
}

// Button tap effect
export const buttonTap = {
  scale: 0.98,
  transition: { duration: motionDurations.fast, ease: motionEasings.standard },
}
