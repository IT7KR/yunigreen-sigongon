"use client";

import { Check } from "lucide-react";
import { cn } from "../lib/utils";

export interface StepperProps {
  steps: { label: string; description?: string }[];
  currentStep: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  orientation = "horizontal",
  className,
}: StepperProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className={cn(
        isHorizontal ? "flex items-start" : "flex flex-col",
        className
      )}
    >
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isPending = stepNumber > currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={index}
            className={cn(
              "flex",
              isHorizontal
                ? "flex-1 flex-col items-center"
                : "flex-row items-start"
            )}
          >
            <div
              className={cn(
                "flex",
                isHorizontal ? "flex-col items-center" : "flex-row items-start gap-4"
              )}
            >
              {/* Step Indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors",
                    isCompleted &&
                      "border-green-500 bg-green-500 text-white",
                    isCurrent &&
                      "border-brand-point-500 bg-brand-point-500 text-white",
                    isPending && "border-slate-300 bg-white text-slate-400"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    stepNumber
                  )}
                </div>

                {/* Vertical Connector */}
                {!isHorizontal && !isLast && (
                  <div
                    className={cn(
                      "my-2 h-12 w-0.5",
                      isCompleted ? "bg-green-500" : "bg-slate-300"
                    )}
                  />
                )}
              </div>

              {/* Step Content */}
              <div
                className={cn(
                  isHorizontal ? "mt-2 text-center" : "flex-1"
                )}
              >
                <div
                  className={cn(
                    "text-sm font-medium",
                    isCurrent && "text-brand-point-600",
                    isCompleted && "text-slate-700",
                    isPending && "text-slate-400"
                  )}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div
                    className={cn(
                      "mt-0.5 text-xs",
                      isCurrent && "text-slate-600",
                      isCompleted && "text-slate-500",
                      isPending && "text-slate-400"
                    )}
                  >
                    {step.description}
                  </div>
                )}
              </div>
            </div>

            {/* Horizontal Connector */}
            {isHorizontal && !isLast && (
              <div
                className={cn(
                  "mx-2 mt-5 h-0.5 flex-1",
                  isCompleted ? "bg-green-500" : "bg-slate-300"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
