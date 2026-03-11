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
  Users,
  FileText,
  AlertCircle,
  Clock,
  RotateCw,
  LayoutGrid,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { MobileListCard } from "@/components/MobileListCard";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  PrimitiveInput,
  PrimitiveSelect,
  toast,
  Skeleton,
  StatCard,
  PageHeader,
  Reveal,
  cn,
} from "@sigongcore/ui";
import { api } from "@/lib/api";
import type {
  DailyWorker,
  ProjectListItem,
  WorkerDocument,
  WorkerDocumentReviewAction,
  WorkerDocumentReviewQueueItem,
} from "@sigongcore/types";
import { sendWorkerInvite } from "@/lib/aligo";

interface LaborCodebook {
  version: string;
  nationality_codes: Record<string, string>;
  visa_status_codes: Record<string, string>;
  job_type_codes: Record<string, string>;
}

type WorkerQuickFilter = "all" | "docs_pending" | "blocked" | "needs_review";

interface ReviewSummary {
  pending_review: number;
  approved: number;
  rejected: number;
  quarantined: number;
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
  const [inviteSuccess, setInviteSuccess] = useState<{
    inviteUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<
    Array<{
      id: string;
      name: string;
      phone: string;
      created_at: string;
      expires_at: string;
      status: string;
    }>
  >([]);

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
  const [registerIdCardFile, setRegisterIdCardFile] = useState<File | null>(
    null,
  );
  const [registerSafetyCertFile, setRegisterSafetyCertFile] =
    useState<File | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<DailyWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingDocuments, setEditingDocuments] = useState<WorkerDocument[]>(
    [],
  );
  const [editIdCardFile, setEditIdCardFile] = useState<File | null>(null);
  const [editSafetyCertFile, setEditSafetyCertFile] = useState<File | null>(
    null,
  );

