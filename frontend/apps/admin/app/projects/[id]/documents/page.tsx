"use client";

import { use, useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Upload,
  Wand2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { Badge, Button, Card, CardContent, PrimitiveButton, PrimitiveInput, toast } from "@sigongon/ui";
import type {
  DocumentPhase,
  DocumentGenerationType,
  DocumentFileFormat,
  ProjectDocumentStatus,
  ProjectDocumentItem,
  ProjectDocumentPhaseGroup,
} from "@sigongon/types";
import {
  buildSampleFileDownloadUrl,
  getSamplePathForDocument,
} from "@/lib/sampleFiles";
import { api } from "@/lib/api";
import {
  getProjectDocumentOverrides,
  upsertProjectDocumentOverride,
  type ProjectDocumentOverride,
} from "@/lib/projectDocumentState";

// ─── Phase config ───────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<
  DocumentPhase,
  { label: string; icon: typeof FileText }
> = {
  contract: { label: "계약 단계", icon: FileText },
  commencement: { label: "착공 단계", icon: FolderOpen },
  construction: { label: "시공 단계", icon: FileText },
  completion: { label: "준공 단계", icon: CheckCircle2 },
  labor_report: { label: "일용신고", icon: FileSpreadsheet },
  private_contract: { label: "민간 계약", icon: FileText },
  school: { label: "학교 특수", icon: AlertCircle },
};

const STATUS_CONFIG: Record<
  ProjectDocumentStatus,
  { label: string; className: string }
> = {
  not_started: {
    label: "미작성",
    className: "bg-slate-100 text-slate-600",
  },
  generated: {
    label: "생성완료",
    className: "bg-green-50 text-green-700",
  },
  uploaded: {
    label: "업로드완료",
    className: "bg-blue-50 text-blue-700",
  },
  submitted: {
    label: "제출완료",
    className: "bg-emerald-50 text-emerald-700",
  },
};

const FORMAT_LABELS: Record<DocumentFileFormat, string> = {
  xlsx: "Excel",
  pdf: "PDF",
  hwp: "HWP",
  hwpx: "HWPX",
  docx: "Word",
};

const FORMAT_CLASS: Record<DocumentFileFormat, string> = {
  xlsx: "bg-emerald-50 text-emerald-700",
  pdf: "bg-red-50 text-red-700",
  hwp: "bg-sky-50 text-sky-700",
  hwpx: "bg-cyan-50 text-cyan-700",
  docx: "bg-indigo-50 text-indigo-700",
};

type DocumentAction = "generate" | "download" | "upload" | "external";

function resolveFileExtension(format: DocumentFileFormat): string {
  return format;
}

// ─── Mock data ──────────────────────────────────────────────────────────────

function doc(
  id: string,
  phase: DocumentPhase,
  name: string,
  format: DocumentFileFormat,
  generation_type: DocumentGenerationType,
  is_required: boolean,
  status: ProjectDocumentStatus,
  opts?: {
    is_conditional?: boolean;
    condition_description?: string;
    file_path?: string;
  },
): ProjectDocumentItem {
  const isComplete =
    status === "generated" || status === "uploaded" || status === "submitted";
  const sampleFilePath = getSamplePathForDocument(id);
  return {
    id,
    phase,
    name,
    format,
    generation_type,
    is_required,
    is_conditional: opts?.is_conditional ?? false,
    condition_description: opts?.condition_description,
    status,
    file_path: isComplete ? sampleFilePath ?? opts?.file_path : opts?.file_path,
    file_size: isComplete ? 102400 : undefined,
    generated_at: isComplete ? "2026-01-20T10:00:00Z" : undefined,
  };
}

function makePhaseGroup(
  phase: DocumentPhase,
  documents: ProjectDocumentItem[],
): ProjectDocumentPhaseGroup {
  const completedStatuses: ProjectDocumentStatus[] = [
    "generated",
    "uploaded",
    "submitted",
  ];
  return {
    phase,
    phase_label: PHASE_CONFIG[phase].label,
    documents,
    total_count: documents.length,
    completed_count: documents.filter((d) =>
      completedStatuses.includes(d.status),
    ).length,
  };
}

const MOCK_DOCUMENT_PHASES: ProjectDocumentPhaseGroup[] = [
  makePhaseGroup("contract", [
    doc("c1", "contract", "견적내역서", "xlsx", "auto", true, "generated"),
    doc("c2", "contract", "수의계약체결제한여부확인서", "hwp", "template", true, "not_started"),
    doc("c3", "contract", "시방서", "hwpx", "auto", true, "generated"),
    doc("c4", "contract", "사업자 외 서류", "pdf", "upload", true, "uploaded"),
    doc("c5", "contract", "계약보증서", "pdf", "upload", true, "not_started"),
    doc("c6", "contract", "계약보증금 지급각서", "hwp", "template", false, "not_started", {
      is_conditional: true,
      condition_description: "보증서 대체 시",
    }),
  ]),
  makePhaseGroup("commencement", [
    doc("m1", "commencement", "착공공문", "hwp", "template", true, "not_started"),
    doc("m2", "commencement", "착공신고서", "hwp", "template", true, "not_started"),
    doc("m3", "commencement", "현장대리인 서류", "hwp", "upload", true, "not_started"),
    doc("m4", "commencement", "계약내역서", "xlsx", "auto", true, "generated"),
    doc("m5", "commencement", "노무비 서류", "hwp", "template", false, "not_started", {
      is_conditional: true,
      condition_description: "상용/일용 선택",
    }),
    doc("m6", "commencement", "안전보건관리 서약서", "hwp", "template", true, "not_started"),
    doc("m7", "commencement", "착공 전 사진", "hwp", "auto", true, "not_started"),
    doc("m8", "commencement", "직접시공계획서", "hwp", "template", true, "not_started"),
    doc("m9", "commencement", "안전보건관리계획서", "hwp", "template", true, "not_started"),
  ]),
  makePhaseGroup("construction", [
    doc("s1", "construction", "공사일지", "hwp", "auto", true, "generated"),
    doc("s2", "construction", "일용근로계약서", "hwp", "auto", true, "generated"),
    doc("s3", "construction", "현장 점검 보고서", "xlsx", "ai", true, "not_started"),
  ]),
  makePhaseGroup("completion", [
    doc("p1", "completion", "준공공문", "hwp", "template", true, "not_started"),
    doc("p2", "completion", "준공계", "hwp", "template", true, "not_started"),
    doc("p3", "completion", "준공내역서", "xlsx", "auto", true, "not_started"),
    doc("p4", "completion", "준공정산동의서", "pdf", "template", false, "not_started", {
      is_conditional: true,
      condition_description: "금액 변동 시",
    }),
    doc("p5", "completion", "준공사진첩", "pdf", "auto", true, "not_started"),
    doc("p6", "completion", "노무비 증빙자료", "pdf", "upload", true, "not_started"),
    doc("p7", "completion", "산업안전관리비 집행내역", "hwp", "template", false, "not_started", {
      is_conditional: true,
      condition_description: "2천만원 이상 공사",
    }),
    doc("p8", "completion", "하자보수보증금 지급각서", "hwp", "template", true, "not_started"),
    doc("p9", "completion", "폐기물/납세 증빙서류", "pdf", "upload", true, "not_started"),
  ]),
  makePhaseGroup("labor_report", [
    doc("l1", "labor_report", "근로내용확인신고", "xlsx", "auto", true, "not_started"),
    doc("l2", "labor_report", "일용근로지급명세서", "xlsx", "auto", true, "not_started"),
    doc("l3", "labor_report", "일용근로계약서", "hwp", "auto", true, "generated"),
  ]),
  makePhaseGroup("private_contract", [
    doc("v1", "private_contract", "공사도급표준계약서", "pdf", "external", true, "not_started"),
  ]),
  makePhaseGroup("school", [
    doc("h1", "school", "교육청 원클릭 프로그램 양식", "xlsx", "upload", false, "not_started", {
      is_conditional: true,
      condition_description: "학교 프로젝트만",
    }),
    doc("h2", "school", "수도전기공문", "hwp", "template", false, "not_started", {
      is_conditional: true,
      condition_description: "학교 준공 시",
    }),
  ]),
];

function applyDocumentOverrides(
  phases: ProjectDocumentPhaseGroup[],
  overrides: Record<string, ProjectDocumentOverride>,
) {
  return phases.map((group) =>
    makePhaseGroup(
      group.phase,
      group.documents.map((docItem) => {
        const override = overrides[docItem.id];
        if (!override) return docItem;
        return {
          ...docItem,
          ...override,
        };
      }),
    ),
  );
}

async function hydrateRepresentativeDocumentState(
  projectId: string,
  phases: ProjectDocumentPhaseGroup[],
) {
  try {
    const assignmentResponse = await api.getProjectRepresentative(projectId);
    const assignment = assignmentResponse.success ? assignmentResponse.data : null;
    if (!assignment) {
      return phases;
    }

    const repsResponse = await api.listFieldRepresentatives();
    const representatives = repsResponse.success ? repsResponse.data : null;
    if (!representatives) {
      return phases;
    }

    const representative = representatives.find(
      (item) => item.id === assignment.representative_id,
    );
    if (!representative) {
      return phases;
    }

    const linkedFilePath =
      representative.career_cert_filename ||
      representative.employment_cert_filename ||
      representative.booklet_filename;
    if (!linkedFilePath) {
      return phases;
    }
    const resolvedPath = linkedFilePath.includes("/")
      ? linkedFilePath
      : getSamplePathForDocument("m3") ?? linkedFilePath;

    return phases.map((group) => {
      if (group.phase !== "commencement") {
        return group;
      }

      const nextDocuments = group.documents.map((docItem) => {
        if (docItem.id !== "m3") {
          return docItem;
        }
        return {
          ...docItem,
          status: "uploaded" as const,
          file_path: resolvedPath,
          file_size: docItem.file_size ?? 102400,
          generated_at:
            representative.career_cert_uploaded_at || docItem.generated_at,
        };
      });

      return makePhaseGroup(group.phase, nextDocuments);
    });
  } catch {
    return phases;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [documentPhases, setDocumentPhases] = useState<ProjectDocumentPhaseGroup[]>(
    () =>
      applyDocumentOverrides(
        MOCK_DOCUMENT_PHASES,
        getProjectDocumentOverrides(id),
      ),
  );
  const [expandedPhases, setExpandedPhases] = useState<Set<DocumentPhase>>(
    () => new Set(documentPhases.map((g) => g.phase)),
  );
  const [pendingUploadDoc, setPendingUploadDoc] =
    useState<ProjectDocumentItem | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const totalDocs = documentPhases.reduce((sum, g) => sum + g.total_count, 0);
  const completedDocs = documentPhases.reduce(
    (sum, g) => sum + g.completed_count,
    0,
  );
  const progressPercent =
    totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;

  useEffect(() => {
    let isMounted = true;

    const loadPhases = async () => {
      const localPhases = applyDocumentOverrides(
        MOCK_DOCUMENT_PHASES,
        getProjectDocumentOverrides(id),
      );
      const hydrated = await hydrateRepresentativeDocumentState(id, localPhases);
      if (isMounted) {
        setDocumentPhases(hydrated);
      }
    };

    void loadPhases();
    return () => {
      isMounted = false;
    };
  }, [id]);

  function togglePhase(phase: DocumentPhase) {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  }

  function updateDocument(
    documentId: string,
    updater: (doc: ProjectDocumentItem) => ProjectDocumentItem,
  ) {
    setDocumentPhases((prev) =>
      prev.map((group) => {
        const hasTarget = group.documents.some((docItem) => docItem.id === documentId);
        if (!hasTarget) {
          return group;
        }
        const nextDocuments = group.documents.map((docItem) =>
          docItem.id === documentId
            ? (() => {
                const nextDoc = updater(docItem);
                upsertProjectDocumentOverride(id, nextDoc.id, {
                  status: nextDoc.status,
                  file_path: nextDoc.file_path,
                  file_size: nextDoc.file_size,
                  generated_at: nextDoc.generated_at,
                });
                return nextDoc;
              })()
            : docItem,
        );
        return makePhaseGroup(group.phase, nextDocuments);
      }),
    );
  }

  function triggerDownload(url: string, fileName?: string) {
    const anchor = document.createElement("a");
    anchor.href = url;
    if (fileName) {
      anchor.download = fileName;
    }
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  function handleDownload(docItem: ProjectDocumentItem) {
    if (!docItem.file_path) {
      toast.error("다운로드할 파일이 없어요.");
      return;
    }
    const extension = resolveFileExtension(docItem.format);
    const fileName = `${docItem.name}.${extension}`;
    const downloadUrl = docItem.file_path.startsWith("blob:")
      ? docItem.file_path
      : buildSampleFileDownloadUrl(docItem.file_path);
    triggerDownload(downloadUrl, fileName);
  }

  function handleAction(action: DocumentAction, docItem: ProjectDocumentItem) {
    if (action === "download") {
      handleDownload(docItem);
      return;
    }

    if (action === "generate") {
      const samplePath = getSamplePathForDocument(docItem.id);
      const generatedAt = new Date().toISOString();
      updateDocument(docItem.id, (current) => ({
        ...current,
        status: "generated",
        file_path: samplePath ?? current.file_path,
        file_size: current.file_size ?? 102400,
        generated_at: generatedAt,
      }));
      toast.success(`${docItem.name} 문서를 생성했어요.`);
      if (samplePath) {
        handleDownload({
          ...docItem,
          status: "generated",
          file_path: samplePath,
          generated_at: generatedAt,
          file_size: docItem.file_size ?? 102400,
        });
      }
      return;
    }

    if (action === "upload") {
      setPendingUploadDoc(docItem);
      uploadInputRef.current?.click();
      return;
    }

    if (action === "external") {
      window.open("https://www.modusign.com", "_blank", "noopener,noreferrer");
      toast.success("외부 전자서명 페이지를 열었어요.");
    }
  }

  function handleUploadInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    const targetDoc = pendingUploadDoc;
    setPendingUploadDoc(null);
    event.target.value = "";

    if (!targetDoc || !selectedFile) {
      return;
    }

    const samplePath = getSamplePathForDocument(targetDoc.id);
    updateDocument(targetDoc.id, (current) => ({
      ...current,
      status: "uploaded",
      file_path: samplePath ?? current.file_path,
      file_size: selectedFile.size,
      generated_at: new Date().toISOString(),
    }));
    toast.success(`${targetDoc.name} 업로드를 완료했어요.`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">문서함</h2>
        <p className="mt-1 text-sm text-slate-500">
          프로젝트 단계별 문서를 관리하고 다운로드할 수 있습니다.
        </p>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              전체 진행률
            </span>
            <span className="text-sm text-slate-500">
              {completedDocs}/{totalDocs}건 완료 ({progressPercent}%)
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-200">
            <div
              className="h-3 rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Phase Sections */}
      <div className="space-y-4">
        {documentPhases.map((group) => {
          const config = PHASE_CONFIG[group.phase];
          const Icon = config.icon;
          const isExpanded = expandedPhases.has(group.phase);
          const phaseProgress =
            group.total_count > 0
              ? Math.round(
                  (group.completed_count / group.total_count) * 100,
                )
              : 0;

          return (
            <Card key={group.phase}>
              {/* Phase Header */}
              <PrimitiveButton
                type="button"
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors rounded-t-lg"
                onClick={() => togglePhase(group.phase)}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-slate-500" />
                  <span className="text-base font-semibold text-slate-900">
                    {group.phase_label}
                  </span>
                  <Badge
                    className={
                      group.completed_count === group.total_count &&
                      group.total_count > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }
                  >
                    {group.completed_count}/{group.total_count}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  {/* Mini progress bar */}
                  <div className="hidden sm:block w-24 h-1.5 rounded-full bg-slate-200">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${phaseProgress}%` }}
                    />
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </PrimitiveButton>

              {/* Phase Content */}
              {isExpanded && (
                <CardContent className="pt-0 pb-4">
                  <div className="divide-y divide-slate-100">
                    {group.documents.map((docItem) => (
                      <DocumentRow
                        key={docItem.id}
                        doc={docItem}
                        onAction={handleAction}
                      />
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <PrimitiveInput
        ref={uploadInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.xlsx,.xls,.xlsm,.docx,.hwp,.hwpx"
        onChange={handleUploadInputChange}
      />
    </div>
  );
}

// ─── Document Row ───────────────────────────────────────────────────────────

function DocumentRow({
  doc: d,
  onAction,
}: {
  doc: ProjectDocumentItem;
  onAction: (action: DocumentAction, doc: ProjectDocumentItem) => void;
}) {
  const statusCfg = STATUS_CONFIG[d.status];
  const hasFile = !!d.file_path;
  const isComplete =
    d.status === "generated" ||
    d.status === "uploaded" ||
    d.status === "submitted";

  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      {/* Left: info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : (
          <Circle className="h-4 w-4 shrink-0 text-slate-300" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900 truncate">
              {d.name}
            </span>
            {/* Format badge */}
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${FORMAT_CLASS[d.format]}`}
            >
              {FORMAT_LABELS[d.format]}
            </span>
            {/* Status badge */}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCfg.className}`}
            >
              {statusCfg.label}
            </span>
            {/* Required label */}
            {d.is_required && (
              <span className="text-[10px] font-medium text-red-500">
                필수
              </span>
            )}
          </div>
          {/* Conditional description */}
          {d.is_conditional && d.condition_description && (
            <p className="mt-0.5 text-xs text-slate-400">
              조건: {d.condition_description}
            </p>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ActionButtons
          doc={d}
          hasFile={hasFile}
          isComplete={isComplete}
          onAction={onAction}
        />
      </div>
    </div>
  );
}

// ─── Action Buttons ─────────────────────────────────────────────────────────

function ActionButtons({
  doc: d,
  hasFile,
  isComplete,
  onAction,
}: {
  doc: ProjectDocumentItem;
  hasFile: boolean;
  isComplete: boolean;
  onAction: (action: DocumentAction, doc: ProjectDocumentItem) => void;
}) {
  const genType = d.generation_type;

  if (genType === "auto" || genType === "template" || genType === "ai") {
    return (
      <>
        <Button
          size="sm"
          variant="secondary"
          disabled={isComplete}
          onClick={() => onAction("generate", d)}
          className="text-xs"
        >
          <Wand2 className="mr-1 h-3.5 w-3.5" />
          생성
        </Button>
        {hasFile && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onAction("download", d)}
            className="text-xs"
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            다운로드
          </Button>
        )}
      </>
    );
  }

  if (genType === "upload") {
    return (
      <>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onAction("upload", d)}
          className="text-xs"
        >
          <Upload className="mr-1 h-3.5 w-3.5" />
          업로드
        </Button>
        {hasFile && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onAction("download", d)}
            className="text-xs"
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            다운로드
          </Button>
        )}
      </>
    );
  }

  if (genType === "external") {
    return (
      <>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onAction("external", d)}
          className="text-xs"
        >
          <ExternalLink className="mr-1 h-3.5 w-3.5" />
          외부 연동
        </Button>
        {hasFile && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onAction("download", d)}
            className="text-xs"
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            다운로드
          </Button>
        )}
      </>
    );
  }

  return null;
}
