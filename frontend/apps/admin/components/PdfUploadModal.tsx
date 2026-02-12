"use client";

import { useState, useRef } from "react";
import { Upload, File, Loader2, CheckCircle } from "lucide-react";
import { Button, Modal, PrimitiveInput } from "@sigongon/ui";
import { api } from "@/lib/api";

interface PdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PdfUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: PdfUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    message: string;
    count: number;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("PDF 파일만 업로드할 수 있어요");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === "application/pdf") {
      setFile(selectedFile);
      setError(null);
    } else if (selectedFile) {
      setError("PDF 파일만 업로드할 수 있어요");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setError("파일을 선택해주세요");
      return;
    }
    if (!versionLabel.trim()) {
      setError("버전명을 입력해주세요");
      return;
    }
    if (!effectiveFrom) {
      setError("적용일을 선택해주세요");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await api.uploadPricebookPdf(
        file,
        versionLabel.trim(),
        effectiveFrom,
      );

      if (result.success && result.data) {
        setSuccess({
          message: result.data.message,
          count: result.data.staging_items_count,
        });
        onSuccess();
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(result.error?.message || "업로드에 실패했어요");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "업로드에 실패했어요";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setVersionLabel("");
    setEffectiveFrom("");
    setError(null);
    setSuccess(null);
    onClose();
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="PDF 업로드"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragOver
              ? "border-brand-point-500 bg-brand-point-50"
              : "border-slate-300 hover:border-slate-400"
          }`}
        >
          <PrimitiveInput
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="flex items-center justify-center gap-3">
              <File className="h-8 w-8 text-brand-point-500" />
              <div className="text-left">
                <p className="font-medium text-slate-900">{file.name}</p>
                <p className="text-sm text-slate-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">
                클릭하거나 파일을 여기에 드롭하세요
              </p>
              <p className="mt-1 text-xs text-slate-400">PDF 파일만 가능</p>
            </>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            버전명 *
          </label>
          <PrimitiveInput
            type="text"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            placeholder="예: 2026-01"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            적용일 *
          </label>
          <PrimitiveInput
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">업로드 완료!</p>
              <p>{success.message}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
          >
            취소
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              "업로드"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
