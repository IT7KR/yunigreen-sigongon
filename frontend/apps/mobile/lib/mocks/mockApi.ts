import type {
  APIResponse,
  PaginatedResponse,
  LoginResponse,
  ProjectListItem,
  ProjectDetail,
  ProjectStatus,
  SiteVisitDetail,
  VisitType,
  PhotoType,
  DiagnosisDetail,
  DiagnosisStatus,
  EstimateDetail,
  EstimateStatus,
  EstimateLineSource,
  ContractDetail,
  ContractStatus,
  LaborContractListItem,
  LaborContractStatus,
  ProjectPhotoAlbum,
  SeasonInfo,
  SeasonCategoryInfo,
  SeasonCategoryPurpose,
  SeasonDocumentInfo,
  SeasonDocumentStatusInfo,
  DiagnosisCase,
  DiagnosisCaseImage,
  VisionResultDetail,
  DiagnosisCaseEstimate,
} from "@sigongon/types";
import { mockDb, type Project, type User } from "./db";
import { MOBILE_MOCK_EXPORT_SAMPLE_FILES } from "../sampleFiles";

const DELAY = 200;

const delay = <T>(data: T): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), DELAY));
};

const nowIso = () => new Date().toISOString();

const randomId = (prefix: string) => {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
};

let snowflakeSeq = 0;
const nextSnowflake = () => {
  snowflakeSeq = (snowflakeSeq + 1) % 1000;
  return Date.now() * 1000 + snowflakeSeq;
};

const ok = <T>(data: T | null): APIResponse<T> => {
  return { success: true, data, error: null };
};

const fail = <T>(code: string, message: string): APIResponse<T> => {
  return { success: false, data: null, error: { code, message } };
};

const okPage = <T>(
  data: T[],
  meta: { page: number; per_page: number; total: number; total_pages: number },
): PaginatedResponse<T> => {
  return { success: true, data, error: null, meta };
};

type StoredEstimate = {
  id: string;
  project_id: string;
  version: number;
  status: EstimateStatus;
  subtotal: string;
  vat_amount: string;
  total_amount: string;
  created_at: string;
  issued_at?: string;
  lines: Array<{
    id: string;
    sort_order: number;
    description: string;
    specification?: string;
    unit: string;
    quantity: string;
    unit_price_snapshot: string;
    amount: string;
    source: EstimateLineSource;
  }>;
};

