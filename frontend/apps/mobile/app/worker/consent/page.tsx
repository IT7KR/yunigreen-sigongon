"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, PrimitiveButton, PrimitiveInput, toast } from "@sigongon/ui";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";

interface ConsentSection {
  id: string;
  title: string;
  content: string[];
}

const consentSections: ConsentSection[] = [
  {
    id: "purpose",
    title: "수집 목적",
    content: [
      "일용직 근로 관리",
      "노무비 지급",
      "4대보험 신고",
      "세금 신고",
    ],
  },
  {
    id: "items",
    title: "수집 항목",
    content: [
      "성명",
      "연락처",
      "주민등록번호",
      "은행계좌 정보",
      "신분증 사본",
      "안전교육이수증",
    ],
  },
  {
    id: "retention",
    title: "보유 기간",
    content: ["근로관계 종료 후 3년 (근로기준법)"],
  },
  {
    id: "third-party",
    title: "제3자 제공",
    content: [
      "국민건강보험공단 (4대보험 신고)",
      "근로복지공단 (산재보험 신고)",
      "국세청 (세금 신고)",
      "※ 법적 의무 신고 목적으로만 제공됩니다.",
    ],
  },
];

function WorkerConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workerId = searchParams.get("workerId") || "worker_1";
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [consents, setConsents] = useState({
    collection: false,
    thirdParty: false,
    sensitive: false,
  });

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleAllConsents = () => {
    const allChecked = consents.collection && consents.thirdParty && consents.sensitive;
    setConsents({
      collection: !allChecked,
      thirdParty: !allChecked,
      sensitive: !allChecked,
    });
  };

  const allConsentsChecked =
    consents.collection && consents.thirdParty && consents.sensitive;

  const handleSubmit = async () => {
    if (!allConsentsChecked) return;

    try {
      const { api } = await import("@/lib/api");
      await api.saveConsentRecords({
        records: [
          { consent_type: "privacy_collection", consented: consents.collection },
          { consent_type: "third_party_sharing", consented: consents.thirdParty },
          { consent_type: "sensitive_info", consented: consents.sensitive },
        ],
        invite_token: workerId.startsWith("worker_") ? undefined : workerId,
      });
    } catch (e) {
      console.error("[Consent] 저장 실패 (계속 진행):", e);
      toast.warning("동의 정보 저장 중 오류가 발생했어요. 나중에 다시 시도해주세요.");
    }

    router.push(`/worker/profile?workerId=${encodeURIComponent(workerId)}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Shield className="h-6 w-6 text-brand-point-500" />
          <h1 className="text-lg font-bold text-slate-900">
            개인정보 수집·이용 동의서
          </h1>
        </div>
      </header>

      <main className="flex-1 p-4 pb-nav-safe">
        <div className="mx-auto max-w-md space-y-4">
          {/* All Consent Checkbox */}
          <div className="rounded-lg border-2 border-brand-point-500 bg-white p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <PrimitiveInput
                type="checkbox"
                checked={allConsentsChecked}
                onChange={toggleAllConsents}
                className="h-5 w-5 cursor-pointer rounded border-slate-300 text-brand-point-500 focus:ring-brand-point-500"
              />
              <span className="font-bold text-slate-900">전체 동의</span>
            </label>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200" />

          {/* Consent Details */}
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              근로관계 성립 및 4대보험·세금 신고를 위해 아래의 개인정보 수집·이용에
              동의가 필요합니다.
            </p>

            {/* Expandable Sections */}
            {consentSections.map((section) => (
              <div
                key={section.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                <PrimitiveButton
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
                >
                  <span className="font-semibold text-slate-900">
                    {section.title}
                  </span>
                  {expandedSections.has(section.id) ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </PrimitiveButton>
                {expandedSections.has(section.id) && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4">
                    <ul className="space-y-2 text-sm text-slate-700">
                      {section.content.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {/* Individual Consent Checkboxes */}
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <PrimitiveInput
                  type="checkbox"
                  checked={consents.collection}
                  onChange={(e) =>
                    setConsents({ ...consents, collection: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-point-500 focus:ring-brand-point-500"
                />
                <span className="text-sm text-slate-700">
                  개인정보 수집·이용에 동의합니다{" "}
                  <span className="font-semibold text-red-500">(필수)</span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <PrimitiveInput
                  type="checkbox"
                  checked={consents.thirdParty}
                  onChange={(e) =>
                    setConsents({ ...consents, thirdParty: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-point-500 focus:ring-brand-point-500"
                />
                <span className="text-sm text-slate-700">
                  제3자 제공에 동의합니다{" "}
                  <span className="font-semibold text-red-500">(필수)</span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <PrimitiveInput
                  type="checkbox"
                  checked={consents.sensitive}
                  onChange={(e) =>
                    setConsents({ ...consents, sensitive: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-point-500 focus:ring-brand-point-500"
                />
                <span className="text-sm text-slate-700">
                  민감정보(주민등록번호) 처리에 동의합니다{" "}
                  <span className="font-semibold text-red-500">(필수)</span>
                </span>
              </label>
            </div>

            {/* Legal Notice */}
            <div className="rounded-lg bg-amber-50 p-4 text-xs text-amber-800">
              <p className="font-semibold">안내사항</p>
              <p className="mt-1">
                귀하는 개인정보 제공 및 활용에 동의하지 않을 권리가 있으며, 동의를
                거부하는 경우 근로계약 체결 및 노무비 지급이 제한될 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 pb-safe">
        <div className="mx-auto max-w-md">
          <Button
            fullWidth
            size="lg"
            onClick={handleSubmit}
            disabled={!allConsentsChecked}
            className="h-14 text-base font-semibold"
          >
            동의하고 계속하기
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConsentPageFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 p-4">
      <div className="mx-auto mt-16 h-6 w-56 animate-pulse rounded bg-slate-200" />
      <div className="mx-auto mt-8 h-4 w-72 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default function WorkerConsentPage() {
  return (
    <Suspense fallback={<ConsentPageFallback />}>
      <WorkerConsentContent />
    </Suspense>
  );
}
