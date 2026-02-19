function getDocumentWithViewTransition(): Document | null {
  if (typeof document === "undefined") {
    return null
  }

  return document
}

export function supportsViewTransition(): boolean {
  return Boolean(getDocumentWithViewTransition()?.startViewTransition)
}

export function runWithViewTransition(
  run: () => void,
  options?: { enabled?: boolean }
) {
  const shouldUseViewTransition = options?.enabled ?? true

  if (!shouldUseViewTransition) {
    run()
    return
  }

  const doc = getDocumentWithViewTransition()
  if (!doc?.startViewTransition) {
    run()
    return
  }

  doc.startViewTransition(() => {
    run()
  })
}
