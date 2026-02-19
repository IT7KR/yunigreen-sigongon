"use client"

import { forwardRef, useId, type TextareaHTMLAttributes } from "react"
import { cn } from "../lib/utils"

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  rows?: number
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    label,
    error,
    helperText,
    id,
    rows = 3,
    value,
    ...props
  }, ref) => {
    const generatedId = useId()
    const textareaId = id || generatedId

    const hasValue = value !== undefined && value !== ""

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          rows={rows}
          className={cn(
            "flex w-full rounded-lg border bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "resize-none",
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-200"
              : hasValue && !error
              ? "border-brand-point-400 focus:border-brand-point-400 focus:ring-brand-point-100"
              : "border-slate-300 focus:border-brand-point-500 focus:ring-brand-point-200",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
            className
          )}
          ref={ref}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
              ? `${textareaId}-helper`
              : undefined
          }
          value={value}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-sm text-red-500">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${textareaId}-helper`} className="text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
