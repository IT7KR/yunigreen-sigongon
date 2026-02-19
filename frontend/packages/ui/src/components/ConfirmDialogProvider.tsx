"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { ConfirmModal } from "./ConfirmModal"

type ConfirmVariant = "default" | "destructive"

export interface ConfirmDialogOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null)

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmDialogOptions>({
    title: "",
    variant: "default",
  })
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null)

  const closeWithResult = useCallback((confirmed: boolean) => {
    setIsOpen(false)
    resolverRef.current?.(confirmed)
    resolverRef.current = null
  }, [])

  const confirm = useCallback((nextOptions: ConfirmDialogOptions) => {
    setOptions({ variant: "default", ...nextOptions })
    setIsOpen(true)

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const value = useMemo<ConfirmDialogContextValue>(() => ({ confirm }), [confirm])

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <ConfirmModal
        isOpen={isOpen}
        onClose={() => closeWithResult(false)}
        onConfirm={() => closeWithResult(true)}
        title={options.title}
        description={options.description}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        variant={options.variant}
      />
    </ConfirmDialogContext.Provider>
  )
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext)

  if (!context) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider")
  }

  return context
}

