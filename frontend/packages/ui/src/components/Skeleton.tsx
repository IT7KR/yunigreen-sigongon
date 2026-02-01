import { forwardRef, type HTMLAttributes } from "react"
import { cn } from "../lib/utils"

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
  lines?: number
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "rectangular", width, height, lines = 1, ...props }, ref) => {
    const baseClasses = "animate-pulse bg-slate-200"

    const variantClasses = {
      text: "h-4 rounded",
      circular: "rounded-full",
      rectangular: "rounded-lg",
    }

    const style: React.CSSProperties = {
      width: typeof width === "number" ? `${width}px` : width,
      height: typeof height === "number" ? `${height}px` : height,
    }

    // For text variant with multiple lines
    if (variant === "text" && lines > 1) {
      return (
        <div ref={ref} className="space-y-2" {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={cn(
                baseClasses,
                variantClasses.text,
                // Last line is 75% width for natural appearance
                index === lines - 1 && "w-3/4",
                className
              )}
              style={index === lines - 1 ? { ...style, width: undefined } : style}
            />
          ))}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], className)}
        style={style}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

interface SkeletonAvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
}

const SkeletonAvatar = forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ className, size = 40, ...props }, ref) => {
    return (
      <Skeleton
        ref={ref}
        variant="circular"
        width={size}
        height={size}
        className={className}
        {...props}
      />
    )
  }
)
SkeletonAvatar.displayName = "Skeleton.Avatar"

interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
}

const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, width, height, ...props }, ref) => {
    return (
      <Skeleton
        ref={ref}
        variant="rectangular"
        width={width}
        height={height}
        className={cn("border border-slate-200", className)}
        {...props}
      />
    )
  }
)
SkeletonCard.displayName = "Skeleton.Card"

interface SkeletonTableRowProps extends HTMLAttributes<HTMLDivElement> {
  columns?: number
}

const SkeletonTableRow = forwardRef<HTMLDivElement, SkeletonTableRowProps>(
  ({ className, columns = 5, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex gap-4", className)}
        {...props}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={20}
            className="flex-1"
          />
        ))}
      </div>
    )
  }
)
SkeletonTableRow.displayName = "Skeleton.TableRow"

// Attach compound components
const SkeletonWithCompounds = Object.assign(Skeleton, {
  Avatar: SkeletonAvatar,
  Card: SkeletonCard,
  TableRow: SkeletonTableRow,
})

export { SkeletonWithCompounds as Skeleton, type SkeletonProps, type SkeletonAvatarProps, type SkeletonCardProps, type SkeletonTableRowProps }
