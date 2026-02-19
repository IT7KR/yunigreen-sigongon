"use client";

import { use, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  formatDate,
  toast,
} from "@sigongon/ui";
import { Shield, Clock3, Download, Wrench, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { buildSampleFileDownloadUrl } from "@/lib/sampleFiles";

interface ASRequestItem {
  id: string;
  description: string;
  status: string;
  created_at: string;
  resolved_at?: string;
}

interface WarrantyInfo {
  project_id: string;
  warranty_expires_at: string;
  days_remaining: number;
  is_expired: boolean;
  as_requests: ASRequestItem[];
}

const asStatusLabel: Record<string, string> = {
  received: "접수",
  in_progress: "처리중",
  completed: "완료",
};

const asStatusClass: Record<string, string> = {
  received: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

export default function WarrantyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const [warrantyInfo, setWarrantyInfo] = useState<WarrantyInfo | null>(null);

  useEffect(() => {
    loadWarrantyInfo();
  }, [projectId]);

  async function loadWarrantyInfo() {
    try {
      setLoading(true);
      const response = await api.getWarrantyInfo(projectId);
      if (response.success && response.data) {
        setWarrantyInfo(response.data);
      }
    } catch (error) {
      console.error(error);
      toast.error("하자보증 정보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateASRequest() {
    const trimmed = description.trim();
    if (!trimmed) {
      toast.error("하자 접수 내용을 입력해 주세요.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.createASRequest(projectId, {
        description: trimmed,
      });
      if (response.success) {
        toast.success("A/S 요청을 등록했어요.");
        setDescription("");
        await loadWarrantyInfo();
      }
    } catch (error) {
      console.error(error);
      toast.error("A/S 요청 등록에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  function downloadWarrantySample() {
    const anchor = document.createElement("a");
    anchor.href = buildSampleFileDownloadUrl(
      "sample/3. 관공서 준공서류/7. 하자보수보증금 지급각서(발주처에서 요청하는 경우 하자보증증권으로 제출).hwpx",
    );
    anchor.download = "하자보수보증금_지급각서_샘플.hwpx";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  if (!warrantyInfo) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-500">
        하자보증 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-400" />
              하자보증 기간
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              만료일: {formatDate(warrantyInfo.warranty_expires_at)}
            </p>
          </div>
          <Badge
            className={
              warrantyInfo.is_expired
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            }
          >
            {warrantyInfo.is_expired
              ? "만료됨"
              : `${warrantyInfo.days_remaining}일 남음`}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={downloadWarrantySample}>
            <Download className="h-4 w-4" />
            하자보증 서류 샘플 다운로드
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-slate-400" />
            A/S 요청 등록
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="예: 준공 후 외벽 하단에서 재누수가 확인되었습니다."
          />
          <Button onClick={handleCreateASRequest} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            A/S 요청 등록
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-slate-400" />
            A/S 처리 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warrantyInfo.as_requests.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              등록된 A/S 요청이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {warrantyInfo.as_requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">
                      {request.description}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        asStatusClass[request.status] ||
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {asStatusLabel[request.status] || request.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    접수일 {formatDate(request.created_at)}
                    {request.resolved_at
                      ? ` · 완료일 ${formatDate(request.resolved_at)}`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
