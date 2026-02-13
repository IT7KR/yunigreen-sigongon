"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  FileSpreadsheet,
  Info,
  Download,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, PrimitiveButton, cn } from "@sigongon/ui";
import { useProject } from "@/hooks";
import { buildSampleFileDownloadUrl, buildSamplePath } from "@/lib/sampleFiles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepStatus = "completed" | "current" | "pending";

interface SampleDocument {
  name: string;
  samplePath?: string;
  files: string[];
  conditional?: boolean;
  isExample?: boolean;
  note?: string;
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  conditional?: boolean;
  documents: SampleDocument[];
  action?: { label: string; href: string };
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_ORDER: readonly string[] = [
  "draft",
  "diagnosing",
  "estimating",
  "quoted",
  "contracted",
  "in_progress",
  "completed",
  "warranty",
  "closed",
] as const;

function statusAtLeast(current: string, threshold: string): boolean {
  return STATUS_ORDER.indexOf(current) >= STATUS_ORDER.indexOf(threshold);
}

function statusIs(current: string, ...values: string[]): boolean {
  return values.includes(current);
}

// ---------------------------------------------------------------------------
// Step definitions factory
// ---------------------------------------------------------------------------

function buildSteps(id: string): WorkflowStep[] {
  return [
    {
      id: "request",
      title: "견적 요청 접수",
      description: "고객이 전화로 견적을 요청합니다.",
      documents: [],
    },
    {
      id: "visit",
      title: "현장 방문",
      description: "업체(대표 또는 현장소장)가 현장을 방문합니다.",
      documents: [],
      action: { label: "현장방문 관리", href: `/projects/${id}/visits` },
    },
    {
      id: "diagnosis",
      title: "현장 확인 및 진단",
      description: "누수 형태/상황을 확인하고 AI 진단을 수행합니다.",
      documents: [
        {
          name: "현장 점검 보고서 (누수소견서)",
          samplePath: "sample/8. 누수소견서(현장 점검 보고서)/",
          files: [
            "1. 현장 점검 보고서_합격의 법학원.xlsx",
            "2. 현장 점검 보고서_성수동.xlsx",
          ],
        },
      ],
    },
    {
      id: "photo",
      title: "현장 사진 촬영 및 면적 산출",
      description: "현장 사진을 촬영하고 면적을 산출합니다.",
      documents: [],
    },
    {
      id: "estimate-calc",
      title: "시공법 결정 및 견적 산출",
      description:
        "면적/현장 상황 기반으로 시공법을 결정하고 견적서를 산출합니다.",
      documents: [
        {
          name: "견적내역서",
          samplePath: "sample/1. 관공서 계약서류/",
          files: [
            "1. 견적내역서_연동경로당 외 1개소(성산1동 제2경로당) 도장 및 방수공사_25.08.26..xlsx",
          ],
        },
        {
          name: "시방서",
          samplePath: "sample/1. 관공서 계약서류/",
          files: [
            "3. 시방서_연동경로당 외 1개소(성산1동 제2경로당) 도장 및 방수공사.hwp",
          ],
        },
      ],
      action: { label: "견적 관리", href: `/projects/${id}/estimates` },
    },
    {
      id: "estimate-send",
      title: "견적서 발송",
      description: "견적서를 고객에게 발송합니다. (공사 일정 포함)",
      documents: [],
    },
    {
      id: "contract",
      title: "계약 체결",
      description:
        "고객이 업체를 선택하면 계약서를 발행하고 전자서명을 진행합니다.",
      documents: [
        {
          name: "수의계약체결제한여부확인서",
          samplePath: "sample/1. 관공서 계약서류/",
          files: [
            "2. 수의계약체결제한여부확인서_연동경로당 외 1개소(성산1동 제2경로당) 도장 및 방수공사.hwp",
          ],
        },
        {
          name: "사업자 외 서류",
          samplePath: "sample/1. 관공서 계약서류/",
          files: ["4. 사업자외 서류_(주)유니그린개발.pdf"],
        },
        {
          name: "계약보증서",
          samplePath: "sample/1. 관공서 계약서류/",
          files: ["5. 계약보증서_대경중학교 본관동 균열보수공사.pdf"],
        },
        {
          name: "계약보증금 지급각서 (보증서 대체 시)",
          samplePath: "sample/1. 관공서 계약서류/",
          files: ["5-1. 계약보증금 지급각서.hwp"],
          conditional: true,
        },
        {
          name: "공사도급표준계약서 (민간)",
          samplePath: "sample/6. 민간 계약관련 서류(간단)/",
          files: [
            "1. 공사도급표준계약서(공사 전 계약에 필요한 서류).hwp",
          ],
          conditional: true,
        },
        {
          name: "나라장터/S2B 계약서",
          samplePath: "sample/10. 공사계약서(나라장터, S2B)/",
          files: [
            "나라장터 계약서.pdf",
            "나라장터 계약서2.pdf",
            "S2B 계약서.pdf",
          ],
          conditional: true,
        },
      ],
      action: { label: "계약 관리", href: `/projects/${id}/contracts` },
    },
    {
      id: "start-docs",
      title: "착공 서류 제출",
      description:
        "착공계를 발주처에 제출합니다. 발주처에 따라 요구 서류가 다릅니다.",
      documents: [
        {
          name: "착공공문",
          samplePath: "sample/2. 관공서 착공서류/",
          files: ["0. 착공공문.hwp"],
        },
        {
          name: "착공신고서",
          samplePath: "sample/2. 관공서 착공서류/",
          files: ["1. 착공신고서.hwp"],
        },
        {
          name: "재직증명서 (현장대리인)",
          samplePath: "sample/2. 관공서 착공서류/",
          files: ["2. 재직증명서_이시대(현장대리인).hwp"],
        },
        {
          name: "계약내역서",
          samplePath: "sample/2. 관공서 착공서류/",
          files: [
            "3. 계약내역서_하하호호 장난감도서관 잠실점 방수공사.xlsx",
          ],
        },
        {
          name: "노무비 관련 서류",
          samplePath: "sample/2. 관공서 착공서류/",
          files: ["4. 노무비 관련 서류.hwp"],
        },
        {
          name: "안전보건관리 준수 서약서",
          samplePath: "sample/2. 관공서 착공서류/",
          files: ["5. 안전보건관리 준수 서약서.hwp"],
        },
        {
          name: "착공 전 사진",
          samplePath: "sample/2. 관공서 착공서류/",
          files: ["6. 착공 전 사진.hwp"],
        },
        {
          name: "직접시공계획서",
          samplePath: "sample/2. 관공서 착공서류/",
          files: ["7. 직접시공계획서.hwp"],
        },
        {
          name: "안전보건관리계획서",
          samplePath: "sample/2. 관공서 착공서류/",
          files: [
            "8. 안전보건관리계획서(산업안전보건관리비 사용계획서 포함).hwp",
          ],
        },
        {
          name: "착공서류 완성본 (스캔)",
          samplePath: "sample/2. 관공서 착공서류/",
          files: [
            "(최종스캔본) 착공서류_하하호호 장난감도서관 잠실점 방수 공사.pdf",
          ],
          isExample: true,
        },
      ],
    },
    {
      id: "construction",
      title: "시공 (작업일지 작성)",
      description: "매일 작업일지를 작성하고 현장 사진을 기록합니다.",
      documents: [
        {
          name: "공사일지",
          samplePath: "sample/7. 공사일지/",
          files: [
            "공사일지_방배중 외1교(역삼중)균열보수공사_25.08.08.hwp",
          ],
        },
      ],
      action: {
        label: "작업일지 확인",
        href: `/projects/${id}/construction/daily-reports`,
      },
    },
    {
      id: "labor",
      title: "일용직 근로 관리",
      description:
        "일용근로계약서 작성, 지급명세서 발행, 신고자료를 생성합니다.",
      documents: [
        {
          name: "근로내용확인신고 (매월, 근로복지공단)",
          samplePath: "sample/5. 일용신고 서류/",
          files: ["근로내용확인신고_전자신고용.xlsx"],
        },
        {
          name: "일용근로지급명세서 (분기, 국세청)",
          samplePath: "sample/5. 일용신고 서류/",
          files: [
            "일용근로지급명세서 일괄등록 양식_일용근로소득_국세청 양식.xlsx",
          ],
        },
        {
          name: "표준근로계약서",
          samplePath: "sample/5. 일용신고 서류/",
          files: [
            "서울시+건설일용근로자+표준근로계약서(2019.2_개정_서울계약마당).hwp",
          ],
        },
      ],
      action: { label: "노무 관리", href: `/projects/${id}/labor` },
    },
    {
      id: "completion-docs",
      title: "준공 서류 제출",
      description:
        "공사 완료 후 준공계와 각종 증빙서류를 발주처에 제출합니다.",
      documents: [
        {
          name: "준공공문",
          samplePath: "sample/3. 관공서 준공서류/",
          files: ["0. 준공공문.hwp"],
        },
        {
          name: "준공계",
          samplePath: "sample/3. 관공서 준공서류/",
          files: ["1. 준공계.hwp"],
        },
        {
          name: "준공내역서",
          samplePath: "sample/3. 관공서 준공서류/",
          files: ["2. 준공내역서.xlsx"],
        },
        {
          name: "준공내역서 (금액 변동 시)",
          samplePath: "sample/3. 관공서 준공서류/",
          files: [
            "2-1. 준공내역서_준공금액이 계약금액과 상이한 경우.xlsx",
          ],
          conditional: true,
        },
        {
          name: "준공정산동의서 (금액 변동 시)",
          samplePath: "sample/3. 관공서 준공서류/",
          files: [
            "3. 준공정산동의서(준공금 변동이 있을 경우에만 작성).pdf",
          ],
          conditional: true,
        },
        {
          name: "준공사진첩",
          samplePath: "sample/3. 관공서 준공서류/",
          files: ["4. 준공사진첩.xlsx"],
        },
        {
          name: "일용명세서",
          samplePath: "sample/3. 관공서 준공서류/",
          files: ["5. 일용명세서_대경중(제출).xlsx"],
        },
        {
          name: "노무비 미체불확약서/지급내역서",
          samplePath: "sample/3. 관공서 준공서류/",
          files: ["5-1. 노무비 미체불확약서,지급내역서.hwp"],
        },
        {
          name: "근로자 인적사항표",
          samplePath: "sample/3. 관공서 준공서류/",
          files: ["5-2. 근로자 인적사항표.hwp"],
        },
        {
          name: "위임장 (인력사무소 대납 시)",
          samplePath: "sample/3. 관공서 준공서류/",
          files: ["5-3. 위임장.xlsx"],
          conditional: true,
        },
        {
          name: "산업안전보건관리비 집행내역 (2천만원 이상)",
          samplePath: "sample/3. 관공서 준공서류/",
          files: [
            "6. 산업안전보건관리비 집행내역 증빙자료.hwp",
          ],
          conditional: true,
        },
        {
          name: "하자보수보증금 지급각서",
          samplePath: "sample/3. 관공서 준공서류/",
          files: [
            "7. 하자보수보증금 지급각서(발주처에서 요청하는 경우 하자보증증권으로 제출).hwp",
          ],
        },
        {
          name: "준공서류 완성본 (예시)",
          samplePath: "sample/3. 관공서 준공서류/",
          files: [
            "준공서류_대경중학교 본관동 균열보수공사.pdf",
            "준공서류_방배중 외1교(역삼중) 균열보수공사(스캔).pdf",
            "준공서류_하하호호 장난감도서관 잠실점 방수 공사.pdf",
          ],
          isExample: true,
        },
      ],
      action: {
        label: "준공/정산",
        href: `/projects/${id}/completion/closeout-report`,
      },
    },
    {
      id: "utilities",
      title: "수도광열비 처리 (학교 등)",
      description: "학교 프로젝트의 경우, 수도광열비 공문을 발송합니다.",
      conditional: true,
      documents: [
        {
          name: "수도전기공문",
          samplePath: "sample/9. 학교 서류/",
          files: ["1. 수도전기공문.hwp"],
        },
        {
          name: "교육청 원클릭 프로그램",
          samplePath: "sample/9. 학교 서류/",
          files: [
            "공사서류 원클릭 프로그램(2025.3.수정)-서울시교육청용.xlsm",
          ],
          note: "교육청 제공 VBA 매크로 프로그램",
        },
      ],
      action: { label: "수도광열비", href: `/projects/${id}/utilities` },
    },
    {
      id: "tax-invoice",
      title: "세금계산서 발행",
      description:
        "발주처 승인 후 세금계산서를 발행합니다. (팝빌 연동)",
      documents: [],
      action: {
        label: "세금계산서",
        href: `/projects/${id}/tax-invoice`,
      },
    },
    {
      id: "warranty",
      title: "하자보증 관리",
      description: "하자보증서를 발급하고 하자보증 기간을 관리합니다.",
      documents: [],
      action: { label: "하자/보증", href: `/projects/${id}/warranty` },
    },
    {
      id: "payment",
      title: "대금 수령 완료",
      description: "대금을 수령하고 프로젝트를 종료합니다.",
      documents: [],
    },
  ];
}

// ---------------------------------------------------------------------------
// Resolve step statuses from project status
// ---------------------------------------------------------------------------

function resolveStatuses(projectStatus: string): StepStatus[] {
  const s = projectStatus;

  const atLeast = (t: string) => statusAtLeast(s, t);
  const is = (...v: string[]) => statusIs(s, ...v);

  // Step 1: always completed once a project exists
  const s1: StepStatus = "completed";
  // Step 2: completed if NOT draft
  const s2: StepStatus = !is("draft") ? "completed" : "current";
  // Step 3: completed if NOT draft AND NOT diagnosing
  const s3: StepStatus =
    !is("draft") && !is("diagnosing")
      ? "completed"
      : is("diagnosing")
        ? "current"
        : "pending";
  // Step 4: same as step 3
  const s4: StepStatus = s3;
  // Step 5: completed if quoted or later
  const s5: StepStatus = atLeast("quoted")
    ? "completed"
    : is("estimating")
      ? "current"
      : "pending";
  // Step 6: completed if quoted or later
  const s6: StepStatus = atLeast("quoted") ? "completed" : s5 === "current" ? "current" : "pending";
  // Step 7: completed if contracted or later
  const s7: StepStatus = atLeast("contracted")
    ? "completed"
    : is("quoted")
      ? "current"
      : "pending";
  // Step 8: completed if in_progress or later
  const s8: StepStatus = atLeast("in_progress")
    ? "completed"
    : is("contracted")
      ? "current"
      : "pending";
  // Step 9: current if in_progress
  const s9: StepStatus = is("in_progress")
    ? "current"
    : atLeast("completed")
      ? "completed"
      : "pending";
  // Step 10: same as step 9
  const s10: StepStatus = s9;
  // Step 11: current if completed, pending otherwise (unless warranty/closed)
  const s11: StepStatus = is("completed")
    ? "current"
    : atLeast("warranty")
      ? "completed"
      : "pending";
  // Step 12: same as step 11
  const s12: StepStatus = s11;
  // Step 13: current if completed or warranty
  const s13: StepStatus = is("completed", "warranty")
    ? "current"
    : atLeast("closed")
      ? "completed"
      : "pending";
  // Step 14: current if warranty
  const s14: StepStatus = is("warranty")
    ? "current"
    : atLeast("closed")
      ? "completed"
      : "pending";
  // Step 15: completed if closed
  const s15: StepStatus = is("closed") ? "completed" : "pending";

  return [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15];
}

// ---------------------------------------------------------------------------
// File icon helper
// ---------------------------------------------------------------------------

function FileIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["xlsx", "xls", "xlsm", "csv"].includes(ext)) {
    return <FileSpreadsheet className="h-4 w-4 shrink-0 text-green-600" />;
  }
  return <FileText className="h-4 w-4 shrink-0 text-blue-600" />;
}

