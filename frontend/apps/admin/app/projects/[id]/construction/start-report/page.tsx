"use client";

import { use } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@sigongon/ui";
import { ClipboardCheck, Download, FileCheck2, ArrowRight } from "lucide-react";
import { buildSampleFileDownloadUrl } from "@/lib/sampleFiles";

export default function ConstructionStartReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  function downloadStartReportSample() {
    const anchor = document.createElement("a");
    anchor.href = buildSampleFileDownloadUrl(
      "sample/2. 관공서 착공서류/(최종스캔본) 착공서류_하하호호 장난감도서관 잠실점 방수 공사.pdf",
    );
    anchor.download = "착공서류_샘플.pdf";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-slate-400" />
            착공계 작성/관리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            착공계 작성/수정은 보고서 탭에서 진행합니다. 아래 버튼으로 이동해
            주세요.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/projects/${projectId}/reports/start`}>
              <Button>
                <FileCheck2 className="h-4 w-4" />
                착공계 작성하기
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/reports`}>
              <Button variant="secondary">
                착공계 목록 보기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="secondary" onClick={downloadStartReportSample}>
              <Download className="h-4 w-4" />
              착공서류 샘플 다운로드
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

