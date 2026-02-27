"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  LoadingOverlay,
  Modal,
  SignaturePad,
  toast,
} from "@sigongon/ui";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type WorkerContract = {
  id: string;
  project_name: string;
  work_date: string;
  role: string;
  daily_rate: number;
  status: "pending" | "signed";
  content?: string;
};

interface WorkerContractDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function WorkerContractDetailPage({
  params,
}: WorkerContractDetailPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const workerId = user?.id ?? "";

  const [contract, setContract] = useState<WorkerContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [hasReadContent, setHasReadContent] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const fetchContract = async () => {
    setIsLoading(true);
    try {
      const response = await (api as any).getWorkerContract(id);
      if (response.success && response.data) {
        setContract(response.data);
      }
    } catch {
      toast.error("계약서를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSign = async () => {
    if (!signatureData) {
      toast.error("서명을 작성해 주세요.");
      return;
    }

    setIsSigning(true);
    try {
      const response = await (api as any).signWorkerContract(id, {
        worker_id: workerId,
        signature: signatureData,
      });
      if (response.success) {
        toast.success("서명이 완료되었습니다.");
        setIsSignModalOpen(false);
        setSignatureData(null);
        await fetchContract();
      } else {
        toast.error(response.error?.message ?? "서명에 실패했습니다.");
      }
    } catch {
      toast.error("서명 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSigning(false);
    }
  };

  const isSigned = contract?.status === "signed";

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/worker/contracts"
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">
              근로계약서 확인
            </h1>
          </div>
        </header>
        <div className="relative flex-1">
          <LoadingOverlay variant="section" text="불러오는 중..." />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/worker/contracts"
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">
              근로계약서 확인
            </h1>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-400">계약서를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/worker/contracts"
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">
              근로계약서 확인
            </h1>
          </div>
          <Badge variant={isSigned ? "success" : "warning"}>
            {isSigned ? "서명완료" : "서명대기"}
          </Badge>
        </div>
      </header>

      {/* Content — pb-48 to clear fixed sign button + bottom nav */}
      <main className="flex-1 space-y-4 p-4 pb-48 lg:pb-28">
        {/* Contract info grid */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            계약 정보
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="text-xs text-slate-400">현장명</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">
                {contract.project_name}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">근무일</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">
                {contract.work_date}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">직종</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">
                {contract.role}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">일당</dt>
              <dd className="mt-0.5 text-sm font-semibold text-brand-point-600">
                {contract.daily_rate.toLocaleString()}원
              </dd>
            </div>
          </dl>
        </div>

        {/* Contract content */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            계약 내용
          </h2>
          <div className="h-64 overflow-y-auto rounded-lg bg-slate-50 p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {contract.content ??
                `본 근로계약서는 근로자와 사업주 간의 근로조건을 명확히 하기 위해 작성되었습니다.\n\n제1조 (근로 장소)\n본 계약의 근로 장소는 "${contract.project_name}" 현장입니다.\n\n제2조 (업무 내용)\n근로자는 "${contract.role}" 업무를 수행합니다.\n\n제3조 (근로일 및 시간)\n근무일: ${contract.work_date}\n근무 시간은 관련 법령에 따릅니다.\n\n제4조 (임금)\n일당: ${contract.daily_rate.toLocaleString()}원\n임금은 지급일에 지정 계좌로 지급합니다.\n\n제5조 (기타)\n본 계약에 명시되지 않은 사항은 근로기준법 및 관련 법령에 따릅니다.`}
            </p>
          </div>
        </div>

        {/* Signed state */}
        {isSigned && (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-700">
              서명이 완료된 근로계약서입니다.
            </p>
          </div>
        )}

        {/* Read confirmation checkbox — only shown when pending */}
        {!isSigned && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <input
              type="checkbox"
              checked={hasReadContent}
              onChange={(e) => setHasReadContent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-point-500"
            />
            <span className="text-sm text-slate-700">
              계약 내용을 모두 확인했습니다.
            </span>
          </label>
        )}
      </main>

      {/* Fixed bottom sign button — positioned above the bottom nav bar */}
      {!isSigned && (
        <div className="fixed bottom-above-nav left-0 right-0 z-40 border-t border-slate-200 bg-white p-4 lg:bottom-0 lg:pb-safe">
          <Button
            fullWidth
            size="lg"
            disabled={!hasReadContent}
            onClick={() => setIsSignModalOpen(true)}
          >
            서명하기
          </Button>
        </div>
      )}

      {/* Signature modal */}
      <Modal
        isOpen={isSignModalOpen}
        onClose={() => {
          if (!isSigning) {
            setIsSignModalOpen(false);
            setSignatureData(null);
          }
        }}
        title="전자서명"
        description="아래 서명란에 서명해 주세요."
        size="md"
        closeOnBackdropClick={!isSigning}
      >
        <div className="space-y-5">
          <SignaturePad
            height={220}
            onSign={(dataUrl) => setSignatureData(dataUrl)}
            onClear={() => setSignatureData(null)}
            disabled={isSigning}
          />
          <Button
            fullWidth
            size="lg"
            loading={isSigning}
            disabled={!signatureData || isSigning}
            onClick={handleSign}
          >
            서명 완료
          </Button>
        </div>
      </Modal>
    </div>
  );
}
