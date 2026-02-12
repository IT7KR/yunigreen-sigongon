"use client";

import Link from "next/link";
import { ArrowRight, Download, FileCheck2 } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@sigongon/ui";
import { triggerBrowserDownload } from "@sigongon/platform";
import { buildSampleFileDownloadUrl } from "@sigongon/mocks";

export interface StartReportActionsCardProps {
  title: string;
  description: string;
  projectId: string;
  reportListPath: string;
  samplePath: string;
  sampleFileName?: string;
  createReportPath?: string;
  createLabel?: string;
  listLabel?: string;
  sampleLabel?: string;
}

export function StartReportActionsCard({
  title,
  description,
  projectId,
  reportListPath,
  samplePath,
  sampleFileName = "착공서류_샘플.pdf",
  createReportPath,
  createLabel = "착공계 작성하기",
  listLabel = "착공계 목록 보기",
  sampleLabel = "착공서류 샘플 다운로드",
}: StartReportActionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-slate-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">{description}</p>
        <div className="flex flex-wrap gap-2">
          {createReportPath ? (
            <Link href={createReportPath.replace("{projectId}", projectId)}>
              <Button>
                <FileCheck2 className="h-4 w-4" />
                {createLabel}
              </Button>
            </Link>
          ) : null}

          <Link href={reportListPath.replace("{projectId}", projectId)}>
            <Button variant="secondary">
              {listLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Button
            variant="secondary"
            onClick={() =>
              triggerBrowserDownload({
                url: buildSampleFileDownloadUrl(samplePath),
                fileName: sampleFileName,
                newTab: true,
              })
            }
          >
            <Download className="h-4 w-4" />
            {sampleLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
