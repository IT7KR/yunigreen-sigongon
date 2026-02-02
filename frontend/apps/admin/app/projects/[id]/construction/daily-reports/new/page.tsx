"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, X, ArrowLeft } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@sigongon/ui";
import { api } from "@/lib/api";
import Link from "next/link";

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
      alert("작업일지 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddPhoto() {
    setPhotos([...photos, "mock-photo-url"]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}/construction/daily-reports`}>
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" />
            목록으로
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">작업일지 작성</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>작업일지 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  작업일자 *
                </label>
                <input
                  type="date"
                  name="work_date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-lg border border-slate-300 p-3"
                  required
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
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                금일 작업내용 *
              </label>
              <textarea
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
              <div className="grid grid-cols-4 gap-4">
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
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
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
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400 hover:bg-slate-100"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-sm">사진 추가</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href={`/projects/${id}/construction/daily-reports`}>
                <Button type="button" variant="secondary">
                  취소
                </Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "작성 완료"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
