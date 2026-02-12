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
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3">
        {variant === "destructive" && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
        )}
        {description && (
          <p className="pt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        )}
      </div>
      <div className="mt-6 border-t border-slate-100 pt-5 flex gap-3">
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
