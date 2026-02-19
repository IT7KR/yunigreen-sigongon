"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { Button, Card, CardContent, CardHeader, CardTitle, FileUpload, Input, PrimitiveButton, PrimitiveInput, Textarea, toast } from "@sigongon/ui";
import { Upload, ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function PricebookUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function handleUpload() {
    if (!file) {
      toast.error("PDF 파일을 선택해 주세요.");
      return;
    }

    if (!versionLabel) {
      toast.error("버전명을 입력해 주세요.");
      return;
    }

    if (!effectiveFrom) {
      toast.error("적용 시작일을 선택해 주세요.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await api.uploadPricebookPdf(
        file,
        versionLabel,
        effectiveFrom,
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        toast.success("업로드를 시작했어요.");
        setTimeout(() => {
          router.push("/sa/pricebooks");
        }, 500);
      } else {
        toast.error("업로드에 실패했어요. 다시 시도해 주세요.");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("업로드 중 오류가 발생했어요.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <PrimitiveButton
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </PrimitiveButton>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              적산정보 업로드
            </h1>
            <p className="mt-1 text-slate-500">
              새 버전의 적산 PDF를 업로드합니다
            </p>
          </div>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>업로드 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                PDF 파일
              </label>
              <FileUpload
                accept=".pdf"
                maxSize={50 * 1024 * 1024}
                onFiles={(files) => setFile(files[0] || null)}
              />
            </div>

            <Input
              label="버전명"
              placeholder="예: 2026년 상반기"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              required
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                적용 시작일
              </label>
              <PrimitiveInput
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                required
              />
              <p className="mt-1 text-sm text-slate-500">
                이 날짜부터 새 적산 정보가 적용됩니다
              </p>
            </div>

            <Textarea
              label="메모 (선택사항)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="버전에 대한 추가 정보를 입력하세요..."
              rows={4}
            />

            {isUploading && (
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-blue-900">업로드 중...</span>
                  <span className="font-medium text-blue-900">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-blue-100">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {uploadProgress >= 90 && (
                  <p className="mt-2 text-sm text-blue-800">
                    파일 파싱 중... 잠시만 기다려 주세요.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => router.back()}
                disabled={isUploading}
              >
                취소
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading || !file || !versionLabel || !effectiveFrom}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    업로드 및 파싱 시작
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>업로드 안내</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <ul className="list-inside list-disc space-y-2">
              <li>PDF 파일 형식만 지원됩니다</li>
              <li>최대 파일 크기는 50MB입니다</li>
              <li>
                업로드 후 자동으로 파싱이 시작되며, 완료까지 수 분이 소요될 수
                있습니다
              </li>
              <li>
                적용 시작일 이전에 업로드하면 자동으로 예약 적용됩니다
              </li>
              <li>
                파싱이 완료되면 검토 페이지에서 항목을 확인하고 수정할 수
                있습니다
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
