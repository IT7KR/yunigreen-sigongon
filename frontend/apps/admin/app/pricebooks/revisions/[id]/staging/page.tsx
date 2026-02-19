"use client";

import { useState } from "react";
import { Button, Card, Badge } from "@sigongon/ui";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";

type ValidationIssue = {
  item_index: number;
  item_name: string;
  field: string;
  severity: "ok" | "warning" | "error";
  message: string;
  value?: string | null;
};

type ValidationReport = {
  total_items: number;
  valid_count: number;
  warning_count: number;
  error_count: number;
  is_valid: boolean;
  issues: ValidationIssue[];
};

export default function PricebookStagingPage({
  params,
}: {
  params: { id: string };
}) {
  const [validating, setValidating] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showIssues, setShowIssues] = useState(false);

  async function handleValidate() {
    setValidating(true);
    setValidationError(null);
    try {
      const result = await api.validatePricebookRevision(params.id);
      if (result.success && result.data) {
        setReport(result.data);
        setShowIssues(true);
      } else {
        setValidationError("검증 결과를 가져오지 못했습니다.");
      }
    } catch {
      setValidationError("검증 중 오류가 발생했습니다.");
    } finally {
      setValidating(false);
    }
  }

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

      {/* Validation Section */}
      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">파싱 검증</h2>
          </div>
          <div className="flex items-center gap-3">
            {report && (
              <button
                onClick={() => setShowIssues((v) => !v)}
                className="text-sm text-brand-point-600 hover:underline"
              >
                {showIssues ? "이슈 숨기기" : "이슈 보기"}
              </button>
            )}
            <Button
              variant="secondary"
              onClick={handleValidate}
              disabled={validating}
            >
              {validating ? "검증 중..." : "검증 실행"}
            </Button>
          </div>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          추출된 가격 항목의 품명·단가·단위·Grounding 여부를 검사합니다.
        </p>

        {validationError && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <XCircle className="h-4 w-4 shrink-0" />
            {validationError}
          </div>
        )}

        {report && (
          <div className="mt-4">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                <CheckCircle className="h-4 w-4" />
                정상 {report.valid_count}개
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                경고 {report.warning_count}개
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                <XCircle className="h-4 w-4" />
                오류 {report.error_count}개
              </span>
              <span className="ml-auto text-sm text-slate-500 self-center">
                전체 {report.total_items}개
              </span>
            </div>

            {/* Overall status */}
            {report.is_valid ? (
              <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800 mb-4">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span className="font-medium">검증 통과</span> — 오류 항목이 없습니다.
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 mb-4">
                <XCircle className="h-4 w-4 shrink-0" />
                <span className="font-medium">검증 실패</span> — 오류 항목을 수정한 후 정식 반영하세요.
              </div>
            )}

            {/* Issues list */}
            {showIssues && report.issues.length > 0 && (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-600 w-8">#</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">품명</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">필드</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">심각도</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">메시지</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.issues.map((issue, idx) => (
                      <tr
                        key={idx}
                        className={
                          issue.severity === "error"
                            ? "bg-red-50"
                            : issue.severity === "warning"
                              ? "bg-amber-50"
                              : "bg-white"
                        }
                      >
                        <td className="px-4 py-2 text-slate-500">{issue.item_index + 1}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{issue.item_name}</td>
                        <td className="px-4 py-2 text-slate-500 font-mono text-xs">{issue.field}</td>
                        <td className="px-4 py-2">
                          {issue.severity === "error" ? (
                            <span className="inline-flex items-center gap-1 text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                              오류
                            </span>
                          ) : issue.severity === "warning" ? (
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              경고
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-700">
                              <CheckCircle className="h-3.5 w-3.5" />
                              정상
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-700">{issue.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showIssues && report.issues.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">이슈가 없습니다.</p>
            )}
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}
