"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Modal,
} from "@sigongon/ui";
import { Plus, Download, UserPlus, Mail, X, Loader2, Check } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function LaborPage() {
  const [summary, setSummary] = useState({
    active_workers: 0,
    pending_paystubs: 0,
    unsigned_contracts: 0,
  });
  const [workers, setWorkers] = useState<
    Array<{
      id: string;
      name: string;
      role: string;
      status: "active" | "inactive";
      contract_status: "signed" | "pending";
      last_work_date: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Worker registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  const [registerSuccess, setRegisterSuccess] = useState<{ message: string; isNew: boolean } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const response = await api.getLaborOverview();
      if (response.success && response.data) {
        setSummary(response.data.summary);
        setWorkers(response.data.workers);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handlePhoneFormat = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handleRegisterWorker = async () => {
    const errors: Record<string, string> = {};

    if (!workerName.trim()) {
      errors.name = "이름을 입력하세요";
    }

    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!workerPhone || !phoneRegex.test(workerPhone)) {
      errors.phone = "010-0000-0000 형식으로 입력하세요";
    }

    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      return;
    }

    setIsRegistering(true);
    setRegisterErrors({});
    setRegisterSuccess(null);

    try {
      const res = await api.registerWorker({
        name: workerName.trim(),
        phone: workerPhone,
      });

      if (res.success && res.data) {
        setRegisterSuccess({
          message: res.data.message,
          isNew: res.data.is_new,
        });

        // Refresh worker list
        const response = await api.getLaborOverview();
        if (response.success && response.data) {
          setSummary(response.data.summary);
          setWorkers(response.data.workers);
        }

        // Reset form after 2 seconds
        setTimeout(() => {
          setShowRegisterModal(false);
          setWorkerName("");
          setWorkerPhone("");
          setRegisterSuccess(null);
        }, 2000);
      }
    } catch {
      setRegisterErrors({ submit: "근로자 등록에 실패했습니다" });
    }

    setIsRegistering(false);
  };

  const closeModal = () => {
    setShowRegisterModal(false);
    setWorkerName("");
    setWorkerPhone("");
    setRegisterErrors({});
    setRegisterSuccess(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">노무 관리</h1>
          <div className="flex gap-2">
            <Link href="/labor/contracts">
              <Button variant="secondary">
                <Mail className="mr-2 h-4 w-4" />
                근로계약 관리
              </Button>
            </Link>
            <Button variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              신고 엑셀 다운로드
            </Button>
            <Button onClick={() => setShowRegisterModal(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              근로자 등록
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                이번 달 출역 인원
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.active_workers}명
              </div>
              <p className="text-xs text-green-500">현장 기준</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                지급명세서 발송 대기
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {summary.pending_paystubs}건
              </div>
              <Button size="sm" variant="ghost" className="px-0">
                일괄 발송하기
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                미체결 근로계약
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary.unsigned_contracts}건
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>일용직 근로자 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">이름</th>
                    <th className="pb-3 font-medium">직종</th>
                    <th className="pb-3 font-medium">상태</th>
                    <th className="pb-3 font-medium">계약상태</th>
                    <th className="pb-3 font-medium">최근 출역일</th>
                    <th className="pb-3 font-medium">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-sm text-slate-400"
                      >
                        불러오는 중...
                      </td>
                    </tr>
                  ) : workers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-sm text-slate-400"
                      >
                        등록된 근로자가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    workers.map((worker) => (
                      <tr
                        key={worker.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-4 font-medium text-slate-900">
                          <Link
                            href={`/labor/${worker.id}`}
                            className="hover:text-brand-point-600"
                          >
                            {worker.name}
                          </Link>
                        </td>
                        <td className="py-4 text-slate-500">{worker.role}</td>
                        <td className="py-4">
                          <Badge
                            variant={
                              worker.status === "active" ? "success" : "default"
                            }
                          >
                            {worker.status === "active" ? "재직" : "대기"}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <Badge
                            variant={
                              worker.contract_status === "signed"
                                ? "success"
                                : "warning"
                            }
                          >
                            {worker.contract_status === "signed"
                              ? "서명 완료"
                              : "서명 대기"}
                          </Badge>
                        </td>
                        <td className="py-4 text-slate-500">
                          {worker.last_work_date}
                        </td>
                        <td className="py-4">
                          <div className="flex gap-2">
                            <Link href={`/labor/${worker.id}`}>
                              <Button size="sm" variant="secondary">
                                상세보기
                              </Button>
                            </Link>
                            <Button size="sm" variant="secondary">
                              <Mail className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worker Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">근로자 등록</h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {registerSuccess ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-slate-600">{registerSuccess.message}</p>
                {registerSuccess.isNew && (
                  <p className="mt-2 text-xs text-slate-500">
                    필수 서류(신분증, 통장사본 등)를 근로자에게 요청해주세요.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  근로자 정보를 입력하면 자동으로 회원가입이 진행됩니다.
                  <br />
                  임시 비밀번호는 전화번호 뒤 4자리입니다.
                </p>

                <Input
                  label="이름"
                  placeholder="홍길동"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  error={registerErrors.name}
                />

                <Input
                  label="휴대폰 번호"
                  placeholder="010-0000-0000"
                  value={workerPhone}
                  onChange={(e) => setWorkerPhone(handlePhoneFormat(e.target.value))}
                  error={registerErrors.phone}
                />

                {registerErrors.submit && (
                  <p className="text-sm text-red-600">{registerErrors.submit}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={closeModal}
                    fullWidth
                    disabled={isRegistering}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleRegisterWorker}
                    fullWidth
                    disabled={isRegistering}
                  >
                    {isRegistering ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "등록"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
