"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  forwardRef,
  useCallback,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type TouchEvent,
} from "react"
import { runWithViewTransition, supportsViewTransition } from "../lib/viewTransition"
import { useNavigationProgress } from "./NavigationProgress"

type NextLinkProps = ComponentPropsWithoutRef<typeof Link>

export interface AppLinkProps extends NextLinkProps {
  prefetchOnIntent?: boolean
  viewTransition?: boolean
}

function hasNavigationModifier(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

function isInternalHref(href: NextLinkProps["href"]): href is string {
  return typeof href === "string" && href.startsWith("/")
}

export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(
  function AppLink(
    {
      href,
      onClick,
      onMouseEnter,
      onTouchStart,
      target,
      download,
      scroll,
      prefetchOnIntent = true,
      viewTransition = true,
      ...props
    },
    ref
  ) {
    const router = useRouter()
    const { start } = useNavigationProgress()

    const prefetch = useCallback(() => {
      if (!prefetchOnIntent || !isInternalHref(href)) {
        return
      }

      void router.prefetch(href)
    }, [href, prefetchOnIntent, router])

    const handleClick = useCallback(
      (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event)

        if (
          event.defaultPrevented ||
          !isInternalHref(href) ||
          hasNavigationModifier(event) ||
          event.button !== 0 ||
          target === "_blank" ||
          Boolean(download)
        ) {
          return
        }

        start()

        if (!viewTransition || !supportsViewTransition()) {
          return
        }

        event.preventDefault()
        runWithViewTransition(
          () => {
            router.push(href, { scroll })
          },
          { enabled: true }
        )
      },
      [download, href, onClick, router, scroll, start, target, viewTransition]
    )

    const handleMouseEnter = useCallback(
      (event: MouseEvent<HTMLAnchorElement>) => {
        prefetch()
        onMouseEnter?.(event)
      },
      [onMouseEnter, prefetch]
    )

    const handleTouchStart = useCallback(
      (event: TouchEvent<HTMLAnchorElement>) => {
        prefetch()
        onTouchStart?.(event)
      },
      [onTouchStart, prefetch]
    )

    return (
      <Link
        ref={ref}
        href={href}
        target={target}
        download={download}
        scroll={scroll}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleTouchStart}
        {...props}
      />
    )
  }
)
