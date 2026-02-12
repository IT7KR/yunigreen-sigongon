"use client"

import { type PageTransitionProps, PageTransition } from "./PageTransition"

interface AnimatedPageProps extends Omit<PageTransitionProps, "styleType"> {}

function AnimatedPage(props: AnimatedPageProps) {
  return <PageTransition styleType="slide-up" {...props} />
}

export { AnimatedPage, type AnimatedPageProps }
