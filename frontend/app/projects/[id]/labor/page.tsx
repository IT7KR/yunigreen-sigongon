"use client";

import { use, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@sigongon/ui";
import { Users, Loader2, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { generateSitePayrollExcel } from "@/lib/labor/excelExport";
import type { SitePayrollReport } from "@sigongon/types";
import { MobileListCard } from "@/components/MobileListCard";

export default function ProjectLaborPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { user } = useAuth();
  const canViewAmount = user?.role !== "site_manager";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [siteReport, setSiteReport] = useState<SitePayrollReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId, year, month]);

  async function loadData() {
    try {
      setLoading(true);
      const reportRes = await api.generateSiteReport(projectId, year, month);
      if (reportRes.success && reportRes.data) {
        setSiteReport(reportRes.data);
      } else {
        setSiteReport(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExcelDownload() {
    if (!siteReport) return;
    setDownloading(true);
    try {
      await generateSitePayrollExcel(siteReport);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloading(false);
    }
  }

  const sortedEntries = siteReport
    ? [...siteReport.entries].sort((a, b) =>
        canViewAmount
          ? b.total_labor_cost - a.total_labor_cost
          : b.total_man_days - a.total_man_days
      )
    : [];

  const currentYear = now.getFullYear();
  const yearOptions = [currentYear, currentYear - 1];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span className="font-medium">조회 기준월:</span>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="투입 인원"
          value={`${siteReport?.entries.length ?? 0}명`}
        />
        <MetricCard
          title="총 공수"
          value={`${siteReport ? siteReport.entries.reduce((s, e) => s + e.total_man_days, 0) : 0}인일`}
        />
        <MetricCard
          title="노무비"
          value={canViewAmount ? `${(siteReport?.totals.total_labor_cost ?? 0).toLocaleString()}원` : "비공개"}
        />
        <MetricCard
          title="차감지급액"
          value={canViewAmount ? `${(siteReport?.totals.total_net_pay ?? 0).toLocaleString()}원` : "비공개"}
        />
      </div>

      {/* Worker Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            투입 근로자 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              이번 달 출역 기록이 없습니다
            </p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-3 md:hidden">
                {sortedEntries.map((entry) => (
                  <MobileListCard
                    key={entry.worker_id}
                    title={entry.worker_name}
                    subtitle={entry.job_type}
                    metadata={[
                      { label: "근무일수", value: `${entry.total_days}일` },
                      { label: "공수", value: String(entry.total_man_days) },
                      {
                        label: "노무비",
                        value: canViewAmount
                          ? `${entry.total_labor_cost.toLocaleString()}원`
                          : "비공개",
                      },
                      {
                        label: "지급액",
                        value: canViewAmount
                          ? `${entry.net_pay.toLocaleString()}원`
                          : "비공개",
                      },
                    ]}
                    onClick={undefined}
                  />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-2 text-left font-medium text-slate-500">
                        성명
                      </th>
                      <th className="pb-2 text-right font-medium text-slate-500">
                        직종
                      </th>
                      <th className="pb-2 text-right font-medium text-slate-500">
                        근무일수
                      </th>
                      <th className="pb-2 text-right font-medium text-slate-500">
                        공수
                      </th>
                      <th className="pb-2 text-right font-medium text-slate-500">
                        일당
                      </th>
                      <th className="pb-2 text-right font-medium text-slate-500">
                        노무비
                      </th>
                      <th className="pb-2 text-right font-medium text-slate-500">
                        차감지급액
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEntries.map((entry, i) => (
                      <tr
                        key={entry.worker_id}
                        className={
                          i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                        }
                      >
                        <td className="py-2 font-medium text-slate-800">
                          {entry.worker_name}
                        </td>
                        <td className="py-2 text-right text-slate-600">
                          {entry.job_type}
                        </td>
                        <td className="py-2 text-right text-slate-600">
                          {entry.total_days}일
                        </td>
                        <td className="py-2 text-right text-slate-600">
                          {entry.total_man_days}
                        </td>
                        <td className="py-2 text-right text-slate-600">
                          {canViewAmount ? `${entry.daily_rate.toLocaleString()}원` : "비공개"}
                        </td>
                        <td className="py-2 text-right text-slate-800">
                          {canViewAmount ? `${entry.total_labor_cost.toLocaleString()}원` : "비공개"}
                        </td>
                        <td className="py-2 text-right font-medium text-slate-900">
                          {canViewAmount ? `${entry.net_pay.toLocaleString()}원` : "비공개"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-semibold">
                      <td className="pt-2 text-slate-900">합계</td>
                      <td />
                      <td className="pt-2 text-right text-slate-900">
                        {sortedEntries.reduce((s, e) => s + e.total_days, 0)}일
                      </td>
                      <td className="pt-2 text-right text-slate-900">
                        {sortedEntries.reduce(
                          (s, e) => s + e.total_man_days,
                          0
                        )}
                      </td>
                      <td />
                      <td className="pt-2 text-right text-slate-900">
                        {canViewAmount
                          ? `${(siteReport?.totals.total_labor_cost ?? 0).toLocaleString()}원`
                          : "비공개"}
                      </td>
                      <td className="pt-2 text-right text-slate-900">
                        {canViewAmount
                          ? `${(siteReport?.totals.total_net_pay ?? 0).toLocaleString()}원`
                          : "비공개"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Excel Download */}
      {canViewAmount && (
        <div className="flex justify-end">
          <button
            onClick={handleExcelDownload}
            disabled={!siteReport || downloading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <Download className="h-4 w-4 text-emerald-600" />
            )}
            노무비 엑셀 다운로드
          </button>
        </div>
      )}
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

