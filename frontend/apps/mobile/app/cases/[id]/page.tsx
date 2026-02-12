"use client";

import { use, useEffect, useState } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { api } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@sigongon/ui";
import type {
  DiagnosisCase,
  DiagnosisCaseEstimate,
  DiagnosisCaseImage,
  VisionResultDetail,
} from "@sigongon/types";
import { Download, Play } from "lucide-react";

interface MobileCaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function MobileCaseDetailPage({ params }: MobileCaseDetailPageProps) {
  const { id } = use(params);
  const caseId = Number(id);
  const [caseData, setCaseData] = useState<DiagnosisCase | null>(null);
  const [images, setImages] = useState<DiagnosisCaseImage[]>([]);
  const [vision, setVision] = useState<VisionResultDetail | null>(null);
  const [estimate, setEstimate] = useState<DiagnosisCaseEstimate | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, [caseId]);

  async function load() {
    const [caseRes, imgRes, estRes] = await Promise.all([
      api.getCase(caseId),
      api.getCaseImages(caseId),
      api.getCaseEstimate(caseId).catch(() => null),
    ]);
    if (caseRes.success && caseRes.data) setCaseData(caseRes.data);
    if (imgRes.success && imgRes.data) setImages(imgRes.data);
    if (estRes?.success && estRes.data) setEstimate(estRes.data);
  }

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadCaseImage(caseId, file, { from: "mobile-case-detail" });
      }
      const imgRes = await api.getCaseImages(caseId);
      if (imgRes.success && imgRes.data) setImages(imgRes.data);
    } finally {
      setBusy(false);
    }
  }

  async function runVision() {
    setBusy(true);
    try {
      const res = await api.runCaseVision(caseId, {});
      if (res.success && res.data) setVision(res.data);
      const caseRes = await api.getCase(caseId);
      if (caseRes.success && caseRes.data) setCaseData(caseRes.data);
    } finally {
      setBusy(false);
    }
  }

  async function createEstimate() {
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

  async function downloadCsv() {
    const blob = await api.downloadCaseEstimateCsv(caseId);
    downloadBlob(blob, `case-${caseId}-estimate.csv`);
  }

  async function downloadXlsx() {
    const blob = await api.downloadCaseEstimateXlsx(caseId);
    downloadBlob(blob, `case-${caseId}-estimate.xlsx`);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <MobileLayout
      title={`케이스 #${caseId}`}
      showBack
      rightAction={
        caseData ? (
          <Badge variant={caseData.status === "estimated" ? "success" : "info"}>
            {caseData.status}
          </Badge>
        ) : null
      }
    >
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">사진 업로드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="file" multiple onChange={(e) => void onUpload(e.target.files)} />
            <p className="text-xs text-slate-500">등록 사진: {images.length}장</p>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <img key={img.id} src={img.file_url} alt="case" className="aspect-square rounded-lg object-cover" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">진단/견적</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button fullWidth onClick={runVision} loading={busy}>
              <Play className="h-4 w-4" />
              Vision 분석 실행
            </Button>
            <Button fullWidth variant="secondary" onClick={createEstimate} loading={busy}>
              견적 생성
            </Button>
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              신뢰도: {Math.round((vision?.confidence || 0) * 100)}%
            </div>
            {estimate && (
              <div className="rounded-lg border border-slate-200 p-3 text-sm">
                합계: {estimate.totals.total_amount.toLocaleString()}원
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={downloadCsv} disabled={!estimate}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button variant="ghost" onClick={downloadXlsx} disabled={!estimate}>
                <Download className="h-4 w-4" />
                XLSX
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
