import type { Variants } from "framer-motion"

// Animation threshold: skip animation for lists with more items
export const ANIMATION_LIST_THRESHOLD = 20

// Standard animation variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

// Reduced motion variants (instant transitions)
export const reducedMotion: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0 } },
}

// Page enter animation
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
}

// Card hover effect
export const cardHover: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
}

// Grid stagger (for card grids)
export const gridStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

// Grid item
export const gridItem: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
}

// Button tap effect
export const buttonTap = { scale: 0.98, transition: { duration: 0.1 } }
