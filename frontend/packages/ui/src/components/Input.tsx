"use client"

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react"
import { Check } from "lucide-react"
import { cn } from "../lib/utils"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  validate?: (value: string) => string | undefined
  validateOnBlur?: boolean
  validateOnChange?: boolean
  showSuccessState?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type,
    label,
    error,
    helperText,
    id,
    validate,
    validateOnBlur = false,
    validateOnChange = false,
    showSuccessState = false,
    onBlur,
    onChange,
    value,
    ...props
  }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const [touched, setTouched] = useState(false)
    const [internalError, setInternalError] = useState<string | undefined>()

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true)

      if (validateOnBlur && validate) {
        const errorMessage = validate(e.target.value)
        setInternalError(errorMessage)
      }

      onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (validateOnChange && validate && touched) {
        const errorMessage = validate(e.target.value)
        setInternalError(errorMessage)
      }

      onChange?.(e)
    }

    const displayError = error || internalError
    const currentValue = value?.toString() || ''
    const isValid = showSuccessState && touched && !displayError && currentValue

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
        <div className="relative">
          <input
            type={type}
            id={inputId}
            className={cn(
              "flex h-11 w-full rounded-lg border bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              displayError
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : isValid
                ? "border-green-500 focus:border-green-500 focus:ring-green-200"
                : "border-slate-300 focus:border-brand-point-500 focus:ring-brand-point-200",
              "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
              isValid ? "pr-10" : "",
              className
            )}
            ref={ref}
            aria-invalid={displayError ? "true" : "false"}
            aria-describedby={displayError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            onBlur={handleBlur}
            onChange={handleChange}
            value={value}
            {...props}
          />
          {isValid && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Check className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>
        {displayError && (
          <p id={`${inputId}-error`} className="text-sm text-red-500">
            {displayError}
          </p>
        )}
        {helperText && !displayError && (
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
