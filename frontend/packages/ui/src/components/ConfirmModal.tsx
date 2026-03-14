"use client"

import { Modal } from "./Modal"
import { Button } from "./Button"
import { Loader2, AlertTriangle } from "lucide-react"
import { cn } from "../lib/utils"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  loading?: boolean
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" hideHeader>
      <div className="flex flex-col items-center text-center gap-4 pt-2">
        {variant === "destructive" ? (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50">
            <AlertTriangle className="h-6 w-6 text-brand-500" />
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="text-sm leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-8 flex gap-3 w-full">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onClose}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={variant === "destructive" ? "destructive" : "primary"}
          className="flex-1"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export { ConfirmModal, type ConfirmModalProps }
