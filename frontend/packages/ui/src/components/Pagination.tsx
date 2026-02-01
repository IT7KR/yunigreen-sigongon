"use client"

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "../lib/utils"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  siblingCount?: number
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i)

  const generatePages = (): (number | "dots")[] => {
    const totalNumbers = siblingCount * 2 + 3
    const totalBlocks = totalNumbers + 2

    if (totalPages <= totalBlocks) {
      return range(1, totalPages)
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

    const showLeftDots = leftSiblingIndex > 2
    const showRightDots = rightSiblingIndex < totalPages - 1

    if (!showLeftDots && showRightDots) {
      const leftRange = range(1, 3 + 2 * siblingCount)
      return [...leftRange, "dots", totalPages]
    }

    if (showLeftDots && !showRightDots) {
      const rightRange = range(totalPages - (2 + 2 * siblingCount), totalPages)
      return [1, "dots", ...rightRange]
    }

    const middleRange = range(leftSiblingIndex, rightSiblingIndex)
    return [1, "dots", ...middleRange, "dots", totalPages]
  }

  const pages = generatePages()

  if (totalPages <= 1) return null

  return (
    <nav className={cn("flex items-center justify-center gap-1", className)} aria-label="페이지 네비게이션">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="이전 페이지"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((page, index) =>
        page === "dots" ? (
          <span key={`dots-${index}`} className="flex h-9 w-9 items-center justify-center">
            <MoreHorizontal className="h-4 w-4 text-slate-400" />
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              currentPage === page
                ? "bg-brand-point-500 text-white"
                : "hover:bg-slate-100 text-slate-600"
            )}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="다음 페이지"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}
