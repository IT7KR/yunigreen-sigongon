"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, FlipHorizontal, Zap, ZapOff } from "lucide-react";
import { cn } from "@sigongon/ui";

interface CameraCaptureProps {
  onCapture: (blob: Blob, facingMode: "user" | "environment") => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check for flash support
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities?.() as any;
      setHasFlash(!!capabilities?.torch);

    } catch (err) {
      console.error("Camera error:", err);
      setError("카메라를 시작할 수 없습니다. 권한을 확인해주세요.");
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const handleFlipCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
    setFlashEnabled(false);
  };

  const toggleFlash = async () => {
    if (!streamRef.current || !hasFlash) return;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      await videoTrack.applyConstraints({
        // @ts-ignore - torch is not in standard types yet
        advanced: [{ torch: !flashEnabled }],
      });
      setFlashEnabled(prev => !prev);
    } catch (err) {
      console.error("Flash error:", err);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Mirror effect for front camera
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCapture(blob, facingMode);
          }
          setIsCapturing(false);
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Capture error:", err);
      setIsCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          facingMode === "user" && "scale-x-[-1]"
        )}
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="mx-4 max-w-md rounded-xl bg-slate-900 p-6 text-center">
            <p className="text-white">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-brand-point-500 px-6 py-2 text-white"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Top controls */}
      <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-colors hover:bg-black/60"
          aria-label="닫기"
        >
          <X className="h-6 w-6 text-white" />
        </button>

        {/* Flash toggle */}
        {hasFlash && (
          <button
            onClick={toggleFlash}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-sm transition-all",
              flashEnabled
                ? "bg-amber-500/90 text-white"
                : "bg-black/40 text-white hover:bg-black/60"
            )}
            aria-label={flashEnabled ? "플래시 끄기" : "플래시 켜기"}
          >
            {flashEnabled ? (
              <Zap className="h-5 w-5" fill="currentColor" />
            ) : (
              <ZapOff className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-safe">
        <div className="flex items-center justify-between px-8 py-8">
          {/* Spacer */}
          <div className="h-14 w-14" />

          {/* Capture button */}
          <button
            onClick={handleCapture}
            disabled={isCapturing || !!error}
            className="group relative h-20 w-20 disabled:opacity-50"
            aria-label="사진 촬영"
          >
            <div className="absolute inset-0 rounded-full border-4 border-white/80" />
            <div className="absolute inset-2 rounded-full bg-white transition-transform group-hover:scale-90 group-active:scale-75" />
            {isCapturing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-8 w-8 animate-pulse text-brand-point-500" />
              </div>
            )}
          </button>

          {/* Flip camera button */}
          <button
            onClick={handleFlipCamera}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="카메라 전환"
          >
            <FlipHorizontal className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>

      {/* Viewfinder grid */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid"
              width="33.333%"
              height="33.333%"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="white"
                strokeWidth="1"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </div>
  );
}
