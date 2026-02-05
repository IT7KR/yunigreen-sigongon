"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, Button } from "@sigongon/ui";
import { CheckCircle2, ChevronDown, ChevronUp, ArrowRight, Shield } from "lucide-react";

/**
 * 개인정보 처리방침 동의 페이지
 *
 * 근로자 가입 플로우의 첫 단계
 * 알림톡 링크 → 동의 → 서류 업로드 → 정보 입력 → 가입 완료
 */
export default function WorkerConsentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [agreements, setAgreements] = useState({
    privacy: false,
    collection: false,
    thirdParty: false,
  });

  const allAgreed = agreements.privacy && agreements.collection && agreements.thirdParty;

  const handleAgreeAll = () => {
    const newValue = !allAgreed;
    setAgreements({
      privacy: newValue,
      collection: newValue,
      thirdParty: newValue,
    });
  };

  const handleProceed = () => {
    if (!allAgreed) return;
    router.push(`/onboarding/worker/${token}?step=documents`);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">유효하지 않은 링크</h2>
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
          <h1 className="text-2xl font-bold text-slate-900">시공ON 가입</h1>
          <p className="mt-2 text-slate-600">개인정보 처리방침에 동의해주세요</p>
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
            {/* All Agree */}
            <div
              className="mb-4 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
              onClick={handleAgreeAll}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  allAgreed ? "bg-brand-point-600" : "border-2 border-slate-300"
                }`}
              >
                {allAgreed && <CheckCircle2 className="h-5 w-5 text-white" />}
              </div>
              <span className="font-medium text-slate-900">전체 동의</span>
            </div>

            {/* Individual Agreements */}
            <div className="space-y-3">
              {/* Privacy Policy */}
              <ConsentItem
                title="개인정보 처리방침 (필수)"
                checked={agreements.privacy}
                expanded={expandedSection === "privacy"}
                onCheck={() => setAgreements({ ...agreements, privacy: !agreements.privacy })}
                onToggle={() => toggleSection("privacy")}
              >
                <PrivacyPolicyContent />
              </ConsentItem>

              {/* Collection */}
              <ConsentItem
                title="개인정보 수집 및 이용 동의 (필수)"
                checked={agreements.collection}
                expanded={expandedSection === "collection"}
                onCheck={() => setAgreements({ ...agreements, collection: !agreements.collection })}
                onToggle={() => toggleSection("collection")}
              >
                <CollectionContent />
              </ConsentItem>

              {/* Third Party */}
              <ConsentItem
                title="제3자 정보 제공 동의 (필수)"
                checked={agreements.thirdParty}
                expanded={expandedSection === "thirdParty"}
                onCheck={() => setAgreements({ ...agreements, thirdParty: !agreements.thirdParty })}
                onToggle={() => toggleSection("thirdParty")}
              >
                <ThirdPartyContent />
              </ConsentItem>
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
  checked: boolean;
  expanded: boolean;
  onCheck: () => void;
  onToggle: () => void;
  children: React.ReactNode;
}

function ConsentItem({ title, checked, expanded, onCheck, onToggle, children }: ConsentItemProps) {
  return (
    <div className="rounded-lg border border-slate-200">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3" onClick={onCheck}>
          <div
            className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded ${
              checked ? "bg-brand-point-600" : "border-2 border-slate-300"
            }`}
          >
            {checked && <CheckCircle2 className="h-4 w-4 text-white" />}
          </div>
          <span className="text-sm text-slate-700">{title}</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="p-1 text-slate-400 hover:text-slate-600"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-3">
          <div className="max-h-48 overflow-y-auto text-xs text-slate-600">{children}</div>
        </div>
      )}
    </div>
  );
}

function PrivacyPolicyContent() {
  return (
    <div className="space-y-3">
      <p className="font-medium">개인정보 처리방침</p>
      <p>
        주식회사 유니그린(이하 &quot;회사&quot;)는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를
        보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이
        개인정보 처리방침을 수립·공개합니다.
      </p>
      <p className="font-medium mt-2">제1조 (개인정보의 처리 목적)</p>
      <p>
        회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적
        이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에
        따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
      </p>
      <ul className="list-disc pl-4 space-y-1">
        <li>일용근로자 신원확인 및 관리</li>
        <li>근로계약 체결 및 이행</li>
        <li>급여 지급 및 원천징수</li>
        <li>4대보험 신고</li>
        <li>산업안전보건 관리</li>
      </ul>
      <p className="font-medium mt-2">제2조 (개인정보의 처리 및 보유기간)</p>
      <p>
        회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은
        개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
      </p>
      <ul className="list-disc pl-4 space-y-1">
        <li>근로계약 관련 기록: 3년</li>
        <li>임금 및 기타 근로관계 기록: 3년</li>
        <li>세무 관련 기록: 5년</li>
      </ul>
    </div>
  );
}

function CollectionContent() {
  return (
    <div className="space-y-3">
      <p className="font-medium">수집하는 개인정보 항목</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">항목</th>
            <th className="py-2 text-left">수집목적</th>
            <th className="py-2 text-left">보유기간</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2">성명, 생년월일, 성별</td>
            <td className="py-2">근로자 식별</td>
            <td className="py-2">3년</td>
          </tr>
          <tr className="border-b">
            <td className="py-2">연락처(휴대전화)</td>
            <td className="py-2">서비스 이용 안내</td>
            <td className="py-2">3년</td>
          </tr>
          <tr className="border-b">
            <td className="py-2">주소</td>
            <td className="py-2">4대보험 신고</td>
            <td className="py-2">3년</td>
          </tr>
          <tr className="border-b">
            <td className="py-2">계좌정보(은행명, 계좌번호)</td>
            <td className="py-2">급여 지급</td>
            <td className="py-2">3년</td>
          </tr>
          <tr className="border-b">
            <td className="py-2">신분증 사본</td>
            <td className="py-2">본인 확인</td>
            <td className="py-2">3년</td>
          </tr>
          <tr>
            <td className="py-2">기초안전교육 이수증</td>
            <td className="py-2">안전교육 이수 확인</td>
            <td className="py-2">3년</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2">
        ※ 주민등록번호 전체(13자리)는 수집하지 않습니다. 생년월일과 성별만 수집합니다.
      </p>
    </div>
  );
}

function ThirdPartyContent() {
  return (
    <div className="space-y-3">
      <p className="font-medium">개인정보 제3자 제공</p>
      <p>
        회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만
        처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에
        해당하는 경우에만 개인정보를 제3자에게 제공합니다.
      </p>
      <table className="w-full text-xs mt-2">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">제공받는 자</th>
            <th className="py-2 text-left">제공 목적</th>
            <th className="py-2 text-left">제공 항목</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2">근로복지공단</td>
            <td className="py-2">4대보험 신고</td>
            <td className="py-2">성명, 생년월일, 성별, 근무일수, 임금</td>
          </tr>
          <tr className="border-b">
            <td className="py-2">국세청</td>
            <td className="py-2">일용근로소득 원천징수</td>
            <td className="py-2">성명, 생년월일, 성별, 지급액, 소득세</td>
          </tr>
          <tr>
            <td className="py-2">수급인(고객사)</td>
            <td className="py-2">현장 출입 관리</td>
            <td className="py-2">성명, 연락처, 안전교육 이수 여부</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
