"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/MobileLayout";
import { Button, Input, Card, CardContent } from "@sigongon/ui";
import { Loader2, Camera, X } from "lucide-react";

export default function NewDailyReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    setTimeout(() => {
      setSubmitting(false);
      router.push(`/projects/${id}/construction/daily-reports`);
    }, 1000);
  }

  function handleAddPhoto() {
    setPhotos([...photos, "mock-photo-url"]);
  }

  return (
    <MobileLayout title="작업일지 작성" showBack>
      <form onSubmit={handleSubmit} className="space-y-6 p-4">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              작업일자
            </label>
            <input
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border border-slate-300 p-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              금일 작업내용
            </label>
            <textarea
              className="h-32 w-full rounded-lg border border-slate-300 p-3"
              placeholder="오늘 진행한 작업을 상세히 기록해주세요."
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              익일 작업예정
            </label>
            <textarea
              className="h-24 w-full rounded-lg border border-slate-300 p-3"
              placeholder="내일 진행할 작업을 입력해주세요."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              현장 사진
            </label>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-lg bg-slate-200"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setPhotos(photos.filter((_, idx) => idx !== i))
                    }
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                    사진 {i + 1}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPhoto}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500"
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs">추가</span>
              </button>
            </div>
          </div>
        </div>

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "작성 완료"
          )}
        </Button>
      </form>
    </MobileLayout>
  );
}
