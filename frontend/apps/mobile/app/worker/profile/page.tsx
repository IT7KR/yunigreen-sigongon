"use client";

import { Card, CardContent, Button } from "@sigongon/ui";
import { User, FileText, CreditCard, LogOut, ChevronRight, Upload, Check, Loader2, Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";

export default function WorkerProfilePage() {
  const workerId = "worker_1";
  const [profile, setProfile] = useState<{
    id: string;
    name: string;
    role: string;
    documents: Array<{
      id: string;
      name: string;
      status: "submitted" | "pending";
      fileName?: string;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadStates, setUploadStates] = useState<Record<string, { uploading: boolean; fileName?: string }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDocId, setActiveDocId] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const response = await api.getWorkerProfile(workerId);
      if (response.success && response.data) {
        setProfile(response.data);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleUploadClick = (docId: string) => {
    setActiveDocId(docId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDocId) return;

    setUploadStates((prev) => ({
      ...prev,
      [activeDocId]: { uploading: true },
    }));

    try {
      await api.uploadWorkerDocument(workerId, activeDocId, file);

      // Update document status
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: prev.documents.map((doc) =>
            doc.id === activeDocId
              ? { ...doc, status: "submitted" as const, fileName: file.name }
              : doc
          ),
        };
      });

      setUploadStates((prev) => ({
        ...prev,
        [activeDocId]: { uploading: false, fileName: file.name },
      }));
    } catch {
      setUploadStates((prev) => ({
        ...prev,
        [activeDocId]: { uploading: false },
      }));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setActiveDocId("");
  };

  const handleViewDocument = (doc: { id: string; name: string; fileName?: string }) => {
    // Mock viewing functionality
    alert(`서류 확인: ${doc.fileName || doc.name}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">내 정보</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="flex items-center gap-4 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
            <User className="h-8 w-8 text-slate-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isLoading ? "불러오는 중..." : profile?.name || "-"}
            </h2>
            <p className="text-slate-500">{profile?.role || ""}</p>
          </div>
        </div>

        <Card>
          <CardContent className="divide-y divide-slate-100 p-0">
            <Link
              href="/worker/contracts/1"
              className="flex items-center justify-between p-4 hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <span className="font-medium">내 근로계약서</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </Link>
            <Link
              href="/worker/paystubs"
              className="flex items-center justify-between p-4 hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-slate-400" />
                <span className="font-medium">지급명세서함</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900">제출 서류</h3>
              <p className="mt-1 text-xs text-amber-600">
                필수 서류가 제출되어야 지급 및 계약이 원활합니다.
              </p>
            </div>
            {isLoading ? (
              <div className="text-sm text-slate-400">불러오는 중...</div>
            ) : profile?.documents?.length ? (
              <div className="space-y-3">
                {profile.documents.map((doc) => {
                  const uploadState = uploadStates[doc.id];
                  const isUploading = uploadState?.uploading;

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-slate-900">
                            {doc.name}
                          </span>
                          {doc.status === "submitted" && doc.fileName && (
                            <span className="text-xs text-slate-500 truncate">
                              {doc.fileName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isUploading ? (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs">업로드 중...</span>
                          </div>
                        ) : doc.status === "submitted" ? (
                          <>
                            <div className="flex items-center gap-1 text-brand-point-500">
                              <Check className="h-4 w-4" />
                              <span className="text-xs font-medium">제출완료</span>
                            </div>
                            <button
                              onClick={() => handleViewDocument(doc)}
                              className="text-xs px-2 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5"
                            >
                              <Eye className="h-3 w-3" />확인
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUploadClick(doc.id)}
                            className="text-sm px-3 py-1 rounded-lg bg-brand-point-500 text-white hover:bg-brand-point-600 transition-colors flex items-center gap-1"
                          >
                            <Upload className="h-3 w-3" />
                            업로드
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="text-sm text-slate-400">
                제출된 서류가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          variant="ghost"
          fullWidth
          className="text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </Button>
      </main>
    </div>
  );
}
