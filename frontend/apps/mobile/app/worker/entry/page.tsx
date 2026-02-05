"use client";

import { Button } from "@sigongon/ui";
import { Droplets, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type WorkerAccessApi = {
  requestWorkerAccess: (phone: string) => Promise<{
    success: boolean;
    data: { request_id: string } | null;
    error: { code: string; message: string } | null;
  }>;
  verifyWorkerAccess: (requestId: string, code: string) => Promise<{
    success: boolean;
    data: { worker_id: string } | null;
    error: { code: string; message: string } | null;
  }>;
  verifyWorkerInvite?: (inviteToken: string) => Promise<{
    success: boolean;
    data: { worker_id: string } | null;
    error: { code: string; message: string } | null;
  }>;
};

const workerAccessApi = api as unknown as WorkerAccessApi;

export default function WorkerEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [requestId, setRequestId] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inviteToken = searchParams.get("invite");
  const phoneFromQuery = searchParams.get("phone");

  useEffect(() => {
    if (!phoneFromQuery) return;
    setPhone(phoneFromQuery);
  }, [phoneFromQuery]);

  useEffect(() => {
    if (!inviteToken) return;
    const verifyWorkerInvite = workerAccessApi.verifyWorkerInvite;
    if (!verifyWorkerInvite) {
      setMessage("초대 링크 로그인을 지원하지 않는 환경입니다.");
      return;
    }

    let isCancelled = false;
    const verifyInvite = async () => {
      setIsSubmitting(true);
      setMessage(null);
      try {
        const response = await verifyWorkerInvite(inviteToken);
        if (isCancelled) return;
        if (response.success && response.data) {
          router.push(`/worker/consent?workerId=${response.data.worker_id}`);
          return;
        }
        setMessage(response.error?.message || "초대 링크 인증에 실패했어요.");
      } catch {
        if (!isCancelled) {
          setMessage("초대 링크 인증 중 오류가 발생했어요.");
        }
      } finally {
        if (!isCancelled) {
          setIsSubmitting(false);
        }
      }
    };

    void verifyInvite();
    return () => {
      isCancelled = true;
    };
  }, [inviteToken, router]);

  const handleRequest = async () => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await workerAccessApi.requestWorkerAccess(phone);
      if (response.success && response.data) {
        setRequestId(response.data.request_id);
        setStep("verify");
        setMessage("인증번호를 전송했어요.");
      } else {
        setMessage(response.error?.message || "요청에 실패했어요. 다시 시도해 주세요.");
      }
    } catch {
      setMessage("요청에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!requestId) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await workerAccessApi.verifyWorkerAccess(requestId, otpCode);
      if (response.success && response.data) {
        router.push(`/worker/consent?workerId=${response.data.worker_id}`);
        return;
      }
      setMessage(response.error?.message || "인증번호를 다시 확인해 주세요.");
    } catch {
      setMessage("인증 확인 중 오류가 발생했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-point-500 text-white">
            <Droplets className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-900">
            시공ON 현장
          </h2>
          <p className="mt-2 text-slate-500">
            초대받은 링크 또는 휴대폰 인증으로
            <br />
            바로 시작합니다.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">
              휴대폰 번호
            </label>
            <input
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-lg placeholder:text-slate-300 focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
            />
          </div>

          {step === "verify" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">
                인증번호
              </label>
              <input
                type="text"
                placeholder="6자리 숫자"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                maxLength={6}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-lg placeholder:text-slate-300 focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
              />
            </div>
          )}

          {step === "request" ? (
            <Button
              fullWidth
              size="lg"
              className="h-12 text-lg"
              onClick={handleRequest}
              disabled={isSubmitting || !phone.trim()}
            >
              <Smartphone className="h-4 w-4" />
              인증번호 받기
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                fullWidth
                size="lg"
                className="h-12 text-lg"
                onClick={handleVerify}
                disabled={isSubmitting || otpCode.trim().length !== 6}
              >
                <ShieldCheck className="h-4 w-4" />
                인증 확인
              </Button>
              <Button
                fullWidth
                variant="ghost"
                onClick={handleRequest}
                disabled={isSubmitting}
              >
                인증번호 재전송
              </Button>
            </div>
          )}

          {message && (
            <p
              className={`text-center text-sm ${
                message.includes("실패") || message.includes("오류")
                  ? "text-red-500"
                  : "text-slate-500"
              }`}
            >
              {message}
            </p>
          )}
        </div>

        <div className="text-center text-xs text-slate-400">
          이용약관 및 개인정보처리방침에 동의합니다.
        </div>
      </div>
    </div>
  );
}
