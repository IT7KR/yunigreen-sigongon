"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button, Card, CardContent, CardHeader, CardTitle, PrimitiveInput, PrimitiveSelect, toast } from "@sigongon/ui";
import { Plus, Trash2, MessageSquare, Copy, Check } from "lucide-react";
import { api } from "@/lib/api";
import type { UserRole } from "@sigongon/types";

type InviteRole = Extract<UserRole, "site_manager" | "company_admin">;

interface InviteRow {
  id: string;
  name: string;
  phone: string;
  role: InviteRole;
}

interface InviteResultItem {
  name: string;
  phone: string;
  inviteUrl: string;
}

const INITIAL_ROW: InviteRow = {
  id: "row_0",
  name: "",
  phone: "",
  role: "site_manager",
};

function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
}

export default function OnboardingInvitePage() {
  const [rows, setRows] = useState<InviteRow[]>([INITIAL_ROW]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<InviteResultItem[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: "",
        phone: "",
        role: "site_manager",
      },
    ]);
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const updateRow = (rowId: string, patch: Partial<InviteRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  };

  const validateRows = (): boolean => {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    for (const row of rows) {
      if (!row.name.trim()) {
        toast.error("초대 대상 이름을 입력해 주세요.");
        return false;
      }
      if (!phoneRegex.test(row.phone)) {
        toast.error("전화번호는 010-0000-0000 형식으로 입력해 주세요.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateRows()) return;

    setIsSubmitting(true);
    setResults([]);

    try {
      const nextResults: InviteResultItem[] = [];
      for (const row of rows) {
        const response = await api.createInvitation({
          phone: row.phone,
          name: row.name.trim(),
          role: row.role,
        });

        if (!response.success || !response.data) {
          throw new Error(response.error?.message || "초대 발송에 실패했어요.");
        }

        nextResults.push({
          name: row.name,
          phone: row.phone,
          inviteUrl: `${window.location.origin}${response.data.invite_url}`,
        });
      }

      setResults(nextResults);
      toast.success("알림톡 초대를 발송했어요.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "초대 발송에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = async (inviteUrl: string, index: number) => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      toast.error("초대 링크 복사에 실패했어요.");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">담당자 및 소장 초대</h1>
          <p className="mt-1 text-slate-600">
            알림톡 링크로 초대하며, 수신자가 개인정보 동의 후 가입을 완료합니다.
          </p>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>초대 대상 입력</CardTitle>
            <Button variant="secondary" onClick={addRow}>
              <Plus className="h-4 w-4" />
              대상 추가
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_1fr_180px_auto]"
              >
                <PrimitiveInput
                  type="text"
                  placeholder="이름"
                  value={row.name}
                  onChange={(event) => updateRow(row.id, { name: event.target.value })}
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                />
                <PrimitiveInput
                  type="tel"
                  placeholder="010-0000-0000"
                  value={row.phone}
                  onChange={(event) =>
                    updateRow(row.id, { phone: formatPhone(event.target.value) })
                  }
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                />
                <PrimitiveSelect
                  value={row.role}
                  onChange={(event) =>
                    updateRow(row.id, { role: event.target.value as InviteRole })
                  }
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                >
                  <option value="site_manager">현장소장</option>
                  <option value="company_admin">실무자/관리자</option>
                </PrimitiveSelect>
                <Button
                  variant="ghost"
                  disabled={rows.length === 1}
                  onClick={() => removeRow(row.id)}
                  aria-label={`행 ${index + 1} 삭제`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="pt-2">
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                <MessageSquare className="h-4 w-4" />
                {isSubmitting ? "발송 중..." : "알림톡 초대 발송"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>발송 결과</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {results.map((result, index) => (
                <div key={`${result.phone}_${index}`} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-900">
                    {result.name} ({result.phone})
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">
                      {result.inviteUrl}
                    </code>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyLink(result.inviteUrl, index)}
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="h-4 w-4" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          링크 복사
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
