"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingOverlay,
  PrimitiveInput,
  toast,
} from "@sigongcore/ui";
import { CreditCard, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

export default function SABillingPolicyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [trialMonths, setTrialMonths] = useState(1);

  useEffect(() => {
    void loadPolicy();
  }, []);

  async function loadPolicy() {
    try {
      setIsLoading(true);
      const response = await api.getTrialPolicy();
      if (response.success && response.data) {
        setTrialEnabled(response.data.default_trial_enabled);
        setTrialMonths(response.data.default_trial_months || 1);
      }
    } catch (err) {
      console.error("Failed to load billing policy:", err);
      toast.error("기본 무료 체험 정책을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (trialEnabled && trialMonths < 1) {
      toast.error("무료 체험 개월 수를 1 이상으로 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.updateTrialPolicy({
        default_trial_enabled: trialEnabled,
        default_trial_months: trialEnabled ? trialMonths : 0,
      });

      if (response.success) {
        toast.success("기본 무료 체험 정책을 저장했어요.");
      } else {
        toast.error(response.error?.message || "정책 저장에 실패했어요.");
      }
    } catch (err) {
      console.error("Failed to save billing policy:", err);
      toast.error("정책 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <LoadingOverlay
          variant="inline"
          text="기본 무료 체험 정책을 불러오는 중..."
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">체험/결제 정책</h1>
          <p className="mt-1 text-slate-500">
            신규 가입 고객사에 기본으로 적용할 무료 체험 정책을 설정합니다.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.3fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>기본 무료 체험 정책</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant={trialEnabled ? "primary" : "secondary"}
                  onClick={() => setTrialEnabled(true)}
                  className="w-full"
                >
                  무료 체험 제공
                </Button>
                <Button
                  variant={!trialEnabled ? "primary" : "secondary"}
                  onClick={() => setTrialEnabled(false)}
                  className="w-full"
                >
                  무료 체험 미제공
                </Button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  기본 무료 체험 개월 수
                </label>
                <PrimitiveInput
                  type="number"
                  min={1}
                  max={24}
                  value={String(trialMonths)}
                  onChange={(event) =>
                    setTrialMonths(Math.max(1, Number(event.target.value) || 1))
                  }
                  disabled={!trialEnabled}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  신규 가입 직후 자동 적용되며, 고객사별 override가 있으면 override가
                  우선합니다.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "저장 중..." : "정책 저장"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>적용 미리보기</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">신규 가입 시</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {trialEnabled
                        ? `${trialMonths}개월 무료 체험 후 결제 전환`
                        : "무료 체험 없이 가입 후 바로 요금제 선택"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">운영 원칙</p>
                    <p className="mt-1 text-sm text-slate-600">
                      개별 고객사 상세 화면에서 무료 체험 제공 여부와 개월 수를 별도로
                      덮어쓸 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
