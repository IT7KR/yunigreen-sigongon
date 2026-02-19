"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, X, ArrowLeft, LocateFixed } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, PrimitiveButton, PrimitiveInput, Textarea, toast } from "@sigongon/ui";
import { api } from "@/lib/api";
import Link from "next/link";

const WEATHER_OPTIONS = [
  { label: "맑음", value: "sunny" },
  { label: "흐림", value: "cloudy" },
  { label: "비", value: "rain" },
  { label: "눈", value: "snow" },
] as const;

function mapWeatherCodeToValue(code: number) {
  if (code <= 1) return "sunny";
  if ([2, 3, 45, 48].includes(code)) return "cloudy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  return "rain";
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 600000,
    });
  });
}

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
  const [autoWeatherLoading, setAutoWeatherLoading] = useState(false);
  const [autoWeatherMessage, setAutoWeatherMessage] = useState<string>("");

  useEffect(() => {
    void handleAutoFillWeather();
  }, []);

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
      toast.error("작업일지 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddPhoto() {
    setPhotos([...photos, "mock-photo-url"]);
  }

  async function handleAutoFillWeather() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setAutoWeatherMessage("위치 기능을 사용할 수 없어 날씨를 수동 선택해 주세요.");
      return;
    }

    try {
      setAutoWeatherLoading(true);
      setAutoWeatherMessage("");

      const position = await getCurrentPosition();
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m&timezone=auto`,
      );

      if (!response.ok) {
        throw new Error(`Weather request failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        current?: { weather_code?: number; temperature_2m?: number };
      };
      const weatherCode = data.current?.weather_code;
      const currentTemperature = data.current?.temperature_2m;

      if (typeof weatherCode !== "number") {
        throw new Error("Weather code is missing");
      }

      setWeather(mapWeatherCodeToValue(weatherCode));
      if (typeof currentTemperature === "number") {
        setTemperature(String(Math.round(currentTemperature)));
      }

      setAutoWeatherMessage("현재 위치 기준으로 날씨를 자동 반영했어요.");
    } catch (error) {
      console.error("Failed to auto-fill weather:", error);
      setAutoWeatherMessage("날씨 자동 입력에 실패해 수동 선택으로 전환했어요.");
    } finally {
      setAutoWeatherLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="sm" asChild><Link href={`/projects/${id}/construction/daily-reports`}>
            <ArrowLeft className="h-4 w-4" />
            목록으로
          </Link></Button>
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
                <PrimitiveInput
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
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    위치 기반 자동 입력 후 필요 시 수정 가능
                  </span>
                  <PrimitiveButton
                    type="button"
                    onClick={handleAutoFillWeather}
                    disabled={autoWeatherLoading}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {autoWeatherLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LocateFixed className="h-3.5 w-3.5" />
                    )}
                    자동 입력
                  </PrimitiveButton>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {WEATHER_OPTIONS.map((w) => (
                    <PrimitiveButton
                      key={w.value}
                      type="button"
                      onClick={() => setWeather(w.value)}
                      className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                        weather === w.value
                          ? "bg-brand-point-50 border-brand-point-500 text-brand-point-700"
                          : "bg-white border-slate-300 text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {w.label}
                    </PrimitiveButton>
                  ))}
                </div>
                {autoWeatherMessage && (
                  <p className="mb-2 text-xs text-slate-500">{autoWeatherMessage}</p>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-700">기온:</label>
                  <PrimitiveInput
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

            <Textarea
              label="금일 작업내용 *"
              name="work_description"
              className="h-32"
              placeholder="오늘 진행한 작업을 상세히 기록해주세요."
              rows={5}
              required
            />

            <Textarea
              label="익일 작업예정"
              name="tomorrow_plan"
              className="h-24"
              placeholder="내일 진행할 작업을 입력해주세요."
              rows={4}
            />

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
                    <PrimitiveButton
                      type="button"
                      onClick={() =>
                        setPhotos(photos.filter((_, idx) => idx !== i))
                      }
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </PrimitiveButton>
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                      사진 {i + 1}
                    </div>
                  </div>
                ))}
                <PrimitiveButton
                  type="button"
                  onClick={handleAddPhoto}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400 hover:bg-slate-100"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-sm">사진 추가</span>
                </PrimitiveButton>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" asChild><Link href={`/projects/${id}/construction/daily-reports`}>
                  취소
                </Link></Button>
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
