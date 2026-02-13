"use client"

import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { cn } from "../../lib/utils"

// Types
export type SortDirection = "asc" | "desc" | null

// Root Table
const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

// Table Header
const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn("border-b border-slate-200 bg-slate-50", className)}
      {...props}
    />
  )
)
TableHeader.displayName = "TableHeader"

// Table Body
const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  )
)
TableBody.displayName = "TableBody"

// Table Row
interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  clickable?: boolean
}

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, clickable, onKeyDown, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-slate-100 transition-colors hover:bg-slate-50",
        clickable && "cursor-pointer",
        className
      )}
      role={clickable ? "button" : props.role}
      tabIndex={clickable ? 0 : props.tabIndex}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (!clickable || event.defaultPrevented) {
          return
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          event.currentTarget.click()
        }
      }}
      {...props}
    />
  )
)
TableRow.displayName = "TableRow"

// Table Head Cell
interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean
  sortDirection?: SortDirection
  onSort?: () => void
}

const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, sortable, sortDirection, onSort, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-6 text-left align-middle text-sm font-medium text-slate-500",
        sortable && "cursor-pointer select-none hover:text-slate-900",
        className
      )}
      onClick={sortable ? onSort : undefined}
      aria-sort={sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : undefined}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && (
          <span className="ml-1">
            {sortDirection === "asc" && <ChevronUp className="h-4 w-4" />}
            {sortDirection === "desc" && <ChevronDown className="h-4 w-4" />}
            {sortDirection === null && <ChevronsUpDown className="h-4 w-4 text-slate-300" />}
          </span>
        )}
      </div>
    </th>
  )
)
TableHead.displayName = "TableHead"

// Table Cell
const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("px-6 py-4 align-middle", className)}
      {...props}
    />
  )
)
TableCell.displayName = "TableCell"

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
export type { TableRowProps, TableHeadProps }
