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
  toast,
} from "@sigongon/ui";
import { Plus, Download, UserPlus, Mail, Loader2, Check, Eye, Send, X, Calculator, UserCheck, Settings, ArrowRight, MessageSquare, Copy } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { sendWorkerInvite } from "@/lib/aligo";

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

  // Excel dropdown removed - moved to /labor/payroll

  // Batch paystub send modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isBatching, setIsBatching] = useState(false);

  // Worker invitation modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [inviteSuccess, setInviteSuccess] = useState<{ inviteUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleInviteWorker = async () => {
    const errors: Record<string, string> = {};

    if (!workerName.trim()) {
      errors.name = "이름을 입력하세요";
    }

    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!workerPhone || !phoneRegex.test(workerPhone)) {
      errors.phone = "010-0000-0000 형식으로 입력하세요";
    }

    if (Object.keys(errors).length > 0) {
      setInviteErrors(errors);
      return;
    }

    setIsInviting(true);
    setInviteErrors({});
    setInviteSuccess(null);

    try {
      // Generate invite token (mock)
      const token = `WI${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
      const inviteUrl = `${window.location.origin}/onboarding/worker/consent?token=${token}`;

      // Send AlimTalk
      const result = await sendWorkerInvite({
        phone: workerPhone,
        name: workerName.trim(),
        companyName: "(주)유니그린", // TODO: Get from current organization
        inviteUrl,
      });

      if (result.success) {
        setInviteSuccess({ inviteUrl });
        toast.success(`${workerName}님에게 알림톡을 발송했습니다`);
      } else {
        setInviteErrors({ submit: result.error_message || "알림톡 발송에 실패했습니다" });
      }
    } catch {
      setInviteErrors({ submit: "초대에 실패했습니다" });
    }

    setIsInviting(false);
  };

  const handleCopyInviteLink = async () => {
    if (!inviteSuccess?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteSuccess.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setWorkerName("");
    setWorkerPhone("");
    setInviteErrors({});
    setInviteSuccess(null);
    setCopied(false);
  };

  const handleBatchSend = async () => {
    setIsBatching(true);

    try {
      await api.batchSendPaystubs();

      // Update summary to 0
      setSummary((prev) => ({
        ...prev,
        pending_paystubs: 0,
      }));

      setShowBatchModal(false);
      toast.success(`${summary.pending_paystubs}건의 지급명세서를 발송했어요.`);
    } catch {
      toast.error("지급명세서 발송에 실패했습니다.");
    }

    setIsBatching(false);
  };

  // Excel functions moved to /labor/payroll page

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
            <Link href="/labor/payroll">
              <Button variant="secondary">
                <Download className="mr-2 h-4 w-4" />
                신고 엑셀 다운로드
              </Button>
            </Link>
            <Button onClick={() => setShowInviteModal(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              근로자 초대
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
              <Button
                size="sm"
                variant="ghost"
                className="px-0"
                onClick={() => setShowBatchModal(true)}
                disabled={summary.pending_paystubs === 0}
              >
                <Send className="h-3.5 w-3.5" />일괄 발송하기
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

        {/* Quick Navigation Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/labor/payroll">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Calculator className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">급여/근무 관리</p>
                  <p className="text-xs text-slate-500">근무 입력 및 급여 계산, 엑셀 다운로드</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/labor/workers">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">근로자 주소록</p>
                  <p className="text-xs text-slate-500">일용 근로자 등록 및 관리</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/labor/settings">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <Settings className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">보험요율 설정</p>
                  <p className="text-xs text-slate-500">세율 및 4대보험 요율 관리</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </CardContent>
            </Card>
          </Link>
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
                                <Eye className="h-3.5 w-3.5" />상세보기
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

      {/* Batch Paystub Send Modal */}
      <Modal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="지급명세서 일괄 발송"
        size="sm"
      >
        <p className="mb-6 text-sm text-slate-600">
          대기중인 {summary.pending_paystubs}건의 지급명세서를 일괄 발송하시겠습니까?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowBatchModal(false)} fullWidth disabled={isBatching}><X className="h-4 w-4" />취소</Button>
          <Button onClick={handleBatchSend} fullWidth disabled={isBatching}>
            {isBatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" />발송하기</>}
          </Button>
        </div>
      </Modal>

      {/* Worker Invitation Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={closeInviteModal}
        title="근로자 초대"
      >
        {inviteSuccess ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800">
                    {workerName}님에게 알림톡을 발송했습니다
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    근로자가 링크를 클릭하여 직접 가입을 완료합니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-medium text-slate-500">초대 링크</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-white px-2 py-1.5 text-xs text-slate-700">
                  {inviteSuccess.inviteUrl}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyInviteLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <><Check className="h-4 w-4 text-green-500" />복사됨</>
                  ) : (
                    <><Copy className="h-4 w-4" />복사</>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              * 초대 링크는 7일 후 만료됩니다.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setInviteSuccess(null);
                  setWorkerName("");
                  setWorkerPhone("");
                }}
                fullWidth
              >
                다른 근로자 초대
              </Button>
              <Button onClick={closeInviteModal} fullWidth>
                완료
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              근로자에게 알림톡으로 가입 링크를 보냅니다.
              <br />
              근로자가 직접 개인정보 동의 및 서류 업로드를 진행합니다.
            </p>
            <Input
              label="이름"
              placeholder="홍길동"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              error={inviteErrors.name}
            />
            <Input
              label="휴대폰 번호"
              placeholder="010-0000-0000"
              value={workerPhone}
              onChange={(e) => setWorkerPhone(handlePhoneFormat(e.target.value))}
              error={inviteErrors.phone}
            />
            {inviteErrors.submit && (
              <p className="text-sm text-red-600">{inviteErrors.submit}</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={closeInviteModal} fullWidth disabled={isInviting}><X className="h-4 w-4" />취소</Button>
              <Button onClick={handleInviteWorker} fullWidth disabled={isInviting}>
                {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><MessageSquare className="h-4 w-4" />알림톡 보내기</>}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
