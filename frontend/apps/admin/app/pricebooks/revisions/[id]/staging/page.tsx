"use client";

import { Button, Card, Badge } from "@sigongon/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { Upload, FileText, CheckCircle, AlertTriangle } from "lucide-react";

export default function PricebookStagingPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span>단가표 관리</span>
          <span>/</span>
          <span>Revisions</span>
          <span>/</span>
          <span className="font-medium text-slate-900">v{params.id}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          단가표 업로드/검수
        </h1>
        <p className="mt-1 text-slate-600">
          업로드 시점부터 새 단가가 적용됩니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Upload Section */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            PDF 업로드
          </h2>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-12 transition-colors hover:bg-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
              <Upload className="h-6 w-6 text-slate-600" />
            </div>
            <p className="mt-4 text-center text-sm text-slate-600">
              <span className="font-semibold text-brand-point-600">파일 선택</span>{" "}
              또는 여기로 드래그
            </p>
            <p className="mt-1 text-xs text-slate-500">PDF 파일만 가능</p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button>업로드</Button>
          </div>
        </Card>

        {/* Right: Staging/Action Section */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            스테이징 검수
          </h2>

          <div className="mb-6 space-y-4">
            <div className="flex items-start gap-3 rounded-md bg-amber-50 p-4 text-amber-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">검수 대기중</p>
                <p className="mt-1">
                  업로드된 파일의 단가 데이터를 추출하고 있습니다.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  추출 항목
                </span>
                <Badge variant="default">1,240개</Badge>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 w-2/3 rounded-full bg-brand-point-500"></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="secondary" fullWidth className="justify-start">
              <FileText className="mr-2 h-4 w-4" />
              추출 데이터 미리보기
            </Button>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button variant="secondary">활성화 (Test)</Button>
              <Button>정식 반영</Button>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
