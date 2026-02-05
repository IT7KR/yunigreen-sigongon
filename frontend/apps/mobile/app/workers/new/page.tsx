"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, Button } from "@sigongon/ui";
import { Camera, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

type WorkerInvitationApi = {
  createWorkerInvitation: (data: {
    name: string;
    phone: string;
    address?: string;
    bank_name?: string;
    account_number?: string;
    residence_confirmed?: boolean;
    has_id_card: boolean;
    has_safety_cert: boolean;
  }) => Promise<{
    success: boolean;
    data: {
      worker_id: string;
      invite_token: string;
      invite_link: string;
      registration_status: "invited";
    } | null;
    error: { code: string; message: string } | null;
  }>;
};

const workerInvitationApi = api as unknown as WorkerInvitationApi;

export default function WorkerRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [residentFront, setResidentFront] = useState("");
  const [residentBackFirst, setResidentBackFirst] = useState("");
  const [address, setAddress] = useState("");
  const [residenceConfirmed, setResidenceConfirmed] = useState(false);
  const [bankName, setBankName] = useState("농협");
  const [accountNumber, setAccountNumber] = useState("");
  const [idCardFileName, setIdCardFileName] = useState("");
  const [safetyFileName, setSafetyFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{
    workerId: string;
    inviteLink: string;
  } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await workerInvitationApi.createWorkerInvitation({
        name,
        phone,
        address,
        bank_name: bankName,
        account_number: accountNumber,
        residence_confirmed: residenceConfirmed,
        has_id_card: Boolean(idCardFileName),
        has_safety_cert: Boolean(safetyFileName),
      });

      if (!response.success || !response.data) {
        setError(response.error?.message || "근로자 등록 요청에 실패했어요.");
        return;
      }

      setInviteInfo({
        workerId: response.data.worker_id,
        inviteLink: response.data.invite_link,
      });
    } catch {
      setError("근로자 등록 처리 중 오류가 발생했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteInfo) return;
    const fullLink =
      typeof window !== "undefined"
        ? `${window.location.origin}${inviteInfo.inviteLink}`
        : inviteInfo.inviteLink;
    try {
      await navigator.clipboard.writeText(fullLink);
      setError(null);
    } catch {
      setError("초대 링크 복사에 실패했어요.");
    }
  }

  return (
    <MobileLayout title="일용직 근로자 등록" showBack>
      <form onSubmit={handleSubmit} className="space-y-6 p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">
            신분증/안전교육증 촬영
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50">
              <Camera className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-500">
                {idCardFileName || "신분증 촬영"}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(event) =>
                  setIdCardFileName(event.target.files?.[0]?.name || "")
                }
              />
            </label>
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50">
              <Camera className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-500">
                {safetyFileName || "안전교육이수증"}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(event) =>
                  setSafetyFileName(event.target.files?.[0]?.name || "")
                }
              />
            </label>
          </div>
          <p className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            주민등록번호 뒷자리는 마스킹되며, 법령에 따라 관리됩니다.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-900">이름</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="홍길동"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-900">휴대폰 번호</label>
            <input
              type="tel"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-900">
              주민등록번호
            </label>
            <div className="flex gap-2 items-center">
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  placeholder="000000"
                  value={residentFront}
                  onChange={(event) => setResidentFront(event.target.value)}
                  maxLength={6}
                />
                <span className="text-slate-400">-</span>
                <div className="mt-1 w-full flex gap-1">
                  <input
                    type="text"
                    className="w-8 rounded-lg border border-slate-200 px-2 py-2 text-center"
                    placeholder="1"
                    maxLength={1}
                    value={residentBackFirst}
                    onChange={(event) => setResidentBackFirst(event.target.value)}
                  />
                  <span className="flex-1 rounded-lg bg-slate-100 py-2 text-slate-400 px-2">
                    ******
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-900">주소</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="주소 입력"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="residence"
                className="h-4 w-4 rounded border-slate-300 text-brand-point-600 focus:ring-brand-point-500"
                checked={residenceConfirmed}
                onChange={(event) => setResidenceConfirmed(event.target.checked)}
              />
              <label htmlFor="residence" className="text-sm text-slate-600">
                실거주 확인
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-900">
              계좌번호
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <select
                className="rounded-lg border border-slate-200 px-3 py-2"
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
              >
                <option>은행 선택</option>
                <option>농협</option>
                <option>국민</option>
                <option>신한</option>
                <option>우리</option>
              </select>
              <input
                type="text"
                className="col-span-2 rounded-lg border border-slate-200 px-3 py-2"
                placeholder="계좌번호 입력"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {inviteInfo && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-semibold text-slate-900">
                등록 요청 완료
              </p>
              <p className="text-sm text-slate-600">
                근로자 ID: {inviteInfo.workerId}
              </p>
              <p className="break-all rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {inviteInfo.inviteLink}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" fullWidth onClick={copyInviteLink}>
                  <Copy className="h-4 w-4" />
                  링크 복사
                </Button>
                <Button
                  type="button"
                  fullWidth
                  onClick={() => router.push(inviteInfo.inviteLink)}
                >
                  <ExternalLink className="h-4 w-4" />
                  링크 열기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="sticky bottom-20">
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={isSubmitting || !name.trim() || !phone.trim()}
            loading={isSubmitting}
          >
            등록하고 초대링크 생성
          </Button>
        </div>
      </form>
    </MobileLayout>
  );
}
