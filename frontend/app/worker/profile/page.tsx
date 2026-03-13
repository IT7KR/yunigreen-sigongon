"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  CreditCard,
  FileText,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  Phone,
  Building2,
  Upload,
  User,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  PrimitiveButton,
  PrimitiveInput,
  toast,
} from "@sigongcore/ui";
import { WorkerLayout } from "@/components/WorkerLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

type WorkerDocument = {
  id: string;
  document_type: string;
  name: string;
  status: string;
  review_status: "pending_review" | "approved" | "rejected" | "quarantined";
  review_reason?: string | null;
  original_filename?: string | null;
};

type WorkerProfile = {
  id: string;
  name: string;
  phone: string;
  address: string;
  bank_name: string;
  account_number: string;
  job_type: string;
  documents: WorkerDocument[];
  has_id_number?: boolean;
  account_holder_name?: string;
  safety_cert_number?: string;
  safety_cert_issue_date?: string;
  safety_cert_issuer?: string;
};

const samplePathByDocId: Record<string, string> = {
  doc_1: "sample/1. 관공서 계약서류/4. 사업자외 서류_(주)유니그린개발.pdf",
  doc_2:
    "sample/3. 관공서 준공서류/3. 준공정산동의서(준공금 변동이 있을 경우에만 작성).pdf",
};

