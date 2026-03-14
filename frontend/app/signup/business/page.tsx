"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Card, Stepper, FileUpload } from "@sigongcore/ui";
import {
  Droplets,
  Check,
  Loader2,
  Building2,
  ArrowLeft,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import {
  STEPS,
  getSignupData,
  saveSignupData,
  validateBusinessNumber,
  type SignupData,
} from "../types";
import { api } from "@/lib/api";

type VerificationStatus =
  | "idle"
  | "loading"
  | "active"
  | "suspended"
  | "closed"
  | "unknown"
  | "duplicate";

interface VerificationResult {
  status: VerificationStatus;
  taxType?: string | null;
  message: string;
}

function BusinessStatusBadge({ result }: { result: VerificationResult }) {
  if (result.status === "active") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
            <Building2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-green-900">계속사업자 확인</h3>
              <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                정상
              </span>
            </div>
            <div className="mt-1 space-y-0.5 text-sm text-green-800">
              {result.taxType && (
                <p>
                  <span className="font-medium">과세유형:</span>{" "}
                  {result.taxType}
                </p>
              )}
              <p className="text-green-700">{result.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "suspended") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-amber-900">휴업 사업자</h3>
              <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-medium text-white">
                가입 불가
              </span>
            </div>
            <p className="mt-1 text-sm text-amber-800">{result.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "closed") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-red-900">폐업 사업자</h3>
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                가입 불가
              </span>
            </div>
            <p className="mt-1 text-sm text-red-800">{result.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "duplicate") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">이미 가입된 사업자</h3>
            <p className="mt-1 text-sm text-red-800">{result.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "unknown") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <HelpCircle className="h-5 w-5 text-slate-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-700">조회 불가</h3>
            <p className="mt-1 text-sm text-slate-600">{result.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function BusinessPage() {
  const router = useRouter();
  const [data, setData] = useState<Partial<SignupData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);

  useEffect(() => {
    const stored = getSignupData();

    if (
      !stored.username ||
      !stored.usernameAvailable ||
      !stored.phoneVerified
    ) {
      router.push("/signup");
      return;
    }

    setData(stored);
  }, [router]);

  const handleBusinessNumberFormat = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
  };

  const handleVerifyBusiness = async () => {
    const newErrors: Record<string, string> = { ...errors };

    if (!data.businessNumber || !validateBusinessNumber(data.businessNumber)) {
      setErrors({
        ...newErrors,
        businessNumber: "000-00-00000 형식으로 입력하세요",
      });
      return;
    }

    setVerifying(true);
    setVerificationResult(null);
    setErrors({ ...errors, businessNumber: "" });

    try {
      const verifyRes = await api.verifyBusiness(data.businessNumber);
      if (!verifyRes.success || !verifyRes.data) {
        setVerificationResult({
          status: "unknown",
          message:
            "사업자 상태를 조회할 수 없습니다. 잠시 후 다시 시도해주세요.",
        });
        setData({ ...data, businessVerified: false });
        setVerifying(false);
        return;
      }

      const { status, tax_type } = verifyRes.data;

      switch (status) {
        case "duplicate":
          setVerificationResult({
            status: "duplicate",
            message:
              "이미 가입된 사업자등록번호입니다. 1개의 사업자번호로는 1개의 대표자 계정만 가입 가능합니다.",
          });
          setData({ ...data, businessVerified: false });
          break;
        case "suspended":
          setVerificationResult({
            status: "suspended",
            message: "휴업 중인 사업자는 가입할 수 없습니다.",
          });
          setData({ ...data, businessVerified: false });
          break;
        case "closed":
          setVerificationResult({
            status: "closed",
            message: "폐업된 사업자로 가입이 불가합니다.",
          });
          setData({ ...data, businessVerified: false });
          break;
        case "active":
          setVerificationResult({
            status: "active",
            taxType: tax_type,
            message: "사업자등록번호가 정상 확인되었습니다.",
          });
          setData({ ...data, businessVerified: true });
          break;
        default:
          setVerificationResult({
            status: "unknown",
            message:
              "사업자 상태를 확인할 수 없습니다. 관리자에게 문의해주세요.",
          });
          setData({ ...data, businessVerified: false });
      }
    } catch {
      setVerificationResult({
        status: "unknown",
        message: "검증 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      });
      setData({ ...data, businessVerified: false });
    }

    setVerifying(false);
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!data.businessNumber || !validateBusinessNumber(data.businessNumber)) {
      newErrors.businessNumber = "000-00-00000 형식으로 입력하세요";
    } else if (!data.businessVerified) {
      newErrors.businessNumber = "사업자등록번호 검증이 필요합니다";
    }

    if (!data.companyName) {
      newErrors.companyName = "회사명을 입력해주세요";
    }

    if (!data.businessLicenseFile) {
      newErrors.businessLicense = "사업자등록증을 업로드해주세요";
    }

    if (!data.repPhone) {
      newErrors.repPhone = "대표자 연락처를 입력해주세요";
    }

    if (!data.repEmail) {
      newErrors.repEmail = "대표자 이메일을 입력해주세요";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    saveSignupData(data);
    router.push("/signup/complete");
  };

  const handleBack = () => {
    saveSignupData(data);
    router.push("/signup");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-point-500 text-white">
          <Droplets className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900">시공코어</span>
      </Link>

      <Card className="w-full max-w-3xl p-6 md:p-8">
        <Stepper steps={STEPS} currentStep={2} className="mb-8" />

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">사업자 인증</h1>
          <p className="mt-2 text-slate-600">
            사업자등록번호를 검증하고 서류를 업로드해주세요
          </p>
          <p className="mt-1 text-xs text-slate-400">* 표시는 필수 입력 항목입니다</p>
        </div>

        <div className="space-y-6">
          {/* Business Number Verification */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="사업자등록번호"
                  required
                  placeholder="000-00-00000"
                  value={data.businessNumber || ""}
                  onChange={(e) => {
                    const formatted = handleBusinessNumberFormat(
                      e.target.value,
                    );
                    setData({
                      ...data,
                      businessNumber: formatted,
                      businessVerified: false,
                    });
                    setVerificationResult(null);
                  }}
                  error={errors.businessNumber}
                  disabled={data.businessVerified}
                />
              </div>
              <Button
                onClick={
                  data.businessVerified
                    ? () => {
                        setData({ ...data, businessVerified: false });
                        setVerificationResult(null);
                      }
                    : handleVerifyBusiness
                }
                disabled={
                  verifying || (!data.businessVerified && !data.businessNumber)
                }
                variant={data.businessVerified ? "secondary" : "primary"}
                className="mt-6"
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : data.businessVerified ? (
                  "재검증"
                ) : (
                  "조회"
                )}
              </Button>
            </div>

            {/* Verification in progress */}
            {verifying && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                국세청 API로 사업자 상태를 조회 중입니다...
              </div>
            )}

            {/* Verification result */}
            {!verifying && verificationResult && (
              <BusinessStatusBadge result={verificationResult} />
            )}

            {/* Success indicator under input */}
            {data.businessVerified && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                사업자등록번호가 확인되었습니다
              </p>
            )}

            {/* Company Name - shown after verification */}
            {data.businessVerified && (
              <Input
                label="회사명"
                required
                placeholder="사업자등록증상 회사명"
                value={data.companyName || ""}
                onChange={(e) => {
                  setData({ ...data, companyName: e.target.value });
                }}
                error={errors.companyName}
              />
            )}
          </div>

          {/* Business License + Construction License (2-column grid) */}
          <div className="grid gap-6 md:grid-cols-2 md:gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                사업자등록증 <span className="ml-1 text-red-500">*</span>
              </label>
              <FileUpload
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={10 * 1024 * 1024}
                onFiles={(files) => {
                  setData({ ...data, businessLicenseFile: files[0] });
                  setErrors({ ...errors, businessLicense: "" });
                }}
              />
              {errors.businessLicense && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.businessLicense}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                건설업등록증 (선택)
              </label>
              <FileUpload
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={10 * 1024 * 1024}
                onFiles={(files) => {
                  setData({ ...data, constructionLicenseFile: files[0] });
                  setErrors({ ...errors, constructionLicense: "" });
                }}
              />
              {errors.constructionLicense && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.constructionLicense}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                전문건설업 면허 보유 시 업로드해주세요
              </p>
            </div>
          </div>

          {/* Note about contact notification */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>프로젝트별 알림 수신자를 지정할 수 있습니다.</strong>
              <br />
              대표자와 실무자 정보를 등록하면, 각 프로젝트에서 알림을 받을
              담당자를 선택할 수 있습니다.
            </p>
          </div>

          {/* Representative + Worker Info (2-column grid) */}
          <div className="grid gap-6 md:grid-cols-2 md:gap-4">
            <div className="h-full space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">대표자 정보</h3>
              <Input
                label="대표자 성함 (선택)"
                value={data.representativeName || ""}
                onChange={(e) =>
                  setData({ ...data, representativeName: e.target.value })
                }
              />
              <Input
                label="대표자 연락처"
                required
                placeholder="010-0000-0000"
                value={data.repPhone || ""}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "");
                  let formatted = cleaned;
                  if (cleaned.length > 3 && cleaned.length <= 7)
                    formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
                  else if (cleaned.length > 7)
                    formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
                  setData({ ...data, repPhone: formatted });
                }}
                error={errors.repPhone}
              />
              <Input
                label="대표자 이메일"
                required
                type="email"
                placeholder="ceo@company.com"
                value={data.repEmail || ""}
                onChange={(e) => setData({ ...data, repEmail: e.target.value })}
                error={errors.repEmail}
              />
            </div>

            <div className="h-full space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-700">
                실무자 정보 (선택)
              </h3>
              <Input
                label="실무자 성함"
                placeholder="담당자 이름"
                value={data.contactName || ""}
                onChange={(e) =>
                  setData({ ...data, contactName: e.target.value })
                }
              />
              <Input
                label="실무자 연락처"
                placeholder="010-0000-0000"
                value={data.contactPhone || ""}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "");
                  let formatted = cleaned;
                  if (cleaned.length > 3 && cleaned.length <= 7)
                    formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
                  else if (cleaned.length > 7)
                    formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
                  setData({ ...data, contactPhone: formatted });
                }}
              />
              <Input
                label="실무자 직위"
                placeholder="예: 과장, 팀장"
                value={data.contactPosition || ""}
                onChange={(e) =>
                  setData({ ...data, contactPosition: e.target.value })
                }
              />
            </div>
          </div>

          {/* Woman-Owned Business Certificate (Optional) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              여성기업확인서 (선택)
            </label>
            <FileUpload
              accept=".pdf,.jpg,.jpeg,.png"
              maxSize={10 * 1024 * 1024}
              onFiles={(files) =>
                setData({ ...data, womanOwnedCertFile: files[0] })
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              여성기업인증을 받은 경우 업로드해주세요
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={handleBack}
              fullWidth
              size="lg"
              className="flex-1"
            >
              <ArrowLeft className="h-5 w-5" />
              이전
            </Button>
            <Button onClick={handleNext} fullWidth size="lg" className="flex-1">
              <Check className="h-5 w-5" />
              가입하기
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
