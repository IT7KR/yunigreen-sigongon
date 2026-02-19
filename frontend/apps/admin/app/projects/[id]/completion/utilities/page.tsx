"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  formatDate,
} from "@sigongon/ui";
import {
  Building2,
  Zap,
  Droplets,
  Flame,
  Download,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { buildSampleFileDownloadUrl } from "@/lib/sampleFiles";

interface UtilityItem {
  id: string;
  type: "수도" | "전기" | "가스" | "기타";
  month: string;
  status: "pending" | "completed";
  amount: number;
  due_date: string;
}

export default function CompletionUtilitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UtilityItem[]>([]);

  useEffect(() => {
    loadUtilities();
  }, [projectId]);

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === "pending").length,
    [items],
  );
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.amount, 0),
    [items],
  );

  async function loadUtilities() {
    try {
      setLoading(true);
      const response = await api.getUtilities(projectId);
      if (response.success && response.data) {
        setItems(response.data.items);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function downloadSample(path: string, fileName: string) {
    const anchor = document.createElement("a");
    anchor.href = buildSampleFileDownloadUrl(path);
    anchor.download = fileName;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  function utilityIcon(type: UtilityItem["type"]) {
    if (type === "수도") return <Droplets className="h-4 w-4 text-blue-600" />;
    if (type === "전기") return <Zap className="h-4 w-4 text-amber-600" />;
    if (type === "가스") return <Flame className="h-4 w-4 text-rose-600" />;
    return <Building2 className="h-4 w-4 text-slate-600" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-400" />
              수도광열비 정산
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              학교 프로젝트 등에서 필요한 수도/전기/가스 정산 문서를 관리합니다.
            </p>
          </div>
          <Badge
            className={
              pendingCount > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }
          >
            {pendingCount > 0 ? `대기 ${pendingCount}건` : "정산 완료"}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <MetricCard title="정산 항목" value={`${items.length}건`} />
          <MetricCard title="대기 항목" value={`${pendingCount}건`} />
          <MetricCard
            title="합계 금액"
            value={`${totalAmount.toLocaleString()}원`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>정산 액션</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          <Button className="w-full justify-between" asChild>
            <Link href={`/projects/${projectId}/utilities`}>
              수도광열비 관리 화면
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-between"
            onClick={() =>
              downloadSample(
                "sample/9. 학교 서류/1. 수도전기공문.hwpx",
                "수도전기공문_샘플.hwpx",
              )
            }
          >
            <span>수도전기공문 샘플</span>
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-between md:col-span-2"
            onClick={() =>
              downloadSample(
                "sample/9. 학교 서류/공사서류 원클릭 프로그램(2025.3.수정)-서울시교육청용.xlsm",
                "교육청_원클릭_샘플.xlsm",
              )
            }
          >
            <span>교육청 원클릭 프로그램 샘플</span>
            <Download className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 정산 항목</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-point-500" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              정산 항목이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {items.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">{utilityIcon(item.type)}</span>
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.month} {item.type}
                      </p>
                      <p className="text-xs text-slate-500">
                        마감일 {formatDate(item.due_date)} ·{" "}
                        {item.amount.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      item.status === "completed" ? "success" : "warning"
                    }
                  >
                    {item.status === "completed" ? "완료" : "대기"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
