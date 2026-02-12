"use client";

import { use } from "react";
import { StartReportActionsCard } from "@sigongon/features";

export default function ConstructionStartReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  return (
    <div className="space-y-6">
      <StartReportActionsCard
        title="착공계 작성/관리"
        description="착공계 작성/수정은 보고서 탭에서 진행합니다. 아래 버튼으로 이동해 주세요."
        projectId={projectId}
        createReportPath="/projects/{projectId}/reports/start"
        reportListPath="/projects/{projectId}/reports"
        samplePath="sample/2. 관공서 착공서류/(최종스캔본) 착공서류_하하호호 장난감도서관 잠실점 방수 공사.pdf"
      />
    </div>
  );
}
