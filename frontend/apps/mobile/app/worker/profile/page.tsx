"use client";

import { Card, CardContent, Button } from "@sigongon/ui";
import { User, FileText, CreditCard, LogOut, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
              profile.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        doc.status === "submitted"
                          ? "bg-brand-point-500"
                          : "bg-slate-300"
                      }`}
                    ></div>
                    <span className="text-sm">{doc.name}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {doc.status === "submitted" ? "제출완료" : "미제출"}
                  </span>
                </div>
              ))
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
