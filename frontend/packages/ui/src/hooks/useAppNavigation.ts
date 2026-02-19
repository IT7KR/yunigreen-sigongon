"use client"

import { useRouter } from "next/navigation"
import { useCallback, useTransition } from "react"
import { useNavigationProgress } from "../components/NavigationProgress"
import { runWithViewTransition, supportsViewTransition } from "../lib/viewTransition"

interface NavigationOptions {
  scroll?: boolean
  viewTransition?: boolean
}

interface AppNavigation {
  isPending: boolean
  push: (href: string, options?: NavigationOptions) => void
  replace: (href: string, options?: NavigationOptions) => void
  back: (options?: Pick<NavigationOptions, "viewTransition">) => void
  refresh: (options?: Pick<NavigationOptions, "viewTransition">) => void
  prefetch: (href: string) => Promise<void>
}

export function useAppNavigation(): AppNavigation {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { start } = useNavigationProgress()

  const runNavigation = useCallback(
    (
      navigate: () => void,
      options?: Pick<NavigationOptions, "viewTransition">
    ) => {
      const shouldUseViewTransition = options?.viewTransition ?? true

      start()

      const run = () => {
        startTransition(() => {
          navigate()
        })
      }

      if (!shouldUseViewTransition || !supportsViewTransition()) {
        run()
        return
      }

      runWithViewTransition(run, { enabled: true })
    },
    [start, startTransition]
  )

  const push = useCallback(
    (href: string, options?: NavigationOptions) => {
      runNavigation(
        () => {
          router.push(href, { scroll: options?.scroll })
        },
        options
      )
    },
    [router, runNavigation]
  )

  const replace = useCallback(
    (href: string, options?: NavigationOptions) => {
      runNavigation(
        () => {
          router.replace(href, { scroll: options?.scroll })
        },
        options
      )
    },
    [router, runNavigation]
  )

  const back = useCallback(
    (options?: Pick<NavigationOptions, "viewTransition">) => {
      runNavigation(
        () => {
          router.back()
        },
        options
      )
    },
    [router, runNavigation]
  )

  const refresh = useCallback(
    (options?: Pick<NavigationOptions, "viewTransition">) => {
      runNavigation(
        () => {
          router.refresh()
        },
        options
      )
    },
    [router, runNavigation]
  )

  const prefetch = useCallback(
    async (href: string) => {
      await router.prefetch(href)
    },
    [router]
  )

  return {
    isPending,
    push,
    replace,
    back,
    refresh,
    prefetch,
  }
}
