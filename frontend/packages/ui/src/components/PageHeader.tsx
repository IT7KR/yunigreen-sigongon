import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cn } from "../lib/utils"

interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: ReactNode
}

const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, actions, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && (
          <p className="mt-1 text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
)
PageHeader.displayName = "PageHeader"

export { PageHeader, type PageHeaderProps }