  // Review queue state
  const [reviewQueue, setReviewQueue] = useState<
    WorkerDocumentReviewQueueItem[]
  >([]);
  const [reviewFilter, setReviewFilter] = useState<
    WorkerDocument["review_status"] | "all"
  >("pending_review");
  const [isReviewQueueOpen, setIsReviewQueueOpen] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewActionKey, setReviewActionKey] = useState<string | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    pending_review: 0,
    approved: 0,
    rejected: 0,
    quarantined: 0,
  });
  const [pendingReviewWorkerIds, setPendingReviewWorkerIds] = useState<
    string[]
  >([]);
  const [workerActionKey, setWorkerActionKey] = useState<string | null>(null);

  const [workerFilter, setWorkerFilter] = useState<WorkerQuickFilter>("all");

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingWorker, setDeletingWorker] = useState<DailyWorker | null>(
    null,
  );
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
  const nationalityCodes =
    codebook?.nationality_codes ?? FALLBACK_NATIONALITY_CODES;
  const visaCodes = codebook?.visa_status_codes ?? FALLBACK_VISA_CODES;
  const jobCodes = codebook?.job_type_codes ?? FALLBACK_JOB_CODES;

  const isWorkerDocumentIncomplete = (worker: DailyWorker) => {
    return (
      worker.registration_status === "pending_consent" ||
      worker.registration_status === "pending_docs" ||
      worker.has_id_card === false ||
      worker.has_safety_cert === false
    );
  };

  // 초기 진입 시 데이터 1회 로드
  useEffect(() => {
    fetchWorkers();
    fetchCodebook();
    fetchProjects();
    fetchReviewQueue("pending_review");
    fetchReviewSummary();
    fetchPendingInvitations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const searchKeyword = search.trim().toLowerCase();
    const pendingReviewIds = new Set(pendingReviewWorkerIds);
    const nextWorkers = workers.filter((worker) => {
      const matchesSearch =
        !searchKeyword ||
        worker.name.toLowerCase().includes(searchKeyword) ||
        worker.phone.includes(searchKeyword);
      if (!matchesSearch) return false;

      if (workerFilter === "docs_pending") {
        return isWorkerDocumentIncomplete(worker);
      }
      if (workerFilter === "blocked") {
        return !!worker.is_blocked_for_labor;
      }
      if (workerFilter === "needs_review") {
        return pendingReviewIds.has(worker.id);
      }
      return true;
    });
    setFilteredWorkers(nextWorkers);
  }, [search, workers, workerFilter, pendingReviewWorkerIds]);

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

  const fetchPendingInvitations = async () => {
    try {
      const currentUser = (await api.getMe()) as any;
      const orgId = currentUser?.data?.organization_id || "org_1";
      const res = await (api as any).getPendingWorkerInvitations(orgId);
      if (res.success && res.data) {
        setPendingInvitations(res.data);
      }
    } catch {
      // Silently ignore
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
        if (status === "pending_review") {
          setPendingReviewWorkerIds(
            Array.from(new Set(response.data.map((item) => item.worker_id))),
          );
        }
      }
    } catch (error) {
      toast.error("서류 검토 대기 목록을 불러오지 못했습니다.");
    } finally {
      setIsReviewLoading(false);
    }
  };

  const fetchReviewSummary = async () => {
    try {
      const response = await api.getWorkerDocumentReviewQueue("all");
      if (response.success && response.data) {
        const nextSummary: ReviewSummary = {
          pending_review: 0,
          approved: 0,
          rejected: 0,
          quarantined: 0,
        };
        const nextPendingWorkerIds = new Set<string>();
        response.data.forEach((item) => {
          if (item.review_status === "pending_review") {
            nextSummary.pending_review += 1;
            nextPendingWorkerIds.add(item.worker_id);
          } else if (item.review_status === "approved") {
            nextSummary.approved += 1;
          } else if (item.review_status === "rejected") {
            nextSummary.rejected += 1;
          } else if (item.review_status === "quarantined") {
            nextSummary.quarantined += 1;
          }
        });
        setReviewSummary(nextSummary);
        setPendingReviewWorkerIds(Array.from(nextPendingWorkerIds));
      }
    } catch {
      // 요약 실패는 큐 실사용에 직접 영향이 없어 화면을 유지한다.
    }
  };

  const handleDownloadDocument = async (
    item: WorkerDocumentReviewQueueItem | WorkerDocument,
  ) => {
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
      if (
        action === "reject" ||
        action === "quarantine" ||
        action === "request_reupload"
      ) {
        const input = window.prompt("사유를 입력하세요.", "");
        if (!input || !input.trim()) {
          toast.error("사유를 입력해야 합니다.");
          return;
        }
        reason = input.trim();
      }
      const response = await api.reviewWorkerDocument(String(item.id), {
        action,
        reason,
      });
      if (response.success) {
        toast.success("검토 결과를 반영했습니다.");
        await Promise.all([
          fetchReviewQueue(reviewFilter),
          fetchWorkers(),
          fetchReviewSummary(),
        ]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "서류 검토에 실패했습니다.",
      );
    } finally {
      setReviewActionKey(null);
    }
  };

  const handleWorkerControl = async (worker: DailyWorker) => {
    const action = worker.is_blocked_for_labor ? "unblock" : "block";
    let reason: string | undefined;
    if (action === "block") {
      const input = window.prompt(
        "노무 투입 차단 사유를 입력하세요.",
        worker.block_reason || "",
      );
      if (!input || !input.trim()) {
        toast.error("차단 사유를 입력해야 합니다.");
        return;
      }
      reason = input.trim();
    }
    setWorkerActionKey(`${worker.id}:${action}`);
    try {
      const response = await api.setDailyWorkerControl(worker.id, {
        action,
        reason,
      });
      if (response.success) {
        toast.success(
          action === "block"
            ? "근로자를 차단했습니다."
            : "근로자 차단을 해제했습니다.",
        );
        await Promise.all([
          fetchWorkers(),
          fetchReviewQueue(reviewFilter),
          fetchReviewSummary(),
        ]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "근로자 통제 변경에 실패했습니다.",
      );
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
        await api.uploadDailyWorkerDocument(
          response.data.id,
          "id_card",
          registerIdCardFile,
        );
        await api.uploadDailyWorkerDocument(
          response.data.id,
          "safety_cert",
          registerSafetyCertFile,
        );
        toast.success("근로자 등록 및 필수 서류 업로드가 완료되었습니다.");
        setShowRegisterModal(false);
        resetForm();
        await Promise.all([
          fetchWorkers(),
          fetchReviewQueue(reviewFilter),
          fetchReviewSummary(),
        ]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "근로자 등록에 실패했습니다.",
      );
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

    setIsUpdating(true);
    try {
      const payload = {
        ...formData,
        daily_rate: Number(formData.daily_rate),
        gender: Number(formData.gender) as 1 | 2 | 3 | 4,
      };

      const response = await api.updateDailyWorker(editingWorker.id, payload);
      if (response.success) {
        if (editIdCardFile) {
          await api.uploadDailyWorkerDocument(
            editingWorker.id,
            "id_card",
            editIdCardFile,
          );
        }
        if (editSafetyCertFile) {
          await api.uploadDailyWorkerDocument(
            editingWorker.id,
            "safety_cert",
            editSafetyCertFile,
          );
        }
        toast.success("근로자 정보가 수정되었습니다.");
        setShowEditModal(false);
        setEditingWorker(null);
        resetForm();
        await Promise.all([
          fetchWorkers(),
          fetchReviewQueue(reviewFilter),
          fetchReviewSummary(),
        ]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "근로자 정보 수정에 실패했습니다.",
      );
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
        await Promise.all([
          fetchWorkers(),
          fetchReviewQueue(reviewFilter),
          fetchReviewSummary(),
        ]);
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
    if (cleaned.length <= 7)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
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
        // Save invitation to DB for tracking
        try {
          const currentUser = (await api.getMe()) as any;
          const orgId = currentUser?.data?.organization_id || "org_1";
          await (api as any).createWorkerInvitation({
            name: workerName.trim(),
            phone: workerPhone,
            organization_id: orgId,
            invited_by: currentUser?.data?.id || "u1",
            token,
          });
          await fetchPendingInvitations();
        } catch {
          // Invitation tracking failed silently - main flow already succeeded
        }
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
      toast.error(
        error instanceof Error ? error.message : "파일 생성에 실패했습니다.",
      );
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

  const pendingReviewWorkerSet = new Set(pendingReviewWorkerIds);
  const docsPendingCount = workers.filter((worker) =>
    isWorkerDocumentIncomplete(worker),
  ).length;
  const blockedWorkerCount = workers.filter(
    (worker) => !!worker.is_blocked_for_labor,
  ).length;
  const needsReviewCount = workers.filter((worker) =>
    pendingReviewWorkerSet.has(worker.id),
  ).length;

  const handleOpenReviewQueue = () => {
    setIsReviewQueueOpen(true);
    setReviewFilter("pending_review");
    void fetchReviewQueue("pending_review");
  };

  const handleCloseReviewQueue = () => {
    setIsReviewQueueOpen(false);
  };

  const handleRefreshReviewQueue = () => {
    void Promise.all([fetchReviewQueue(reviewFilter), fetchReviewSummary()]);
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-10">
        <Reveal>
          <PageHeader
            title="근로자 관리"
            description={`검색/필터 결과 ${filteredWorkers.length}명 · 전체 ${workers.length}명`}
            actions={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openDownloadModal("kwdi")}
                  className="hidden sm:inline-flex"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  근로복지공단
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openDownloadModal("tax")}
                  className="hidden sm:inline-flex"
                >
                  <Download className="h-4 w-4" />
                  국세청
                </Button>
                <Button size="sm" onClick={() => setShowInviteModal(true)}>
                  <MessageSquare className="h-4 w-4" />
                  초대
                </Button>
                <Button size="sm" onClick={() => setShowRegisterModal(true)}>
                  <Plus className="h-4 w-4" />
                  등록
                </Button>
              </div>
            }
          />
        </Reveal>

        {/* Action Dashboard - Stat Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="전체 근로자"
            value={workers.length}
            icon={Users}
            color="brand"
            className={cn(
              "cursor-pointer border-2 transition-all",
              workerFilter === "all" ? "border-brand-point-500 ring-2 ring-brand-point-100" : "border-slate-100"
            )}
            onClick={() => setWorkerFilter("all")}
          />
          <StatCard
            title="서류 미완"
            value={docsPendingCount}
            icon={FileText}
            color="amber"
            className={cn(
              "cursor-pointer border-2 transition-all",
              workerFilter === "docs_pending" ? "border-amber-500 ring-2 ring-amber-100" : "border-slate-100"
            )}
            onClick={() => setWorkerFilter("docs_pending")}
          />
          <StatCard
            title="검토 필요"
            value={needsReviewCount}
            icon={ShieldCheck}
            color="blue"
            className={cn(
              "cursor-pointer border-2 transition-all",
              workerFilter === "needs_review" ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-100"
            )}
            onClick={() => setWorkerFilter("needs_review")}
          />
          <StatCard
            title="투입 차단"
            value={blockedWorkerCount}
            icon={Ban}
            color="red"
            className={cn(
              "cursor-pointer border-2 transition-all",
              workerFilter === "blocked" ? "border-red-500 ring-2 ring-red-100" : "border-slate-100"
            )}
            onClick={() => setWorkerFilter("blocked")}
          />
        </div>

        {/* Evidence Document Management Section */}
        <Reveal delay={0.1}>
          <Card className="overflow-hidden border-brand-point-100 bg-brand-point-50/30 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-brand-point-100">
                  <ShieldCheck className="h-6 w-6 text-brand-point-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">증빙 서류 관리</h3>
                  <div className="mt-1 flex gap-3 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      대기 {reviewSummary.pending_review}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-brand-point-500" />
                      승인 {reviewSummary.approved}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      반려 {reviewSummary.rejected}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-10 border-brand-point-200 bg-white text-brand-point-700 hover:bg-brand-point-50"
                  onClick={handleOpenReviewQueue}
                >
                  승인 대기열 확인
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 p-0 text-slate-400 hover:bg-white hover:text-brand-point-500"
                  onClick={() => void fetchReviewSummary()}
                  title="새로고침"
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        {/* Search & List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <PrimitiveInput
                type="search"
                placeholder="근로자 명 또는 전화번호 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-2xl border-slate-200 bg-white pl-10 shadow-sm transition-all focus:border-brand-point-500 focus:ring-4 focus:ring-brand-point-100"
              />
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border-slate-200 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <>
                {/* 모바일: 스켈레톤 리스트 */}
                <div className="space-y-3 p-4 md:hidden">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-slate-100 p-4 space-y-3 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                      <div className="grid gap-2 pt-2">
                        <Skeleton className="h-4 w-48 shadow-sm" />
                        <Skeleton className="h-4 w-32 shadow-sm" />
                      </div>
                    </div>
                  ))}
                </div>
                {/* 데스크톱: 스켈레톤 테이블 */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-4 font-semibold">No.</th>
                        <th className="px-6 py-4 font-semibold">근로자 정보</th>
                        <th className="px-6 py-4 font-semibold">직종/매칭</th>
                        <th className="px-6 py-4 font-semibold">보수 정보</th>
                        <th className="px-6 py-4 font-semibold">연락처/계좌</th>
                        <th className="px-6 py-4 font-semibold text-center">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="px-6 py-5"><Skeleton className="h-4 w-6" /></td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-2">
                              <Skeleton className="h-5 w-32" />
                              <Skeleton className="h-3 w-40" />
                            </div>
                          </td>
                          <td className="px-6 py-5"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-6 py-5"><Skeleton className="h-4 w-28" /></td>
                          <td className="px-6 py-5"><Skeleton className="h-8 w-40" /></td>
                          <td className="px-6 py-5 text-center"><Skeleton className="mx-auto h-9 w-24 rounded-xl" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : filteredWorkers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 mb-4">
                  <Search className="h-10 w-10 opacity-20" />
                </div>
                <p className="text-lg font-medium">{search ? "검색 결과가 없습니다." : "등록된 근로자가 없습니다."}</p>
                {workerFilter !== 'all' && (
                  <Button variant="ghost" onClick={() => setWorkerFilter('all')} className="mt-2 text-brand-point-600">
                    전체 목록 보기
                  </Button>
                )}
              </div>
            ) : (
              <Reveal delay={0.2} direction="up">
                {/* 모바일: 전용 카드 리스트 */}
                <div className="space-y-4 p-4 md:hidden bg-slate-50/30">
                  {filteredWorkers.map((worker) => {
                    const nationalityLabel = worker.nationality_code
                      ? (nationalityCodes[worker.nationality_code] ?? worker.nationality_code)
                      : undefined;
                    
                    const statusBadge = (
                      <div className="flex flex-col items-end gap-1">
                        {worker.is_blocked_for_labor ? (
                          <Badge variant="error" className="shadow-sm">차단됨</Badge>
                        ) : isWorkerDocumentIncomplete(worker) ? (
                          <Badge variant="warning" className="shadow-sm">서류 미완</Badge>
                        ) : (
                          <Badge variant="success" className="shadow-sm">정상</Badge>
                        )}
                      </div>
                    );

                    return (
                      <MobileListCard
                        key={worker.id}
                        title={<span className="text-base font-bold">{worker.name}</span>}
                        subtitle={<span className="font-mono text-xs">{worker.phone}</span>}
                        badge={statusBadge}
                        className="border-none shadow-sm ring-1 ring-slate-200/50 hover:ring-brand-point-300 transition-all"
                        metadata={[
                          { label: "직종", value: <span className="font-medium text-slate-700">{worker.job_type || "-"}</span> },
                          { label: "일당", value: <span className="font-bold text-brand-primary">{formatCurrency(worker.daily_rate)}</span> },
                          ...(nationalityLabel ? [{ label: "국적", value: nationalityLabel }] : []),
                        ]}
                        actions={
                          <div className="grid w-full grid-cols-2 gap-2 mt-2">
                             <Button
                              variant="secondary"
                              size="sm"
                              className="w-full bg-slate-50 font-semibold"
                              onClick={() => void handleEdit(worker)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              정보 수정
                            </Button>
                            <Button
                              variant={worker.is_blocked_for_labor ? "secondary" : "ghost"}
                              size="sm"
                              className={cn(
                                "w-full font-semibold",
                                worker.is_blocked_for_labor ? "text-amber-600" : "text-slate-500"
                              )}
                              onClick={() => handleWorkerControl(worker)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              {worker.is_blocked_for_labor ? "차단 해제" : "입임 차단"}
                            </Button>
                          </div>
                        }
                      />
                    );
                  })}
                </div>

                {/* 데스크톱: 데이터 테이블 */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/30 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">근로자 기본 정보</th>
                        <th className="px-6 py-4">직종 / 소속</th>
                        <th className="px-6 py-4">지급 기준</th>
                        <th className="px-6 py-4">연락처 / 계좌</th>
                        <th className="px-6 py-4">상태 및 제어</th>
                        <th className="px-6 py-4 text-center">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredWorkers.map((worker, index) => (
                        <tr
                          key={worker.id}
                          className="group transition-all hover:bg-brand-point-50/30"
                        >
                          <td className="px-6 py-6 text-xs font-mono text-slate-400">
                            {(index + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col">
                              <span className="text-base font-bold text-slate-900 group-hover:text-brand-primary">
                                {worker.name}
                              </span>
                              <span className="mt-1 font-mono text-[11px] text-slate-500 tracking-tighter">
                                {formatMaskedSSN(worker.birth_date, worker.gender)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col gap-1">
                              <Badge variant="default" className="w-fit bg-slate-100 text-slate-700">
                                {worker.job_type}
                              </Badge>
                              <span className="text-xs text-slate-500">{worker.team || "소속 없음"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className="text-sm font-bold text-brand-primary">
                              {formatCurrency(worker.daily_rate)}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-700">{worker.phone}</span>
                              <span className="text-[11px] text-slate-400">
                                {worker.bank_name} {worker.account_number}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                             <div className="flex items-center gap-2">
                                {worker.is_blocked_for_labor ? (
                                  <Badge variant="error" className="animate-pulse">투입 불가</Badge>
                                ) : isWorkerDocumentIncomplete(worker) ? (
                                  <Badge variant="warning">서류 보완</Badge>
                                ) : (
                                  <Badge variant="success">투입 가능</Badge>
                                )}
                                {worker.is_foreign && (
                                  <Badge variant="info" className="bg-blue-50 text-blue-600 border-blue-100">F</Badge>
                                )}
                             </div>
                             {worker.block_reason && (
                               <div className="mt-2 text-[10px] text-red-500 font-medium">
                                 🚨 {worker.block_reason}
                               </div>
                             )}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 text-slate-400 hover:text-brand-primary hover:bg-white shadow-sm"
                                onClick={() => void handleEdit(worker)}
                                title="수정"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  "h-9 w-9 p-0 shadow-sm transition-colors",
                                  worker.is_blocked_for_labor ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                                )}
                                onClick={() => handleWorkerControl(worker)}
                                title={worker.is_blocked_for_labor ? "차단 해제" : "차단"}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 shadow-sm"
                                onClick={() => handleDelete(worker)}
                                title="삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            )}
          </CardContent>
        </Card>

        {/* 대기중 초대 */}
        {pendingInvitations.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              대기중 초대 ({pendingInvitations.length}명)
            </h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0 transition-colors hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {inv.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">{inv.phone}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>만료: {new Date(inv.expires_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs bg-white border-slate-200"
                      onClick={async () => {
                        try {
                          const invToken = inv.id;
                          const inviteUrl = `${window.location.origin}/onboarding/worker/consent?token=${invToken}`;
                          await (api as any).resendWorkerInvitation(inv.id, inviteUrl);
                          toast.success(`${inv.name}님에게 재발송했습니다.`);
                          await fetchPendingInvitations();
                        } catch {
                          toast.error("재발송에 실패했습니다.");
                        }
                      }}
                    >
                      재발송
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={async () => {
                        try {
                          await (api as any).revokeWorkerInvitation(inv.id);
                          toast.success(`${inv.name}님의 초대를 취소했습니다.`);
                          await fetchPendingInvitations();
                        } catch {
                          toast.error("초대 취소에 실패했습니다.");
                        }
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Worker Document Review Queue Modal */}
      <Modal
        isOpen={isReviewQueueOpen}
        onClose={handleCloseReviewQueue}
        title="서류 승인 대기열"
        description="근로자가 업로드한 자격 증명 서류를 검토하고 승인 여부를 결정합니다."
        size="xl"
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-slate-900">조회 결과</span>
              <span className="text-sm font-mono text-brand-point-600">{reviewQueue.length}건</span>
            </div>
            <div className="flex items-center gap-2">
              <PrimitiveSelect
                value={reviewFilter}
                onChange={(e) => {
                  const next = e.target.value as
                    | WorkerDocument["review_status"]
                    | "all";
                  setReviewFilter(next);
                  void fetchReviewQueue(next);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm transition-all focus:border-brand-point-500 focus:ring-4 focus:ring-brand-point-100"
              >
                <option value="pending_review">승인대기</option>
                <option value="approved">승인완료</option>
                <option value="rejected">반려내역</option>
                <option value="quarantined">심사보류</option>
                <option value="all">전체보기</option>
              </PrimitiveSelect>
              <Button
                variant="outline"
                className="h-10 shrink-0 whitespace-nowrap bg-white border-slate-200 text-slate-600 hover:text-brand-point-500 hover:border-brand-point-200"
                onClick={handleRefreshReviewQueue}
                disabled={isReviewLoading}
              >
                {isReviewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RotateCw className="h-4 w-4" />
                    새로고침
                  </>
                )}
              </Button>
            </div>
          </div>

          {isReviewLoading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              검토 목록을 불러오는 중...
            </div>
          ) : reviewQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
                <ShieldCheck className="h-7 w-7 text-slate-200" />
              </div>
              <p className="text-sm font-medium text-slate-400">승인 대기 중인 서류가 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-4">
                {reviewQueue.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-slate-100 bg-slate-50/50 p-5 transition-all hover:bg-white hover:shadow-xl hover:ring-1 hover:ring-brand-point-200"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-base font-extrabold text-slate-900 truncate">
                            {item.worker_name}
                          </p>
                          <Badge variant="info" className="bg-slate-100 text-slate-600 border-none text-[10px]">
                            {item.document_name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                          <FileText className="h-3 w-3" />
                          <span className="truncate">{item.original_filename || "파일명 없음"}</span>
                          <span>·</span>
                          <span>{formatFileSize(item.file_size_bytes)}</span>
                        </div>
                        {item.anomaly_flags && item.anomaly_flags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {item.anomaly_flags.map((flag, idx) => (
                              <span key={idx} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-100 uppercase tracking-tighter">
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.review_reason && (
                          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50/50 p-3 border border-red-50">
                            <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-medium text-red-600 leading-relaxed">
                              {item.review_reason}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-10 px-4 bg-white border border-slate-200 text-slate-600 hover:text-brand-primary"
                          onClick={() => handleDownloadDocument(item)}
                        >
                          <Eye className="h-4 w-4" />
                          보기
                        </Button>
                        <Button
                          size="sm"
                          className="h-10 px-5 shadow-md shadow-brand-point-50"
                          onClick={() => handleReviewAction(item, "approve")}
                          disabled={!!reviewActionKey && reviewActionKey === `${item.id}:approve`}
                          loading={!!reviewActionKey && reviewActionKey === `${item.id}:approve`}
                        >
                          {(!reviewActionKey || !reviewActionKey.includes('approve')) && <ShieldCheck className="h-4 w-4" />}
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-10 px-4 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100"
                          onClick={() => handleReviewAction(item, "reject")}
                          disabled={reviewActionKey === `${item.id}:reject`}
                        >
                          <CircleX className="h-4 w-4" />
                          반려
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          )}
        </div>
      </Modal>

      {/* Worker Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={closeInviteModal}
        title="근로자 초대"
        size="md"
      >
        <div className="space-y-6 pt-2">
          <div className="space-y-4">
            <Input
              label="근로자 이름"
              placeholder="성함을 입력하세요 (예: 홍길동)"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              error={inviteErrors.name}
              className="h-12 text-base"
            />
            <Input
              label="휴대폰 번호"
              placeholder="010-0000-0000"
              value={workerPhone}
              onChange={(e) => setWorkerPhone(handlePhoneFormat(e.target.value))}
              maxLength={13}
              error={inviteErrors.phone}
              className="h-12 font-mono text-base tracking-wider"
            />
          </div>

          {inviteErrors.submit && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600 animate-in fade-in slide-in-from-top-1">
              ⚠️ {inviteErrors.submit}
            </div>
          )}

          {inviteSuccess && (
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-inner animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                   <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="font-bold text-emerald-800">알림톡 발송 완료</p>
              </div>
              
              <div className="rounded-xl bg-white/60 p-3 border border-emerald-100">
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Invitation Link</p>
                <p className="break-all font-mono text-xs text-emerald-700 leading-relaxed">
                  {inviteSuccess.inviteUrl}
                </p>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                className="mt-4 w-full bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={handleCopyInviteLink}
              >
                {copied ? (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    복사되었습니다
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    초대 링크 복사하기
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={closeInviteModal} className="h-12 flex-1 font-bold text-slate-500">
              취소
            </Button>
            <Button
              onClick={handleInviteWorker}
              className="h-12 flex-1 font-bold shadow-lg shadow-brand-point-100"
              disabled={isInviting}
              loading={isInviting}
            >
              {!isInviting && (
                <>
                  <MessageSquare className="h-5 w-5" />
                  초대장 발송
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
        title={
          downloadType === "kwdi"
            ? "근로복지공단 양식 다운로드"
            : "국세청 양식 다운로드"
        }
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
                {Array.from(
                  { length: 4 },
                  (_, idx) => now.getFullYear() - 1 + idx,
                ).map((year) => (
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
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map(
                  (month) => (
                    <option key={month} value={month}>
                      {month}월
                    </option>
                  ),
                )}
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
        size="2xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="성명 *"
              placeholder="홍길동"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, team: e.target.value })
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="생년월일 (6자리) *"
              placeholder="예: 900101"
              value={formData.birth_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  birth_date: e.target.value.replace(/\D/g, "").slice(0, 6),
                })
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
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
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
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
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
              <span className="text-sm font-medium text-slate-700">
                외국인 근로자
              </span>
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
                    setFormData({
                      ...formData,
                      nationality_code: e.target.value,
                    })
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
            <p className="text-sm font-medium text-slate-800">
              필수 서류 업로드 *
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block rounded-lg border border-slate-200 p-3">
                <p className="mb-1 text-sm font-medium text-slate-700">
                  신분증
                </p>
                <p className="mb-2 text-xs text-slate-500">
                  JPG/PNG/PDF, 10MB 이하
                </p>
                <PrimitiveInput
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => onFileChange(e, setRegisterIdCardFile)}
                  className="w-full text-sm"
                />
                {registerIdCardFile && (
                  <p className="mt-2 text-xs text-slate-600">
                    {registerIdCardFile.name} ·{" "}
                    {formatFileSize(registerIdCardFile.size)}
                  </p>
                )}
              </label>
              <label className="block rounded-lg border border-slate-200 p-3">
                <p className="mb-1 text-sm font-medium text-slate-700">
                  안전교육 이수증
                </p>
                <p className="mb-2 text-xs text-slate-500">
                  JPG/PNG/PDF, 10MB 이하
                </p>
                <PrimitiveInput
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => onFileChange(e, setRegisterSafetyCertFile)}
                  className="w-full text-sm"
                />
                {registerSafetyCertFile && (
                  <p className="mt-2 text-xs text-slate-600">
                    {registerSafetyCertFile.name} ·{" "}
                    {formatFileSize(registerSafetyCertFile.size)}
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
        size="2xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="성명 *"
              placeholder="홍길동"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, team: e.target.value })
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="생년월일 (6자리) *"
              placeholder="예: 900101"
              value={formData.birth_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  birth_date: e.target.value.replace(/\D/g, "").slice(0, 6),
                })
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
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
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
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
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
              <span className="text-sm font-medium text-slate-700">
                외국인 근로자
              </span>
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
                    setFormData({
                      ...formData,
                      nationality_code: e.target.value,
                    })
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
            <p className="text-sm font-medium text-slate-800">
              필수 서류 재업로드 *
            </p>
            <p className="text-xs text-slate-500">
              수정 저장 시 신분증과 안전교육 이수증을 모두 다시 첨부해야 합니다.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {(["id_card", "safety_cert"] as const).map((documentType) => {
                const currentDocument = editingDocuments.find(
                  (item) => item.document_type === documentType,
                );
                const uploadFile =
                  documentType === "id_card"
                    ? editIdCardFile
                    : editSafetyCertFile;
                const setUploadFile =
                  documentType === "id_card"
                    ? setEditIdCardFile
                    : setEditSafetyCertFile;

                return (
                  <div
                    key={documentType}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">
                        {documentType === "id_card"
                          ? "신분증"
                          : "안전교육 이수증"}
                      </p>
                      {currentDocument ? (
                        renderReviewBadge(currentDocument.review_status)
                      ) : (
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
                        신규 파일: {uploadFile.name} ·{" "}
                        {formatFileSize(uploadFile.size)}
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
