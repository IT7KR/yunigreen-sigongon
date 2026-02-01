"use client";

import { use, useState, useEffect } from "react";
import {
  FileText,
  Download,
  Filter,
  Search,
  File,
  FileCheck,
  FileEdit,
  FileSignature,
  Camera,
  Receipt,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  formatDate,
} from "@sigongon/ui";

type DocumentType =
  | "estimate"
  | "contract"
  | "construction_report"
  | "daily_report"
  | "completion_album"
  | "tax_invoice";

type DocumentStatus =
  | "draft"
  | "sent"
  | "signed"
  | "submitted"
  | "issued"
  | "completed";

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  created_at: string;
  file_path?: string;
  file_size?: number;
  created_by?: string;
}

const DOCUMENT_TYPE_CONFIG: Record<
  DocumentType,
  { label: string; icon: typeof FileText; color: string }
> = {
  estimate: { label: "견적서", icon: FileText, color: "blue" },
  contract: { label: "계약서", icon: FileSignature, color: "green" },
  construction_report: { label: "착공계/준공계", icon: FileCheck, color: "purple" },
  daily_report: { label: "작업일지", icon: FileEdit, color: "orange" },
  completion_album: { label: "준공사진첩", icon: Camera, color: "pink" },
  tax_invoice: { label: "세금계산서", icon: Receipt, color: "indigo" },
};

const DOCUMENT_STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; variant: "default" | "success" | "warning" | "error" | "info" }
> = {
  draft: { label: "작성중", variant: "default" },
  sent: { label: "발송완료", variant: "info" },
  signed: { label: "서명완료", variant: "success" },
  submitted: { label: "제출완료", variant: "success" },
  issued: { label: "발행완료", variant: "success" },
  completed: { label: "완료", variant: "success" },
};

export default function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<DocumentType | "all">("all");

  useEffect(() => {
    loadDocuments();
  }, [id]);

  async function loadDocuments() {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call when backend implements
      const mockDocuments: Document[] = [
        {
          id: "1",
          name: "견적서 v1",
          type: "estimate",
          status: "sent",
          created_at: "2026-01-15T10:00:00Z",
          file_path: "/files/estimate_v1.pdf",
          file_size: 245678,
          created_by: "김관리",
        },
        {
          id: "2",
          name: "견적서 v2 (최종)",
          type: "estimate",
          status: "signed",
          created_at: "2026-01-18T14:30:00Z",
          file_path: "/files/estimate_v2.pdf",
          file_size: 256789,
          created_by: "김관리",
        },
        {
          id: "3",
          name: "공사계약서",
          type: "contract",
          status: "signed",
          created_at: "2026-01-20T09:00:00Z",
          file_path: "/files/contract.pdf",
          file_size: 512345,
          created_by: "이대표",
        },
        {
          id: "4",
          name: "착공계",
          type: "construction_report",
          status: "submitted",
          created_at: "2026-01-22T11:00:00Z",
          file_path: "/files/start_report.pdf",
          file_size: 345678,
          created_by: "박현장",
        },
        {
          id: "5",
          name: "1월 22일 작업일지",
          type: "daily_report",
          status: "completed",
          created_at: "2026-01-22T18:00:00Z",
          file_size: 123456,
          created_by: "박현장",
        },
        {
          id: "6",
          name: "1월 23일 작업일지",
          type: "daily_report",
          status: "completed",
          created_at: "2026-01-23T18:00:00Z",
          file_size: 134567,
          created_by: "박현장",
        },
        {
          id: "7",
          name: "준공 사진첩",
          type: "completion_album",
          status: "draft",
          created_at: "2026-01-24T10:00:00Z",
          created_by: "박현장",
        },
      ];
      setDocuments(mockDocuments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload(doc: Document) {
    if (doc.file_path) {
      alert(`다운로드: ${doc.name}\n경로: ${doc.file_path}`);
      // Implement actual download logic
    } else {
      alert("파일이 없습니다.");
    }
  }

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Group by type
  const documentsByType = filteredDocuments.reduce(
    (acc, doc) => {
      if (!acc[doc.type]) {
        acc[doc.type] = [];
      }
      acc[doc.type].push(doc);
      return acc;
    },
    {} as Record<DocumentType, Document[]>,
  );

  const documentTypes = Object.keys(DOCUMENT_TYPE_CONFIG) as DocumentType[];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">문서함</h2>
          <p className="mt-1 text-sm text-slate-500">
            프로젝트 관련 모든 문서를 확인하고 다운로드할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="문서 이름으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedType === "all" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setSelectedType("all")}
              >
                전체
              </Button>
              {documentTypes.map((type) => {
                const config = DOCUMENT_TYPE_CONFIG[type];
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    variant={selectedType === type ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                  >
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-slate-500">문서를 불러오는 중...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <File className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">
              {searchQuery || selectedType !== "all"
                ? "검색 결과가 없습니다."
                : "아직 문서가 없습니다."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {selectedType === "all" ? (
            // Grouped by type
            documentTypes.map((type) => {
              const docs = documentsByType[type];
              if (!docs || docs.length === 0) return null;

              const config = DOCUMENT_TYPE_CONFIG[type];
              const Icon = config.icon;

              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-slate-400" />
                      {config.label}
                      <Badge>{docs.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-slate-100">
                      {docs.map((doc) => (
                        <DocumentRow
                          key={doc.id}
                          doc={doc}
                          onDownload={handleDownload}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            // Single type
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-slate-400" />
                  {DOCUMENT_TYPE_CONFIG[selectedType].label}
                  <Badge>{filteredDocuments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100">
                  {filteredDocuments.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>문서 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documentTypes.map((type) => {
              const docs = documentsByType[type] || [];
              const config = DOCUMENT_TYPE_CONFIG[type];
              const Icon = config.icon;

              return (
                <div
                  key={type}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-4"
                >
                  <div className={`rounded-lg bg-${config.color}-50 p-2`}>
                    <Icon className={`h-5 w-5 text-${config.color}-600`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{config.label}</p>
                    <p className="text-xl font-bold text-slate-900">
                      {docs.length}건
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentRow({
  doc,
  onDownload,
}: {
  doc: Document;
  onDownload: (doc: Document) => void;
}) {
  const typeConfig = DOCUMENT_TYPE_CONFIG[doc.type];
  const statusConfig = DOCUMENT_STATUS_CONFIG[doc.status];
  const TypeIcon = typeConfig.icon;

  return (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-4">
        <div className={`rounded-lg bg-${typeConfig.color}-50 p-2`}>
          <TypeIcon className={`h-5 w-5 text-${typeConfig.color}-600`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900">{doc.name}</p>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
            <span>{typeConfig.label}</span>
            <span>•</span>
            <span>{formatDate(doc.created_at)}</span>
            {doc.created_by && (
              <>
                <span>•</span>
                <span>{doc.created_by}</span>
              </>
            )}
            {doc.file_size && (
              <>
                <span>•</span>
                <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {doc.file_path && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onDownload(doc)}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
