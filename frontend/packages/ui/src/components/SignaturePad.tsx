"use client";

import { useRef, useEffect, useState, type MouseEvent, type TouchEvent } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";

export interface SignaturePadProps {
  width?: number;
  height?: number;
  onSign: (dataUrl: string) => void;
  onClear?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SignaturePad({
  width = 500,
  height = 200,
  onSign,
  onClear,
  className,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Configure drawing style
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [width, height]);

  const getCoordinates = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;

    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;

    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);

    // Export signature as data URL
    if (!isEmpty) {
      const dataUrl = canvas?.toDataURL("image/png");
      if (dataUrl) {
        onSign(dataUrl);
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onClear?.();
  };

  return (
    <div className={cn(className)}>
      <div className="relative">
        <div
          className={cn(
            "block w-full rounded-lg border-2 border-slate-300 bg-white",
            !isEmpty && "border-brand-point-400",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={cn(
              "touch-none",
              !disabled && "cursor-crosshair"
            )}
            style={{ width: "100%", maxWidth: `${width}px`, height: `${height}px` }}
          />
        </div>

        {/* 빈 상태 힌트 */}
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
            <p className="text-sm text-slate-400">여기에 서명해 주세요</p>
          </div>
        )}

        {/* 지우기 오버레이 버튼 */}
        {!isEmpty && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="서명 지우기"
            className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all"
          >
            <RotateCcw className="h-3 w-3" />
            지우기
          </button>
        )}
      </div>
    </div>
  );
}
