"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  StatusBadge,
} from "@sigongon/ui";
import {
  Users,
  FileSpreadsheet,
  FileSignature,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { LaborContractStatus } from "@sigongon/types";

interface LaborSummary {
  total_workers: number;
  total_amount: string;
  by_status: Record<LaborContractStatus, number>;
}

const initialSummary: LaborSummary = {
  total_workers: 0,
  total_amount: "0",
  by_status: {
    draft: 0,
    sent: 0,
    signed: 0,
    paid: 0,
  },
};

export default function ProjectLaborPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [summary, setSummary] = useState<LaborSummary>(initialSummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [projectId]);

  async function loadSummary() {
    try {
      setLoading(true);
      const response = await api.getLaborContractsSummary(projectId);
      if (response.success && response.data) {
        setSummary({
          total_workers: response.data.total_workers,
          total_amount: response.data.total_amount,
          by_status: response.data.by_status,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="투입 근로자" value={`${summary.total_workers}명`} />
        <MetricCard title="계약 초안" value={`${summary.by_status.draft}건`} />
        <MetricCard title="서명 대기" value={`${summary.by_status.sent}건`} />
        <MetricCard title="서명 완료" value={`${summary.by_status.signed}건`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            프로젝트 노무 액션
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <ActionLinkCard
            href={`/labor/contracts`}
            icon={<FileSignature className="h-5 w-5 text-blue-600" />}
            title="근로계약 관리"
            description="계약서 발송, 서명 상태 확인"
          />
          <ActionLinkCard
            href={`/labor/payroll`}
            icon={<FileSpreadsheet className="h-5 w-5 text-emerald-600" />}
            title="신고 엑셀 생성"
            description="근로복지공단/국세청 양식 다운로드"
          />
          <ActionLinkCard
            href={`/labor/workers`}
            icon={<Users className="h-5 w-5 text-violet-600" />}
            title="근로자 관리"
            description="근로자 등록/정보 수정/상태 관리"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>프로젝트 상태 참고</CardTitle>
          <StatusBadge
            status={summary.by_status.signed > 0 ? "in_progress" : "draft"}
          />
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            프로젝트 금액 합계(목업):{" "}
            <span className="font-semibold text-slate-900">
              {Number(summary.total_amount).toLocaleString()}원
            </span>
          </p>
          <p>
            실제 정산은 백엔드 연동 이후 프로젝트별 계약/근무 데이터로 계산됩니다.
          </p>
          <Link href={`/labor/payroll`}>
            <Button size="sm" variant="secondary" className="mt-1">
              노무 정산 화면으로 이동
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function ActionLinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <div className="h-full rounded-lg border border-slate-200 p-4 transition-colors hover:border-brand-point-200 hover:bg-brand-point-50/40">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
          {icon}
        </div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
    </Link>
  );
}
