"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./Button";

export interface CalendarProps {
  value?: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월"
];

export function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isDisabledDate = (date: Date) => {
    if (disabled) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days: (Date | null)[] = [];

    // Previous month padding
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const handleDateClick = (date: Date) => {
    if (!isDisabledDate(date)) {
      onChange(date);
    }
  };

  const days = generateCalendarDays();

  return (
    <div className={cn("inline-block rounded-lg border border-slate-200 bg-white p-4", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevMonth}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-sm font-semibold text-slate-700">
          {currentMonth.getFullYear()}년 {MONTHS[currentMonth.getMonth()]}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextMonth}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day Headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {DAYS.map((day, index) => (
          <div
            key={day}
            className={cn(
              "text-center text-xs font-medium",
              index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : "text-slate-600"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-9" />;
          }

          const isToday = isSameDay(date, today);
          const isSelected = value ? isSameDay(date, value) : false;
          const isDisabled = isDisabledDate(date);
          const dayOfWeek = date.getDay();

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              disabled={isDisabled}
              className={cn(
                "h-9 w-9 rounded-md text-sm font-medium transition-colors",
                "hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-point-500 focus:ring-offset-1",
                isToday && !isSelected && "border border-brand-point-500 text-brand-point-600",
                isSelected && "bg-brand-point-500 text-white hover:bg-brand-point-600",
                !isSelected && !isToday && dayOfWeek === 0 && "text-red-500",
                !isSelected && !isToday && dayOfWeek === 6 && "text-blue-500",
                !isSelected && !isToday && dayOfWeek !== 0 && dayOfWeek !== 6 && "text-slate-700",
                isDisabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Today Button */}
      {!disabled && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChange(today)}
            disabled={isDisabledDate(today)}
          >
            오늘
          </Button>
        </div>
      )}
    </div>
  );
}
