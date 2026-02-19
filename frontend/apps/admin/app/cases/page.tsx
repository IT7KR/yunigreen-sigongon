"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { api } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, formatDate } from "@sigongon/ui";
import type { DiagnosisCase, SeasonInfo } from "@sigongon/types";
import { Plus, Sparkles } from "lucide-react";

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<DiagnosisCase[]>([]);
  const [activeSeason, setActiveSeason] = useState<SeasonInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [casesRes, seasonRes] = await Promise.all([
        api.listCases(),
        api.getActiveSeason().catch(() => null),
      ]);
      if (casesRes.success && casesRes.data) setCases(casesRes.data);
      if (seasonRes?.success && seasonRes.data) setActiveSeason(seasonRes.data);
    } catch (err) {
      console.error("케이스 목록 불러오기 실패:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCase() {
    setCreating(true);
    try {
      const res = await api.createCase(activeSeason ? { season_id: activeSeason.id } : undefined);
      if (res.success && res.data) {
        router.push(`/cases/${res.data.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">케이스 견적</h1>
            <p className="mt-1 text-sm text-slate-500">
              사진 기반 진단과 근거 포함 견적을 생성합니다
            </p>
          </div>
          <Button onClick={handleCreateCase} loading={creating}>
            <Plus className="h-4 w-4" />
            새 케이스
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-point-600" />
              <span className="text-sm text-slate-600">활성 시즌</span>
              {activeSeason ? (
                <Badge variant="success">{activeSeason.name}</Badge>
              ) : (
                <Badge variant="warning">없음</Badge>
              )}
              <Link className="ml-2 text-sm text-brand-point-600 hover:underline" href="/sa/estimation-governance">
                적산 운영
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>케이스 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">불러오는 중...</p>
            ) : cases.length === 0 ? (
              <p className="text-sm text-slate-500">등록된 케이스가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                      <th className="pb-3 font-medium">케이스 ID</th>
                      <th className="pb-3 font-medium">시즌 ID</th>
                      <th className="pb-3 font-medium">상태</th>
                      <th className="pb-3 font-medium">생성일</th>
                      <th className="pb-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 font-medium">{item.id}</td>
                        <td className="py-3">{item.season_id}</td>
                        <td className="py-3">
                          <Badge variant={item.status === "estimated" ? "success" : "info"}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-sm text-slate-600">{formatDate(item.created_at)}</td>
                        <td className="py-3 text-right">
                          <Link href={`/cases/${item.id}`} className="text-sm text-brand-point-600 hover:underline">
                            열기
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
