"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
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
  Upload,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api";


interface PricebookRevision {
  id: string;
  version_label: string;
  effective_from: string;
  effective_to?: string;
  status: "active" | "scheduled" | "archived";
  item_count: number;
  created_at: string;
  activated_at?: string;
}

export default function SAPricebooksPage() {
  const [activeRevision, setActiveRevision] = useState<PricebookRevision | null>(
    null,
  );
  const [revisions, setRevisions] = useState<PricebookRevision[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRevisions();
  }, []);

  async function loadRevisions() {
    try {
      setIsLoading(true);
      const response = await api.getRevisions();

      if (response.success && response.data) {
        const mockRevisions: PricebookRevision[] = [
          {
            id: "rev_1",
            version_label: "2026년 상반기",
            effective_from: "2026-01-01",
            effective_to: undefined,
            status: "active",
            item_count: 1247,
            created_at: "2025-12-20T00:00:00Z",
            activated_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "rev_2",
            version_label: "2025년 하반기",
            effective_from: "2025-07-01",
            effective_to: "2025-12-31",
            status: "archived",
            item_count: 1198,
            created_at: "2025-06-15T00:00:00Z",
            activated_at: "2025-07-01T00:00:00Z",
          },
          {
            id: "rev_3",
            version_label: "2025년 상반기",
            effective_from: "2025-01-01",
            effective_to: "2025-06-30",
            status: "archived",
            item_count: 1156,
            created_at: "2024-12-10T00:00:00Z",
            activated_at: "2025-01-01T00:00:00Z",
          },
        ];

        setActiveRevision(
          mockRevisions.find((r) => r.status === "active") || null,
        );
        setRevisions(mockRevisions);
      }
    } catch (err) {
      console.error("Failed to load revisions:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const statusConfig: Record<
    "active" | "scheduled" | "archived",
    { label: string; variant: "success" | "default" | "warning" }
  > = {
    active: { label: "활성", variant: "success" },
    scheduled: { label: "예정", variant: "warning" },
    archived: { label: "보관", variant: "default" },
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              적산정보 관리
            </h1>
            <p className="mt-1 text-slate-500">
              전체 시스템의 적산 정보를 관리합니다
            </p>
          </div>
          <Button asChild><Link href="/sa/pricebooks/upload">
              <Upload className="h-4 w-4" />
              새 버전 업로드
            </Link></Button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
          </div>
        ) : (
          <>
            {activeRevision && (
              <Card>
                <CardHeader>
                  <CardTitle>현재 활성 버전</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                            <FileText className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {activeRevision.version_label}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">
                              {activeRevision.item_count.toLocaleString()}개 항목
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600">적용 시작일:</span>
                            <span className="font-medium text-slate-900">
                              {activeRevision.effective_from}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-slate-600">활성화일:</span>
                            <span className="font-medium text-slate-900">
                              {activeRevision.activated_at
                                ? formatDate(activeRevision.activated_at)
                                : "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="success">활성</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>버전 이력</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                        <th className="pb-3 font-medium">버전명</th>
                        <th className="pb-3 font-medium">적용 기간</th>
                        <th className="pb-3 font-medium">항목 수</th>
                        <th className="pb-3 font-medium">상태</th>
                        <th className="pb-3 font-medium">생성일</th>
                        <th className="pb-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {revisions.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-12 text-center text-slate-500"
                          >
                            버전 이력이 없어요
                          </td>
                        </tr>
                      ) : (
                        revisions.map((revision) => {
                          const status = statusConfig[revision.status];

                          return (
                            <tr
                              key={revision.id}
                              className="border-b border-slate-100 last:border-0"
                            >
                              <td className="py-4">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-slate-400" />
                                  <span className="font-medium text-slate-900">
                                    {revision.version_label}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 text-slate-600">
                                {revision.effective_from}
                                {revision.effective_to && (
                                  <> ~ {revision.effective_to}</>
                                )}
                              </td>
                              <td className="py-4 text-slate-900">
                                {revision.item_count.toLocaleString()}
                              </td>
                              <td className="py-4">
                                <Badge variant={status.variant}>
                                  {status.label}
                                </Badge>
                              </td>
                              <td className="py-4 text-slate-500">
                                {formatDate(revision.created_at)}
                              </td>
                              <td className="py-4">
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-3.5 w-3.5" />상세보기
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
