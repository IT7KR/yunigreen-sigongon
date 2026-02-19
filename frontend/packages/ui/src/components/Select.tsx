"use client"

import { forwardRef, useId, type SelectHTMLAttributes } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../lib/utils"

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, value, onChange, className, id, required, disabled, ...props }, ref) => {
    const generatedId = useId()
    const selectId = id || generatedId

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={required}
            style={{ WebkitAppearance: "none", MozAppearance: "none" }}
            className={cn(
              "flex h-11 w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-10 text-base text-slate-900",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : "border-slate-300 focus:border-brand-point-500 focus:ring-brand-point-200",
              "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
              !value && placeholder ? "text-slate-400" : "",
              className
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
        {error && (
          <p id={`${selectId}-error`} className="text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="text-sm text-slate-500">{helperText}</p>
        )}
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
