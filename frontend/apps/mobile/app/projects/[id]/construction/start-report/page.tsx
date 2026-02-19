"use client";

import { use } from "react";
import { StartReportActionsCard } from "@sigongon/features";
import { MobileLayout } from "@/components/MobileLayout";
import { MOBILE_MOCK_EXPORT_SAMPLE_FILES } from "@/lib/sampleFiles";

export default function MobileStartReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  return (
    <MobileLayout title="착공계" showBack>
      <div className="p-4">
        <StartReportActionsCard
          title="착공계 작성/관리"
          description="착공계 작성/수정은 보고서 메뉴에서 진행합니다. 아래 버튼으로 이동해 주세요."
          projectId={projectId}
          createReportPath="/projects/{projectId}/reports/start"
          reportListPath="/projects/{projectId}/reports"
          samplePath={MOBILE_MOCK_EXPORT_SAMPLE_FILES.startReportPdf}
          listLabel="보고서로 이동"
          sampleLabel="샘플"
        />
      </div>
    </MobileLayout>
  );
}
