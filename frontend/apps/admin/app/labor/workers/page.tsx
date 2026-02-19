"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  Download,
  FileSpreadsheet,
  Loader2,
  MessageSquare,
  Copy,
  ShieldCheck,
  CircleX,
  ShieldAlert,
  Ban,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge, Button, Card, CardContent, Input, Modal, PrimitiveInput, PrimitiveSelect, toast } from "@sigongon/ui";
import { api } from "@/lib/api";
import type {
  DailyWorker,
  ProjectListItem,
  WorkerDocument,
  WorkerDocumentReviewAction,
  WorkerDocumentReviewQueueItem,
} from "@sigongon/types";
import { sendWorkerInvite } from "@/lib/aligo";

interface LaborCodebook {
  version: string;
  nationality_codes: Record<string, string>;
  visa_status_codes: Record<string, string>;
  job_type_codes: Record<string, string>;
}

const FALLBACK_NATIONALITY_CODES: Record<string, string> = {
  "100": "한국",
  "156": "중국",
  "704": "베트남",
};

const FALLBACK_VISA_CODES: Record<string, string> = {
  "E-9": "비전문취업",
  "H-2": "방문취업",
};

const FALLBACK_JOB_CODES: Record<string, string> = {
  "701": "건설구조 기능원",
  "705": "기타 건설 기능원",
  "706": "건설·채국 단순 종사자",
};