const asNumber = (value: string) => {
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const calcAmount = (quantity: string, unitPrice: string) => {
  const q = asNumber(quantity);
  const p = asNumber(unitPrice);
  return Math.round(q * p).toString();
};

const recalcTotals = (estimate: StoredEstimate): StoredEstimate => {
  const subtotalNum = estimate.lines.reduce(
    (sum, line) => sum + asNumber(line.amount),
    0,
  );
  const vatNum = Math.round(subtotalNum * 0.1);
  return {
    ...estimate,
    subtotal: subtotalNum.toString(),
    vat_amount: vatNum.toString(),
    total_amount: (subtotalNum + vatNum).toString(),
  };
};

export class MockAPIClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private siteVisitsByProject: Record<string, SiteVisitDetail[]> = {};
  private visitProjectId: Record<string, string> = {};
  private visitById: Record<string, SiteVisitDetail> = {};

  private diagnosesById: Record<string, DiagnosisDetail> = {};
  private diagnosisPolls: Record<string, number> = {};

  private estimatesById: Record<string, StoredEstimate> = {};
  private projectEstimateIds: Record<string, string[]> = {};

  private contractsById: Record<string, ContractDetail> = {};
  private projectContractIds: Record<string, string[]> = {};

  private laborContractsByProject: Record<string, LaborContractListItem[]> = {};
  private warrantyRequestsByProject: Record<
    string,
    Array<{
      id: string;
      description: string;
      status: string;
      created_at: string;
      resolved_at?: string;
    }>
  > = {};

  private utilitiesByProject: Record<
    string,
    {
      items: Array<{
        id: string;
        type: "수도" | "전기" | "가스" | "기타";
        month: string;
        status: "pending" | "completed";
        amount: number;
        due_date: string;
        doc_status: "pending" | "submitted";
      }>;
      timeline: Array<{ id: string; date: string; message: string }>;
    }
  > = {};

  private taxInvoicesByProject: Record<
    string,
    {
      summary: {
        total_amount: number;
        success_count: number;
        failed_count: number;
      };
      items: Array<{
        id: string;
        type: "매출" | "매입";
        amount: number;
        status: "published" | "failed";
        date: string;
        customer: string;
        failure_reason?: string;
      }>;
    }
  > = {};

  private workerContractsById: Record<
    string,
    {
      id: string;
      project_name: string;
      work_date: string;
      role: string;
      daily_rate: number;
      status: "pending" | "signed";
      content: string;
    }
  > = {};

  private workerContractsByWorker: Record<
    string,
    Array<{
      id: string;
      project_name: string;
      work_date: string;
      role: string;
      daily_rate: number;
      status: "pending" | "signed";
    }>
  > = {};

  private workerPaystubsByWorker: Record<
    string,
    Array<{
      id: string;
      month: string;
      amount: number;
      status: "sent" | "confirmed";
      date: string;
    }>
  > = {};

  private workerPaystubDetails: Record<
    string,
    Record<
      string,
      {
        id: string;
        title: string;
        total_amount: number;
        deductions: number;
        net_amount: number;
        items: Array<{ label: string; amount: number }>;
        status: "sent" | "confirmed";
      }
    >
  > = {};

  private notifications: Array<{
    id: string;
    type: "contract" | "paystub" | "notice";
    title: string;
    message: string;
    time: string;
    read: boolean;
  }> = [];

  private workerAccessRequests: Record<string, string> = {};
  private workerInvitations: Record<
    string,
    { worker_id: string; name: string; phone: string; created_at: string }
  > = {};
  private passwordResetRequests: Record<
    string,
    { login_id: string; phone: string; code: string; expires_at: number }
  > = {};
  private passwordResetVerifications: Record<string, { phone: string }> = {};
  private dailyReportsByProject: Record<
    string,
    Array<{
      id: string;
      project_id: string;
      work_date: string;
      weather?: string;
      temperature?: string;
      work_description: string;
      tomorrow_plan?: string;
      photo_count: number;
      created_at: string;
    }>
  > = {};
  private seasons: SeasonInfo[] = [
    { id: 202601010001, name: "2026H1", is_active: true, created_at: "2026-01-01T00:00:00Z" },
  ];
  private seasonCategories: SeasonCategoryInfo[] = [
    {
      id: 202601010101,
      season_id: 202601010001,
      name: "적산 자료",
      purpose: "estimation",
      is_enabled: true,
      sort_order: 100,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
  private seasonDocuments: SeasonDocumentInfo[] = [];
  private diagnosisCases: DiagnosisCase[] = [];
  private caseImagesByCaseId: Record<number, DiagnosisCaseImage[]> = {};
  private visionByCaseId: Record<number, VisionResultDetail> = {};
  private estimateByCaseId: Record<number, DiagnosisCaseEstimate> = {};

  private constructionReportsByProject: Record<
    string,
    Array<{
      id: string;
      project_id: string;
      report_type: "start" | "completion";
      report_number?: string;
      status: "draft" | "submitted" | "approved" | "rejected";
      construction_name?: string;
      site_address?: string;
      start_date?: string;
      expected_end_date?: string;
      supervisor_name?: string;
      supervisor_phone?: string;
      actual_end_date?: string;
      final_amount?: string;
      defect_warranty_period?: number;
      notes?: string;
      created_at: string;
      submitted_at?: string;
      approved_at?: string;
    }>
  > = {};

  private ensureUtilities(projectId: string) {
    if (this.utilitiesByProject[projectId]) return;

    this.utilitiesByProject[projectId] = {
      items: [
        {
          id: "util_1",
          type: "수도",
          month: "2026-01",
          status: "completed",
          amount: 45000,
          due_date: "2026-01-25",
          doc_status: "submitted",
        },
        {
          id: "util_2",
          type: "전기",
          month: "2026-01",
          status: "pending",
          amount: 120000,
          due_date: "2026-01-25",
          doc_status: "pending",
        },
      ],
      timeline: [
        {
          id: "t1",
          date: "2026-01-20 14:00",
          message: "1월 수도요금 공문이 발송되었습니다.",
        },
        {
          id: "t2",
          date: "2026-01-15 09:30",
          message: "전기요금 고지서가 업로드되었습니다.",
        },
      ],
    };
  }

  private ensureTaxInvoices(projectId: string) {
    if (this.taxInvoicesByProject[projectId]) return;

    this.taxInvoicesByProject[projectId] = {
      summary: {
        total_amount: 20000000,
        success_count: 1,
        failed_count: 1,
      },
      items: [
        {
          id: "ti_1",
          type: "매출",
          amount: 15000000,
          status: "published",
          date: "2026-01-20",
          customer: "ABC 건설",
        },
        {
          id: "ti_2",
          type: "매출",
          amount: 5000000,
          status: "failed",
          date: "2026-01-15",
          customer: "ABC 건설",
          failure_reason: "사업자번호 불일치",
        },
      ],
    };
  }

  private ensureWorkerContract(contractId: string) {
    if (this.workerContractsById[contractId]) return;
    this.workerContractsById[contractId] = {
      id: contractId,
      project_name: "논현동 주택 리모델링",
      work_date: "2026.01.22",
      role: "목공",
      daily_rate: 250000,
      status: "pending",
      content: "(계약 내용 생략)",
    };
  }

  private ensureWorkerContracts(workerId: string) {
    if (this.workerContractsByWorker[workerId]) return;

    const seededContracts = [
      {
        id: "wc_1",
        project_name: "논현동 주택 리모델링",
        work_date: "2026.01.22",
        role: "목공",
        daily_rate: 250000,
        status: "pending" as const,
        content: "(논현동 현장 계약 내용 생략)",
      },
      {
        id: "wc_2",
        project_name: "역삼중 옥상 방수 공사",
        work_date: "2026.01.15",
        role: "방수",
        daily_rate: 230000,
        status: "signed" as const,
        content: "(역삼중 현장 계약 내용 생략)",
      },
    ];

    for (const contract of seededContracts) {
      this.workerContractsById[contract.id] = {
        id: contract.id,
        project_name: contract.project_name,
        work_date: contract.work_date,
        role: contract.role,
        daily_rate: contract.daily_rate,
        status: contract.status,
        content: contract.content,
      };
    }

    this.workerContractsByWorker[workerId] = seededContracts.map(
      ({ content: _content, ...contract }) => contract,
    );
  }

  private ensureWorkerPaystubs(workerId: string) {
    if (this.workerPaystubsByWorker[workerId]) return;

    this.workerPaystubsByWorker[workerId] = [
      {
        id: "ps_1",
        month: "2026년 1월",
        amount: 2500000,
        status: "sent",
        date: "2026.01.20",
      },
      {
        id: "ps_2",
        month: "2025년 12월",
        amount: 1800000,
        status: "confirmed",
        date: "2025.12.20",
      },
    ];
    this.workerPaystubDetails[workerId] = {
      ps_1: {
        id: "ps_1",
        title: "2026년 1월 급여지급명세서",
        total_amount: 2500000,
        deductions: 89000,
        net_amount: 2411000,
        items: [
          { label: "기본급", amount: 2500000 },
          { label: "소득세", amount: -78000 },
          { label: "주민세", amount: -7800 },
        ],
        status: "sent",
      },
      ps_2: {
        id: "ps_2",
        title: "2025년 12월 급여지급명세서",
        total_amount: 1800000,
        deductions: 70000,
        net_amount: 1730000,
        items: [
          { label: "기본급", amount: 1800000 },
          { label: "소득세", amount: -62000 },
          { label: "주민세", amount: -8000 },
        ],
        status: "confirmed",
      },
    };
  }

  private ensureNotifications() {
    if (this.notifications.length > 0) return;
    this.notifications = [
      {
        id: "n1",
        type: "contract",
        title: "근로계약서 서명 요청",
        message: "논현동 현장 근로계약서 서명이 필요합니다.",
        time: "방금 전",
        read: false,
      },
      {
        id: "n2",
        type: "paystub",
        title: "1월 지급명세서 발송",
        message: "2026년 1월분 지급명세서가 도착했습니다.",
        time: "1시간 전",
        read: true,
      },
    ];
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
  }

  private getUsers(): User[] {
    return mockDb.get("users");
  }

  private pickUser(email: string): User {
    const users = this.getUsers();
    const byEmail = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    return byEmail || users[0];
  }

  private getCurrentUser(): User | null {
    const user = mockDb.get("currentUser");
    return user || null;
  }

  async login(email: string, _password: string) {
    if (!email) {
      return delay(
        fail<LoginResponse>("INVALID_CREDENTIALS", "이메일을 입력해 주세요"),
      );
    }

    const user = this.pickUser(email);
    mockDb.set("currentUser", user);

    const access_token = `mock_access_${randomId("t")}`;
    const refresh_token = `mock_refresh_${randomId("t")}`;
    this.setAccessToken(access_token);
    this.setRefreshToken(refresh_token);

    return delay(
      ok<LoginResponse>({
        access_token,
        refresh_token,
        expires_in: 60 * 60,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      }),
    );
  }

  async getMe() {
    if (!this.accessToken) {
      return delay(
        fail<{
          id: string;
          email: string;
          name: string;
          phone?: string;
          role: string;
          organization?: { id: string; name: string };
        }>("UNAUTHORIZED", "로그인이 필요해요"),
      );
    }

    const user = this.getCurrentUser() || this.getUsers()[0];

    return delay(
      ok({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        organization: {
          id: user.organization_id,
          name: "시공ON",
        },
      }),
    );
  }

  async getProjects(params?: {
    page?: number;
    per_page?: number;
    status?: ProjectStatus;
    search?: string;
  }) {
    let projects = mockDb.get("projects");

    if (params?.status) {
      projects = projects.filter((p) => p.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q),
      );
    }

    const page = params?.page || 1;
    const per_page = params?.per_page || 10;
    const total = projects.length;
    const total_pages = Math.max(1, Math.ceil(total / per_page));

    const start = (page - 1) * per_page;
    const pageItems = projects.slice(start, start + per_page);

    const items: ProjectListItem[] = pageItems.map((p) => {
      const siteVisits = this.siteVisitsByProject[p.id] || [];
      const estimates = this.projectEstimateIds[p.id] || [];

      return {
        id: p.id,
        name: p.name,
        address: p.address,
        status: p.status,
        client_name: p.clientName,
        created_at: p.createdAt,
        site_visit_count: siteVisits.length,
        estimate_count: estimates.length,
      };
    });

    return delay(okPage(items, { page, per_page, total, total_pages }));
  }

  async getProject(id: string) {
    const project = mockDb.get("projects").find((p) => p.id === id);
    if (!project) {
      return delay(
        fail<ProjectDetail>("NOT_FOUND", "프로젝트를 찾을 수 없어요"),
      );
    }

    const visits = this.siteVisitsByProject[id] || [];
    const estimateIds = this.projectEstimateIds[id] || [];
    const estimates = estimateIds
      .map((estimateId) => this.estimatesById[estimateId])
      .filter(Boolean)
      .map((e) => ({
        id: e.id,
        version: e.version,
        status: e.status,
        total_amount: e.total_amount,
      }));

    return delay(
      ok<ProjectDetail>({
        id: project.id,
        name: project.name,
        address: project.address,
        status: project.status,
        client_name: project.clientName,
        client_phone: project.clientPhone,
        notes: project.notes,
        created_at: project.createdAt,
        site_visits: visits.map((v) => ({
          id: v.id,
          visit_type: v.visit_type,
          visited_at: v.visited_at,
          photo_count: v.photo_count,
        })),
        estimates,
      }),
    );
  }

  async createProject(data: {
    name: string;
    address: string;
    client_name?: string;
    client_phone?: string;
    notes?: string;
  }) {
    const newProject: Project = {
      id: randomId("p"),
      name: data.name,
      address: data.address,
      status: "draft",
      clientName: data.client_name || "",
      clientPhone: data.client_phone || "",
      notes: data.notes,
      organization_id: "org_1",
      visibleToSiteManager: true,
      createdAt: nowIso(),
    };

    mockDb.update("projects", (prev) => [newProject, ...prev]);

    return delay(
      ok({
        id: newProject.id,
        name: newProject.name,
        status: newProject.status,
      }),
    );
  }

  async getSiteVisits(projectId: string) {
    return delay(ok(this.siteVisitsByProject[projectId] || []));
  }

  async createSiteVisit(
    projectId: string,
    data: {
      visit_type: VisitType;
      visited_at: string;
      notes?: string;
    },
  ) {
    const visitId = randomId("v");
    const visit: SiteVisitDetail = {
      id: visitId,
      visit_type: data.visit_type,
      visited_at: data.visited_at,
      notes: data.notes,
      photo_count: 0,
      photos: [],
    };

    this.siteVisitsByProject[projectId] = [
      ...(this.siteVisitsByProject[projectId] || []),
      visit,
    ];
    this.visitProjectId[visitId] = projectId;
    this.visitById[visitId] = visit;

    return delay(
      ok({
        id: visitId,
        visit_type: data.visit_type,
        visited_at: data.visited_at,
      }),
    );
  }

  async uploadPhoto(
    visitId: string,
    file: File,
    photoType: PhotoType,
    caption?: string,
  ) {
    const visit = this.visitById[visitId];
    if (!visit) {
      return delay(
        fail<{ id: string; storage_path: string; photo_type: PhotoType }>(
          "NOT_FOUND",
          "방문 기록을 찾을 수 없어요",
        ),
      );
    }

    const photoId = randomId("ph");
    const storage_path = `mock://photos/${photoId}/${encodeURIComponent(file.name)}`;
    const photo = { id: photoId, photo_type: photoType, storage_path, caption };

    visit.photos = [...visit.photos, photo];
    visit.photo_count = visit.photos.length;

    return delay(ok({ id: photoId, storage_path, photo_type: photoType }));
  }

  async requestDiagnosis(
    visitId: string,
    _data?: {
      additional_notes?: string;
      photo_ids?: string[];
    },
  ) {
    const projectId = this.visitProjectId[visitId];
    if (!projectId) {
      return delay(
        fail<{ diagnosis_id: string; status: string; message: string }>(
          "NOT_FOUND",
          "진단을 요청할 방문 기록을 찾을 수 없어요",
        ),
      );
    }

    const diagnosisId = randomId("d");
    const status: DiagnosisStatus = "processing";

    const diagnosis: DiagnosisDetail = {
      id: diagnosisId,
      site_visit_id: visitId,
      project_id: projectId,
      status,
      leak_opinion_text:
        "누수 가능성이 있어요. 방수층과 배관 주변을 우선 확인해 주세요.",
      field_opinion_text: "",
      confidence_score: 0.72,
      processing_time_ms: 1200,
      suggested_materials: [
        {
          id: randomId("m"),
          suggested_name: "방수 코팅제",
          suggested_spec: "우레탄",
          suggested_unit: "set",
          suggested_quantity: 1,
          matched_catalog_item: {
            id: "mat_1",
            name_ko: "우레탄 방수제",
            unit_price: "45000",
          },
          match_confidence: 0.81,
          is_confirmed: false,
        },
        {
          id: randomId("m"),
          suggested_name: "실리콘 실란트",
          suggested_spec: "중성",
          suggested_unit: "ea",
          suggested_quantity: 2,
          matched_catalog_item: undefined,
          match_confidence: 0.55,
          is_confirmed: false,
        },
      ],
    };

    this.diagnosesById[diagnosisId] = diagnosis;
    this.diagnosisPolls[diagnosisId] = 0;

    return delay(
      ok({ diagnosis_id: diagnosisId, status, message: "진단을 시작했어요" }),
    );
  }

  async getDiagnosis(diagnosisId: string) {
    const diagnosis = this.diagnosesById[diagnosisId];
    if (!diagnosis) {
      return delay(
        fail<DiagnosisDetail>("NOT_FOUND", "진단 결과를 찾을 수 없어요"),
      );
    }

    const polls = this.diagnosisPolls[diagnosisId] || 0;
    if (diagnosis.status === "processing" && polls >= 1) {
      this.diagnosesById[diagnosisId] = {
        ...diagnosis,
        status: "completed",
        processing_time_ms: 1800,
      };
    }
    this.diagnosisPolls[diagnosisId] = polls + 1;

    return delay(ok(this.diagnosesById[diagnosisId]));
  }

  async updateDiagnosisFieldOpinion(
    diagnosisId: string,
    data: { field_opinion_text: string },
  ) {
    const diagnosis = this.diagnosesById[diagnosisId];
    if (!diagnosis) {
      return delay(
        fail<{ id: string; field_opinion_text: string }>(
          "NOT_FOUND",
          "진단 결과를 찾을 수 없어요",
        ),
      );
    }

    this.diagnosesById[diagnosisId] = {
      ...diagnosis,
      field_opinion_text: data.field_opinion_text,
    };

    return delay(
      ok({
        id: diagnosisId,
        field_opinion_text: data.field_opinion_text,
      }),
    );
  }

  async createEstimate(projectId: string, diagnosisId?: string) {
    const estimateId = randomId("e");
    const estimateIds = this.projectEstimateIds[projectId] || [];
    const version = estimateIds.length + 1;
    const created_at = nowIso();

    const lines: StoredEstimate["lines"] = [
      {
        id: randomId("el"),
        sort_order: 1,
        description: diagnosisId ? "AI 추천 자재 반영" : "기본 공사 항목",
        specification: "",
        unit: "set",
        quantity: "1",
        unit_price_snapshot: "120000",
        amount: "120000",
        source: diagnosisId ? "ai" : "manual",
      },
      {
        id: randomId("el"),
        sort_order: 2,
        description: "부자재",
        specification: "",
        unit: "set",
        quantity: "1",
        unit_price_snapshot: "30000",
        amount: "30000",
        source: "manual",
      },
    ];

    const estimate: StoredEstimate = recalcTotals({
      id: estimateId,
      project_id: projectId,
      version,
      status: "draft",
      subtotal: "0",
      vat_amount: "0",
      total_amount: "0",
      created_at,
      lines,
    });

    this.estimatesById[estimateId] = estimate;
    this.projectEstimateIds[projectId] = [...estimateIds, estimateId];

    return delay(
      ok({
        id: estimateId,
        version,
        status: estimate.status,
        total_amount: estimate.total_amount,
        lines: estimate.lines.map((l) => ({
          id: l.id,
          description: l.description,
          quantity: l.quantity,
          unit_price_snapshot: l.unit_price_snapshot,
          amount: l.amount,
        })),
      }),
    );
  }

  async getEstimate(estimateId: string) {
    const estimate = this.estimatesById[estimateId];
    if (!estimate) {
      return delay(
        fail<EstimateDetail>("NOT_FOUND", "견적서를 찾을 수 없어요"),
      );
    }

    return delay(ok<EstimateDetail>(estimate));
  }

  async issueEstimate(estimateId: string) {
    const estimate = this.estimatesById[estimateId];
    if (!estimate) {
      return delay(
        fail<{
          id: string;
          status: string;
          issued_at: string;
          message: string;
        }>("NOT_FOUND", "견적서를 찾을 수 없어요"),
      );
    }

    const issued_at = nowIso();
    this.estimatesById[estimateId] = {
      ...estimate,
      status: "issued",
      issued_at,
    };

    return delay(
      ok({
        id: estimateId,
        status: "issued",
        issued_at,
        message: "발송했어요",
      }),
    );
  }

  async updateEstimateLine(
    estimateId: string,
    lineId: string,
    data: {
      quantity?: string;
      unit_price_snapshot?: string;
      description?: string;
    },
  ) {
    const estimate = this.estimatesById[estimateId];
    if (!estimate) {
      return delay(
        fail<{
          id: string;
          quantity: string;
          unit_price_snapshot: string;
          amount: string;
        }>("NOT_FOUND", "견적서를 찾을 수 없어요"),
      );
    }

    const nextLines = estimate.lines.map((l) => {
      if (l.id !== lineId) return l;
      const quantity = data.quantity ?? l.quantity;
      const unit_price_snapshot =
        data.unit_price_snapshot ?? l.unit_price_snapshot;
      const amount = calcAmount(quantity, unit_price_snapshot);
      return {
        ...l,
        description: data.description ?? l.description,
        quantity,
        unit_price_snapshot,
        amount,
      };
    });

    const next = recalcTotals({ ...estimate, lines: nextLines });
    this.estimatesById[estimateId] = next;
    const updated = next.lines.find((l) => l.id === lineId);

    if (!updated) {
      return delay(
        fail<{
          id: string;
          quantity: string;
          unit_price_snapshot: string;
          amount: string;
        }>("NOT_FOUND", "항목을 찾을 수 없어요"),
      );
    }

    return delay(
      ok({
        id: updated.id,
        quantity: updated.quantity,
        unit_price_snapshot: updated.unit_price_snapshot,
        amount: updated.amount,
      }),
    );
  }

  async addEstimateLine(
    estimateId: string,
    data: {
      description: string;
      specification?: string;
      unit: string;
      quantity: string;
      unit_price_snapshot: string;
    },
  ) {
    const estimate = this.estimatesById[estimateId];
    if (!estimate) {
      return delay(
        fail<{ id: string; description: string; amount: string }>(
          "NOT_FOUND",
          "견적서를 찾을 수 없어요",
        ),
      );
    }

    const id = randomId("el");
    const nextLine = {
      id,
      sort_order: estimate.lines.length + 1,
      description: data.description,
      specification: data.specification,
      unit: data.unit,
      quantity: data.quantity,
      unit_price_snapshot: data.unit_price_snapshot,
      amount: calcAmount(data.quantity, data.unit_price_snapshot),
      source: "manual" as const,
    };

    const next = recalcTotals({
      ...estimate,
      lines: [...estimate.lines, nextLine],
    });
    this.estimatesById[estimateId] = next;

    return delay(
      ok({ id, description: data.description, amount: nextLine.amount }),
    );
  }

  async deleteEstimateLine(estimateId: string, lineId: string) {
    const estimate = this.estimatesById[estimateId];
    if (!estimate) {
      return delay(
        fail<{ message: string }>("NOT_FOUND", "견적서를 찾을 수 없어요"),
      );
    }

    const nextLines = estimate.lines.filter((l) => l.id !== lineId);
    const normalized = nextLines.map((l, idx) => ({
      ...l,
      sort_order: idx + 1,
    }));
    this.estimatesById[estimateId] = recalcTotals({
      ...estimate,
      lines: normalized,
    });

    return delay(ok({ message: "삭제했어요" }));
  }

  async getContracts(projectId: string) {
    const ids = this.projectContractIds[projectId] || [];
    const contracts = ids.map((id) => this.contractsById[id]).filter(Boolean);
    return delay(ok(contracts));
  }

  async getContract(contractId: string) {
    const contract = this.contractsById[contractId];
    if (!contract) {
      return delay(
        fail<ContractDetail>("NOT_FOUND", "계약서를 찾을 수 없어요"),
      );
    }
    return delay(ok(contract));
  }

  async createContract(
    projectId: string,
    data: {
      estimate_id: string;
      start_date?: string;
      expected_end_date?: string;
      notes?: string;
    },
  ) {
    const project = mockDb.get("projects").find((p) => p.id === projectId);
    if (!project) {
      return delay(
        fail<{ id: string; contract_number: string; status: ContractStatus }>(
          "NOT_FOUND",
          "프로젝트를 찾을 수 없어요",
        ),
      );
    }

    const contractId = randomId("c");
    const contract: ContractDetail = {
      id: contractId,
      project_id: projectId,
      estimate_id: data.estimate_id,
      contract_number: `CT-${Date.now()}`,
      contract_amount:
        this.estimatesById[data.estimate_id]?.total_amount || "0",
      status: "draft",
      notes: data.notes,
      created_at: nowIso(),
      start_date: data.start_date,
      expected_end_date: data.expected_end_date,
      project_name: project.name,
      client_name: project.clientName,
    };

    this.contractsById[contractId] = contract;
    this.projectContractIds[projectId] = [
      ...(this.projectContractIds[projectId] || []),
      contractId,
    ];

    return delay(
      ok({
        id: contractId,
        contract_number: contract.contract_number || contractId,
        status: contract.status,
      }),
    );
  }

  async sendContractForSignature(contractId: string) {
    const contract = this.contractsById[contractId];
    if (!contract) {
      return delay(
        fail<{
          id: string;
          status: ContractStatus;
          sent_at: string;
          signature_url: string;
        }>("NOT_FOUND", "계약서를 찾을 수 없어요"),
      );
    }

    const sent_at = nowIso();
    const next: ContractDetail = { ...contract, status: "sent", sent_at };
    this.contractsById[contractId] = next;

    return delay(
      ok({
        id: contractId,
        status: next.status,
        sent_at,
        signature_url: `mock://signature/${contractId}`,
      }),
    );
  }

  async signContract(
    contractId: string,
    _signatureData: string,
    _signerType: "client" | "company",
  ) {
    const contract = this.contractsById[contractId];
    if (!contract) {
      return delay(
        fail<{ id: string; status: ContractStatus; signed_at: string }>(
          "NOT_FOUND",
          "계약서를 찾을 수 없어요",
        ),
      );
    }

    const signed_at = nowIso();
    const next: ContractDetail = { ...contract, status: "signed", signed_at };
    this.contractsById[contractId] = next;
    return delay(ok({ id: contractId, status: next.status, signed_at }));
  }

  async getLaborContracts(projectId: string) {
    return delay(ok(this.laborContractsByProject[projectId] || []));
  }

  async createLaborContract(
    projectId: string,
    data: {
      worker_name: string;
      worker_phone?: string;
      work_date: string;
      work_type?: string;
      daily_rate: string;
      hours_worked?: string;
    },
  ) {
    const id = randomId("lc");
    const item: LaborContractListItem = {
      id,
      worker_name: data.worker_name,
      work_date: data.work_date,
      work_type: data.work_type,
      daily_rate: data.daily_rate,
      status: "draft",
      signed_at: undefined,
    };
    this.laborContractsByProject[projectId] = [
      ...(this.laborContractsByProject[projectId] || []),
      item,
    ];
    return delay(
      ok({ id, worker_name: data.worker_name, status: item.status }),
    );
  }

  async sendLaborContractForSignature(laborContractId: string) {
    return delay(
      ok({
        id: laborContractId,
        status: "sent",
        signature_url: `mock://labor-sign/${laborContractId}`,
      }),
    );
  }

  async getLaborContractsSummary(projectId: string) {
    const items = this.laborContractsByProject[projectId] || [];
    const by_status: Record<LaborContractStatus, number> = {
      draft: 0,
      sent: 0,
      signed: 0,
      paid: 0,
    };
    items.forEach((i) => {
      by_status[i.status] = (by_status[i.status] || 0) + 1;
    });

    return delay(
      ok({
        total_workers: items.length,
        total_amount: "0",
        by_status,
        by_work_type: {},
      }),
    );
  }

  async getProjectPhotoAlbum(projectId: string) {
    const project = mockDb.get("projects").find((p) => p.id === projectId);
    if (!project) {
      return delay(
        fail<ProjectPhotoAlbum>("NOT_FOUND", "프로젝트를 찾을 수 없어요"),
      );
    }

    return delay(
      ok<ProjectPhotoAlbum>({
        project_id: projectId,
        project_name: project.name,
        photos: {
          before: [],
          during: [],
          after: [],
        },
      }),
    );
  }

  async getWarrantyInfo(projectId: string) {
    const warranty_expires_at = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 365,
    ).toISOString();
    const as_requests = this.warrantyRequestsByProject[projectId] || [];
    return delay(
      ok({
        project_id: projectId,
        warranty_expires_at,
        days_remaining: 365,
        is_expired: false,
        as_requests,
      }),
    );
  }

  async createASRequest(
    projectId: string,
    data: { description: string; photos?: string[] },
  ) {
    const req = {
      id: randomId("as"),
      description: data.description,
      status: "received",
      created_at: nowIso(),
    };
    this.warrantyRequestsByProject[projectId] = [
      ...(this.warrantyRequestsByProject[projectId] || []),
      req,
    ];
    return delay(ok({ id: req.id, status: req.status, message: "접수했어요" }));
  }

  async completeProject(projectId: string) {
    const completed_at = nowIso();
    const warranty_expires_at = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 365,
    ).toISOString();
    mockDb.update("projects", (prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: "completed" } : p)),
    );
    return delay(
      ok({
        id: projectId,
        status: "completed",
        completed_at,
        warranty_expires_at,
      }),
    );
  }

  async getUtilities(_projectId: string) {
    this.ensureUtilities(_projectId);
    return delay(ok(this.utilitiesByProject[_projectId]));
  }

  async updateUtilityStatus(
    _projectId: string,
    _utilityId: string,
    _data: {
      status?: "pending" | "completed";
      doc_status?: "pending" | "submitted";
    },
  ) {
    this.ensureUtilities(_projectId);
    const utilities = this.utilitiesByProject[_projectId];
    const item = utilities.items.find((entry) => entry.id === _utilityId);
    if (item) {
      const nextStatus = _data.status ?? item.status;
      const nextDocStatus = _data.doc_status ?? item.doc_status;
      if (nextStatus !== item.status) {
        utilities.timeline.unshift({
          id: randomId("t"),
          date: nowIso(),
          message: `${item.month} ${item.type}요금 상태가 ${nextStatus === "completed" ? "완료" : "대기"}로 변경되었습니다.`,
        });
      }
      if (nextDocStatus !== item.doc_status) {
        utilities.timeline.unshift({
          id: randomId("t"),
          date: nowIso(),
          message: `${item.month} ${item.type}요금 공문 상태가 ${nextDocStatus === "submitted" ? "발송 완료" : "발송 대기"}로 변경되었습니다.`,
        });
      }
      item.status = nextStatus;
      item.doc_status = nextDocStatus;
    }
    return delay(ok({ id: _utilityId }));
  }

  async getTaxInvoice(_projectId: string) {
    this.ensureTaxInvoices(_projectId);
    return delay(ok(this.taxInvoicesByProject[_projectId]));
  }

  async issueTaxInvoice(_projectId: string) {
    this.ensureTaxInvoices(_projectId);
    const state = this.taxInvoicesByProject[_projectId];
    const failed = state.items.find((item) => item.status === "failed");
    if (failed) {
      failed.status = "published";
      failed.failure_reason = undefined;
      state.summary.failed_count = Math.max(0, state.summary.failed_count - 1);
      state.summary.success_count += 1;
    } else {
      const newAmount = 1000000;
      state.items.unshift({
        id: randomId("ti"),
        type: "매출",
        amount: newAmount,
        status: "published",
        date: nowIso().slice(0, 10),
        customer: "ABC 건설",
      });
      state.summary.success_count += 1;
      state.summary.total_amount += newAmount;
    }
    return delay(ok({ status: "published" as const, message: "발행했어요" }));
  }

  async getPartners(_params?: { search?: string; status?: string }) {
    return delay(
      ok([
        {
          id: "p_1",
          name: "(주)가나건설",
          biz_no: "123-45-67890",
          owner: "홍길동",
          license: "실내건축공사업",
          is_female_owned: true,
          status: "active" as const,
        },
        {
          id: "p_2",
          name: "다라마디자인",
          biz_no: "987-65-43210",
          owner: "김철수",
          license: "미보유",
          is_female_owned: false,
          status: "active" as const,
        },
      ]),
    );
  }

  async getLaborOverview() {
    return delay(
      ok({
        summary: {
          active_workers: 12,
          pending_paystubs: 5,
          unsigned_contracts: 2,
        },
        workers: [
          {
            id: "w_1",
            name: "김철수",
            role: "목수",
            status: "active" as const,
            contract_status: "signed" as const,
            last_work_date: "2026-01-21",
          },
          {
            id: "w_2",
            name: "이영희",
            role: "전기",
            status: "active" as const,
            contract_status: "pending" as const,
            last_work_date: "2026-01-20",
          },
        ],
      }),
    );
  }

  async getBillingOverview() {
    return delay(
      ok({
        plan: "Pro Plan",
        interval: "monthly" as const,
        next_billing_at: "2026-02-21",
        seats_used: 5,
        seats_total: 10,
        payment_method: {
          brand: "현대카드",
          last4: "1234",
          expires: "12/28",
        },
        history: [
          {
            id: "h1",
            date: "2026.01.21",
            description: "Pro Plan 월간 구독 (5석)",
            amount: 55000,
            status: "paid" as const,
          },
        ],
      }),
    );
  }

  async requestWorkerAccess(phone: string) {
    const requestId = `req_${phone}_${randomId("r")}`;
    this.workerAccessRequests[requestId] = phone;
    return delay(ok({ request_id: requestId }));
  }

  async verifyWorkerAccess(_requestId: string, _code: string) {
    const workerId = this.workerAccessRequests[_requestId]
      ? "worker_1"
      : "worker_1";
    return delay(ok({ worker_id: workerId }));
  }

  async createWorkerInvitation(data: {
    name: string;
    phone: string;
    address?: string;
    bank_name?: string;
    account_number?: string;
    residence_confirmed?: boolean;
    has_id_card: boolean;
    has_safety_cert: boolean;
  }) {
    const normalizedPhone = data.phone.replace(/\D/g, "");
    if (!data.name.trim() || normalizedPhone.length < 10) {
      return delay(
        fail<{
          worker_id: string;
          invite_token: string;
          invite_link: string;
          registration_status: "invited";
        }>("INVALID_INPUT", "이름과 휴대폰 번호를 확인해 주세요"),
      );
    }

    const workerId = randomId("worker");
    const inviteToken = randomId("invite");
    this.workerInvitations[inviteToken] = {
      worker_id: workerId,
      name: data.name.trim(),
      phone: normalizedPhone,
      created_at: nowIso(),
    };

    return delay(
      ok({
        worker_id: workerId,
        invite_token: inviteToken,
        invite_link: `/worker/entry?invite=${encodeURIComponent(inviteToken)}&phone=${encodeURIComponent(normalizedPhone)}`,
        registration_status: "invited" as const,
      }),
    );
  }

  async verifyWorkerInvite(inviteToken: string) {
    const target = this.workerInvitations[inviteToken];
    if (!target) {
      return delay(
        fail<{ worker_id: string }>("INVALID_INVITE", "초대 링크가 유효하지 않아요"),
      );
    }

    return delay(ok({ worker_id: target.worker_id }));
  }

  async requestPasswordResetOtp(loginId: string, phone: string) {
    const normalizedLoginId = loginId.trim().toLowerCase();
    const normalized = phone.replace(/\D/g, "");
    if (!normalizedLoginId || normalized.length < 10) {
      return delay(
        fail<{ request_id: string; expires_in_sec: number }>(
          "INVALID_INPUT",
          "아이디와 휴대폰 번호를 확인해 주세요",
        ),
      );
    }

    const matchedUser = this.getUsers().find((user) => {
      const userPhone = (user.phone || "").replace(/\D/g, "");
      return user.email.toLowerCase() === normalizedLoginId && userPhone === normalized;
    });
    if (!matchedUser) {
      return delay(
        fail<{ request_id: string; expires_in_sec: number }>(
          "USER_NOT_FOUND",
          "아이디와 휴대폰 번호가 일치하지 않아요",
        ),
      );
    }

    const requestId = `pwreq_${randomId("r")}`;
    const mockCode = "123456";
    this.passwordResetRequests[requestId] = {
      login_id: normalizedLoginId,
      phone: normalized,
      code: mockCode,
      expires_at: Date.now() + 1000 * 60 * 3,
    };

    return delay(
      ok({
        request_id: requestId,
        expires_in_sec: 180,
        channel: "alimtalk",
        mock_otp: mockCode,
      }),
    );
  }

  async verifyPasswordResetOtp(requestId: string, code: string) {
    const request = this.passwordResetRequests[requestId];
    if (!request) {
      return delay(
        fail<{ verification_id: string }>(
          "REQUEST_NOT_FOUND",
          "인증 요청을 찾을 수 없어요",
        ),
      );
    }

    if (Date.now() > request.expires_at) {
      delete this.passwordResetRequests[requestId];
      return delay(
        fail<{ verification_id: string }>(
          "OTP_EXPIRED",
          "인증번호가 만료되었어요",
        ),
      );
    }

    if (request.code !== code.trim()) {
      return delay(
        fail<{ verification_id: string }>(
          "INVALID_OTP",
          "인증번호가 올바르지 않아요",
        ),
      );
    }

    const verificationId = `pwver_${randomId("v")}`;
    this.passwordResetVerifications[verificationId] = { phone: request.phone };
    delete this.passwordResetRequests[requestId];

    return delay(ok({ verification_id: verificationId }));
  }

  async resetPasswordWithOtp(verificationId: string, newPassword: string) {
    if (!this.passwordResetVerifications[verificationId]) {
      return delay(
        fail<{ success: boolean }>(
          "VERIFICATION_NOT_FOUND",
          "비밀번호 재설정 검증 정보가 없어요",
        ),
      );
    }

    if (newPassword.trim().length < 8) {
      return delay(
        fail<{ success: boolean }>(
          "WEAK_PASSWORD",
          "비밀번호는 8자 이상이어야 해요",
        ),
      );
    }

    delete this.passwordResetVerifications[verificationId];
    return delay(ok({ success: true }));
  }

  async getWorkerContracts(workerId: string) {
    this.ensureWorkerContracts(workerId);
    return delay(ok(this.workerContractsByWorker[workerId]));
  }

  async getWorkerContract(contractId: string) {
    this.ensureWorkerContract(contractId);
    return delay(ok(this.workerContractsById[contractId]));
  }

  async signWorkerContract(contractId: string, _signatureData: string) {
    this.ensureWorkerContract(contractId);
    this.workerContractsById[contractId].status = "signed";
    for (const contracts of Object.values(this.workerContractsByWorker)) {
      const target = contracts.find((contract) => contract.id === contractId);
      if (target) {
        target.status = "signed";
      }
    }
    return delay(
      ok({ id: contractId, status: "signed" as const, signed_at: nowIso() }),
    );
  }

  async getWorkerPaystubs(_workerId: string) {
    this.ensureWorkerPaystubs(_workerId);
    return delay(ok(this.workerPaystubsByWorker[_workerId]));
  }

  async getWorkerPaystub(_workerId: string, paystubId: string) {
    this.ensureWorkerPaystubs(_workerId);
    const detail = this.workerPaystubDetails[_workerId]?.[paystubId];
    return delay(ok(detail));
  }

  async ackWorkerPaystub(_workerId: string, _paystubId: string) {
    this.ensureWorkerPaystubs(_workerId);
    const list = this.workerPaystubsByWorker[_workerId];
    const item = list.find((entry) => entry.id === _paystubId);
    if (item) {
      item.status = "confirmed";
    }
    const detail = this.workerPaystubDetails[_workerId]?.[_paystubId];
    if (detail) {
      detail.status = "confirmed";
    }
    return delay(ok({ received_at: nowIso() }));
  }

  async getWorkerProfile(workerId: string) {
    return delay(
      ok({
        id: workerId,
        name: "홍길동",
        role: "목공 반장",
        documents: [
          { id: "doc_1", name: "신분증", status: "submitted" as const },
          { id: "doc_2", name: "안전교육이수증", status: "submitted" as const },
        ],
      }),
    );
  }

  async getNotifications() {
    this.ensureNotifications();
    return delay(ok(this.notifications));
  }

  async markNotificationRead(notificationId: string) {
    this.ensureNotifications();
    const target = this.notifications.find(
      (item) => item.id === notificationId,
    );
    if (target) target.read = true;
    return delay(ok({ id: notificationId, read: true }));
  }

  async getConstructionReports(projectId: string) {
    const reports = this.constructionReportsByProject[projectId] || [
      {
        id: "cr_start_1",
        project_id: projectId,
        report_type: "start" as const,
        report_number: "SCR-20260120-abc123",
        status: "approved" as const,
        construction_name: "논현동 주택 방수공사",
        site_address: "서울특별시 강남구 논현동 123-45",
        start_date: "2026-01-22",
        expected_end_date: "2026-02-22",
        supervisor_name: "김현장",
        supervisor_phone: "010-1234-5678",
        notes: "외벽 및 옥상 방수 공사",
        created_at: "2026-01-20T09:00:00Z",
        submitted_at: "2026-01-20T10:00:00Z",
        approved_at: "2026-01-20T14:00:00Z",
      },
      {
        id: "cr_comp_1",
        project_id: projectId,
        report_type: "completion" as const,
        report_number: "CCR-20260225-abc123",
        status: "draft" as const,
        construction_name: "논현동 주택 방수공사",
        site_address: "서울특별시 강남구 논현동 123-45",
        start_date: "2026-01-22",
        expected_end_date: "2026-02-22",
        actual_end_date: "2026-02-25",
        final_amount: "12500000",
        defect_warranty_period: 36,
        supervisor_name: "김현장",
        supervisor_phone: "010-1234-5678",
        notes: "방수 공사 완료. 누수 테스트 통과",
        created_at: "2026-02-25T16:00:00Z",
      },
    ];

    this.constructionReportsByProject[projectId] = reports;
    return delay(ok(reports));
  }

  async getConstructionReport(reportId: string) {
    for (const reports of Object.values(this.constructionReportsByProject)) {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        return delay(ok(report));
      }
    }

    return delay(
      fail<{
        id: string;
        project_id: string;
        report_type: "start" | "completion";
        report_number?: string;
        status: "draft" | "submitted" | "approved" | "rejected";
        construction_name?: string;
        site_address?: string;
        start_date?: string;
        expected_end_date?: string;
        supervisor_name?: string;
        supervisor_phone?: string;
        actual_end_date?: string;
        final_amount?: string;
        defect_warranty_period?: number;
        notes?: string;
        created_at: string;
        submitted_at?: string;
        approved_at?: string;
      }>("NOT_FOUND", "보고서를 찾을 수 없어요"),
    );
  }

  async getPhotoAlbums(projectId: string) {
    const project = mockDb.get("projects").find((p) => p.id === projectId);
    if (!project) {
      return delay(
        fail<
          Array<{
            id: string;
            project_id: string;
            name: string;
            description?: string;
            layout: "three_column" | "four_column";
            status: "draft" | "published";
            photo_count: number;
            created_at: string;
            updated_at: string;
          }>
        >("NOT_FOUND", "프로젝트를 찾을 수 없어요"),
      );
    }

    const albums = [
      {
        id: "album_1",
        project_id: projectId,
        name: "시공 전 현황",
        description: "착공 전 초기 상태 사진 모음",
        layout: "three_column" as const,
        status: "published" as const,
        photo_count: 12,
        created_at: "2026-01-15T09:00:00Z",
        updated_at: "2026-01-15T09:30:00Z",
      },
      {
        id: "album_2",
        project_id: projectId,
        name: "시공 중 진행 상황",
        description: "공사 진행 과정 기록",
        layout: "four_column" as const,
        status: "draft" as const,
        photo_count: 24,
        created_at: "2026-01-20T14:00:00Z",
        updated_at: "2026-01-22T16:00:00Z",
      },
      {
        id: "album_3",
        project_id: projectId,
        name: "완공 사진",
        description: "최종 완료 상태",
        layout: "three_column" as const,
        status: "draft" as const,
        photo_count: 8,
        created_at: "2026-01-25T10:00:00Z",
        updated_at: "2026-01-25T11:00:00Z",
      },
    ];

    return delay(ok(albums));
  }

  async createDailyReport(
    projectId: string,
    data: {
      work_date: string;
      weather?: string;
      temperature?: string;
      work_description: string;
      tomorrow_plan?: string;
      photos?: string[];
    },
  ) {
    const reportId = randomId("dr");
    const report = {
      id: reportId,
      project_id: projectId,
      work_date: data.work_date,
      weather: data.weather,
      temperature: data.temperature,
      work_description: data.work_description,
      tomorrow_plan: data.tomorrow_plan,
      photo_count: data.photos?.length ?? 0,
      created_at: nowIso(),
    };

    this.dailyReportsByProject[projectId] = [
      report,
      ...(this.dailyReportsByProject[projectId] || []),
    ];

    return delay(ok(report));
  }

  async getDailyReports(projectId: string) {
    if (!this.dailyReportsByProject[projectId]) {
      this.dailyReportsByProject[projectId] = [
        {
          id: randomId("dr"),
          project_id: projectId,
          work_date: "2026-02-01",
          weather: "sunny",
          temperature: "8°C",
          work_description: "균열 보수 및 방수 프라이머 도포",
          tomorrow_plan: "우레탄 1차 도포",
          photo_count: 6,
          created_at: "2026-02-01T17:00:00Z",
        },
      ];
    }

    return delay(ok(this.dailyReportsByProject[projectId]));
  }

  async searchRAG(query: string, limit: number = 10) {
    const normalized = query.trim().toLowerCase();
    const catalog = [
      { id: "rag_1", description: "우레탄 방수 보수", specification: "2회 도포", unit: "m2", unit_price: 35000, confidence: 0.92 },
      { id: "rag_2", description: "실리콘 코킹 보수", specification: "중성 실란트", unit: "m", unit_price: 12000, confidence: 0.88 },
      { id: "rag_3", description: "균열 보강 메쉬 시공", specification: "유리섬유 메쉬", unit: "m2", unit_price: 18000, confidence: 0.84 },
    ];

    const filtered = normalized
      ? catalog.filter((item) =>
          `${item.description} ${item.specification}`.toLowerCase().includes(normalized),
        )
      : catalog;

    return delay(ok(filtered.slice(0, limit)));
  }

  async getPhotoAlbum(albumId: string) {
    const mockAlbums: Record<
      string,
      {
        id: string;
        project_id: string;
        name: string;
        description?: string;
        layout: "three_column" | "four_column";
        status: "draft" | "published";
        photos: Array<{
          id: string;
          album_photo_id: string;
          storage_path: string;
          caption?: string;
          caption_override?: string;
          photo_type: PhotoType;
          taken_at?: string;
          sort_order: number;
        }>;
        created_at: string;
        updated_at: string;
      }
    > = {
      album_1: {
        id: "album_1",
        project_id: "p_1",
        name: "시공 전 현황",
        description: "착공 전 초기 상태 사진 모음",
        layout: "three_column",
        status: "published",
        photos: Array.from({ length: 12 }, (_, i) => ({
          id: `photo_${i + 1}`,
          album_photo_id: `ap_${i + 1}`,
          storage_path: `https://picsum.photos/seed/${albumId}_${i + 1}/800/600`,
          caption: `시공 전 사진 ${i + 1}`,
          photo_type: "before" as PhotoType,
          taken_at: "2026-01-15T09:00:00Z",
          sort_order: i + 1,
        })),
        created_at: "2026-01-15T09:00:00Z",
        updated_at: "2026-01-15T09:30:00Z",
      },
      album_2: {
        id: "album_2",
        project_id: "p_1",
        name: "시공 중 진행 상황",
        description: "공사 진행 과정 기록",
        layout: "four_column",
        status: "draft",
        photos: Array.from({ length: 24 }, (_, i) => ({
          id: `photo_${i + 1}`,
          album_photo_id: `ap_${i + 1}`,
          storage_path: `https://picsum.photos/seed/${albumId}_${i + 1}/800/600`,
          caption: `시공 중 사진 ${i + 1}`,
          photo_type: "during" as PhotoType,
          taken_at: "2026-01-20T14:00:00Z",
          sort_order: i + 1,
        })),
        created_at: "2026-01-20T14:00:00Z",
        updated_at: "2026-01-22T16:00:00Z",
      },
      album_3: {
        id: "album_3",
        project_id: "p_1",
        name: "완공 사진",
        description: "최종 완료 상태",
        layout: "three_column",
        status: "draft",
        photos: Array.from({ length: 8 }, (_, i) => ({
          id: `photo_${i + 1}`,
          album_photo_id: `ap_${i + 1}`,
          storage_path: `https://picsum.photos/seed/${albumId}_${i + 1}/800/600`,
          caption: `완공 사진 ${i + 1}`,
          photo_type: "after" as PhotoType,
          taken_at: "2026-01-25T10:00:00Z",
          sort_order: i + 1,
        })),
        created_at: "2026-01-25T10:00:00Z",
        updated_at: "2026-01-25T11:00:00Z",
      },
    };

    const album = mockAlbums[albumId];
    if (!album) {
      return delay(
        fail<typeof album>("NOT_FOUND", "앨범을 찾을 수 없어요"),
      );
    }

    return delay(ok(album));
  }

  async exportAlbumPdf(_albumId: string) {
    const sample_file_path = MOBILE_MOCK_EXPORT_SAMPLE_FILES.albumPdf;
    return delay(
      ok({
        pdf_url: sample_file_path,
        sample_file_path,
        message: "PDF를 생성했어요",
      }),
    );
  }

  async exportConstructionReportPdf(reportId: string) {
    const reportResponse = await this.getConstructionReport(reportId);
    if (!reportResponse.success || !reportResponse.data) {
      return delay(fail<any>("NOT_FOUND", "보고서를 찾을 수 없어요"));
    }

    const sample_file_path =
      reportResponse.data.report_type === "start"
        ? MOBILE_MOCK_EXPORT_SAMPLE_FILES.startReportPdf
        : MOBILE_MOCK_EXPORT_SAMPLE_FILES.completionReportPdf;

    return delay(
      ok({
        report_id: reportId,
        pdf_url: sample_file_path,
        sample_file_path,
      }),
    );
  }

  private ensureEstimationCategory(seasonId: number): SeasonCategoryInfo {
    const existing = this.seasonCategories.find(
      (row) =>
        row.season_id === seasonId &&
        row.purpose === "estimation" &&
        row.name === "적산 자료",
    );
    if (existing) return existing;

    const created: SeasonCategoryInfo = {
      id: nextSnowflake(),
      season_id: seasonId,
      name: "적산 자료",
      purpose: "estimation",
      is_enabled: true,
      sort_order: 100,
      created_at: nowIso(),
    };
    this.seasonCategories = [...this.seasonCategories, created];
    return created;
  }

  async getSeasons(): Promise<APIResponse<SeasonInfo[]>> {
    return delay(ok([...this.seasons]));
  }

  async getActiveSeason(): Promise<APIResponse<SeasonInfo>> {
    const active = this.seasons.find((s) => s.is_active) || this.seasons[0];
    if (!active) return delay(fail("NOT_FOUND", "활성 시즌이 없습니다"));
    return delay(ok(active));
  }

  async createSeason(data: { name: string; is_active?: boolean }): Promise<APIResponse<SeasonInfo>> {
    const id = nextSnowflake();
    const season: SeasonInfo = { id, name: data.name, is_active: !!data.is_active, created_at: nowIso() };
    if (season.is_active) this.seasons = this.seasons.map((s) => ({ ...s, is_active: false }));
    this.seasons = [season, ...this.seasons];
    this.ensureEstimationCategory(id);
    return delay(ok(season));
  }

  async updateSeason(seasonId: number, data: { is_active: boolean }): Promise<APIResponse<SeasonInfo>> {
    const target = this.seasons.find((s) => s.id === seasonId);
    if (!target) return delay(fail("NOT_FOUND", "시즌을 찾을 수 없습니다"));
    this.seasons = this.seasons.map((s) => ({ ...s, is_active: data.is_active && s.id === seasonId }));
    this.ensureEstimationCategory(seasonId);
    return delay(ok(this.seasons.find((s) => s.id === seasonId)!));
  }

  async getAdminSeasonCategories(params?: {
    season_id?: number;
    purpose?: SeasonCategoryPurpose;
    is_enabled?: boolean;
  }): Promise<APIResponse<SeasonCategoryInfo[]>> {
    if (params?.season_id) {
      this.ensureEstimationCategory(params.season_id);
    }
    let rows = [...this.seasonCategories];
    if (params?.season_id) {
      rows = rows.filter((row) => row.season_id === params.season_id);
    }
    if (params?.purpose) {
      rows = rows.filter((row) => row.purpose === params.purpose);
    }
    if (typeof params?.is_enabled === "boolean") {
      rows = rows.filter((row) => row.is_enabled === params.is_enabled);
    }
    return delay(ok(rows));
  }

  async createAdminSeasonCategory(data: {
    season_id: number;
    name: string;
    purpose?: SeasonCategoryPurpose;
    is_enabled?: boolean;
    sort_order?: number;
  }): Promise<APIResponse<SeasonCategoryInfo>> {
    const exists = this.seasonCategories.find(
      (row) => row.season_id === data.season_id && row.name === data.name,
    );
    if (exists) return delay(fail("CONFLICT", "이미 존재하는 카테고리예요"));

    const row: SeasonCategoryInfo = {
      id: nextSnowflake(),
      season_id: data.season_id,
      name: data.name,
      purpose: data.purpose || "estimation",
      is_enabled: data.is_enabled ?? true,
      sort_order: data.sort_order ?? 100,
      created_at: nowIso(),
    };
    this.seasonCategories = [...this.seasonCategories, row];
    return delay(ok(row));
  }

  async updateAdminSeasonCategory(
    categoryId: number,
    data: { name?: string; is_enabled?: boolean; sort_order?: number },
  ): Promise<APIResponse<SeasonCategoryInfo>> {
    const idx = this.seasonCategories.findIndex((row) => row.id === categoryId);
    if (idx === -1) return delay(fail("NOT_FOUND", "카테고리를 찾을 수 없습니다"));
    const next = { ...this.seasonCategories[idx], ...data };
    this.seasonCategories[idx] = next;
    return delay(ok(next));
  }

  async getAdminDocuments(params?: {
    season_id?: number;
    category_id?: number;
    purpose?: SeasonCategoryPurpose;
  }): Promise<APIResponse<SeasonDocumentInfo[]>> {
    if (params?.season_id) {
      this.ensureEstimationCategory(params.season_id);
    }
    let rows = [...this.seasonDocuments];
    if (params?.season_id) {
      rows = rows.filter((row) => row.season_id === params.season_id);
    }
    if (params?.category_id) {
      const category = this.seasonCategories.find((row) => row.id === params.category_id);
      if (!category) return delay(fail("NOT_FOUND", "카테고리를 찾을 수 없습니다"));
      rows = rows.filter(
        (row) =>
          row.season_id === category.season_id &&
          row.category === category.name,
      );
    }
    if (params?.purpose) {
      rows = rows.filter((row) => {
        const category = this.seasonCategories.find(
          (c) => c.season_id === row.season_id && c.name === row.category,
        );
        return category?.purpose === params.purpose;
      });
    }
    rows = rows.map((row) => {
      const category = this.seasonCategories.find(
        (c) => c.season_id === row.season_id && c.name === row.category,
      );
      return {
        ...row,
        category_id: category?.id,
        purpose: category?.purpose,
      };
    });
    return delay(ok(rows));
  }

  async createAdminDocument(data: {
    season_id: number;
    category_id?: number;
    category?: string;
    title: string;
    file_name: string;
  }): Promise<APIResponse<SeasonDocumentInfo>> {
    const id = nextSnowflake();
    let category = data.category?.trim();
    let categoryId = data.category_id;

    if (categoryId) {
      const row = this.seasonCategories.find((item) => item.id === categoryId);
      if (!row) return delay(fail("NOT_FOUND", "카테고리를 찾을 수 없습니다"));
      category = row.name;
    } else if (!category) {
      const defaultCategory = this.ensureEstimationCategory(data.season_id);
      category = defaultCategory.name;
      categoryId = defaultCategory.id;
    } else {
      const matched = this.seasonCategories.find(
        (row) => row.season_id === data.season_id && row.name === category,
      );
      if (matched) {
        categoryId = matched.id;
      }
    }

    const mappedCategory = this.seasonCategories.find((row) => row.id === categoryId);
    const doc: SeasonDocumentInfo = {
      id,
      season_id: data.season_id,
      category_id: mappedCategory?.id,
      purpose: mappedCategory?.purpose,
      category: category || "적산 자료",
      title: data.title,
      file_url: `pricebooks/${data.season_id}/${data.file_name}`,
      version_hash: randomId("vh"),
      status: "queued",
      uploaded_at: nowIso(),
      upload_url: `/api/v1/admin/documents/${id}/upload`,
    };
    this.seasonDocuments = [doc, ...this.seasonDocuments];
    return delay(ok(doc));
  }

  async ingestAdminDocument(documentId: number): Promise<APIResponse<SeasonDocumentStatusInfo>> {
    const idx = this.seasonDocuments.findIndex((d) => d.id === documentId);
    if (idx === -1) return delay(fail("NOT_FOUND", "문서를 찾을 수 없습니다"));
    this.seasonDocuments[idx] = { ...this.seasonDocuments[idx], status: "done" };
    return delay(ok({
      id: documentId,
      status: "done",
      uploaded_at: this.seasonDocuments[idx].uploaded_at,
      trace_chunk_count: 2,
      cost_item_count: 3,
    }));
  }

  async getAdminDocumentStatus(documentId: number): Promise<APIResponse<SeasonDocumentStatusInfo>> {
    const doc = this.seasonDocuments.find((d) => d.id === documentId);
    if (!doc) return delay(fail("NOT_FOUND", "문서를 찾을 수 없습니다"));
    return delay(ok({
      id: doc.id,
      status: doc.status,
      uploaded_at: doc.uploaded_at,
      trace_chunk_count: doc.status === "done" ? 2 : 0,
      cost_item_count: doc.status === "done" ? 3 : 0,
    }));
  }

  async listCases(): Promise<APIResponse<DiagnosisCase[]>> {
    return delay(ok([...this.diagnosisCases].sort((a, b) => b.id - a.id)));
  }

  async createCase(data?: { season_id?: number }): Promise<APIResponse<DiagnosisCase>> {
    const season =
      (data?.season_id ? this.seasons.find((s) => s.id === data.season_id) : undefined) ||
      this.seasons.find((s) => s.is_active) ||
      this.seasons[0];
    if (!season) return delay(fail("NOT_FOUND", "시즌이 없습니다"));
    const caseId = nextSnowflake();
    const row: DiagnosisCase = {
      id: caseId,
      user_id: "u_site_manager",
      season_id: season.id,
      status: "draft",
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.diagnosisCases = [row, ...this.diagnosisCases];
    this.caseImagesByCaseId[caseId] = [];
    return delay(ok(row));
  }

  async getCase(caseId: number): Promise<APIResponse<DiagnosisCase>> {
    const item = this.diagnosisCases.find((c) => c.id === caseId);
    if (!item) return delay(fail("NOT_FOUND", "케이스를 찾을 수 없습니다"));
    return delay(ok(item));
  }

  async getCaseImages(caseId: number): Promise<APIResponse<DiagnosisCaseImage[]>> {
    return delay(ok(this.caseImagesByCaseId[caseId] || []));
  }

  async uploadCaseImage(
    caseId: number,
    file: File,
    metaJson?: Record<string, unknown>,
  ): Promise<APIResponse<DiagnosisCaseImage>> {
    const target = this.diagnosisCases.find((c) => c.id === caseId);
    if (!target) return delay(fail("NOT_FOUND", "케이스를 찾을 수 없습니다"));
    const item: DiagnosisCaseImage = {
      id: nextSnowflake(),
      case_id: caseId,
      file_url: URL.createObjectURL(file),
      meta_json: metaJson,
      created_at: nowIso(),
    };
    this.caseImagesByCaseId[caseId] = [...(this.caseImagesByCaseId[caseId] || []), item];
    return delay(ok(item));
  }

  async runCaseVision(
    caseId: number,
    _data?: { extra_context?: string },
  ): Promise<APIResponse<VisionResultDetail>> {
    const target = this.diagnosisCases.find((c) => c.id === caseId);
    if (!target) return delay(fail("NOT_FOUND", "케이스를 찾을 수 없습니다"));
    const vision: VisionResultDetail = {
      id: nextSnowflake(),
      case_id: caseId,
      model: "gemini-3.0-flash",
      result_json: {
        findings: [
          {
            location: "옥상 배수구 인접부",
            observed: "균열 및 변색이 확인됨",
            hypothesis: "방수층 노후화 가능성",
            severity: "med",
            next_checks: ["우천 시 재촬영", "배관 관통부 추가 촬영"],
          },
        ],
        work_items: [{ name: "우레탄 방수 보수", required: true, rationale: "균열 구간 보강" }],
        materials: [
          { name: "우레탄 방수제", spec_hint: "2회 도포", unit_hint: "m2", qty_hint: "20" },
          { name: "실리콘 실란트", spec_hint: "중성", unit_hint: "ea", qty_hint: "4" },
        ],
        confidence: 0.75,
        questions_for_user: ["누수 발생 위치를 더 알려주세요."],
      },
      confidence: 0.75,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.visionByCaseId[caseId] = vision;
    this.diagnosisCases = this.diagnosisCases.map((c) =>
      c.id === caseId ? { ...c, status: "vision_ready", updated_at: nowIso() } : c,
    );
    return delay(ok(vision));
  }

  async updateCaseVision(
    caseId: number,
    data: { result_json: VisionResultDetail["result_json"]; confidence?: number },
  ): Promise<APIResponse<VisionResultDetail>> {
    const prev = this.visionByCaseId[caseId];
    if (!prev) return delay(fail("NOT_FOUND", "진단 결과가 없습니다"));
    const updated: VisionResultDetail = {
      ...prev,
      result_json: data.result_json,
      confidence: data.confidence ?? prev.confidence,
      updated_at: nowIso(),
    };
    this.visionByCaseId[caseId] = updated;
    return delay(ok(updated));
  }

  async createCaseEstimate(caseId: number): Promise<APIResponse<DiagnosisCaseEstimate>> {
    const target = this.diagnosisCases.find((c) => c.id === caseId);
    if (!target) return delay(fail("NOT_FOUND", "케이스를 찾을 수 없습니다"));
    const season = this.seasons.find((s) => s.id === target.season_id);
    const estimate: DiagnosisCaseEstimate = {
      id: nextSnowflake(),
      case_id: caseId,
      version: 1,
      items: [
        {
          work: "work",
          item_name: "우레탄 도막 방수",
          spec: "2회 도포",
          unit: "m2",
          quantity: 20,
          unit_price: 35000,
          amount: 700000,
          optional: false,
          evidence: [
            {
              doc_title: "종합적산정보 공통",
              season_name: season?.name || "2026H1",
              page: 11,
              table_id: "T-11",
              row_id: "R-07",
              row_text: "우레탄 도막 방수 2회 도포 m2 35,000",
            },
          ],
        },
      ],
      totals: {
        subtotal: 700000,
        vat_amount: 70000,
        total_amount: 770000,
      },
      version_hash_snapshot: randomId("vh"),
      created_at: nowIso(),
    };
    this.estimateByCaseId[caseId] = estimate;
    this.diagnosisCases = this.diagnosisCases.map((c) =>
      c.id === caseId ? { ...c, status: "estimated", updated_at: nowIso() } : c,
    );
    return delay(ok(estimate));
  }

  async getCaseEstimate(caseId: number): Promise<APIResponse<DiagnosisCaseEstimate>> {
    const estimate = this.estimateByCaseId[caseId];
    if (!estimate) return delay(fail("NOT_FOUND", "견적 결과가 없습니다"));
    return delay(ok(estimate));
  }

  async downloadCaseEstimateCsv(caseId: number): Promise<Blob> {
    const estimate = this.estimateByCaseId[caseId];
    const header = "공종,품목명,규격,단위,수량,단가,금액,근거\n";
    const lines =
      estimate?.items
        .map((line: any) => {
          const ev = line.evidence[0];
          return `${line.work || ""},${line.item_name},${line.spec || ""},${line.unit},${line.quantity},${line.unit_price},${line.amount},${ev.doc_title}/p.${ev.page}/${ev.table_id}/${ev.row_id}`;
        })
        .join("\n") || "";
    return new Blob([header + lines], { type: "text/csv;charset=utf-8;" });
  }

  async downloadCaseEstimateXlsx(caseId: number): Promise<Blob> {
    const estimate = this.estimateByCaseId[caseId];
    const payload = JSON.stringify(estimate ?? {}, null, 2);
    return new Blob([payload], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  async uploadWorkerDocument(
    _workerId: string,
    documentId: string,
    file: File,
  ) {
    return delay(
      ok({
        id: documentId,
        status: "submitted",
        file_name: file.name,
      })
    );
  }

  async sendAlimTalk(payload: { phone: string; template_code: string; variables: Record<string, string> }) {
    console.log("[MockAPI] sendAlimTalk:", payload);
    return delay(ok({ message_id: `mock_alimtalk_${Date.now()}`, success: true, message: "Mock 알림톡 발송" }));
  }

  async getAlimTalkStatus(messageId: string) {
    return delay(ok({ message_id: messageId, status: "delivered" }));
  }

  async saveConsentRecords(payload: { records: Array<{ consent_type: string; consented: boolean }>; invite_token?: string }) {
    console.log("[MockAPI] saveConsentRecords:", payload);
    return delay(ok(payload.records.map((r, i) => ({ id: i + 1, consent_type: r.consent_type, consented: r.consented, consented_at: nowIso() }))));
  }
}

export const mockApiClient = new MockAPIClient();
