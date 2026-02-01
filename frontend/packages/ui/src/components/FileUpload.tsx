"use client";

import { useRef, useState, type DragEvent } from "react";
import { Upload, X, FileIcon, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./Button";

export interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  onFiles,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      // Check file size
      if (maxSize && file.size > maxSize) {
        errors.push(
          `${file.name}: 파일 크기가 너무 큽니다 (최대 ${formatFileSize(maxSize)})`
        );
        return;
      }

      // Check file type
      if (accept) {
        const acceptedTypes = accept.split(",").map((t) => t.trim());
        const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
        const fileMimeType = file.type.toLowerCase();

        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return fileExtension === type.toLowerCase();
          }
          // Handle MIME types like "image/*"
          if (type.includes("*")) {
            const baseType = type.split("/")[0];
            return fileMimeType.startsWith(baseType);
          }
          return fileMimeType === type;
        });

        if (!isAccepted) {
          errors.push(`${file.name}: 지원하지 않는 파일 형식입니다`);
          return;
        }
      }

      valid.push(file);
    });

    return { valid, errors };
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const { valid, errors: validationErrors } = validateFiles(fileArray);

    setErrors(validationErrors);

    if (valid.length > 0) {
      const newFiles = multiple ? [...selectedFiles, ...valid] : valid;
      setSelectedFiles(newFiles);
      onFiles(newFiles);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFiles(newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging && "border-brand-point-500 bg-brand-point-50",
          !isDragging && !disabled && "border-slate-300 hover:border-brand-point-300 hover:bg-slate-50",
          disabled && "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <Upload className="mx-auto h-12 w-12 text-slate-400" />
        <p className="mt-2 text-sm font-medium text-slate-700">
          파일을 드래그하거나 클릭하여 선택하세요
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {accept && `허용 형식: ${accept}`}
          {maxSize && ` • 최대 크기: ${formatFileSize(maxSize)}`}
        </p>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          {errors.map((error, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            선택된 파일 ({selectedFiles.length})
          </p>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <FileIcon className="h-8 w-8 flex-shrink-0 text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(index);
                }}
                disabled={disabled}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
