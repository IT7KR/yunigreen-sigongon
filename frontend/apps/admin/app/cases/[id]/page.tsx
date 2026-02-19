"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { api } from "@/lib/api";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@sigongon/ui";
import type {
  DiagnosisCase,
  DiagnosisCaseEstimate,
  DiagnosisCaseImage,
  VisionResultDetail,
} from "@sigongon/types";
import { Download, Play, Save } from "lucide-react";
import { saveAs } from "file-saver";

interface CaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const caseId = Number(id);

  const [caseData, setCaseData] = useState<DiagnosisCase | null>(null);
  const [images, setImages] = useState<DiagnosisCaseImage[]>([]);
  const [vision, setVision] = useState<VisionResultDetail | null>(null);
  const [estimate, setEstimate] = useState<DiagnosisCaseEstimate | null>(null);
  const [visionEditor, setVisionEditor] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [caseId]);

  async function load() {
    setLoading(true);
    try {
      const [caseRes, imageRes, estimateRes] = await Promise.all([
        api.getCase(caseId),
        api.getCaseImages(caseId),
        api.getCaseEstimate(caseId).catch(() => null),
      ]);
      if (caseRes.success && caseRes.data) setCaseData(caseRes.data);
      if (imageRes.success && imageRes.data) setImages(imageRes.data);
      if (estimateRes?.success && estimateRes.data) setEstimate(estimateRes.data);
    } catch (err) {
      console.error("케이스 데이터 불러오기 실패:", err);
    } finally {
      setLoading(false);
    }
  }

  const previewJson = useMemo(() => {
    if (!vision) return "";
    return JSON.stringify(vision.result_json, null, 2);
  }, [vision]);

  useEffect(() => {
    if (previewJson) setVisionEditor(previewJson);
  }, [previewJson]);

  async function handleUploadImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadCaseImage(caseId, file, { from: "admin-case-detail" });
      }
      const imageRes = await api.getCaseImages(caseId);
      if (imageRes.success && imageRes.data) setImages(imageRes.data);
    } finally {
      setBusy(false);
    }
  }

  async function handleRunVision() {
    setBusy(true);
    try {
      const res = await api.runCaseVision(caseId, {});
      if (res.success && res.data) {
        setVision(res.data);
        setVisionEditor(JSON.stringify(res.data.result_json, null, 2));
      }
      const caseRes = await api.getCase(caseId);
      if (caseRes.success && caseRes.data) setCaseData(caseRes.data);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveVision() {
    setBusy(true);
    try {
      const parsed = JSON.parse(visionEditor) as VisionResultDetail["result_json"];
      const res = await api.updateCaseVision(caseId, {
        result_json: parsed,
        confidence: vision?.confidence,
      });
      if (res.success && res.data) setVision(res.data);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateEstimate() {
    setBusy(true);
    try {
      const res = await api.createCaseEstimate(caseId);
      if (res.success && res.data) setEstimate(res.data);
      const caseRes = await api.getCase(caseId);
      if (caseRes.success && caseRes.data) setCaseData(caseRes.data);
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadCsv() {
    try {
      const blob = await api.downloadCaseEstimateCsv(caseId);
      saveAs(blob, `case-${caseId}-estimate.csv`);
    } catch (err) {
      console.error("CSV 다운로드 실패:", err);
      alert("CSV 다운로드에 실패했어요.");
    }
  }

  async function handleDownloadXlsx() {
    try {
      const blob = await api.downloadCaseEstimateXlsx(caseId);
      saveAs(blob, `case-${caseId}-estimate.xlsx`);
    } catch (err) {
      console.error("XLSX 다운로드 실패:", err);
      alert("XLSX 다운로드에 실패했어요.");
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <p className="text-sm text-slate-500">불러오는 중...</p>
      </AdminLayout>
    );
  }

  if (!caseData) {
    return (
      <AdminLayout>
        <div className="space-y-3">
          <p className="text-sm text-red-500">케이스를 찾을 수 없습니다.</p>
          <Button onClick={() => router.push("/cases")}>목록으로</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">케이스 #{caseData.id}</h1>
            <p className="mt-1 text-sm text-slate-500">시즌 {caseData.season_id}</p>
          </div>
          <Badge variant={caseData.status === "estimated" ? "success" : "info"}>
            {caseData.status}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>사진 업로드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              multiple
              onChange={(e) => void handleUploadImages(e.target.files)}
              disabled={busy}
            />
            <p className="text-sm text-slate-500">등록 사진: {images.length}장</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {images.map((image) => (
                <img
                  key={image.id}
                  src={image.file_url}
                  alt="case image"
                  className="aspect-square rounded-lg border border-slate-200 object-cover"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Vision JSON</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleRunVision} loading={busy}>
                <Play className="h-4 w-4" />
                분석 실행
              </Button>
              <Button onClick={handleSaveVision} loading={busy}>
                <Save className="h-4 w-4" />
                수정 저장
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={visionEditor}
              onChange={(e) => setVisionEditor(e.target.value)}
              rows={18}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-700"
              placeholder="분석 실행 후 JSON이 표시됩니다."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>견적 결과</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleCreateEstimate} loading={busy}>
                견적 생성
              </Button>
              <Button variant="ghost" onClick={handleDownloadCsv} disabled={!estimate}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button variant="ghost" onClick={handleDownloadXlsx} disabled={!estimate}>
                <Download className="h-4 w-4" />
                XLSX
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!estimate ? (
              <p className="text-sm text-slate-500">견적을 아직 생성하지 않았습니다.</p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                        <th className="pb-2 font-medium">품목</th>
                        <th className="pb-2 font-medium">단위</th>
                        <th className="pb-2 font-medium">수량</th>
                        <th className="pb-2 font-medium">단가</th>
                        <th className="pb-2 font-medium">금액</th>
                        <th className="pb-2 font-medium">근거</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimate.items.map((line, idx) => {
                        const evidence = line.evidence[0];
                        return (
                          <tr key={`${line.item_name}-${idx}`} className="border-b border-slate-100">
                            <td className="py-2">{line.item_name}</td>
                            <td className="py-2">{line.unit}</td>
                            <td className="py-2">{line.quantity}</td>
                            <td className="py-2">{line.unit_price.toLocaleString()}</td>
                            <td className="py-2">{line.amount.toLocaleString()}</td>
                            <td className="py-2 text-xs text-slate-600">
                              {evidence?.doc_title} / p.{evidence?.page} / {evidence?.table_id} / {evidence?.row_id}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  공급가액 {estimate.totals.subtotal.toLocaleString()}원 / 부가세{" "}
                  {estimate.totals.vat_amount.toLocaleString()}원 / 합계{" "}
                  {estimate.totals.total_amount.toLocaleString()}원
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
