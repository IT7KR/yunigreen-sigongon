"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Loader2, X, UploadCloud } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, PrimitiveButton, PrimitiveInput, Textarea } from "@sigongon/ui";
import { api } from "@/lib/api";
import type { PhotoType, VisitType } from "@sigongon/types";

const VISIT_TYPES: Array<{ value: VisitType; label: string }> = [
  { value: "initial", label: "최초 방문" },
  { value: "progress", label: "진행 점검" },
  { value: "completion", label: "준공 확인" },
];

const PHOTO_TYPES: Array<{ value: PhotoType; label: string }> = [
  { value: "before", label: "시공 전" },
  { value: "during", label: "시공 중" },
  { value: "after", label: "시공 후" },
  { value: "detail", label: "상세" },
];

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
  type: PhotoType;
}

export default function NewVisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [visitType, setVisitType] = useState<VisitType>("initial");
  const [visitedAt, setVisitedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [estimatedAreaM2, setEstimatedAreaM2] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [currentPhotoType, setCurrentPhotoType] = useState<PhotoType>("before");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("이미지 파일만 업로드할 수 있어요.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("사진 용량은 10MB 이하만 지원해요.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => [
          ...prev,
          {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            file,
            preview: String(reader.result),
            type: currentPhotoType,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const created = await api.createSiteVisit(projectId, {
        visit_type: visitType,
        visited_at: new Date(visitedAt).toISOString(),
        estimated_area_m2: estimatedAreaM2.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!created.success || !created.data?.id) {
        setErrorMessage(created.error?.message || "현장방문 생성에 실패했어요.");
        setIsSubmitting(false);
        return;
      }

      const visitId = created.data.id;

      if (photos.length > 0) {
        for (let idx = 0; idx < photos.length; idx += 1) {
          const photo = photos[idx];
          await api.uploadPhoto(visitId, photo.file, photo.type);
          setUploadProgress(Math.round(((idx + 1) / photos.length) * 100));
        }
      }

      router.push(`/projects/${projectId}/visits/${visitId}`);
    } catch (error) {
      console.error("현장방문 생성 실패:", error);
      setErrorMessage("현장방문 생성 중 오류가 발생했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">현장방문 등록</h2>
          <p className="mt-1 text-sm text-slate-500">
            웹에서 방문 기록과 사진을 바로 등록할 수 있어요.
          </p>
        </div>
        <Button variant="secondary" asChild><Link href={`/projects/${projectId}/visits`}>목록으로</Link></Button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">방문 유형</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {VISIT_TYPES.map((type) => (
                <PrimitiveButton
                  key={type.value}
                  type="button"
                  onClick={() => setVisitType(type.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    visitType === type.value
                      ? "border-brand-point-500 bg-brand-point-50 text-brand-point-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {type.label}
                </PrimitiveButton>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              방문 일시
            </label>
            <PrimitiveInput
              type="datetime-local"
              value={visitedAt}
              onChange={(event) => setVisitedAt(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              면적 산출 (㎡)
            </label>
            <PrimitiveInput
              type="number"
              step="0.01"
              min="0"
              value={estimatedAreaM2}
              onChange={(event) => setEstimatedAreaM2(event.target.value)}
              placeholder="예: 85.5"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            />
            <p className="mt-1 text-xs text-slate-500">
              견적 산출 근거로 쓰이는 대략 면적을 입력해 주세요.
            </p>
          </div>

          <Textarea
            label="메모"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="현장 상황이나 특이사항을 입력하세요."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>사진 업로드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PHOTO_TYPES.map((type) => (
              <PrimitiveButton
                key={type.value}
                type="button"
                onClick={() => setCurrentPhotoType(type.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  currentPhotoType === type.value
                    ? "bg-brand-point-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {type.label}
              </PrimitiveButton>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative overflow-hidden rounded-lg border border-slate-200">
                <img
                  src={photo.preview}
                  alt="업로드 미리보기"
                  className="aspect-square w-full object-cover"
                />
                <PrimitiveButton
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                >
                  <X className="h-3 w-3" />
                </PrimitiveButton>
                <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                  {PHOTO_TYPES.find((item) => item.value === photo.type)?.label}
                </div>
              </div>
            ))}

            <PrimitiveButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-brand-point-400 hover:text-brand-point-600"
            >
              <UploadCloud className="h-6 w-6" />
              <span className="text-xs">사진 추가</span>
            </PrimitiveButton>
          </div>

          <PrimitiveInput
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <p className="text-xs text-slate-500">
            최대 10MB, JPG/PNG 파일을 권장합니다.
          </p>
        </CardContent>
      </Card>

      {isSubmitting && photos.length > 0 && (
        <div className="rounded-lg border border-brand-point-200 bg-brand-point-50 p-3 text-sm text-brand-point-700">
          사진 업로드 진행률: {uploadProgress}%
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" asChild><Link href={`/projects/${projectId}/visits`}>취소</Link></Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              방문 등록
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