// ---------------------------------------------------------------------------
// Document list sub-component
// ---------------------------------------------------------------------------

function DocumentList({ documents }: { documents: SampleDocument[] }) {
  if (documents.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.name}
          className="rounded-md border border-slate-100 bg-slate-50 p-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              {doc.name}
            </span>
            {doc.conditional && (
              <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                조건부
              </span>
            )}
            {doc.isExample && (
              <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                예시
              </span>
            )}
          </div>
          {doc.note && (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Info className="h-3 w-3" />
              {doc.note}
            </p>
          )}
          {doc.samplePath && (
            <p className="mt-1 text-[11px] text-slate-400">
              {doc.samplePath}
            </p>
          )}
          <ul className="mt-1.5 space-y-1">
            {doc.files.map((file) => {
              const sampleFilePath = buildSamplePath(doc.samplePath, file);
              return (
                <li
                  key={file}
                  className="flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-slate-100/80"
                >
                  <div className="min-w-0 flex items-center gap-1.5">
                    <FileIcon fileName={file} />
                    <span className="truncate text-xs text-slate-500">{file}</span>
                  </div>
                  {sampleFilePath && (
                    <a
                      href={buildSampleFileDownloadUrl(sampleFilePath)}
                      download
                      className="inline-flex shrink-0 items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Download className="h-3 w-3" />
                      다운로드
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step card sub-component
// ---------------------------------------------------------------------------

function StepCard({
  step,
  stepNumber,
  status,
}: {
  step: WorkflowStep;
  stepNumber: number;
  status: StepStatus;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDocuments = step.documents.length > 0;
  const isCompleted = status === "completed";
  const isCurrent = status === "current";

  return (
    <div className="relative">
      {/* Timeline indicator */}
      <div
        className={cn(
          "absolute -left-8 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold",
          isCompleted
            ? "border-green-500 bg-green-500 text-white"
            : isCurrent
              ? "border-brand-point-500 bg-brand-point-500 text-white"
              : "border-slate-300 bg-white text-slate-400",
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <span>{stepNumber}</span>
        )}
      </div>

      {/* Card body */}
      <div
        className={cn(
          "rounded-lg border p-4 transition-colors",
          isCurrent
            ? "border-brand-point-200 bg-brand-point-50/50 shadow-sm"
            : isCompleted
              ? "border-slate-100 bg-white"
              : "border-slate-100 bg-slate-50/50",
        )}
      >
        {/* Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={cn(
                  "text-sm font-semibold",
                  isCurrent
                    ? "text-brand-point-900"
                    : isCompleted
                      ? "text-slate-700"
                      : "text-slate-500",
                )}
              >
                {stepNumber}. {step.title}
              </h3>
              {isCurrent && (
                <span className="inline-flex items-center rounded-full bg-brand-point-100 px-2 py-0.5 text-[10px] font-medium text-brand-point-800">
                  진행 중
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  완료
                </span>
              )}
              {step.conditional && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  조건부
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">{step.description}</p>
          </div>

          <div className="flex items-center gap-2">
            {step.action && (
              <Button
                  variant={isCurrent ? "primary" : "secondary"}
                  size="sm"
                  className="whitespace-nowrap text-xs"
                 asChild><Link href={step.action.href}>
                  {step.action.label}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link></Button>
            )}
            {hasDocuments && (
              <PrimitiveButton
                type="button"
                onClick={() => setExpanded(!expanded)}
                className={cn(
                  "flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
                  expanded
                    ? "border-slate-300 bg-slate-100 text-slate-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                <FileText className="h-3 w-3" />
                서류 {step.documents.length}건
                {expanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </PrimitiveButton>
            )}
          </div>
        </div>

        {/* Collapsible documents */}
        {expanded && hasDocuments && (
          <DocumentList documents={step.documents} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: response, isLoading } = useProject(id);
  const project = response?.success ? response.data : null;

  if (isLoading || !project) {
    return <div className="h-64 animate-pulse rounded bg-slate-100" />;
  }

  const steps = buildSteps(id);
  const statuses = resolveStatuses(project.status);
  const completedCount = statuses.filter((s) => s === "completed").length;

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                프로젝트 진행 현황
              </h2>
              <p className="text-sm text-slate-500">
                전체 15단계 중{" "}
                <span className="font-semibold text-brand-point-600">
                  {completedCount}단계
                </span>{" "}
                완료
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-48 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${Math.round((completedCount / 15) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-sm font-medium text-slate-600">
                {completedCount}/15
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vertical timeline */}
      <Card>
        <CardHeader>
          <CardTitle>업무 프로세스</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-6 pl-8 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-slate-200">
            {steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                stepNumber={index + 1}
                status={statuses[index]}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
