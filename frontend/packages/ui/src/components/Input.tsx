"use client"

import { forwardRef, useId, type InputHTMLAttributes } from "react"
import { cn } from "../lib/utils"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-200"
              : "border-slate-300 focus:border-teal-500 focus:ring-teal-200",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
            className
          )}
          ref={ref}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-500">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
