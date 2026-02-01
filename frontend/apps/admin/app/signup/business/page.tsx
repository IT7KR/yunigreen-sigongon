"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Card, Stepper, FileUpload } from "@sigongon/ui";
import { Droplets, Check, Loader2, Building2 } from "lucide-react";
import {
  STEPS,
  getSignupData,
  saveSignupData,
  validateBusinessNumber,
  type SignupData,
} from "../types";
import { api } from "@/lib/api";

export default function BusinessPage() {
  const router = useRouter();
  const [data, setData] = useState<Partial<SignupData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const stored = getSignupData();

    // Redirect if basic info not completed (both email and phone verification required)
    if (!stored.username || !stored.usernameAvailable || !stored.phoneVerified) {
      router.push("/signup");
      return;
    }

    setData(stored);
  }, [router]);

  const handleBusinessNumberFormat = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
  };

  const handleVerifyBusiness = async () => {
    if (!data.businessNumber || !validateBusinessNumber(data.businessNumber)) {
      setErrors({ ...errors, businessNumber: "000-00-00000 형식으로 입력하세요" });
      return;
    }

    setVerifying(true);
    try {
      // Phase 1: 사업자등록번호 중복 체크
      const checkRes = await api.checkBusinessNumber(data.businessNumber);
      if (!checkRes.success || !checkRes.data?.available) {
        setErrors({ ...errors, businessNumber: "이미 가입된 사업자번호입니다" });
        setVerifying(false);
        return;
      }

      // Mock API call to verify business number
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock data returned from verification
      setData({
        ...data,
        businessVerified: true,
        companyName: "(주)시공온",
        representativeName: "홍길동",
      });
      setErrors({ ...errors, businessNumber: "" });
    } catch {
      setErrors({ ...errors, businessNumber: "검증 중 오류가 발생했습니다" });
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

    if (!data.businessLicenseFile) {
      newErrors.businessLicense = "사업자등록증을 업로드해주세요";
    }

    if (!data.constructionLicenseFile) {
      newErrors.constructionLicense = "건설업등록증을 업로드해주세요";
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
    router.push("/signup/plan");
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
        <span className="text-2xl font-bold text-slate-900">시공ON</span>
      </Link>

      <Card className="w-full max-w-2xl p-6 md:p-8">
        <Stepper steps={STEPS} currentStep={2} className="mb-8" />

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">사업자 인증</h1>
          <p className="mt-2 text-slate-600">
            사업자등록번호를 검증하고 서류를 업로드해주세요
          </p>
        </div>

        <div className="space-y-6">
          {/* Business Number Verification */}
          <div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="사업자등록번호"
                  placeholder="000-00-00000"
                  value={data.businessNumber || ""}
                  onChange={(e) => {
                    const formatted = handleBusinessNumberFormat(e.target.value);
                    setData({
                      ...data,
                      businessNumber: formatted,
                      businessVerified: false,
                    });
                  }}
                  error={errors.businessNumber}
                  disabled={data.businessVerified}
                />
              </div>
              {!data.businessVerified && (
                <Button
                  onClick={handleVerifyBusiness}
                  disabled={verifying}
                  className="mt-6"
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "검증"
                  )}
                </Button>
              )}
            </div>
            {data.businessVerified && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                사업자등록번호가 확인되었습니다
              </p>
            )}
          </div>

          {/* Verified Business Info */}
          {data.businessVerified && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900">사업자 정보</h3>
                  <div className="mt-2 space-y-1 text-sm text-green-800">
                    <p>
                      <span className="font-medium">회사명:</span> {data.companyName}
                    </p>
                    <p>
                      <span className="font-medium">대표자:</span>{" "}
                      {data.representativeName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business License Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              사업자등록증 (필수)
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
              <p className="mt-1 text-sm text-red-600">{errors.businessLicense}</p>
            )}
          </div>

          {/* Construction License Upload (Required) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              건설업등록증 (필수)
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
              <p className="mt-1 text-sm text-red-600">{errors.constructionLicense}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              건설업등록증을 업로드해주세요
            </p>
          </div>

          {/* Representative Info (대표자 정보) */}
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">대표자 정보</h3>
            <Input
              label="대표자 성함"
              value={data.representativeName || ""}
              onChange={(e) => setData({ ...data, representativeName: e.target.value })}
              disabled={data.businessVerified}
            />
            <Input
              label="대표자 연락처 (필수)"
              placeholder="010-0000-0000"
              value={data.repPhone || ""}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, "");
                let formatted = cleaned;
                if (cleaned.length > 3 && cleaned.length <= 7) formatted = `${cleaned.slice(0,3)}-${cleaned.slice(3)}`;
                else if (cleaned.length > 7) formatted = `${cleaned.slice(0,3)}-${cleaned.slice(3,7)}-${cleaned.slice(7,11)}`;
                setData({ ...data, repPhone: formatted });
              }}
              error={errors.repPhone}
            />
            <Input
              label="대표자 이메일 (필수)"
              type="email"
              placeholder="ceo@company.com"
              value={data.repEmail || ""}
              onChange={(e) => setData({ ...data, repEmail: e.target.value })}
              error={errors.repEmail}
            />
          </div>

          {/* Worker Contact Info (실무자 정보) */}
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-700">실무자 정보 (선택)</h3>
            <Input
              label="실무자 성함"
              placeholder="담당자 이름"
              value={data.contactName || ""}
              onChange={(e) => setData({ ...data, contactName: e.target.value })}
            />
            <Input
              label="실무자 연락처"
              placeholder="010-0000-0000"
              value={data.contactPhone || ""}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, "");
                let formatted = cleaned;
                if (cleaned.length > 3 && cleaned.length <= 7) formatted = `${cleaned.slice(0,3)}-${cleaned.slice(3)}`;
                else if (cleaned.length > 7) formatted = `${cleaned.slice(0,3)}-${cleaned.slice(3,7)}-${cleaned.slice(7,11)}`;
                setData({ ...data, contactPhone: formatted });
              }}
            />
            <Input
              label="실무자 직위"
              placeholder="예: 과장, 팀장"
              value={data.contactPosition || ""}
              onChange={(e) => setData({ ...data, contactPosition: e.target.value })}
            />
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
              이전
            </Button>
            <Button onClick={handleNext} fullWidth size="lg" className="flex-1">
              다음
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