export default function DailyWorkersPage() {
  const now = new Date();

  const [workers, setWorkers] = useState<DailyWorker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<DailyWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [codebook, setCodebook] = useState<LaborCodebook | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);

  // Worker invitation modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [inviteSuccess, setInviteSuccess] = useState<{ inviteUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Report download modal state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadType, setDownloadType] = useState<"kwdi" | "tax">("kwdi");
  const [downloadProjectId, setDownloadProjectId] = useState("");
  const [downloadYear, setDownloadYear] = useState(now.getFullYear());
  const [downloadMonth, setDownloadMonth] = useState(now.getMonth() + 1);
  const [isDownloading, setIsDownloading] = useState(false);

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerIdCardFile, setRegisterIdCardFile] = useState<File | null>(null);
  const [registerSafetyCertFile, setRegisterSafetyCertFile] = useState<File | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<DailyWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingDocuments, setEditingDocuments] = useState<WorkerDocument[]>([]);
  const [editIdCardFile, setEditIdCardFile] = useState<File | null>(null);
  const [editSafetyCertFile, setEditSafetyCertFile] = useState<File | null>(null);

  // Review queue state
  const [reviewQueue, setReviewQueue] = useState<WorkerDocumentReviewQueueItem[]>([]);
  const [reviewFilter, setReviewFilter] = useState<WorkerDocument["review_status"] | "all">("pending_review");
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewActionKey, setReviewActionKey] = useState<string | null>(null);
  const [workerActionKey, setWorkerActionKey] = useState<string | null>(null);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingWorker, setDeletingWorker] = useState<DailyWorker | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    job_type: "보통인부",
    job_type_code: "",
    team: "",
    hire_date: "",
    birth_date: "",
    gender: "" as "" | "1" | "2" | "3" | "4",
    address: "",
    daily_rate: "",
    bank_name: "",
    account_number: "",
    phone: "",
    is_foreign: false,
    visa_status: "",
    nationality_code: "",
    english_name: "",
  });
  const nationalityCodes = codebook?.nationality_codes ?? FALLBACK_NATIONALITY_CODES;
  const visaCodes = codebook?.visa_status_codes ?? FALLBACK_VISA_CODES;
  const jobCodes = codebook?.job_type_codes ?? FALLBACK_JOB_CODES;

  useEffect(() => {
    fetchWorkers();
    fetchCodebook();
    fetchProjects();
    fetchReviewQueue("pending_review");
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredWorkers(workers);
    } else {
      const searchLower = search.toLowerCase();
      setFilteredWorkers(
        workers.filter(
          (worker) =>
            worker.name.toLowerCase().includes(searchLower) ||
            worker.phone.includes(searchLower)
        )
      );
    }
  }, [search, workers]);

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const response = await api.getDailyWorkers();
      if (response.success && response.data) {
        setWorkers(response.data);
        setFilteredWorkers(response.data);
      }
    } catch (error) {
      toast.error("근로자 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCodebook = async () => {
    try {
      const response = await api.getLaborCodebook();
      if (response.success && response.data) {
        setCodebook(response.data as LaborCodebook);
      }
    } catch {
      // 코드북 조회 실패 시 입력은 계속 허용하되, 백엔드 검증을 신뢰한다.
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.getProjects({ page: 1, per_page: 100 });
      if (response.data) {
        setProjects(response.data);
        setDownloadProjectId((prev) => prev || response.data?.[0]?.id || "");
      }
    } catch {
      toast.error("현장 목록을 불러오지 못했습니다.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      job_type: "보통인부",
      job_type_code: "",
      team: "",
      hire_date: "",
      birth_date: "",
      gender: "",
      address: "",
      daily_rate: "",
      bank_name: "",
      account_number: "",
      phone: "",
      is_foreign: false,
      visa_status: "",
      nationality_code: "",
      english_name: "",
    });
    setRegisterIdCardFile(null);
    setRegisterSafetyCertFile(null);
    setEditIdCardFile(null);
    setEditSafetyCertFile(null);
    setEditingDocuments([]);
  };

  const validateDocumentFile = (file: File) => {
    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
      : "";
    const allowedExt = [".jpg", ".jpeg", ".png", ".pdf"];
    if (!allowedExt.includes(ext)) {
      toast.error("PDF 또는 JPG/PNG 파일만 업로드할 수 있습니다.");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일은 10MB 이하로 업로드해주세요.");
      return false;
    }
    return true;
  };

  const onFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!validateDocumentFile(file)) {
      event.target.value = "";
      return;
    }
    setter(file);
  };

  const formatFileSize = (size: number) => {
    if (!size) return "0 KB";
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.ceil(size / 1024)} KB`;
  };

  const fetchWorkerDocuments = async (workerId: string) => {
    try {
      const response = await api.getDailyWorkerDocuments(workerId);
      if (response.success && response.data) {
        setEditingDocuments(response.data);
        return;
      }
      setEditingDocuments([]);
    } catch {
      setEditingDocuments([]);
      toast.error("근로자 서류 정보를 불러오지 못했습니다.");
    }
  };

  const fetchReviewQueue = async (
    status: WorkerDocument["review_status"] | "all" = reviewFilter,
  ) => {
    setIsReviewLoading(true);
    try {
      const response = await api.getWorkerDocumentReviewQueue(status);
      if (response.success && response.data) {
        setReviewQueue(response.data);
      }
    } catch (error) {
      toast.error("서류 검토 대기 목록을 불러오지 못했습니다.");
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleDownloadDocument = async (item: WorkerDocumentReviewQueueItem | WorkerDocument) => {
    if (!item.id) {
      toast.error("다운로드할 서류가 없습니다.");
      return;
    }
    try {
      const blob = await api.downloadWorkerDocument(String(item.id));
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      toast.error("서류 파일을 열 수 없습니다.");
    }
  };

  const handleReviewAction = async (
    item: WorkerDocumentReviewQueueItem,
    action: WorkerDocumentReviewAction,
  ) => {
    const key = `${item.id}:${action}`;
    setReviewActionKey(key);
    try {
      let reason: string | undefined;
      if (action === "reject" || action === "quarantine" || action === "request_reupload") {
        const input = window.prompt("사유를 입력하세요.", "");
        if (!input || !input.trim()) {
          toast.error("사유를 입력해야 합니다.");
          return;
        }
        reason = input.trim();
      }
      const response = await api.reviewWorkerDocument(String(item.id), { action, reason });
      if (response.success) {
        toast.success("검토 결과를 반영했습니다.");
        await Promise.all([fetchReviewQueue(reviewFilter), fetchWorkers()]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "서류 검토에 실패했습니다.");
    } finally {
      setReviewActionKey(null);
    }
  };

  const handleWorkerControl = async (worker: DailyWorker) => {
    const action = worker.is_blocked_for_labor ? "unblock" : "block";
    let reason: string | undefined;
    if (action === "block") {
      const input = window.prompt("노무 투입 차단 사유를 입력하세요.", worker.block_reason || "");
      if (!input || !input.trim()) {
        toast.error("차단 사유를 입력해야 합니다.");
        return;
      }
      reason = input.trim();
    }
    setWorkerActionKey(`${worker.id}:${action}`);
    try {
      const response = await api.setDailyWorkerControl(worker.id, { action, reason });
      if (response.success) {
        toast.success(action === "block" ? "근로자를 차단했습니다." : "근로자 차단을 해제했습니다.");
        await Promise.all([fetchWorkers(), fetchReviewQueue(reviewFilter)]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "근로자 통제 변경에 실패했습니다.");
    } finally {
      setWorkerActionKey(null);
    }
  };

  const handleRegister = async () => {
    if (!formData.name.trim()) {
      toast.error("성명을 입력하세요.");
      return;
    }
    if (!formData.birth_date || formData.birth_date.length !== 6) {
      toast.error("생년월일을 6자리로 입력하세요.");
      return;
    }
    if (!formData.gender) {
      toast.error("성별을 선택하세요.");
      return;
    }
    if (!formData.daily_rate || Number(formData.daily_rate) <= 0) {
      toast.error("일당을 입력하세요.");
      return;
    }
    if (!registerIdCardFile || !registerSafetyCertFile) {
      toast.error("신분증과 안전교육 이수증 파일을 모두 업로드하세요.");
      return;
    }

    setIsRegistering(true);
    try {
      const payload = {
        ...formData,
        daily_rate: Number(formData.daily_rate),
        gender: Number(formData.gender) as 1 | 2 | 3 | 4,
        organization_id: "org_1", // Hardcoded for mock
      };

      const response = await api.createDailyWorker(payload);
      if (response.success && response.data?.id) {
        await api.uploadDailyWorkerDocument(response.data.id, "id_card", registerIdCardFile);
        await api.uploadDailyWorkerDocument(response.data.id, "safety_cert", registerSafetyCertFile);
        toast.success("근로자 등록 및 필수 서류 업로드가 완료되었습니다.");
        setShowRegisterModal(false);
        resetForm();
        await Promise.all([fetchWorkers(), fetchReviewQueue(reviewFilter)]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "근로자 등록에 실패했습니다.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleEdit = async (worker: DailyWorker) => {
    setEditingWorker(worker);
    setEditIdCardFile(null);
    setEditSafetyCertFile(null);
    setFormData({
      name: worker.name,
      job_type: worker.job_type,
      job_type_code: worker.job_type_code,
      team: worker.team,
      hire_date: worker.hire_date,
      birth_date: worker.birth_date,
      gender: String(worker.gender) as "" | "1" | "2" | "3" | "4",
      address: worker.address,
      daily_rate: String(worker.daily_rate),
      bank_name: worker.bank_name,
      account_number: worker.account_number,
      phone: worker.phone,
      is_foreign: worker.is_foreign,
      visa_status: worker.visa_status || "",
      nationality_code: worker.nationality_code || "",
      english_name: worker.english_name || "",
    });
    setShowEditModal(true);
    await fetchWorkerDocuments(worker.id);
  };

  const handleUpdate = async () => {
    if (!editingWorker) return;

    if (!formData.name.trim()) {
      toast.error("성명을 입력하세요.");
      return;
    }
    if (!formData.birth_date || formData.birth_date.length !== 6) {
      toast.error("생년월일을 6자리로 입력하세요.");
      return;
    }
    if (!formData.gender) {
      toast.error("성별을 선택하세요.");
      return;
    }
    if (!formData.daily_rate || Number(formData.daily_rate) <= 0) {
      toast.error("일당을 입력하세요.");
      return;
    }
    if (!editIdCardFile || !editSafetyCertFile) {
      toast.error("신분증과 안전교육 이수증 파일을 모두 업로드하세요.");
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        ...formData,
        daily_rate: Number(formData.daily_rate),
        gender: Number(formData.gender) as 1 | 2 | 3 | 4,
      };

      const response = await api.updateDailyWorker(editingWorker.id, payload);
      if (response.success) {
        await api.uploadDailyWorkerDocument(editingWorker.id, "id_card", editIdCardFile);
        await api.uploadDailyWorkerDocument(editingWorker.id, "safety_cert", editSafetyCertFile);
        toast.success("근로자 정보가 수정되었습니다.");
        setShowEditModal(false);
        setEditingWorker(null);
        resetForm();
        await Promise.all([fetchWorkers(), fetchReviewQueue(reviewFilter)]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "근로자 정보 수정에 실패했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = (worker: DailyWorker) => {
    setDeletingWorker(worker);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingWorker) return;

    setIsDeleting(true);
    try {
      const response = await api.deleteDailyWorker(deletingWorker.id);
      if (response.success) {
        toast.success("근로자가 삭제되었습니다.");
        setShowDeleteModal(false);
        setDeletingWorker(null);
        fetchWorkers();
      }
    } catch (error) {
      toast.error("근로자 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePhoneFormat = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setWorkerName("");
    setWorkerPhone("");
    setInviteErrors({});
    setInviteSuccess(null);
    setCopied(false);
  };

  const handleInviteWorker = async () => {
    const errors: Record<string, string> = {};

    if (!workerName.trim()) {
      errors.name = "이름을 입력하세요.";
    }

    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!workerPhone || !phoneRegex.test(workerPhone)) {
      errors.phone = "010-0000-0000 형식으로 입력하세요.";
    }

    if (Object.keys(errors).length > 0) {
      setInviteErrors(errors);
      return;
    }

    setIsInviting(true);
    setInviteErrors({});
    setInviteSuccess(null);

    try {
      const token = `WI${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
      const inviteUrl = `${window.location.origin}/onboarding/worker/consent?token=${token}`;

      const result = await sendWorkerInvite({
        phone: workerPhone,
        name: workerName.trim(),
        companyName: "(주)유니그린",
        inviteUrl,
      });

      if (result.success) {
        setInviteSuccess({ inviteUrl });
        toast.success(`${workerName}님에게 알림톡을 발송했습니다.`);
      } else {
        setInviteErrors({
          submit: result.error_message || "알림톡 발송에 실패했습니다.",
        });
      }
    } catch {
      setInviteErrors({ submit: "초대에 실패했습니다." });
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteSuccess?.inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteSuccess.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const openDownloadModal = (type: "kwdi" | "tax") => {
    setDownloadType(type);
    setShowDownloadModal(true);
  };

  const handleDownload = async () => {
    if (!downloadProjectId) {
      toast.error("현장을 선택하세요.");
      return;
    }

    setIsDownloading(true);
    try {
      const response = await api.generateSiteReport(
        downloadProjectId,
        downloadYear,
        downloadMonth,
      );

      if (!(response.success && response.data)) {
        toast.error("신고 데이터를 불러오지 못했습니다.");
        return;
      }

      const excelModule = await import("@/lib/labor/excelExport");
      if (downloadType === "kwdi") {
        await excelModule.generateKWDIReportExcel(response.data);
        toast.success("근로복지공단 양식이 다운로드되었습니다.");
      } else {
        await excelModule.generateNationalTaxExcel(response.data);
        toast.success("국세청 양식이 다운로드되었습니다.");
      }

      setShowDownloadModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "파일 생성에 실패했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatMaskedSSN = (birthDate: string, gender: 1 | 2 | 3 | 4) => {
    if (!birthDate || birthDate.length < 6) return "-";
    return `${birthDate.slice(0, 6)}-${gender}******`;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ko-KR")}원`;
  };

  const renderReviewBadge = (status: WorkerDocument["review_status"]) => {
    if (status === "approved") {
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          승인
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge variant="warning">
          <CircleX className="h-3.5 w-3.5" />
          반려
        </Badge>
      );
    }
    if (status === "quarantined") {
      return (
        <Badge variant="error">
          <ShieldAlert className="h-3.5 w-3.5" />
          격리
        </Badge>
      );
    }
    return (
      <Badge variant="default">
        <Loader2 className="h-3.5 w-3.5" />
        검토대기
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">근로자 관리</h1>
            <p className="mt-1 text-slate-500">전체 {filteredWorkers.length}명</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => openDownloadModal("kwdi")}>
              <FileSpreadsheet className="h-4 w-4" />
              근로복지공단 양식
            </Button>
            <Button variant="secondary" onClick={() => openDownloadModal("tax")}>
              <Download className="h-4 w-4" />
              국세청 양식
            </Button>
            <Button onClick={() => setShowInviteModal(true)}>
              <MessageSquare className="h-4 w-4" />
              근로자 초대
            </Button>
            <Button onClick={() => setShowRegisterModal(true)}>
              <Plus className="h-4 w-4" />
              근로자 등록
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <PrimitiveInput
                type="search"
                placeholder="성명, 연락처로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Document Review Queue */}
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-slate-900">서류 검토 큐</p>
                <p className="text-sm text-slate-500">
                  신분증/안전교육 이수증 업로드 파일을 검토하고 이상 건을 제어합니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <PrimitiveSelect
                  value={reviewFilter}
                  onChange={(e) => {
                    const next = e.target.value as WorkerDocument["review_status"] | "all";
                    setReviewFilter(next);
                    void fetchReviewQueue(next);
                  }}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="pending_review">검토대기</option>
                  <option value="approved">승인</option>
                  <option value="rejected">반려</option>
                  <option value="quarantined">격리</option>
                  <option value="all">전체</option>
                </PrimitiveSelect>
                <Button
                  variant="secondary"
                  onClick={() => fetchReviewQueue(reviewFilter)}
                  disabled={isReviewLoading}
                >
                  {isReviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "새로고침"}
                </Button>
              </div>
            </div>

            {isReviewLoading ? (
              <div className="py-10 text-center text-sm text-slate-500">검토 목록을 불러오는 중...</div>
            ) : reviewQueue.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
                검토할 서류가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewQueue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.worker_name} · {item.document_name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.original_filename || "파일명 없음"} · {formatFileSize(item.file_size_bytes)}
                        </p>
                        {!!item.anomaly_flags?.length && (
                          <p className="mt-1 text-xs text-amber-700">
                            이상 플래그: {item.anomaly_flags.join(", ")}
                          </p>
                        )}
                        {!!item.review_reason && (
                          <p className="mt-1 text-xs text-red-600">사유: {item.review_reason}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {renderReviewBadge(item.review_status)}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDownloadDocument(item)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          보기
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReviewAction(item, "approve")}
                          disabled={reviewActionKey === `${item.id}:approve`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleReviewAction(item, "reject")}
                          disabled={reviewActionKey === `${item.id}:reject`}
                        >
                          <CircleX className="h-3.5 w-3.5" />
                          반려
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleReviewAction(item, "quarantine")}
                          disabled={reviewActionKey === `${item.id}:quarantine`}
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          격리
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Worker List Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                {search ? "검색 결과가 없습니다." : "등록된 근로자가 없습니다."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                      <th className="px-4 py-3 font-medium">No.</th>
                      <th className="px-4 py-3 font-medium">성명</th>
                      <th className="px-4 py-3 font-medium">직종</th>
                      <th className="px-4 py-3 font-medium">소속반</th>
                      <th className="px-4 py-3 font-medium">일당</th>
                      <th className="px-4 py-3 font-medium">연락처</th>
                      <th className="px-4 py-3 font-medium">외국인</th>
                      <th className="px-4 py-3 font-medium">계좌정보</th>
                      <th className="px-4 py-3 font-medium">통제</th>
                      <th className="px-4 py-3 font-medium">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers.map((worker, index) => (
                      <tr
                        key={worker.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-4 py-4 text-slate-500">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{worker.name}</p>
                            {(worker.registration_status === "pending_consent" ||
                              worker.registration_status === "pending_docs" ||
                              worker.has_id_card === false) && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                서류 미완
                              </span>
                            )}
                            {worker.is_blocked_for_labor && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                투입 차단
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatMaskedSSN(worker.birth_date, worker.gender)}
                          </p>
                          {worker.block_reason && (
                            <p className="mt-1 text-xs text-red-600">
                              사유: {worker.block_reason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {worker.job_type}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{worker.team}</td>
                        <td className="px-4 py-4 text-slate-900 font-medium">
                          {formatCurrency(worker.daily_rate)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{worker.phone}</td>
                        <td className="px-4 py-4">
                          {worker.is_foreign ? (
                            <div>
                              <Badge variant="info">외국인</Badge>
                              {worker.visa_status && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {worker.visa_status}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-slate-900">{worker.bank_name}</p>
                          <p className="text-xs text-slate-500">
                            {worker.account_number}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            size="sm"
                            variant={worker.is_blocked_for_labor ? "secondary" : "ghost"}
                            onClick={() => handleWorkerControl(worker)}
                            disabled={workerActionKey === `${worker.id}:${worker.is_blocked_for_labor ? "unblock" : "block"}`}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            {worker.is_blocked_for_labor ? "차단해제" : "차단"}
                          </Button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => void handleEdit(worker)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              수정
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(worker)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              삭제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Worker Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={closeInviteModal}
        title="근로자 초대"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="근로자 이름"
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
            maxLength={13}
            error={inviteErrors.phone}
          />

          {inviteErrors.submit && (
            <p className="text-sm text-red-500">{inviteErrors.submit}</p>
          )}

          {inviteSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-700">
                알림톡 발송이 완료되었습니다.
              </p>
              <p className="mt-1 break-all text-xs text-emerald-600">
                {inviteSuccess.inviteUrl}
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                onClick={handleCopyInviteLink}
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "복사 완료" : "링크 복사"}
              </Button>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={closeInviteModal} fullWidth>
              <X className="h-4 w-4" />
              닫기
            </Button>
            <Button onClick={handleInviteWorker} fullWidth disabled={isInviting}>
              {isInviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  알림톡 발송
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Tax/Welfare Download Modal */}
      <Modal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        title={downloadType === "kwdi" ? "근로복지공단 양식 다운로드" : "국세청 양식 다운로드"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              현장
            </label>
            <PrimitiveSelect
              value={downloadProjectId}
              onChange={(e) => setDownloadProjectId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            >
              <option value="">선택하세요</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </PrimitiveSelect>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                연도
              </label>
              <PrimitiveSelect
                value={String(downloadYear)}
                onChange={(e) => setDownloadYear(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                {Array.from({ length: 4 }, (_, idx) => now.getFullYear() - 1 + idx).map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </PrimitiveSelect>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                월
              </label>
              <PrimitiveSelect
                value={String(downloadMonth)}
                onChange={(e) => setDownloadMonth(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
                  <option key={month} value={month}>
                    {month}월
                  </option>
                ))}
              </PrimitiveSelect>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={() => setShowDownloadModal(false)}
              fullWidth
            >
              <X className="h-4 w-4" />
              취소
            </Button>
            <Button onClick={handleDownload} fullWidth disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  다운로드
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Registration Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false);
          resetForm();
        }}
        title="근로자 등록"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="성명 *"
              placeholder="홍길동"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                직종 *
              </label>
              <PrimitiveSelect
                value={formData.job_type}
                onChange={(e) =>
                  setFormData({ ...formData, job_type: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                <option value="보통인부">보통인부</option>
                <option value="특별인부">특별인부</option>
                <option value="기능공">기능공</option>
              </PrimitiveSelect>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                직종코드 *
              </label>
              <PrimitiveSelect
                value={formData.job_type_code}
                onChange={(e) =>
                  setFormData({ ...formData, job_type_code: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                <option value="">선택하세요</option>
                {Object.entries(jobCodes).map(([code, label]) => (
                  <option key={code} value={code}>
                    {code} - {label}
                  </option>
                ))}
              </PrimitiveSelect>
            </div>
            <Input
              label="소속반"
              placeholder="1반"
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="생년월일 (6자리) *"
              placeholder="예: 900101"
              value={formData.birth_date}
              onChange={(e) =>
                setFormData({ ...formData, birth_date: e.target.value.replace(/\D/g, "").slice(0, 6) })
              }
              maxLength={6}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                성별 *
              </label>
              <PrimitiveSelect
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value as "" | "1" | "2" | "3" | "4" })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                <option value="">선택하세요</option>
                <option value="1">남성 (내국인)</option>
                <option value="2">여성 (내국인)</option>
                <option value="3">남성 (외국인)</option>
                <option value="4">여성 (외국인)</option>
              </PrimitiveSelect>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="입사일"
              type="date"
              value={formData.hire_date}
              onChange={(e) =>
                setFormData({ ...formData, hire_date: e.target.value })
              }
            />
          </div>

          <Input
            label="주소"
            placeholder="서울시 강남구..."
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="일당 *"
              type="number"
              placeholder="200000"
              value={formData.daily_rate}
              onChange={(e) =>
                setFormData({ ...formData, daily_rate: e.target.value })
              }
            />
            <Input
              label="연락처"
              placeholder="010-0000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="은행명"
              placeholder="국민은행"
              value={formData.bank_name}
              onChange={(e) =>
                setFormData({ ...formData, bank_name: e.target.value })
              }
            />
            <Input
              label="계좌번호"
              placeholder="000000-00-000000"
              value={formData.account_number}
              onChange={(e) =>
                setFormData({ ...formData, account_number: e.target.value })
              }
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="flex items-center gap-2">
              <PrimitiveInput
                type="checkbox"
                checked={formData.is_foreign}
                onChange={(e) =>
                  setFormData({ ...formData, is_foreign: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-brand-point-600 focus:ring-brand-point-500"
              />
              <span className="text-sm font-medium text-slate-700">외국인 근로자</span>
            </label>
          </div>

          {formData.is_foreign && (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  비자유형 *
                </label>
                <PrimitiveSelect
                  value={formData.visa_status}
                  onChange={(e) =>
                    setFormData({ ...formData, visa_status: e.target.value })
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                >
                  <option value="">선택하세요</option>
                  {Object.entries(visaCodes).map(([code, label]) => (
                    <option key={code} value={code}>
                      {code} - {label}
                    </option>
                  ))}
                </PrimitiveSelect>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  국적코드 *
                </label>
                <PrimitiveSelect
                  value={formData.nationality_code}
                  onChange={(e) =>
                    setFormData({ ...formData, nationality_code: e.target.value })
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                >
                  <option value="">선택하세요</option>
                  {Object.entries(nationalityCodes).map(([code, label]) => (
                    <option key={code} value={code}>
                      {code} - {label}
                    </option>
                  ))}
                </PrimitiveSelect>
              </div>
              <Input
                label="영문이름"
                placeholder="NGUYEN VAN A"
                value={formData.english_name}
                onChange={(e) =>
                  setFormData({ ...formData, english_name: e.target.value })
                }
              />
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-800">필수 서류 업로드 *</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block rounded-lg border border-slate-200 p-3">
                <p className="mb-1 text-sm font-medium text-slate-700">신분증</p>
                <p className="mb-2 text-xs text-slate-500">JPG/PNG/PDF, 10MB 이하</p>
                <PrimitiveInput
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => onFileChange(e, setRegisterIdCardFile)}
                  className="w-full text-sm"
                />
                {registerIdCardFile && (
                  <p className="mt-2 text-xs text-slate-600">
                    {registerIdCardFile.name} · {formatFileSize(registerIdCardFile.size)}
                  </p>
                )}
              </label>
              <label className="block rounded-lg border border-slate-200 p-3">
                <p className="mb-1 text-sm font-medium text-slate-700">안전교육 이수증</p>
                <p className="mb-2 text-xs text-slate-500">JPG/PNG/PDF, 10MB 이하</p>
                <PrimitiveInput
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => onFileChange(e, setRegisterSafetyCertFile)}
                  className="w-full text-sm"
                />
                {registerSafetyCertFile && (
                  <p className="mt-2 text-xs text-slate-600">
                    {registerSafetyCertFile.name} · {formatFileSize(registerSafetyCertFile.size)}
                  </p>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowRegisterModal(false);
                resetForm();
              }}
              disabled={isRegistering}
            >
              <X className="h-4 w-4" />
              취소
            </Button>
            <Button
              onClick={handleRegister}
              className="flex-1"
              disabled={isRegistering}
            >
              {isRegistering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  등록
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingWorker(null);
          resetForm();
        }}
        title="근로자 정보 수정"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="성명 *"
              placeholder="홍길동"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                직종 *
              </label>
              <PrimitiveSelect
                value={formData.job_type}
                onChange={(e) =>
                  setFormData({ ...formData, job_type: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                <option value="보통인부">보통인부</option>
                <option value="특별인부">특별인부</option>
                <option value="기능공">기능공</option>
              </PrimitiveSelect>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                직종코드 *
              </label>
              <PrimitiveSelect
                value={formData.job_type_code}
                onChange={(e) =>
                  setFormData({ ...formData, job_type_code: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                <option value="">선택하세요</option>
                {Object.entries(jobCodes).map(([code, label]) => (
                  <option key={code} value={code}>
                    {code} - {label}
                  </option>
                ))}
              </PrimitiveSelect>
            </div>
            <Input
              label="소속반"
              placeholder="1반"
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="생년월일 (6자리) *"
              placeholder="예: 900101"
              value={formData.birth_date}
              onChange={(e) =>
                setFormData({ ...formData, birth_date: e.target.value.replace(/\D/g, "").slice(0, 6) })
              }
              maxLength={6}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                성별 *
              </label>
              <PrimitiveSelect
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value as "" | "1" | "2" | "3" | "4" })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                <option value="">선택하세요</option>
                <option value="1">남성 (내국인)</option>
                <option value="2">여성 (내국인)</option>
                <option value="3">남성 (외국인)</option>
                <option value="4">여성 (외국인)</option>
              </PrimitiveSelect>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="입사일"
              type="date"
              value={formData.hire_date}
              onChange={(e) =>
                setFormData({ ...formData, hire_date: e.target.value })
              }
            />
          </div>

          <Input
            label="주소"
            placeholder="서울시 강남구..."
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="일당 *"
              type="number"
              placeholder="200000"
              value={formData.daily_rate}
              onChange={(e) =>
                setFormData({ ...formData, daily_rate: e.target.value })
              }
            />
            <Input
              label="연락처"
              placeholder="010-0000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="은행명"
              placeholder="국민은행"
              value={formData.bank_name}
              onChange={(e) =>
                setFormData({ ...formData, bank_name: e.target.value })
              }
            />
            <Input
              label="계좌번호"
              placeholder="000000-00-000000"
              value={formData.account_number}
              onChange={(e) =>
                setFormData({ ...formData, account_number: e.target.value })
              }
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="flex items-center gap-2">
              <PrimitiveInput
                type="checkbox"
                checked={formData.is_foreign}
                onChange={(e) =>
                  setFormData({ ...formData, is_foreign: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-brand-point-600 focus:ring-brand-point-500"
              />
              <span className="text-sm font-medium text-slate-700">외국인 근로자</span>
            </label>
          </div>

          {formData.is_foreign && (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  비자유형 *
                </label>
                <PrimitiveSelect
                  value={formData.visa_status}
                  onChange={(e) =>
                    setFormData({ ...formData, visa_status: e.target.value })
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                >
                  <option value="">선택하세요</option>
                  {Object.entries(visaCodes).map(([code, label]) => (
                    <option key={code} value={code}>
                      {code} - {label}
                    </option>
                  ))}
                </PrimitiveSelect>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  국적코드 *
                </label>
                <PrimitiveSelect
                  value={formData.nationality_code}
                  onChange={(e) =>
                    setFormData({ ...formData, nationality_code: e.target.value })
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                >
                  <option value="">선택하세요</option>
                  {Object.entries(nationalityCodes).map(([code, label]) => (
                    <option key={code} value={code}>
                      {code} - {label}
                    </option>
                  ))}
                </PrimitiveSelect>
              </div>
              <Input
                label="영문이름"
                placeholder="NGUYEN VAN A"
                value={formData.english_name}
                onChange={(e) =>
                  setFormData({ ...formData, english_name: e.target.value })
                }
              />
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-800">필수 서류 재업로드 *</p>
            <p className="text-xs text-slate-500">
              수정 저장 시 신분증과 안전교육 이수증을 모두 다시 첨부해야 합니다.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {(["id_card", "safety_cert"] as const).map((documentType) => {
                const currentDocument = editingDocuments.find(
                  (item) => item.document_type === documentType,
                );
                const uploadFile =
                  documentType === "id_card" ? editIdCardFile : editSafetyCertFile;
                const setUploadFile =
                  documentType === "id_card" ? setEditIdCardFile : setEditSafetyCertFile;

                return (
                  <div key={documentType} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">
                        {documentType === "id_card" ? "신분증" : "안전교육 이수증"}
                      </p>
                      {currentDocument
                        ? renderReviewBadge(currentDocument.review_status)
                        : (
                          <Badge variant="default">미등록</Badge>
                        )}
                    </div>
                    {currentDocument?.original_filename && (
                      <p className="mb-2 text-xs text-slate-500">
                        현재 파일: {currentDocument.original_filename}
                      </p>
                    )}
                    {currentDocument?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mb-2"
                        onClick={() => handleDownloadDocument(currentDocument)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        현재 파일 보기
                      </Button>
                    )}
                    <PrimitiveInput
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => onFileChange(e, setUploadFile)}
                      className="w-full text-sm"
                    />
                    {uploadFile && (
                      <p className="mt-2 text-xs text-slate-600">
                        신규 파일: {uploadFile.name} · {formatFileSize(uploadFile.size)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowEditModal(false);
                setEditingWorker(null);
                resetForm();
              }}
              disabled={isUpdating}
            >
              <X className="h-4 w-4" />
              취소
            </Button>
            <Button
              onClick={handleUpdate}
              className="flex-1"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  저장
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingWorker(null);
        }}
        title="근로자 삭제"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {deletingWorker?.name}님의 정보를 삭제하시겠습니까?
            <br />
            삭제된 데이터는 복구할 수 없습니다.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingWorker(null);
              }}
              fullWidth
              disabled={isDeleting}
            >
              <X className="h-4 w-4" />
              취소
            </Button>
            <Button
              onClick={confirmDelete}
              fullWidth
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  삭제
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
