"use client";

import { useRef, useEffect, useState, type MouseEvent, type TouchEvent } from "react";
import { cn } from "../lib/utils";
import { Button } from "./Button";

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
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "inline-block rounded-lg border-2 border-slate-300 bg-white",
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
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty || disabled}
        >
          지우기
        </Button>
        {isEmpty && (
          <p className="text-sm text-slate-500 flex items-center">
            서명을 작성해주세요
          </p>
        )}
      </div>
    </div>
  );
}
