"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  LogOut,
  Upload,
  User,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  PrimitiveButton,
  PrimitiveInput,
} from "@sigongon/ui";
import { WorkerLayout } from "@/components/WorkerLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { buildSampleFileDownloadUrl } from "@/lib/sampleFiles";
import { useRouter } from "next/navigation";

type WorkerDocument = {
  id: string;
  name: string;
  status: "submitted" | "pending";
  fileName?: string;
};

type WorkerProfile = {
  id: string;
  name: string;
  role: string;
  documents: WorkerDocument[];
};

const samplePathByDocId: Record<string, string> = {
  doc_1:
    "sample/1. 관공서 계약서류/4. 사업자외 서류_(주)유니그린개발.pdf",
  doc_2:
    "sample/3. 관공서 준공서류/3. 준공정산동의서(준공금 변동이 있을 경우에만 작성).pdf",
};

export default function WorkerProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const workerId = user?.id ?? "";

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const res = await (api as any).getWorkerProfile(workerId);
      if (res.success && res.data) {
        setProfile(res.data as WorkerProfile);
      }
      setIsLoading(false);
    };

    void fetchProfile();
  }, [workerId]);

  const handleUploadClick = (docId: string) => {
    fileInputRefs.current[docId]?.click();
  };

  const handleFileChange = async (
    docId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDocId(docId);
    try {
      const res = await (api as any).uploadWorkerDocument(workerId, docId, file);
      if (res.success) {
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            documents: prev.documents.map((doc) =>
              doc.id === docId
                ? { ...doc, status: "submitted" as const, fileName: file.name }
                : doc,
            ),
          };
        });
      }
    } finally {
      setUploadingDocId(null);
      if (fileInputRefs.current[docId]) {
        fileInputRefs.current[docId]!.value = "";
      }
    }
  };

  const handleLogout = () => {
    router.push("/worker/entry");
  };

  return (
    <WorkerLayout title="내 정보">
      <div className="space-y-6 p-4 pb-8">
        {/* 사용자 아바타 + 정보 */}
        <Card>
          <CardContent className="flex flex-col items-center py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-point-100">
              <User className="h-10 w-10 text-brand-point-600" />
            </div>
            {isLoading ? (
              <div className="mt-4 space-y-2 text-center">
                <div className="mx-auto h-6 w-32 animate-pulse rounded bg-slate-200" />
                <div className="mx-auto h-4 w-20 animate-pulse rounded bg-slate-200" />
              </div>
            ) : (
              <div className="mt-4 text-center">
                <p className="text-xl font-bold text-slate-900">
                  {profile?.name ?? "이름 없음"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {profile?.role ?? ""}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 메뉴 링크 */}
        <Card>
          <CardContent className="p-0">
            <Link
              href="/worker/contracts"
              className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 active:bg-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-point-100">
                  <FileText className="h-5 w-5 text-brand-point-600" />
                </div>
                <span className="font-medium text-slate-900">내 근로계약서</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </Link>
            <div className="mx-4 border-t border-slate-100" />
            <Link
              href="/worker/paystubs"
              className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 active:bg-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary-100">
                  <CreditCard className="h-5 w-5 text-brand-primary-600" />
                </div>
                <span className="font-medium text-slate-900">지급명세서함</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </Link>
          </CardContent>
        </Card>

        {/* 제출 서류 */}
        <div>
          <h2 className="mb-3 font-semibold text-slate-900">제출 서류</h2>
          {isLoading ? (
            <Card>
              <CardContent className="space-y-3 py-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : profile?.documents && profile.documents.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                {profile.documents.map((doc, idx) => (
                  <div key={doc.id}>
                    {idx > 0 && <div className="mx-4 border-t border-slate-100" />}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {doc.name}
                        </p>
                        {doc.status === "submitted" && doc.fileName && (
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {doc.fileName}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                        {doc.status === "submitted" ? (
                          <>
                            <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                              <Check className="h-3 w-3" />
                              제출완료
                            </span>
                            {samplePathByDocId[doc.id] && (
                              <PrimitiveButton
                                onClick={() => {
                                  const url = buildSampleFileDownloadUrl(
                                    samplePathByDocId[doc.id],
                                  );
                                  window.open(url, "_blank");
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 active:bg-slate-100"
                                aria-label="문서 보기"
                              >
                                <Eye className="h-4 w-4" />
                              </PrimitiveButton>
                            )}
                          </>
                        ) : (
                          <>
                            <PrimitiveButton
                              onClick={() => handleUploadClick(doc.id)}
                              disabled={uploadingDocId === doc.id}
                              className="flex items-center gap-1.5 rounded-lg border border-brand-point-300 bg-brand-point-50 px-3 py-1.5 text-xs font-medium text-brand-point-700 hover:bg-brand-point-100 active:bg-brand-point-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {uploadingDocId === doc.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                              업로드
                            </PrimitiveButton>
                            <PrimitiveInput
                              ref={(el) => {
                                fileInputRefs.current[doc.id] = el;
                              }}
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => void handleFileChange(doc.id, e)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-sm text-slate-400">
                제출할 서류가 없습니다.
              </CardContent>
            </Card>
          )}
        </div>

        {/* 로그아웃 버튼 */}
        <Button
          fullWidth
          variant="destructive"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </WorkerLayout>
  );
}
