"use client";

import { use, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/MobileLayout";
import { Button, Input, Card, CardContent } from "@sigongon/ui";
import { Loader2, Camera, X, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { VoiceInput } from "@/components/features/VoiceInput";

export default function NewDailyReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [weather, setWeather] = useState<string>("");
  const [temperature, setTemperature] = useState<string>("");
  const workDescriptionRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const workDate = formData.get("work_date") as string;
    const workDescription = formData.get("work_description") as string;
    const tomorrowPlan = formData.get("tomorrow_plan") as string;

    try {
      await api.createDailyReport(id, {
        work_date: workDate,
        weather,
        temperature,
        work_description: workDescription,
        tomorrow_plan: tomorrowPlan,
        photos,
      });
      router.push(`/projects/${id}/construction/daily-reports`);
    } catch (error) {
      console.error("Failed to create daily report:", error);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddPhoto() {
    setPhotos([...photos, "mock-photo-url"]);
  }

  function handleVoiceTranscript(text: string) {
    if (workDescriptionRef.current) {
      const currentValue = workDescriptionRef.current.value;
      const newValue = currentValue ? `${currentValue} ${text}` : text;
      workDescriptionRef.current.value = newValue;
    }
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
              name="work_date"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border border-slate-300 p-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              날씨
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { emoji: "☀️", label: "맑음", value: "sunny" },
                { emoji: "⛅", label: "흐림", value: "cloudy" },
                { emoji: "🌧️", label: "비", value: "rain" },
                { emoji: "❄️", label: "눈", value: "snow" },
                { emoji: "💨", label: "강풍", value: "wind" },
              ].map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setWeather(w.value)}
                  className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                    weather === w.value
                      ? "bg-brand-point-50 border-brand-point-500 text-brand-point-700"
                      : "bg-white border-slate-300 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  <span className="mr-1">{w.emoji}</span>
                  {w.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700">기온:</label>
              <input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="0"
                className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <span className="text-sm text-slate-700">℃</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-900">
                금일 작업내용
              </label>
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                placeholder="음성으로 입력"
              />
            </div>
            <textarea
              ref={workDescriptionRef}
              name="work_description"
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
              name="tomorrow_plan"
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
            <><CheckCircle className="h-4 w-4" />작성 완료</>
          )}
        </Button>
      </form>
    </MobileLayout>
  );
}