export default function WorkerProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const workerId = user?.id ?? "";

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 개인정보 수정 state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    phone: "",
    address: "",
    bank_name: "",
    account_number: "",
    account_holder_name: "",
    ssnFront: "",
    ssnBack: "",
    safety_cert_number: "",
    safety_cert_issue_date: "",
    safety_cert_issuer: "",
  });
  const [ssnError, setSsnError] = useState("");
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // 비밀번호 변경 state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // 서류 업로드 state
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const res = await (api as any).getWorkerProfile(workerId);
      if (res.success && res.data) {
        const data = res.data as WorkerProfile;
        setProfile(data);
        setInfoForm({
          phone: data.phone ?? "",
          address: data.address ?? "",
          bank_name: data.bank_name ?? "",
          account_number: data.account_number ?? "",
          account_holder_name: data.account_holder_name ?? "",
          ssnFront: "",
          ssnBack: "",
          safety_cert_number: data.safety_cert_number ?? "",
          safety_cert_issue_date: data.safety_cert_issue_date ?? "",
          safety_cert_issuer: data.safety_cert_issuer ?? "",
        });
      }
      setIsLoading(false);
    };

    void fetchProfile();
  }, [workerId]);

  // 개인정보 저장
  const handleSaveInfo = async () => {
    // SSN validation: either both parts or neither
    if ((infoForm.ssnFront && !infoForm.ssnBack) || (!infoForm.ssnFront && infoForm.ssnBack)) {
      setSsnError("주민번호 앞·뒤 자리를 모두 입력하세요.");
      return;
    }
    if (infoForm.ssnFront && !/^\d{6}$/.test(infoForm.ssnFront)) {
      setSsnError("앞 6자리는 숫자 6자리여야 합니다.");
      return;
    }
    if (infoForm.ssnBack && !/^\d{7}$/.test(infoForm.ssnBack)) {
      setSsnError("뒤 7자리는 숫자 7자리여야 합니다.");
      return;
    }
    setSsnError("");

    const id_number =
      infoForm.ssnFront && infoForm.ssnBack
        ? `${infoForm.ssnFront}${infoForm.ssnBack}`
        : undefined;

    const payload: Record<string, unknown> = {
      phone: infoForm.phone,
      address: infoForm.address,
      bank_name: infoForm.bank_name,
      account_number: infoForm.account_number,
      account_holder_name: infoForm.account_holder_name || undefined,
      safety_cert_number: infoForm.safety_cert_number || undefined,
      safety_cert_issue_date: infoForm.safety_cert_issue_date || undefined,
      safety_cert_issuer: infoForm.safety_cert_issuer || undefined,
    };
    if (id_number !== undefined) {
      payload.id_number = id_number;
    }

    setIsSavingInfo(true);
    try {
      const res = await (api as any).updateWorkerProfile(workerId, payload);
      if (res.success) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                phone: infoForm.phone,
                address: infoForm.address,
                bank_name: infoForm.bank_name,
                account_number: infoForm.account_number,
                account_holder_name: infoForm.account_holder_name,
                safety_cert_number: infoForm.safety_cert_number,
                safety_cert_issue_date: infoForm.safety_cert_issue_date,
                safety_cert_issuer: infoForm.safety_cert_issuer,
                has_id_number: id_number !== undefined ? true : prev.has_id_number,
              }
            : prev,
        );
        setInfoForm((prev) => ({ ...prev, ssnFront: "", ssnBack: "" }));
        setIsEditingInfo(false);
        toast.success("개인정보가 저장되었습니다.");
      } else {
        toast.error("저장에 실패했습니다. 다시 시도해 주세요.");
      }
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleCancelEditInfo = () => {
    setInfoForm({
      phone: profile?.phone ?? "",
      address: profile?.address ?? "",
      bank_name: profile?.bank_name ?? "",
      account_number: profile?.account_number ?? "",
      account_holder_name: profile?.account_holder_name ?? "",
      ssnFront: "",
      ssnBack: "",
      safety_cert_number: profile?.safety_cert_number ?? "",
      safety_cert_issue_date: profile?.safety_cert_issue_date ?? "",
      safety_cert_issuer: profile?.safety_cert_issuer ?? "",
    });
    setSsnError("");
    setIsEditingInfo(false);
  };

  // 비밀번호 변경
  const handleSavePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setIsSavingPassword(true);
    try {
      const res = await (api as any).changeWorkerPassword(workerId, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      if (res.success) {
        setPasswordForm({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
        setShowPasswordForm(false);
        toast.success("비밀번호가 변경되었습니다.");
      } else {
        toast.error(res.message ?? "비밀번호 변경에 실패했습니다.");
      }
    } catch {
      toast.error("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // 서류 업로드
  const handleUploadClick = (docId: string) => {
    fileInputRefs.current[docId]?.click();
  };

  const handleFileChange = async (
    docId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDocId(docId);
    try {
      const res = await (api as any).uploadWorkerDocument(
        workerId,
        docId,
        file,
      );
      if (res.success) {
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            documents: prev.documents.map((doc) =>
              doc.id === docId
                ? {
                    ...doc,
                    review_status: "pending_review" as const,
                    original_filename: file.name,
                  }
                : doc,
            ),
          };
        });
        toast.success("서류가 업로드되었습니다. 검토 후 승인됩니다.");
      } else {
        toast.error("업로드에 실패했습니다. 다시 시도해 주세요.");
      }
    } catch {
      toast.error("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingDocId(null);
      if (fileInputRefs.current[docId]) {
        fileInputRefs.current[docId]!.value = "";
      }
    }
  };

  const handleLogout = () => {
    router.push("/worker/entry");
  };

  // 서류 상태별 UI 렌더링
  const renderDocumentActions = (doc: WorkerDocument) => {
    const isUploading = uploadingDocId === doc.id;

    switch (doc.review_status) {
      case "approved":
        return (
          <div className="ml-3 flex flex-shrink-0 flex-col items-end gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              <Check className="h-3 w-3" />
              승인완료
            </span>
            <PrimitiveButton
              onClick={() => handleUploadClick(doc.id)}
              disabled={isUploading}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              재업로드
            </PrimitiveButton>
            <PrimitiveInput
              ref={(el) => {
                fileInputRefs.current[doc.id] = el;
              }}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => void handleFileChange(doc.id, e)}
            />
          </div>
        );

      case "pending_review":
        return (
          <div className="ml-3 flex flex-shrink-0 flex-col items-end gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              <Loader2 className="h-3 w-3" />
              검토 대기중
            </span>
            <PrimitiveButton
              disabled
              className="flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-400 opacity-50"
            >
              <Upload className="h-3 w-3" />
              업로드 중
            </PrimitiveButton>
          </div>
        );

      case "rejected":
        return (
          <div className="ml-3 flex flex-shrink-0 flex-col items-end gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
              <X className="h-3 w-3" />
              반려
            </span>
            <PrimitiveButton
              onClick={() => handleUploadClick(doc.id)}
              disabled={isUploading}
              className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 active:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              재업로드
            </PrimitiveButton>
            <PrimitiveInput
              ref={(el) => {
                fileInputRefs.current[doc.id] = el;
              }}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => void handleFileChange(doc.id, e)}
            />
          </div>
        );

      case "quarantined":
        return (
          <div className="ml-3 flex flex-shrink-0 flex-col items-end gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
              <X className="h-3 w-3" />
              격리됨
            </span>
            <PrimitiveButton
              onClick={() => handleUploadClick(doc.id)}
              disabled={isUploading}
              className="flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 active:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              재업로드
            </PrimitiveButton>
            <PrimitiveInput
              ref={(el) => {
                fileInputRefs.current[doc.id] = el;
              }}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => void handleFileChange(doc.id, e)}
            />
          </div>
        );

      default:
        return (
          <div className="ml-3 flex flex-shrink-0 flex-col items-end gap-1.5">
            <PrimitiveButton
              onClick={() => handleUploadClick(doc.id)}
              disabled={isUploading}
              className="flex items-center gap-1.5 rounded-lg border border-brand-point-300 bg-brand-point-50 px-3 py-1.5 text-xs font-medium text-brand-point-700 hover:bg-brand-point-100 active:bg-brand-point-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              업로드
            </PrimitiveButton>
            <PrimitiveInput
              ref={(el) => {
                fileInputRefs.current[doc.id] = el;
              }}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => void handleFileChange(doc.id, e)}
            />
          </div>
        );
    }
  };

  return (
    <WorkerLayout title="내 정보">
      <div className="space-y-6 p-4 pb-8">
        {/* 1. 워커 아바타 + 이름 (read-only header) */}
        <Card>
          <CardContent className="flex flex-col items-center py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-point-100">
              <User className="h-10 w-10 text-brand-point-600" />
            </div>
            {isLoading ? (
              <div className="mt-4 space-y-2 text-center">
                <div className="mx-auto h-6 w-32 animate-pulse rounded bg-slate-200" />
                <div className="mx-auto h-4 w-20 animate-pulse rounded bg-slate-200" />
              </div>
            ) : (
              <div className="mt-4 text-center">
                <p className="text-xl font-bold text-slate-900">
                  {profile?.name ?? "이름 없음"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {profile?.job_type ?? ""}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. 개인정보 수정 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">개인정보 수정</h2>
            {!isEditingInfo && (
              <PrimitiveButton
                onClick={() => setIsEditingInfo(true)}
                className="text-sm font-medium text-brand-point-600 hover:text-brand-point-700"
              >
                수정
              </PrimitiveButton>
            )}
          </div>
          <Card>
            <CardContent className="space-y-4 py-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded bg-slate-100"
                    />
                  ))}
                </div>
              ) : isEditingInfo ? (
                <>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Phone className="h-3.5 w-3.5" />
                      전화번호
                    </label>
                    <PrimitiveInput
                      type="tel"
                      value={infoForm.phone}
                      onChange={(e) =>
                        setInfoForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="010-0000-0000"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      주소
                    </label>
                    <PrimitiveInput
                      type="text"
                      value={infoForm.address}
                      onChange={(e) =>
                        setInfoForm((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="주소를 입력하세요"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Building2 className="h-3.5 w-3.5" />
                      은행명
                    </label>
                    <PrimitiveInput
                      type="text"
                      value={infoForm.bank_name}
                      onChange={(e) =>
                        setInfoForm((prev) => ({
                          ...prev,
                          bank_name: e.target.value,
                        }))
                      }
                      placeholder="예: 국민은행"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <CreditCard className="h-3.5 w-3.5" />
                      계좌번호
                    </label>
                    <PrimitiveInput
                      type="text"
                      value={infoForm.account_number}
                      onChange={(e) =>
                        setInfoForm((prev) => ({
                          ...prev,
                          account_number: e.target.value,
                        }))
                      }
                      placeholder="계좌번호를 입력하세요"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <User className="h-3.5 w-3.5" />
                      예금주
                    </label>
                    <PrimitiveInput
                      type="text"
                      value={infoForm.account_holder_name}
                      onChange={(e) =>
                        setInfoForm((prev) => ({
                          ...prev,
                          account_holder_name: e.target.value,
                        }))
                      }
                      placeholder="예금주명"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Lock className="h-3.5 w-3.5" />
                      주민등록번호
                    </label>
                    <div className="flex items-center gap-2">
                      <PrimitiveInput
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={infoForm.ssnFront}
                        onChange={(e) => {
                          setSsnError("");
                          setInfoForm((prev) => ({
                            ...prev,
                            ssnFront: e.target.value.replace(/\D/g, ""),
                          }));
                        }}
                        placeholder="앞 6자리"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                      />
                      <span className="flex-shrink-0 text-slate-400">-</span>
                      <PrimitiveInput
                        type="password"
                        inputMode="numeric"
                        maxLength={7}
                        value={infoForm.ssnBack}
                        onChange={(e) => {
                          setSsnError("");
                          setInfoForm((prev) => ({
                            ...prev,
                            ssnBack: e.target.value.replace(/\D/g, ""),
                          }));
                        }}
                        placeholder="뒤 7자리"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                      />
                    </div>
                    {ssnError && (
                      <p className="text-xs text-red-600">{ssnError}</p>
                    )}
                    {profile?.has_id_number && !infoForm.ssnFront && !infoForm.ssnBack && (
                      <p className="text-xs text-slate-400">
                        주민번호가 이미 등록되어 있습니다. 변경하려면 다시 입력하세요.
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                    <p className="text-xs font-medium text-slate-700">건설업 기초 안전보건교육 이수증</p>
                    <p className="text-xs text-slate-400">이수증이 있는 경우에만 입력하세요.</p>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">이수증 등록번호</label>
                      <PrimitiveInput
                        type="text"
                        value={infoForm.safety_cert_number}
                        onChange={(e) =>
                          setInfoForm((prev) => ({
                            ...prev,
                            safety_cert_number: e.target.value,
                          }))
                        }
                        placeholder="이수증 등록번호"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">이수일자</label>
                      <PrimitiveInput
                        type="date"
                        value={infoForm.safety_cert_issue_date}
                        onChange={(e) =>
                          setInfoForm((prev) => ({
                            ...prev,
                            safety_cert_issue_date: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">발급처</label>
                      <PrimitiveInput
                        type="text"
                        value={infoForm.safety_cert_issuer}
                        onChange={(e) =>
                          setInfoForm((prev) => ({
                            ...prev,
                            safety_cert_issuer: e.target.value,
                          }))
                        }
                        placeholder="발급처"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <PrimitiveButton
                      onClick={handleCancelEditInfo}
                      disabled={isSavingInfo}
                      className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
                    >
                      취소
                    </PrimitiveButton>
                    <PrimitiveButton
                      onClick={() => void handleSaveInfo()}
                      disabled={isSavingInfo}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-point-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-point-700 active:bg-brand-point-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingInfo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      저장
                    </PrimitiveButton>
                  </div>
                </>
              ) : (
                <dl className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs text-slate-400">전화번호</dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {profile?.phone || "—"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs text-slate-400">주소</dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {profile?.address || "—"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs text-slate-400">은행명</dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {profile?.bank_name || "—"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs text-slate-400">계좌번호</dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {profile?.account_number || "—"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs text-slate-400">예금주</dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {profile?.account_holder_name || "—"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs text-slate-400">주민등록번호</dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {profile?.has_id_number ? "등록됨" : "—"}
                      </dd>
                    </div>
                  </div>
                  {(profile?.safety_cert_number || profile?.safety_cert_issue_date || profile?.safety_cert_issuer) && (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1">
                      <p className="text-xs font-medium text-slate-600">건설업 기초 안전보건교육 이수증</p>
                      {profile?.safety_cert_number && (
                        <p className="text-xs text-slate-700">등록번호: {profile.safety_cert_number}</p>
                      )}
                      {profile?.safety_cert_issue_date && (
                        <p className="text-xs text-slate-700">이수일자: {profile.safety_cert_issue_date}</p>
                      )}
                      {profile?.safety_cert_issuer && (
                        <p className="text-xs text-slate-700">발급처: {profile.safety_cert_issuer}</p>
                      )}
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 3. 제출 서류 */}
        <div>
          <h2 className="mb-3 font-semibold text-slate-900">제출 서류</h2>
          {isLoading ? (
            <Card>
              <CardContent className="space-y-3 py-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : profile?.documents && profile.documents.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                {profile.documents.map((doc, idx) => (
                  <div key={doc.id}>
                    {idx > 0 && (
                      <div className="mx-4 border-t border-slate-100" />
                    )}
                    <div className="flex items-start justify-between px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                          <p className="truncate text-sm font-medium text-slate-900">
                            {doc.name}
                          </p>
                        </div>
                        {doc.original_filename && (
                          <p className="mt-0.5 truncate pl-5.5 text-xs text-slate-400">
                            {doc.original_filename}
                          </p>
                        )}
                        {(doc.review_status === "rejected" ||
                          doc.review_status === "quarantined") &&
                          doc.review_reason && (
                            <p className="mt-1 pl-5.5 text-xs text-red-600">
                              사유: {doc.review_reason}
                            </p>
                          )}
                      </div>
                      {renderDocumentActions(doc)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-sm text-slate-400">
                제출할 서류가 없습니다.
              </CardContent>
            </Card>
          )}
        </div>

        {/* 4. 비밀번호 변경 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">비밀번호 변경</h2>
            {!showPasswordForm && (
              <PrimitiveButton
                onClick={() => setShowPasswordForm(true)}
                className="text-sm font-medium text-brand-point-600 hover:text-brand-point-700"
              >
                변경
              </PrimitiveButton>
            )}
          </div>
          {showPasswordForm ? (
            <Card>
              <CardContent className="space-y-4 py-4">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                    현재 비밀번호
                  </label>
                  <PrimitiveInput
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        current_password: e.target.value,
                      }))
                    }
                    placeholder="현재 비밀번호 입력"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Lock className="h-3.5 w-3.5" />새 비밀번호
                  </label>
                  <PrimitiveInput
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        new_password: e.target.value,
                      }))
                    }
                    placeholder="새 비밀번호 (6자 이상)"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Lock className="h-3.5 w-3.5" />새 비밀번호 확인
                  </label>
                  <PrimitiveInput
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirm_password: e.target.value,
                      }))
                    }
                    placeholder="새 비밀번호 재입력"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-point-400 focus:outline-none focus:ring-2 focus:ring-brand-point-100"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <PrimitiveButton
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordForm({
                        current_password: "",
                        new_password: "",
                        confirm_password: "",
                      });
                    }}
                    disabled={isSavingPassword}
                    className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
                  >
                    취소
                  </PrimitiveButton>
                  <PrimitiveButton
                    onClick={() => void handleSavePassword()}
                    disabled={isSavingPassword}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-point-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-point-700 active:bg-brand-point-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    변경 저장
                  </PrimitiveButton>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-0">
                <PrimitiveButton
                  onClick={() => setShowPasswordForm(true)}
                  className="flex w-full items-center justify-between py-4 text-sm text-slate-600 hover:text-slate-900"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <span>비밀번호를 변경하려면 탭하세요</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </PrimitiveButton>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 5. 로그아웃 버튼 */}
        <Button
          fullWidth
          variant="destructive"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </WorkerLayout>
  );
}
