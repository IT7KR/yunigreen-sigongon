"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  Button,
  Input,
  toast,
} from "@sigongon/ui";
import {
  CheckCircle2,
  Upload,
  ArrowRight,
  ArrowLeft,
  Shield,
  FileText,
  User,
  Loader2,
  Camera,
  X,
} from "lucide-react";

/**
 * 근로자 가입 페이지
 *
 * 플로우: 동의 → 서류 업로드 → 정보 입력 → 완료
 */
export default function WorkerOnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const step = searchParams.get("step") || "consent";

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [inviteData, setInviteData] = useState<{
    name: string;
    phone: string;
    companyName: string;
  } | null>(null);

  // Document upload state
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [safetyCertFile, setSafetyCertFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [safetyCertPreview, setSafetyCertPreview] = useState<string | null>(null);

  // Form data state
  const [formData, setFormData] = useState({
    birthDate: "",
    gender: "" as "" | "1" | "2" | "3" | "4",
    address: "",
    bankName: "",
    accountNumber: "",
    password: "",
    passwordConfirm: "",
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  async function validateToken() {
    setIsLoading(true);
    // Mock token validation
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In real implementation, call API to validate token
    if (token && token.length > 5) {
      setTokenValid(true);
      setInviteData({
        name: "홍길동", // Mock data from token
        phone: "010-1234-5678",
        companyName: "(주)유니그린",
      });
    } else {
      setTokenValid(false);
    }
    setIsLoading(false);
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "idCard" | "safetyCert"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("이미지 또는 PDF 파일만 업로드 가능합니다");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하여야 합니다");
      return;
    }

    if (type === "idCard") {
      setIdCardFile(file);
      if (file.type.startsWith("image/")) {
        setIdCardPreview(URL.createObjectURL(file));
      } else {
        setIdCardPreview(null);
      }
    } else {
      setSafetyCertFile(file);
      if (file.type.startsWith("image/")) {
        setSafetyCertPreview(URL.createObjectURL(file));
      } else {
        setSafetyCertPreview(null);
      }
    }
  }

  function handleRemoveFile(type: "idCard" | "safetyCert") {
    if (type === "idCard") {
      setIdCardFile(null);
      setIdCardPreview(null);
    } else {
      setSafetyCertFile(null);
      setSafetyCertPreview(null);
    }
  }

  function handleDocumentsNext() {
    if (!idCardFile || !safetyCertFile) {
      toast.error("모든 서류를 업로드해주세요");
      return;
    }
    router.push(`/onboarding/worker/${token}?step=info`);
  }

  async function handleSubmit() {
    // Validation
    if (!formData.birthDate || formData.birthDate.length !== 6) {
      toast.error("생년월일을 6자리로 입력해주세요 (예: 900101)");
      return;
    }
    if (!formData.gender) {
      toast.error("성별을 선택해주세요");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("주소를 입력해주세요");
      return;
    }
    if (!formData.bankName.trim()) {
      toast.error("은행명을 입력해주세요");
      return;
    }
    if (!formData.accountNumber.trim()) {
      toast.error("계좌번호를 입력해주세요");
      return;
    }
    if (formData.password.length < 4) {
      toast.error("비밀번호는 4자리 이상 입력해주세요");
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      toast.error("비밀번호가 일치하지 않습니다");
      return;
    }

    setIsSubmitting(true);

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In real implementation, call API to complete registration
      toast.success("가입이 완료되었습니다!");
      router.push(`/onboarding/worker/${token}?step=complete`);
    } catch {
      toast.error("가입에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-600" />
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">유효하지 않은 링크</h2>
            <p className="mt-2 text-sm text-slate-600">
              초대 링크가 만료되었거나 유효하지 않습니다.
              <br />
              담당자에게 새로운 초대를 요청해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to consent if not completed
  if (step === "consent") {
    router.push(`/onboarding/worker/consent?token=${token}`);
    return null;
  }

  const currentStep = step === "documents" ? 2 : step === "info" ? 3 : 4;

  return (
    <div className="min-h-screen bg-slate-50 p-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">시공ON 가입</h1>
          <p className="mt-2 text-slate-600">
            {inviteData?.companyName}에서 초대했습니다
          </p>
        </div>

        {/* Progress */}
        {step !== "complete" && (
          <div className="mb-6 flex items-center justify-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                currentStep >= 1
                  ? "bg-brand-point-600 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              1
            </div>
            <div className={`h-0.5 w-12 ${currentStep >= 2 ? "bg-brand-point-600" : "bg-slate-200"}`} />
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                currentStep >= 2
                  ? "bg-brand-point-600 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              2
            </div>
            <div className={`h-0.5 w-12 ${currentStep >= 3 ? "bg-brand-point-600" : "bg-slate-200"}`} />
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                currentStep >= 3
                  ? "bg-brand-point-600 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              3
            </div>
          </div>
        )}

        {/* Step: Documents */}
        {step === "documents" && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900">서류 업로드</h2>
              <p className="mb-6 text-sm text-slate-600">
                본인 확인을 위한 서류를 업로드해주세요
              </p>

              <div className="space-y-4">
                {/* ID Card Upload */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    신분증 사본 *
                  </label>
                  <p className="mb-2 text-xs text-slate-500">
                    주민등록증, 운전면허증, 여권 중 하나
                  </p>
                  {idCardFile ? (
                    <div className="relative rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-3">
                        {idCardPreview ? (
                          <img
                            src={idCardPreview}
                            alt="신분증"
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-100">
                            <FileText className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {idCardFile.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(idCardFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile("idCard")}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 transition hover:border-brand-point-400 hover:bg-slate-100">
                      <Camera className="mb-2 h-8 w-8 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">
                        사진 촬영 또는 파일 선택
                      </span>
                      <span className="mt-1 text-xs text-slate-500">
                        이미지 또는 PDF (최대 10MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        onChange={(e) => handleFileChange(e, "idCard")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Safety Certificate Upload */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    기초안전보건교육 이수증 *
                  </label>
                  <p className="mb-2 text-xs text-slate-500">
                    건설업 기초안전보건교육 이수증 (4시간)
                  </p>
                  {safetyCertFile ? (
                    <div className="relative rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-3">
                        {safetyCertPreview ? (
                          <img
                            src={safetyCertPreview}
                            alt="이수증"
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-100">
                            <FileText className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {safetyCertFile.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(safetyCertFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile("safetyCert")}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 transition hover:border-brand-point-400 hover:bg-slate-100">
                      <Upload className="mb-2 h-8 w-8 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">
                        사진 촬영 또는 파일 선택
                      </span>
                      <span className="mt-1 text-xs text-slate-500">
                        이미지 또는 PDF (최대 10MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        onChange={(e) => handleFileChange(e, "safetyCert")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/onboarding/worker/consent?token=${token}`)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  이전
                </Button>
                <Button className="flex-1" onClick={handleDocumentsNext}>
                  다음
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Info */}
        {step === "info" && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900">정보 입력</h2>
              <p className="mb-6 text-sm text-slate-600">
                급여 지급 및 4대보험 신고에 필요한 정보입니다
              </p>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="생년월일 (6자리) *"
                    placeholder="예: 900101"
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        birthDate: e.target.value.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                    maxLength={6}
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      성별 *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gender: e.target.value as "" | "1" | "2" | "3" | "4",
                        })
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                    >
                      <option value="">선택하세요</option>
                      <option value="1">남성 (내국인)</option>
                      <option value="2">여성 (내국인)</option>
                      <option value="3">남성 (외국인)</option>
                      <option value="4">여성 (외국인)</option>
                    </select>
                  </div>
                </div>

                <Input
                  label="주소 *"
                  placeholder="예: 서울시 강남구 테헤란로 123"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="은행명 *"
                    placeholder="예: 국민은행"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  />
                  <Input
                    label="계좌번호 *"
                    placeholder="예: 123-456-789012"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, accountNumber: e.target.value })
                    }
                  />
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <p className="mb-4 text-sm font-medium text-slate-700">
                    로그인에 사용할 비밀번호를 설정해주세요
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="비밀번호 *"
                      type="password"
                      placeholder="4자리 이상"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                    <Input
                      label="비밀번호 확인 *"
                      type="password"
                      placeholder="비밀번호 재입력"
                      value={formData.passwordConfirm}
                      onChange={(e) =>
                        setFormData({ ...formData, passwordConfirm: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/onboarding/worker/${token}?step=documents`)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  이전
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      가입 완료
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">가입 완료</h2>
              <p className="mt-2 text-slate-600">
                {inviteData?.name}님, 환영합니다!
              </p>
              <p className="mt-4 text-sm text-slate-500">
                이제 {inviteData?.companyName}의 현장에서
                <br />
                근무하실 수 있습니다.
              </p>

              <div className="mt-6 rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">로그인 정보</p>
                <p className="mt-1 text-sm text-slate-600">
                  아이디: {inviteData?.phone}
                </p>
                <p className="text-sm text-slate-600">비밀번호: 설정하신 비밀번호</p>
              </div>

              <Button className="mt-6 w-full" onClick={() => router.push("/login")}>
                <User className="h-4 w-4" />
                로그인하기
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="mt-4 text-center text-xs text-slate-500">
          문의사항이 있으시면 담당자에게 연락해주세요
        </p>
      </div>
    </div>
  );
}
