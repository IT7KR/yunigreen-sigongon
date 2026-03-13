"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, PrimitiveButton } from "@sigongcore/ui";
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  Loader2,
} from "lucide-react";

/**
 * 개인정보 처리방침 동의 페이지
 *
 * 근로자 가입 플로우의 첫 단계
 * 알림톡 링크 → 동의 → 서류 업로드 → 정보 입력 → 가입 완료
 */
export default function WorkerConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-brand-point-600" />
        </div>
      }
    >
      <WorkerConsentContent />
    </Suspense>
  );
}

function WorkerConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [agreements, setAgreements] = useState({
    privacy: false,
    ssn: false,
  });

  const allAgreed = agreements.privacy && agreements.ssn;

  const handleAgreeAll = () => {
    const newValue = !allAgreed;
    setAgreements({
      privacy: newValue,
      ssn: newValue,
    });
  };

  const handleProceed = async () => {
    if (!allAgreed) return;

    try {
      const { api } = await import("@/lib/api");
      await api.saveConsentRecords({
        records: [
          { consent_type: "privacy_collection", consented: agreements.privacy },
          { consent_type: "ssn_collection", consented: agreements.ssn },
        ],
        invite_token: token || undefined,
      });
    } catch (e) {
      console.error("[Consent] API 저장 실패 (계속 진행):", e);
      // Non-blocking: proceed even if API fails
    }

    router.push(`/onboarding/worker/${token}?step=documents`);
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              유효하지 않은 링크
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              초대 링크가 만료되었거나 유효하지 않습니다.
              <br />
              담당자에게 새로운 초대를 요청해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">시공코어 가입</h1>
          <p className="mt-2 text-slate-600">
            개인정보 수집 동의서
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-point-600 text-sm font-medium text-white">
            1
          </div>
          <div className="h-0.5 w-12 bg-slate-200" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-500">
            2
          </div>
          <div className="h-0.5 w-12 bg-slate-200" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-500">
            3
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {/* Legal Info Table */}
            <div className="mb-6 rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-800">
                  개인정보 수집·이용 안내
                </h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="w-28 bg-slate-50 px-4 py-3 font-medium text-slate-700">
                      수집 항목
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      성명, 주민등록번호, 주소, 연락처, 계좌정보
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="w-28 bg-slate-50 px-4 py-3 font-medium text-slate-700">
                      수집 목적
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      일용근로소득 및 지급명세서 제출, 4대 보험 신고, 근로자관리
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="w-28 bg-slate-50 px-4 py-3 font-medium text-slate-700 align-top">
                      법적 근거
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <ul className="space-y-0.5">
                        <li>개인정보보호법 제24조의2</li>
                        <li>소득세법 제164조</li>
                        <li>소득세법 시행령 제213조</li>
                        <li>건설근로자법 제13조</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-28 bg-slate-50 px-4 py-3 font-medium text-slate-700">
                      보관 기간
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      5년 후 자동 파기
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* All Agree */}
            <PrimitiveButton
              type="button"
              className="mb-4 flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:border-slate-300"
              onClick={handleAgreeAll}
            >
              <div
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                  allAgreed ? "bg-brand-point-600" : "border-2 border-slate-300"
                }`}
              >
                {allAgreed && <CheckCircle2 className="h-5 w-5 text-white" />}
              </div>
              <span className="font-medium text-slate-900">전체 동의</span>
            </PrimitiveButton>

            {/* Individual Agreements */}
            <div className="space-y-3">
              {/* Privacy Collection */}
              <ConsentItem
                title="개인정보 수집 및 이용에 동의합니다. (필수)"
                checked={agreements.privacy}
                onCheck={() =>
                  setAgreements({ ...agreements, privacy: !agreements.privacy })
                }
              />

              {/* SSN Collection */}
              <ConsentItem
                title="주민등록번호 수집에 특별 동의합니다. (필수)"
                description="개인정보보호법 제24조의2에 따라 주민등록번호 수집에 별도로 동의합니다."
                checked={agreements.ssn}
                onCheck={() =>
                  setAgreements({ ...agreements, ssn: !agreements.ssn })
                }
              />
            </div>

            <Button
              className="mt-6 w-full"
              disabled={!allAgreed}
              onClick={handleProceed}
            >
              동의하고 계속하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-500">
          문의사항이 있으시면 담당자에게 연락해주세요
        </p>
      </div>
    </div>
  );
}

interface ConsentItemProps {
  title: string;
  description?: string;
  checked: boolean;
  onCheck: () => void;
}

function ConsentItem({ title, description, checked, onCheck }: ConsentItemProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <PrimitiveButton
        type="button"
        onClick={onCheck}
        className="flex w-full items-start gap-3 text-left"
      >
        <div
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${
            checked ? "bg-brand-point-600" : "border-2 border-slate-300"
          }`}
        >
          {checked && <CheckCircle2 className="h-4 w-4 text-white" />}
        </div>
        <div>
          <span className="text-sm text-slate-700">{title}</span>
          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
        </div>
      </PrimitiveButton>
    </div>
  );
}
