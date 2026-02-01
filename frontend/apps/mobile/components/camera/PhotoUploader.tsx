"use client";

import { useState, useCallback } from "react";
import { Upload, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { cn } from "@sigongon/ui";
import type { PhotoType } from "./PhotoTypeSelector";

interface PhotoUploadTask {
  id: string;
  file: File;
  type: PhotoType;
  exif?: {
    dateTime?: string;
    latitude?: number;
    longitude?: number;
  };
  status: "pending" | "uploading" | "success" | "failed";
  progress: number;
  error?: string;
}

interface PhotoUploaderProps {
  photos: Array<{
    id: string;
    blob: Blob;
    type: PhotoType;
    facingMode: "user" | "environment";
  }>;
  onUploadComplete: (photoId: string, url: string) => void;
  onUploadError: (photoId: string, error: string) => void;
}

export function PhotoUploader({
  photos,
  onUploadComplete,
  onUploadError,
}: PhotoUploaderProps) {
  const [tasks, setTasks] = useState<Map<string, PhotoUploadTask>>(new Map());

  const extractExif = useCallback(async (file: File) => {
    // In a real implementation, you would use a library like exifr
    // For now, we'll return basic metadata
    return {
      dateTime: new Date().toISOString(),
    };
  }, []);

  const uploadPhoto = useCallback(
    async (photo: typeof photos[0]) => {
      const file = new File([photo.blob], `photo-${photo.id}.jpg`, {
        type: "image/jpeg",
      });

      // Extract EXIF data
      const exif = await extractExif(file);

      // Create upload task
      const task: PhotoUploadTask = {
        id: photo.id,
        file,
        type: photo.type,
        exif,
        status: "pending",
        progress: 0,
      };

      setTasks((prev) => new Map(prev).set(photo.id, task));

      try {
        // Update to uploading
        setTasks((prev) => {
          const next = new Map(prev);
          const current = next.get(photo.id);
          if (current) {
            next.set(photo.id, { ...current, status: "uploading" });
          }
          return next;
        });

        // Simulate upload with progress
        // In real implementation, use FormData and XMLHttpRequest for progress tracking
        const formData = new FormData();
        formData.append("photo", file);
        formData.append("type", photo.type);
        formData.append("facing_mode", photo.facingMode);
        if (exif.dateTime) {
          formData.append("exif_datetime", exif.dateTime);
        }

        // Simulate progress
        for (let i = 0; i <= 100; i += 10) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          setTasks((prev) => {
            const next = new Map(prev);
            const current = next.get(photo.id);
            if (current) {
              next.set(photo.id, { ...current, progress: i });
            }
            return next;
          });
        }

        // Simulate successful upload
        // In real implementation, replace with actual API call
        const mockUrl = URL.createObjectURL(photo.blob);

        setTasks((prev) => {
          const next = new Map(prev);
          const current = next.get(photo.id);
          if (current) {
            next.set(photo.id, {
              ...current,
              status: "success",
              progress: 100,
            });
          }
          return next;
        });

        onUploadComplete(photo.id, mockUrl);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "업로드 실패";

        setTasks((prev) => {
          const next = new Map(prev);
          const current = next.get(photo.id);
          if (current) {
            next.set(photo.id, {
              ...current,
              status: "failed",
              error: errorMessage,
            });
          }
          return next;
        });

        onUploadError(photo.id, errorMessage);
      }
    },
    [extractExif, onUploadComplete, onUploadError]
  );

  const retryUpload = useCallback(
    (photoId: string) => {
      const photo = photos.find((p) => p.id === photoId);
      if (photo) {
        uploadPhoto(photo);
      }
    },
    [photos, uploadPhoto]
  );

  // Auto-upload photos when they're added
  useState(() => {
    photos.forEach((photo) => {
      if (!tasks.has(photo.id)) {
        uploadPhoto(photo);
      }
    });
  });

  const taskList = Array.from(tasks.values());
  const hasActiveTasks = taskList.some(
    (task) => task.status === "pending" || task.status === "uploading"
  );

  if (taskList.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          <Upload className="h-4 w-4" />
          업로드 진행 상황
        </h3>
        {hasActiveTasks && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-brand-point-500" />
            <span className="text-xs text-slate-400">업로드 중</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {taskList.map((task) => (
          <div
            key={task.id}
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              {/* Status icon */}
              <div className="flex-shrink-0">
                {task.status === "success" && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {task.status === "failed" && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                {(task.status === "pending" || task.status === "uploading") && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-point-500 border-t-transparent" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    {task.file.name}
                  </p>
                  {task.status === "uploading" && (
                    <span className="text-xs font-semibold text-brand-point-600">
                      {task.progress}%
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {(task.status === "pending" || task.status === "uploading") && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-brand-point-500 transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}

                {/* Status text */}
                {task.status === "success" && (
                  <p className="text-xs text-green-600">업로드 완료</p>
                )}
                {task.status === "failed" && (
                  <p className="text-xs text-red-600">
                    {task.error || "업로드 실패"}
                  </p>
                )}
              </div>

              {/* Retry button */}
              {task.status === "failed" && (
                <button
                  onClick={() => retryUpload(task.id)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-point-50 text-brand-point-600 transition-colors hover:bg-brand-point-100"
                  aria-label="재시도"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
