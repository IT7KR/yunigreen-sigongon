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
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} size="sm">
      {variant === "destructive" && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
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
