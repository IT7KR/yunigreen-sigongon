"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileCheck,
  FileX,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Image,
  Plus,
} from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import {
  Card,
  CardContent,
  Button,
  StatusBadge,
  formatDate,
} from "@sigongon/ui";
import { mockApiClient } from "@/lib/mocks/mockApi";
import type { ReportStatus } from "@sigongon/types";

interface Report {
  id: string;
  project_id: string;
  report_type: "start" | "completion";
  report_number?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  construction_name?: string;
  start_date?: string;
  actual_end_date?: string;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
}

interface ReportsPageProps {
  params: Promise<{ id: string }>;
}

export default function ReportsPage({ params }: ReportsPageProps) {
  const { id } = use(params);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await mockApiClient.getConstructionReports(id);
        if (response.success && response.data) {
          setReports(response.data);
        }
      } catch (error) {
        console.error("보고서 목록 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [id]);

  if (loading) {
    return (
      <MobileLayout title="공사 보고서" showBack>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-point-500 border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  const startReports = reports.filter((r) => r.report_type === "start");
  const completionReports = reports.filter(
    (r) => r.report_type === "completion",
  );
  const editableStartReport = startReports.find(
    (report) => report.status === "draft" || report.status === "rejected",
  );

  return (
    <MobileLayout
      title="공사 보고서"
      showBack
      rightAction={
        <Button size="sm" asChild>
          <Link
            href={
              editableStartReport
                ? `/projects/${id}/reports/start?reportId=${editableStartReport.id}`
                : `/projects/${id}/reports/start`
            }
          >
            <Plus className="h-4 w-4" />
            착공계
          </Link>
        </Button>
      }
    >
      <div className="space-y-6 p-4">
        <Card>
          <CardContent className="grid grid-cols-2 gap-2 p-4">
            <Button variant="secondary" fullWidth asChild><Link href={`/projects/${id}/completion/closeout-report`}>
                <CheckCircle2 className="h-4 w-4" />
                준공/정산
              </Link></Button>
            <Button variant="secondary" fullWidth asChild><Link href={`/projects/${id}/completion/photo-album`}>
                <Image className="h-4 w-4" />
                준공사진첩
              </Link></Button>
          </CardContent>
        </Card>

        {/* 착공계 섹션 */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">착공계</h2>
            <span className="text-sm text-slate-500">
              {startReports.length}건
            </span>
          </div>

          {startReports.length > 0 ? (
            <div className="space-y-3">
              {startReports.map((report) => (
                <Link
                  key={report.id}
                  href={
                    report.status === "draft" || report.status === "rejected"
                      ? `/projects/${id}/reports/start?reportId=${report.id}`
                      : `/projects/${id}/reports/${report.id}`
                  }
                >
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-brand-point-600" />
                            <h3 className="font-medium text-slate-900">
                              {report.construction_name || "착공계"}
                            </h3>
                          </div>
                          {report.report_number && (
                            <p className="text-xs text-slate-500">
                              {report.report_number}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={report.status as ReportStatus} />
                      </div>

                      <div className="space-y-2">
                        {report.start_date && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>착공일: {report.start_date}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{formatDate(report.created_at)} 생성</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <FileCheck className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  아직 착공계가 없어요
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* 준공계 섹션 */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">준공계</h2>
            <span className="text-sm text-slate-500">
              {completionReports.length}건
            </span>
          </div>

          {completionReports.length > 0 ? (
            <div className="space-y-3">
              {completionReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/projects/${id}/reports/${report.id}`}
                >
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <FileX className="h-4 w-4 text-green-600" />
                            <h3 className="font-medium text-slate-900">
                              {report.construction_name || "준공계"}
                            </h3>
                          </div>
                          {report.report_number && (
                            <p className="text-xs text-slate-500">
                              {report.report_number}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={report.status as ReportStatus} />
                      </div>

                      <div className="space-y-2">
                        {report.actual_end_date && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>준공일: {report.actual_end_date}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{formatDate(report.created_at)} 생성</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <FileX className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  아직 준공계가 없어요
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </MobileLayout>
  );
}
