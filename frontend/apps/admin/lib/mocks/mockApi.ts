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
} from "@sigongon/types";
import { mockDb, type Project, type User, type Tenant, type Invitation, type InvitationStatus } from "./db";

const DELAY = 200;

const delay = <T>(data: T): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), DELAY));
};

const nowIso = () => new Date().toISOString();

const randomId = (prefix: string) => {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
};

// Mock JWT 생성 함수 (middleware에서 파싱 가능한 형태)
function createMockJwt(payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodeBase64Url = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerPart = encodeBase64Url(header);
  const payloadPart = encodeBase64Url(payload);
  const signature = "mock_signature"; // Mock이므로 실제 서명 불필요

  return `${headerPart}.${payloadPart}.${signature}`;
}

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

  private taxInvoicesById: Record<
    string,
    {
      id: string;
      project_id: string;
      buyer_corp_num: string;
      buyer_name: string;
      buyer_ceo: string;
      buyer_address: string;
      buyer_email: string;
      supplier_corp_num: string;
      supplier_name: string;
      supplier_ceo: string;
      supplier_address: string;
      supplier_email: string;
      supply_amount: number;
      tax_amount: number;
      total_amount: number;
      description: string;
      remark?: string;
      issue_date: string;
      status: "draft" | "issued" | "cancelled" | "failed";
      created_at: string;
      issued_at?: string;
      cancelled_at?: string;
      failure_reason?: string;
    }
  > = {};

  private projectTaxInvoiceIds: Record<string, string[]> = {};

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

  private getStoredUsers(): User[] {
    return mockDb.get("users");
  }

  private pickUser(email: string): User {
    const users = this.getStoredUsers();
    const byEmail = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    return byEmail || users[0];
  }

  private getCurrentUser(): User | null {
    const user = mockDb.get("currentUser");
    return user || null;
  }

  async login(username: string, _password: string) {
    if (!username) {
      return delay(
        fail<LoginResponse>("INVALID_CREDENTIALS", "아이디를 입력해 주세요"),
      );
    }

    const users = this.getStoredUsers();
    const user = users.find(u => u.username === username) || users.find(u => u.email.toLowerCase() === username.toLowerCase()) || users[0];
    mockDb.set("currentUser", user);

    // JWT 형식으로 토큰 생성 (middleware에서 role 파싱 가능)
    const access_token = createMockJwt({
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      org_id: user.organization_id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1시간 후 만료
      iat: Math.floor(Date.now() / 1000),
    });
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
          username: user.username,
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

    const user = this.getCurrentUser() || this.getStoredUsers()[0];

    return delay(
      ok({
        id: user.id,
        username: user.username,
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

  async checkUsername(username: string) {
    const users = this.getStoredUsers();
    const exists = users.some(u => u.username === username);
    return delay(ok({ available: !exists }));
  }

  async checkPhone(phone: string) {
    const users = this.getStoredUsers();
    const exists = users.some(u => u.phone === phone);
    return delay(ok({ available: !exists }));
  }

  async checkBusinessNumber(businessNumber: string) {
    const tenants = mockDb.get("tenants");
    const exists = tenants.some(t => t.businessNumber === businessNumber);
    return delay(ok({ available: !exists }));
  }

  async sendOtp(phone: string) {
    const request_id = `otp_${randomId("r")}`;
    console.log(`[MockOTP] Sending OTP to ${phone}, request_id: ${request_id}`);
    return delay(ok({ request_id, message: "인증번호가 발송되었어요." }));
  }

  async verifyOtp(_requestId: string, _code: string) {
    // Mock에서는 항상 성공
    return delay(ok({ verified: true, message: "인증이 완료되었어요." }));
  }

  async requestPasswordReset(username: string) {
    const users = this.getStoredUsers();
    const user = users.find(u => u.username === username);
    if (!user || !user.phone) {
      return delay(fail<{ request_id: string; masked_phone: string; message: string }>("NOT_FOUND", "등록된 사용자를 찾을 수 없어요"));
    }

    const request_id = `pwd_${randomId("r")}`;
    const phone = user.phone.replace(/-/g, "");
    const masked_phone = phone.length >= 8
      ? `${phone.slice(0, 3)}-****-${phone.slice(-4)}`
      : "***-****-****";

    console.log(`[MockPasswordReset] Request for ${username}, OTP sent to ${user.phone}, request_id: ${request_id}`);
    return delay(ok({
      request_id,
      masked_phone,
      message: `${masked_phone}으로 인증번호가 발송되었어요.`
    }));
  }

  async confirmPasswordReset(_requestId: string, _code: string, _newPassword: string) {
    // Mock에서는 항상 성공
    return delay(ok({ verified: true, message: "비밀번호가 변경되었어요." }));
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
    category?: string;
    client_name?: string;
    client_phone?: string;
    notes?: string;
  }) {
    const newProject: Project = {
      id: randomId("p"),
      name: data.name,
      address: data.address,
      status: "draft",
      category: data.category,
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
        status: "sent" as LaborContractStatus,
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

  async getUsers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    role?: string;
    is_active?: boolean;
  }) {
    const currentUser = this.getCurrentUser();
    let users = mockDb.get("users");

    // Tenant isolation: non-super_admin users only see users in their organization
    if (currentUser && currentUser.role !== "super_admin" && currentUser.organization_id) {
      users = users.filter(
        (u) => u.organization_id === currentUser.organization_id
      );
    }

    if (params?.role) {
      users = users.filter((u) => u.role === params.role);
    }
    if (typeof params?.is_active === "boolean") {
      users = users.filter((u) => u.is_active === params.is_active);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone || "").includes(q),
      );
    }

    const page = params?.page || 1;
    const per_page = params?.per_page || 10;
    const total = users.length;
    const total_pages = Math.max(1, Math.ceil(total / per_page));
    const start = (page - 1) * per_page;
    const pageItems = users.slice(start, start + per_page);

    return delay(
      okPage(
        pageItems.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          phone: u.phone,
          role: u.role,
          is_active: u.is_active,
          created_at: u.created_at,
          last_login_at: u.last_login_at,
        })),
        { page, per_page, total, total_pages },
      ),
    );
  }

  async createUser(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: string;
    organization_id?: string | null;
  }) {
    const role: User["role"] =
      data.role === "super_admin" ||
      data.role === "company_admin" ||
      data.role === "site_manager" ||
      data.role === "worker"
        ? data.role
        : "site_manager";

    // System-level roles have null organization_id
    const isSystemRole = role === "super_admin" || role === "worker";
    const organization_id = isSystemRole ? null : (data.organization_id ?? "org_1");

    const user: User = {
      id: randomId("u"),
      email: data.email,
      name: data.name,
      phone: data.phone,
      role,
      organization_id,
      is_active: true,
      created_at: nowIso(),
      last_login_at: undefined,
    };

    mockDb.update("users", (prev) => [user, ...prev]);
    return delay(
      ok({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization_id: user.organization_id,
        message: "생성했어요",
      }),
    );
  }

  async updateUser(
    userId: string,
    data: { name?: string; phone?: string; role?: string; is_active?: boolean },
  ) {
    const role: User["role"] | undefined =
      data.role === "super_admin" ||
      data.role === "company_admin" ||
      data.role === "site_manager" ||
      data.role === "worker"
        ? data.role
        : undefined;

    const users = mockDb.get("users");
    const idx = users.findIndex((u) => u.id === userId);
    if (idx < 0) {
      return delay(
        fail<{
          id: string;
          email: string;
          name: string;
          role: string;
          is_active: boolean;
        }>("NOT_FOUND", "사용자를 찾을 수 없어요"),
      );
    }

    const current = users[idx];
    const newRole = role ?? current.role;

    // System-level roles have null organization_id
    const isSystemRole = newRole === "super_admin" || newRole === "worker";
    const organization_id = isSystemRole ? null : current.organization_id;

    const updatedUser: User = {
      ...current,
      name: data.name ?? current.name,
      phone: data.phone ?? current.phone,
      role: newRole,
      organization_id,
      is_active:
        typeof data.is_active === "boolean"
          ? data.is_active
          : current.is_active,
    };

    mockDb.set(
      "users",
      users.map((u) => (u.id === userId ? updatedUser : u)),
    );

    return delay(
      ok({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        is_active: updatedUser.is_active,
      }),
    );
  }

  async deleteUser(userId: string) {
    const before = mockDb.get("users");
    const exists = before.some((u) => u.id === userId);
    if (!exists) {
      return delay(fail<void>("NOT_FOUND", "사용자를 찾을 수 없어요"));
    }
    mockDb.update("users", (prev) => prev.filter((u) => u.id !== userId));
    const current = mockDb.get("currentUser");
    if (current?.id === userId) {
      mockDb.set("currentUser", null);
    }
    return delay(ok<void>(null));
  }

  async getRevisions(_pricebookId?: string) {
    return delay(
      ok([
        {
          id: "rev_1",
          pricebook_id: "pb_1",
          version_label: "2026-01",
          effective_from: "2026-01-01",
          effective_to: undefined,
          status: "active",
          created_at: nowIso(),
          activated_at: nowIso(),
          item_count: 0,
        },
      ]),
    );
  }

  async getStagingItems(
    _revisionId: string,
    params?: {
      page?: number;
      per_page?: number;
      status?: string;
      confidence?: string;
    },
  ) {
    const page = params?.page || 1;
    const per_page = params?.per_page || 10;
    const total = 0;
    const total_pages = 1;
    return delay(okPage([], { page, per_page, total, total_pages }));
  }

  async uploadPricebookPdf(
    file: File,
    versionLabel: string,
    effectiveFrom: string,
  ) {
    return delay(
      ok({
        id: randomId("rev"),
        version_label: versionLabel,
        status: "processing",
        processing_status: "processing",
        staging_items_count: 0,
        message: `업로드했어요: ${file.name} (${effectiveFrom})`,
      }),
    );
  }

  async getUtilities(_projectId: string) {
    this.ensureUtilities(_projectId);
    return delay(ok(this.utilitiesByProject[_projectId]));
  }

  async updateUtilityStatus(
    projectId: string,
    utilityId: string,
    data: {
      status?: "pending" | "completed";
      doc_status?: "pending" | "submitted";
    },
  ) {
    this.ensureUtilities(projectId);
    const utilities = this.utilitiesByProject[projectId];
    const item = utilities.items.find((entry) => entry.id === utilityId);
    if (item) {
      const nextStatus = data.status ?? item.status;
      const nextDocStatus = data.doc_status ?? item.doc_status;
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
    return delay(ok({ id: utilityId }));
  }

  async getTaxInvoice(_projectId: string) {
    this.ensureTaxInvoices(_projectId);
    return delay(ok(this.taxInvoicesByProject[_projectId]));
  }

  async issueTaxInvoice(invoiceId: string) {
    const invoice = this.taxInvoicesById[invoiceId];
    if (!invoice) {
      // Fallback to old behavior for project ID
      this.ensureTaxInvoices(invoiceId);
      const state = this.taxInvoicesByProject[invoiceId];
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

    if (invoice.status === "issued") {
      return delay(fail("ALREADY_ISSUED", "이미 발행된 세금계산서입니다"));
    }

    this.taxInvoicesById[invoiceId] = {
      ...invoice,
      status: "issued",
      issued_at: nowIso(),
      failure_reason: undefined,
    };

    return delay(ok({ status: "issued" as const, message: "발행했어요" }));
  }

  async getTaxInvoices(projectId: string) {
    const ids = this.projectTaxInvoiceIds[projectId] || [];
    const invoices = ids
      .map((id) => this.taxInvoicesById[id])
      .filter(Boolean)
      .map((inv) => ({
        id: inv.id,
        buyer_name: inv.buyer_name,
        supply_amount: inv.supply_amount,
        tax_amount: inv.tax_amount,
        total_amount: inv.total_amount,
        status: inv.status,
        issue_date: inv.issue_date,
        created_at: inv.created_at,
        failure_reason: inv.failure_reason,
      }));
    return delay(ok(invoices));
  }

  async getTaxInvoiceDetail(invoiceId: string) {
    const invoice = this.taxInvoicesById[invoiceId];
    if (!invoice) {
      return delay(fail("NOT_FOUND", "세금계산서를 찾을 수 없어요"));
    }
    return delay(ok(invoice));
  }

  async createTaxInvoice(
    projectId: string,
    data: {
      buyer_corp_num: string;
      buyer_name: string;
      buyer_ceo: string;
      buyer_address: string;
      buyer_email: string;
      supply_amount: number;
      tax_amount: number;
      description: string;
      remark?: string;
      issue_date: string;
      status: "draft" | "issued" | "cancelled" | "failed";
    }
  ) {
    const invoiceId = randomId("ti");
    const invoice = {
      id: invoiceId,
      project_id: projectId,
      buyer_corp_num: data.buyer_corp_num,
      buyer_name: data.buyer_name,
      buyer_ceo: data.buyer_ceo,
      buyer_address: data.buyer_address,
      buyer_email: data.buyer_email,
      supplier_corp_num: "123-45-67890",
      supplier_name: "유니그린개발",
      supplier_ceo: "이중호",
      supplier_address: "서울특별시 강남구 테헤란로 123",
      supplier_email: "ceo@yunigreen.com",
      supply_amount: data.supply_amount,
      tax_amount: data.tax_amount,
      total_amount: data.supply_amount + data.tax_amount,
      description: data.description,
      remark: data.remark,
      issue_date: data.issue_date,
      status: data.status,
      created_at: nowIso(),
    };

    this.taxInvoicesById[invoiceId] = invoice;
    this.projectTaxInvoiceIds[projectId] = [
      ...(this.projectTaxInvoiceIds[projectId] || []),
      invoiceId,
    ];

    return delay(
      ok({
        id: invoiceId,
        status: invoice.status,
        message: "생성했어요",
      })
    );
  }

  async updateTaxInvoice(
    invoiceId: string,
    data: Partial<{
      buyer_corp_num: string;
      buyer_name: string;
      buyer_ceo: string;
      buyer_address: string;
      buyer_email: string;
      supply_amount: number;
      tax_amount: number;
      description: string;
      remark: string;
      issue_date: string;
    }>
  ) {
    const invoice = this.taxInvoicesById[invoiceId];
    if (!invoice) {
      return delay(fail("NOT_FOUND", "세금계산서를 찾을 수 없어요"));
    }

    if (invoice.status !== "draft") {
      return delay(fail("INVALID_STATUS", "초안 상태에서만 수정할 수 있어요"));
    }

    this.taxInvoicesById[invoiceId] = {
      ...invoice,
      ...data,
      total_amount: (data.supply_amount ?? invoice.supply_amount) + (data.tax_amount ?? invoice.tax_amount),
    };

    return delay(ok({ id: invoiceId, message: "수정했어요" }));
  }

  async cancelTaxInvoice(invoiceId: string) {
    const invoice = this.taxInvoicesById[invoiceId];
    if (!invoice) {
      return delay(fail("NOT_FOUND", "세금계산서를 찾을 수 없어요"));
    }

    if (invoice.status !== "issued") {
      return delay(fail("INVALID_STATUS", "발행된 세금계산서만 취소할 수 있어요"));
    }

    // Check if same day
    const issueDate = new Date(invoice.issued_at || invoice.created_at);
    const today = new Date();
    const isSameDay = issueDate.toDateString() === today.toDateString();

    if (!isSameDay) {
      return delay(fail("EXPIRED", "발행 당일에만 취소할 수 있어요"));
    }

    this.taxInvoicesById[invoiceId] = {
      ...invoice,
      status: "cancelled",
      cancelled_at: nowIso(),
    };

    return delay(ok({ status: "cancelled" as const, message: "취소했어요" }));
  }

  async retryTaxInvoice(invoiceId: string) {
    const invoice = this.taxInvoicesById[invoiceId];
    if (!invoice) {
      return delay(fail("NOT_FOUND", "세금계산서를 찾을 수 없어요"));
    }

    if (invoice.status !== "failed") {
      return delay(fail("INVALID_STATUS", "실패한 세금계산서만 재시도할 수 있어요"));
    }

    this.taxInvoicesById[invoiceId] = {
      ...invoice,
      status: "issued",
      issued_at: nowIso(),
      failure_reason: undefined,
    };

    return delay(ok({ status: "issued" as const, message: "재발행했어요" }));
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

  async registerWorker(data: { name: string; phone: string; id_number?: string }) {
    const users = this.getStoredUsers();
    const existing = users.find(u => u.phone === data.phone && u.role === "worker");
    if (existing) {
      return delay(ok({
        user_id: existing.id,
        is_new: false,
        message: "기존 근로자 정보를 찾았어요.",
      }));
    }

    // 새 worker 생성
    const newWorkerId = randomId("w");
    const phoneClean = data.phone.replace(/-/g, "");
    const newWorker: User = {
      id: newWorkerId,
      username: `worker_${phoneClean}`,
      email: null,
      name: data.name,
      phone: data.phone,
      role: "worker",
      organization_id: null, // System-level role
      is_active: true,
      password_hash: "mock_hash",
    };

    mockDb.update("users", prev => [...prev, newWorker]);

    return delay(ok({
      user_id: newWorkerId,
      is_new: true,
      message: "근로자가 등록되었어요. 임시 비밀번호는 전화번호 뒤 4자리입니다.",
    }));
  }

  async getBillingOverview() {
    // 현재 사용자의 테넌트 정보를 가져옴
    const currentUser = mockDb.get("currentUser");
    const tenants = mockDb.get("tenants");

    // 사용자의 organization_id로 테넌트 찾기 (mock에서는 첫 번째 테넌트 사용)
    const tenant = currentUser?.organization_id
      ? tenants.find((t) => t.id === currentUser.organization_id)
      : tenants[0];

    if (!tenant) {
      return delay(
        ok({
          plan: "무료 체험",
          subscription_end_date: "",
          days_remaining: 0,
          is_custom_trial: false,
          seats_used: 0,
          seats_total: 2,
          payment_method: null,
          history: [],
        }),
      );
    }

    // 남은 일수 계산
    const now = new Date();
    const endDate = new Date(tenant.subscription_end_date);
    const diffTime = endDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 플랜 이름 변환
    const planNames: Record<string, string> = {
      trial: "무료 체험",
      basic: "Basic",
      pro: "Pro",
    };

    // 좌석 제한 (플랜별)
    const seatLimits: Record<string, number> = {
      trial: 2,
      basic: 5,
      pro: 999, // 무제한
    };

    return delay(
      ok({
        plan: planNames[tenant.plan] || tenant.plan,
        subscription_start_date: tenant.subscription_start_date,
        subscription_end_date: tenant.subscription_end_date,
        days_remaining: daysRemaining,
        is_custom_trial: tenant.is_custom_trial,
        billing_amount: tenant.billing_amount || 0,
        seats_used: tenant.users_count,
        seats_total: seatLimits[tenant.plan] || 2,
        payment_method: tenant.plan !== "trial" && !tenant.is_custom_trial ? {
          brand: "현대카드",
          last4: "1234",
          expires: "12/28",
        } : null,
        history: tenant.plan !== "trial" && !tenant.is_custom_trial ? [
          {
            id: "h1",
            date: tenant.subscription_start_date.slice(0, 10).replace(/-/g, "."),
            description: `${planNames[tenant.plan]} 연간 구독`,
            amount: tenant.billing_amount || 0,
            status: "paid" as const,
          },
        ] : [],
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

  async getWorkerContract(contractId: string) {
    this.ensureWorkerContract(contractId);
    return delay(ok(this.workerContractsById[contractId]));
  }

  async signWorkerContract(contractId: string, _signatureData: string) {
    this.ensureWorkerContract(contractId);
    this.workerContractsById[contractId].status = "signed";
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

  async verifyBusiness(businessNumber: string) {
    const cleaned = businessNumber.replace(/[^0-9]/g, "");
    if (cleaned.length !== 10) {
      return delay(
        ok({
          valid: false,
        }),
      );
    }

    const sampleCompanies: Record<
      string,
      { company_name: string; representative: string; business_type: string }
    > = {
      "1234567890": {
        company_name: "유니그린개발",
        representative: "이중호",
        business_type: "실내건축공사업",
      },
      "9876543210": {
        company_name: "ABC건설",
        representative: "김철수",
        business_type: "종합건설업",
      },
    };

    const company = sampleCompanies[cleaned];
    if (company) {
      return delay(
        ok({
          valid: true,
          company_name: company.company_name,
          representative: company.representative,
          business_type: company.business_type,
        }),
      );
    }

    return delay(
      ok({
        valid: true,
        company_name: "샘플업체",
        representative: "홍길동",
        business_type: "건설업",
      }),
    );
  }

  async register(data: {
    username: string;
    password: string;
    phone: string;
    email?: string;
    company_name: string;
    business_number: string;
    representative_name: string;
    rep_phone: string;
    rep_email: string;
    contact_name?: string;
    contact_phone?: string;
    contact_position?: string;
    plan: "trial" | "basic" | "pro";
  }) {
    const tenant_id = randomId("tenant");
    const user_id = randomId("u");

    const now = new Date();
    const startDate = now.toISOString();

    // 구독 종료일 계산
    let endDate: Date;
    let billingAmount: number;

    const DEFAULT_TRIAL_DAYS = 30;
    const PLAN_PRICES: Record<string, number> = {
      trial: 0,
      basic: 588000,  // 49,000 × 12 (연간)
      pro: 1188000,   // 99,000 × 12 (연간)
    };

    if (data.plan === "trial") {
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() + DEFAULT_TRIAL_DAYS);
      billingAmount = 0;
    } else {
      endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1);  // 1년 후
      billingAmount = PLAN_PRICES[data.plan] || 0;
    }

    const newTenant: Tenant = {
      id: tenant_id,
      name: data.company_name,
      plan: data.plan,
      users_count: 1,
      projects_count: 0,
      created_at: startDate,
      subscription_start_date: startDate,
      subscription_end_date: endDate.toISOString(),
      is_custom_trial: false,
      billing_amount: billingAmount,
    };

    mockDb.update("tenants", (prev) => [newTenant, ...prev]);

    const newUser: User = {
      id: user_id,
      username: data.username,
      email: data.email || "",
      name: data.company_name,
      phone: data.phone,
      role: "company_admin",
      organization_id: tenant_id,
      is_active: true,
      created_at: nowIso(),
    };

    mockDb.update("users", (prev) => [newUser, ...prev]);
    mockDb.set("currentUser", newUser);

    // JWT 형식으로 토큰 생성 (middleware에서 role 파싱 가능)
    const access_token = createMockJwt({
      sub: user_id,
      email: data.email || "",
      username: data.username,
      role: "company_admin",
      org_id: tenant_id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      iat: Math.floor(Date.now() / 1000),
    });
    this.setAccessToken(access_token);

    return delay(
      ok({
        tenant_id,
        user_id,
        access_token,
      }),
    );
  }

  async confirmPayment(data: {
    payment_key: string;
    order_id: string;
    amount: number;
  }) {
    const payment_id = randomId("pay");
    const receipt_url = `mock://receipt/${payment_id}`;

    // Mock: 현재 사용자의 테넌트 플랜 업데이트
    const currentUser = mockDb.get("currentUser");
    if (currentUser?.organization_id) {
      const tenants = mockDb.get("tenants");
      const tenantIdx = tenants.findIndex(
        (t) => t.id === currentUser.organization_id
      );

      if (tenantIdx >= 0) {
        const tenant = tenants[tenantIdx];
        const now = new Date();
        const endDate = new Date(now);
        endDate.setFullYear(endDate.getFullYear() + 1);

        // 금액에 따라 플랜 결정 (연간 결제 금액 기준)
        // Basic: ₩588,000 (49,000/월 × 12)
        // Pro: ₩1,188,000 (99,000/월 × 12)
        let newPlan: "trial" | "basic" | "pro" = "basic";
        if (data.amount === 588000) {
          newPlan = "basic";
        } else if (data.amount === 1188000) {
          newPlan = "pro";
        }

        const updatedTenant = {
          ...tenant,
          plan: newPlan,
          subscription_start_date: now.toISOString(),
          subscription_end_date: endDate.toISOString(),
          is_custom_trial: false,
          billing_amount: data.amount,
        };

        mockDb.set(
          "tenants",
          tenants.map((t) =>
            t.id === currentUser.organization_id ? updatedTenant : t
          )
        );
      }
    }

    return delay(
      ok({
        payment_id,
        status: "completed" as const,
        receipt_url,
        payment_key: data.payment_key,
        order_id: data.order_id,
        amount: data.amount,
        approved_at: nowIso(),
      })
    );
  }

  async getSubscription() {
    return this.getBillingOverview();
  }

  async changePlan(plan: "STARTER" | "STANDARD" | "PREMIUM") {
    const currentUser = mockDb.get("currentUser");
    if (!currentUser?.organization_id) {
      return delay(
        fail<{ message: string }>("UNAUTHORIZED", "인증이 필요합니다")
      );
    }

    const planMapping: Record<string, "trial" | "basic" | "pro"> = {
      STARTER: "trial",
      STANDARD: "basic",
      PREMIUM: "pro",
    };

    const tenantPlan = planMapping[plan];
    const tenants = mockDb.get("tenants");
    const tenantIdx = tenants.findIndex(
      (t) => t.id === currentUser.organization_id
    );

    if (tenantIdx < 0) {
      return delay(fail<{ message: string }>("NOT_FOUND", "테넌트를 찾을 수 없어요"));
    }

    const tenant = tenants[tenantIdx];
    const now = new Date();
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const billingAmounts: Record<string, number> = {
      STARTER: 99000,
      STANDARD: 199000,
      PREMIUM: 399000,
    };

    const updatedTenant = {
      ...tenant,
      plan: tenantPlan,
      subscription_start_date: now.toISOString(),
      subscription_end_date: endDate.toISOString(),
      billing_amount: billingAmounts[plan],
    };

    mockDb.set(
      "tenants",
      tenants.map((t) => (t.id === currentUser.organization_id ? updatedTenant : t))
    );

    return delay(ok({ message: "플랜이 변경되었습니다" }));
  }

  async cancelSubscription() {
    const currentUser = mockDb.get("currentUser");
    if (!currentUser?.organization_id) {
      return delay(
        fail<{ message: string }>("UNAUTHORIZED", "인증이 필요합니다")
      );
    }

    const tenants = mockDb.get("tenants");
    const tenantIdx = tenants.findIndex(
      (t) => t.id === currentUser.organization_id
    );

    if (tenantIdx < 0) {
      return delay(fail<{ message: string }>("NOT_FOUND", "테넌트를 찾을 수 없어요"));
    }

    const tenant = tenants[tenantIdx];
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30); // 30일 후 만료

    const updatedTenant = {
      ...tenant,
      plan: "trial" as const,
      subscription_end_date: endDate.toISOString(),
      billing_amount: 0,
    };

    mockDb.set(
      "tenants",
      tenants.map((t) => (t.id === currentUser.organization_id ? updatedTenant : t))
    );

    return delay(ok({ message: "구독이 취소되었습니다" }));
  }

  async getPaymentHistory() {
    const overview = await this.getBillingOverview();
    if (!overview.success || !overview.data) {
      return delay(ok([]));
    }

    return delay(ok(overview.data.history));
  }

  async getTenants(params?: { page?: number; search?: string }) {
    let tenants = mockDb.get("tenants");

    if (params?.search) {
      const q = params.search.toLowerCase();
      tenants = tenants.filter((t) => t.name.toLowerCase().includes(q));
    }

    const page = params?.page || 1;
    const per_page = 10;
    const total = tenants.length;
    const total_pages = Math.max(1, Math.ceil(total / per_page));
    const start = (page - 1) * per_page;
    const pageItems = tenants.slice(start, start + per_page);

    return delay(okPage(pageItems, { page, per_page, total, total_pages }));
  }

  async getTenant(tenantId: string) {
    const tenant = mockDb.get("tenants").find((t) => t.id === tenantId);
    if (!tenant) {
      return delay(
        fail<Tenant>("NOT_FOUND", "테넌트를 찾을 수 없어요"),
      );
    }

    return delay(ok(tenant));
  }

  async setCustomTrialPeriod(tenantId: string, data: {
    end_date: string;  // ISO date
    reason?: string;
  }) {
    const tenants = mockDb.get("tenants");
    const idx = tenants.findIndex((t) => t.id === tenantId);

    if (idx < 0) {
      return delay(
        fail<{
          id: string;
          subscription_end_date: string;
          is_custom_trial: boolean;
        }>("NOT_FOUND", "테넌트를 찾을 수 없어요"),
      );
    }

    const updated = {
      ...tenants[idx],
      subscription_end_date: data.end_date,
      is_custom_trial: true,
      billing_amount: 0,  // 무료
    };

    mockDb.set(
      "tenants",
      tenants.map((t) => (t.id === tenantId ? updated : t)),
    );

    return delay(
      ok({
        id: tenantId,
        subscription_end_date: data.end_date,
        is_custom_trial: true,
      }),
    );
  }

  async uploadPricebook(
    file: File,
    data: { version_label: string; effective_from: string },
  ) {
    const revision_id = randomId("rev");
    const estimated_items = Math.floor(Math.random() * 500) + 100;

    return delay(
      ok({
        revision_id,
        status: "processing" as const,
        estimated_items,
        version_label: data.version_label,
        effective_from: data.effective_from,
        file_name: file.name,
        file_size: file.size,
      }),
    );
  }

  async reviewStagingItem(
    stagingId: string,
    data: { action: "approved" | "rejected" },
  ) {
    return delay(
      ok({
        id: stagingId,
        status: data.action,
      }),
    );
  }

  async bulkReviewStaging(
    revisionId: string,
    data: { staging_ids: string[]; action: "approved" | "rejected" },
  ) {
    return delay(
      ok({
        revision_id: revisionId,
        processed: data.staging_ids.length,
        status: data.action,
      }),
    );
  }

  async activateRevision(revisionId: string) {
    return delay(
      ok({
        id: revisionId,
        status: "active" as const,
        activated_at: nowIso(),
        message: "활성화했어요",
      }),
    );
  }

  async promoteApprovedStaging(revisionId: string) {
    return delay(
      ok({
        id: revisionId,
        promoted_count: 0,
        message: "정식 DB로 이동했어요",
      }),
    );
  }

  async autoApproveStaging(revisionId: string) {
    return delay(
      ok({
        id: revisionId,
        auto_approved_count: 0,
        message: "자동 승인 완료",
      }),
    );
  }

  // Construction Reports (착공계/준공계)
  private constructionReportsByProject: Record<
    string,
    Array<{
      id: string;
      project_id: string;
      report_type: "start" | "completion";
      status: "draft" | "submitted" | "approved" | "rejected";
      construction_name?: string;
      site_address?: string;
      start_date?: string;
      expected_end_date?: string;
      actual_end_date?: string;
      supervisor_name?: string;
      supervisor_phone?: string;
      final_amount?: string;
      defect_warranty_period?: string;
      notes?: string;
      created_at: string;
      submitted_at?: string;
      approved_at?: string;
      rejected_at?: string;
      rejection_reason?: string;
    }>
  > = {};

  async getConstructionReports(projectId: string) {
    const reports = this.constructionReportsByProject[projectId] || [];
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
      fail<any>("NOT_FOUND", "보고서를 찾을 수 없어요"),
    );
  }

  async createStartReport(
    projectId: string,
    data: {
      construction_name: string;
      site_address: string;
      start_date: string;
      expected_end_date: string;
      supervisor_name: string;
      supervisor_phone: string;
      notes?: string;
    },
  ) {
    const reportId = randomId("report");
    const report = {
      id: reportId,
      project_id: projectId,
      report_type: "start" as const,
      status: "draft" as const,
      construction_name: data.construction_name,
      site_address: data.site_address,
      start_date: data.start_date,
      expected_end_date: data.expected_end_date,
      supervisor_name: data.supervisor_name,
      supervisor_phone: data.supervisor_phone,
      notes: data.notes,
      created_at: nowIso(),
    };

    if (!this.constructionReportsByProject[projectId]) {
      this.constructionReportsByProject[projectId] = [];
    }
    this.constructionReportsByProject[projectId].push(report);

    return delay(
      ok({
        id: reportId,
        report_type: "start",
        status: "draft",
      }),
    );
  }

  async createCompletionReport(
    projectId: string,
    data: {
      actual_end_date: string;
      final_amount: string;
      defect_warranty_period: string;
      notes?: string;
    },
  ) {
    const reports = this.constructionReportsByProject[projectId] || [];
    const startReport = reports.find(
      (r) => r.report_type === "start" && r.status === "approved",
    );

    if (!startReport) {
      return delay(
        fail<any>(
          "PRECONDITION_FAILED",
          "승인된 착공계가 없어요",
        ),
      );
    }

    const reportId = randomId("report");
    const report = {
      id: reportId,
      project_id: projectId,
      report_type: "completion" as const,
      status: "draft" as const,
      construction_name: startReport.construction_name,
      site_address: startReport.site_address,
      start_date: startReport.start_date,
      expected_end_date: startReport.expected_end_date,
      supervisor_name: startReport.supervisor_name,
      supervisor_phone: startReport.supervisor_phone,
      actual_end_date: data.actual_end_date,
      final_amount: data.final_amount,
      defect_warranty_period: data.defect_warranty_period,
      notes: data.notes,
      created_at: nowIso(),
    };

    this.constructionReportsByProject[projectId].push(report);

    return delay(
      ok({
        id: reportId,
        report_type: "completion",
        status: "draft",
      }),
    );
  }

  async updateConstructionReport(
    reportId: string,
    data: {
      construction_name?: string;
      site_address?: string;
      start_date?: string;
      expected_end_date?: string;
      actual_end_date?: string;
      supervisor_name?: string;
      supervisor_phone?: string;
      final_amount?: string;
      defect_warranty_period?: string;
      notes?: string;
    },
  ) {
    for (const reports of Object.values(this.constructionReportsByProject)) {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        Object.assign(report, data);
        return delay(ok({ id: reportId, message: "저장했어요" }));
      }
    }
    return delay(
      fail<any>("NOT_FOUND", "보고서를 찾을 수 없어요"),
    );
  }

  async submitConstructionReport(reportId: string) {
    for (const reports of Object.values(this.constructionReportsByProject)) {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        report.status = "submitted";
        report.submitted_at = nowIso();
        return delay(
          ok({
            id: reportId,
            status: "submitted",
            message: "제출했어요",
          }),
        );
      }
    }
    return delay(
      fail<any>("NOT_FOUND", "보고서를 찾을 수 없어요"),
    );
  }

  async approveConstructionReport(reportId: string) {
    for (const reports of Object.values(this.constructionReportsByProject)) {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        report.status = "approved";
        report.approved_at = nowIso();
        return delay(
          ok({
            id: reportId,
            status: "approved",
            message: "승인했어요",
          }),
        );
      }
    }
    return delay(
      fail<any>("NOT_FOUND", "보고서를 찾을 수 없어요"),
    );
  }

  async rejectConstructionReport(reportId: string, reason: string) {
    for (const reports of Object.values(this.constructionReportsByProject)) {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        report.status = "rejected";
        report.rejected_at = nowIso();
        report.rejection_reason = reason;
        return delay(
          ok({
            id: reportId,
            status: "rejected",
            message: "반려했어요",
          }),
        );
      }
    }
    return delay(
      fail<any>("NOT_FOUND", "보고서를 찾을 수 없어요"),
    );
  }

  // Photo Album APIs
  private albumsByProject: Record<string, any[]> = {};
  private albumsById: Record<string, any> = {};

  async getPhotoAlbums(projectId: string) {
    const albums = this.albumsByProject[projectId] || [];
    return delay(ok(albums));
  }

  async getPhotoAlbum(albumId: string) {
    const album = this.albumsById[albumId];
    if (!album) {
      return delay(fail<any>("NOT_FOUND", "앨범을 찾을 수 없어요"));
    }
    return delay(ok(album));
  }

  async createPhotoAlbum(
    projectId: string,
    data: { name: string; description?: string; layout?: "three_column" | "four_column" }
  ) {
    const albumId = randomId("album");
    const album = {
      id: albumId,
      project_id: projectId,
      name: data.name,
      description: data.description,
      layout: data.layout || "three_column",
      status: "draft",
      photo_count: 0,
      photos: [],
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    this.albumsById[albumId] = album;
    this.albumsByProject[projectId] = [
      ...(this.albumsByProject[projectId] || []),
      album,
    ];

    return delay(ok({ id: albumId, name: album.name, status: album.status }));
  }

  async updatePhotoAlbum(
    albumId: string,
    data: {
      name?: string;
      description?: string;
      layout?: "three_column" | "four_column";
      status?: "draft" | "published";
    }
  ) {
    const album = this.albumsById[albumId];
    if (!album) {
      return delay(fail<any>("NOT_FOUND", "앨범을 찾을 수 없어요"));
    }

    const updated = {
      ...album,
      name: data.name ?? album.name,
      description: data.description ?? album.description,
      layout: data.layout ?? album.layout,
      status: data.status ?? album.status,
      updated_at: nowIso(),
    };

    this.albumsById[albumId] = updated;
    const projectId = album.project_id;
    this.albumsByProject[projectId] = (this.albumsByProject[projectId] || []).map(
      (a) => (a.id === albumId ? updated : a)
    );

    return delay(ok({ id: albumId, message: "수정했어요" }));
  }

  async deletePhotoAlbum(albumId: string) {
    const album = this.albumsById[albumId];
    if (!album) {
      return delay(fail<void>("NOT_FOUND", "앨범을 찾을 수 없어요"));
    }

    const projectId = album.project_id;
    delete this.albumsById[albumId];
    this.albumsByProject[projectId] = (this.albumsByProject[projectId] || []).filter(
      (a) => a.id !== albumId
    );

    return delay(ok<void>(null));
  }

  async addPhotosToAlbum(albumId: string, photoIds: string[]) {
    const album = this.albumsById[albumId];
    if (!album) {
      return delay(fail<any>("NOT_FOUND", "앨범을 찾을 수 없어요"));
    }

    // Mock photo data - in real app, would fetch from photos table
    const newPhotos = photoIds.map((id, idx) => ({
      id: randomId("ap"),
      album_photo_id: id,
      storage_path: `mock://photos/${id}`,
      caption: `사진 ${idx + 1}`,
      photo_type: idx % 3 === 0 ? "before" : idx % 3 === 1 ? "during" : "after",
      sort_order: album.photos.length + idx,
    }));

    const updated = {
      ...album,
      photos: [...album.photos, ...newPhotos],
      photo_count: album.photos.length + newPhotos.length,
      updated_at: nowIso(),
    };

    this.albumsById[albumId] = updated;
    const projectId = album.project_id;
    this.albumsByProject[projectId] = (this.albumsByProject[projectId] || []).map(
      (a) => (a.id === albumId ? updated : a)
    );

    return delay(ok({ added_count: newPhotos.length }));
  }

  async removePhotoFromAlbum(albumId: string, photoId: string) {
    const album = this.albumsById[albumId];
    if (!album) {
      return delay(fail<void>("NOT_FOUND", "앨범을 찾을 수 없어요"));
    }

    const updated = {
      ...album,
      photos: album.photos.filter((p: any) => p.id !== photoId),
      photo_count: album.photos.filter((p: any) => p.id !== photoId).length,
      updated_at: nowIso(),
    };

    this.albumsById[albumId] = updated;
    const projectId = album.project_id;
    this.albumsByProject[projectId] = (this.albumsByProject[projectId] || []).map(
      (a) => (a.id === albumId ? updated : a)
    );

    return delay(ok<void>(null));
  }

  async reorderAlbumPhotos(albumId: string, photos: Array<{ id: string; sort_order: number }>) {
    const album = this.albumsById[albumId];
    if (!album) {
      return delay(fail<any>("NOT_FOUND", "앨범을 찾을 수 없어요"));
    }

    const reordered = album.photos.map((photo: any) => {
      const newOrder = photos.find((p) => p.id === photo.id);
      return newOrder ? { ...photo, sort_order: newOrder.sort_order } : photo;
    });

    reordered.sort((a: any, b: any) => a.sort_order - b.sort_order);

    const updated = {
      ...album,
      photos: reordered,
      updated_at: nowIso(),
    };

    this.albumsById[albumId] = updated;
    const projectId = album.project_id;
    this.albumsByProject[projectId] = (this.albumsByProject[projectId] || []).map(
      (a) => (a.id === albumId ? updated : a)
    );

    return delay(ok({ message: "순서를 변경했어요" }));
  }

  async exportAlbumPdf(albumId: string) {
    const album = this.albumsById[albumId];
    if (!album) {
      return delay(fail<any>("NOT_FOUND", "앨범을 찾을 수 없어요"));
    }

    const pdf_url = `mock://pdf/${albumId}.pdf`;
    return delay(ok({ pdf_url, message: "PDF를 생성했어요" }));
  }

  // ========== Invitation APIs ==========

  /**
   * Create an invitation for a new user
   * Only company_admin can invite site_manager within same org
   * Only super_admin can invite any role
   */
  async createInvitation(data: {
    email: string;
    name: string;
    role: User["role"];
  }) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return delay(
        fail<{ id: string; token: string; invite_url: string }>(
          "UNAUTHORIZED",
          "로그인이 필요해요"
        )
      );
    }

    // Validate role permissions
    if (currentUser.role === "company_admin") {
      if (data.role !== "site_manager") {
        return delay(
          fail<{ id: string; token: string; invite_url: string }>(
            "FORBIDDEN",
            "현장소장만 초대할 수 있어요"
          )
        );
      }
    } else if (currentUser.role !== "super_admin") {
      return delay(
        fail<{ id: string; token: string; invite_url: string }>(
          "FORBIDDEN",
          "초대 권한이 없어요"
        )
      );
    }

    // Check for existing pending invitation
    const invitations = mockDb.get("invitations");
    const existingInvite = invitations.find(
      (inv) =>
        inv.email.toLowerCase() === data.email.toLowerCase() &&
        inv.status === "pending"
    );
    if (existingInvite) {
      return delay(
        fail<{ id: string; token: string; invite_url: string }>(
          "DUPLICATE",
          "이미 대기중인 초대가 있어요"
        )
      );
    }

    // Check if user already exists
    const users = mockDb.get("users");
    const existingUser = users.find(
      (u) => u.email.toLowerCase() === data.email.toLowerCase()
    );
    if (existingUser) {
      return delay(
        fail<{ id: string; token: string; invite_url: string }>(
          "DUPLICATE",
          "이미 등록된 사용자예요"
        )
      );
    }

    const invitationId = randomId("inv");
    const token = randomId("tok") + randomId("tok"); // Longer token for security
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation: Invitation = {
      id: invitationId,
      email: data.email,
      name: data.name,
      role: data.role,
      organization_id: currentUser.organization_id || "org_1",
      status: "pending",
      token,
      invited_by: currentUser.id,
      created_at: nowIso(),
      expires_at: expiresAt.toISOString(),
    };

    mockDb.update("invitations", (prev) => [invitation, ...prev]);

    // Log invite URL for development
    const inviteUrl = `/accept-invite/${token}`;
    console.log("📧 초대 링크:", `${typeof window !== "undefined" ? window.location.origin : ""}${inviteUrl}`);

    return delay(
      ok({
        id: invitationId,
        token,
        invite_url: inviteUrl,
      })
    );
  }

  /**
   * Get invitations for the current organization
   */
  async getInvitations(params?: {
    status?: InvitationStatus;
    page?: number;
    per_page?: number;
  }) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return delay(fail("UNAUTHORIZED", "로그인이 필요해요"));
    }

    let invitations = mockDb.get("invitations");

    // Filter by organization (unless super_admin)
    if (currentUser.role !== "super_admin" && currentUser.organization_id) {
      invitations = invitations.filter(
        (inv) => inv.organization_id === currentUser.organization_id
      );
    }

    // Filter by status
    if (params?.status) {
      invitations = invitations.filter((inv) => inv.status === params.status);
    }

    // Check for expired invitations and update status
    const now = new Date();
    invitations = invitations.map((inv) => {
      if (inv.status === "pending" && new Date(inv.expires_at) < now) {
        return { ...inv, status: "expired" as InvitationStatus };
      }
      return inv;
    });

    const page = params?.page || 1;
    const per_page = params?.per_page || 20;
    const total = invitations.length;
    const total_pages = Math.max(1, Math.ceil(total / per_page));
    const start = (page - 1) * per_page;
    const pageItems = invitations.slice(start, start + per_page);

    return delay(
      okPage(
        pageItems.map((inv) => ({
          id: inv.id,
          email: inv.email,
          name: inv.name,
          role: inv.role,
          status: inv.status,
          created_at: inv.created_at,
          expires_at: inv.expires_at,
        })),
        { page, per_page, total, total_pages }
      )
    );
  }

  /**
   * Resend an invitation (generates new token and extends expiry)
   */
  async resendInvitation(invitationId: string) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return delay(
        fail<{ id: string; token: string; invite_url: string }>(
          "UNAUTHORIZED",
          "로그인이 필요해요"
        )
      );
    }

    const invitations = mockDb.get("invitations");
    const invitation = invitations.find((inv) => inv.id === invitationId);

    if (!invitation) {
      return delay(
        fail<{ id: string; token: string; invite_url: string }>(
          "NOT_FOUND",
          "초대를 찾을 수 없어요"
        )
      );
    }

    // Check org permission
    if (
      currentUser.role !== "super_admin" &&
      invitation.organization_id !== currentUser.organization_id
    ) {
      return delay(
        fail<{ id: string; token: string; invite_url: string }>(
          "FORBIDDEN",
          "권한이 없어요"
        )
      );
    }

    if (invitation.status !== "pending" && invitation.status !== "expired") {
      return delay(
        fail<{ id: string; token: string; invite_url: string }>(
          "INVALID_STATUS",
          "재발송할 수 없는 상태예요"
        )
      );
    }

    const newToken = randomId("tok") + randomId("tok");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const updated: Invitation = {
      ...invitation,
      token: newToken,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    };

    mockDb.set(
      "invitations",
      invitations.map((inv) => (inv.id === invitationId ? updated : inv))
    );

    const inviteUrl = `/accept-invite/${newToken}`;
    console.log("📧 초대 재발송:", `${typeof window !== "undefined" ? window.location.origin : ""}${inviteUrl}`);

    return delay(
      ok({
        id: invitationId,
        token: newToken,
        invite_url: inviteUrl,
      })
    );
  }

  /**
   * Revoke (cancel) an invitation
   */
  async revokeInvitation(invitationId: string) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return delay(fail<{ id: string; status: InvitationStatus }>("UNAUTHORIZED", "로그인이 필요해요"));
    }

    const invitations = mockDb.get("invitations");
    const invitation = invitations.find((inv) => inv.id === invitationId);

    if (!invitation) {
      return delay(fail<{ id: string; status: InvitationStatus }>("NOT_FOUND", "초대를 찾을 수 없어요"));
    }

    if (
      currentUser.role !== "super_admin" &&
      invitation.organization_id !== currentUser.organization_id
    ) {
      return delay(fail<{ id: string; status: InvitationStatus }>("FORBIDDEN", "권한이 없어요"));
    }

    if (invitation.status !== "pending") {
      return delay(
        fail<{ id: string; status: InvitationStatus }>("INVALID_STATUS", "취소할 수 없는 상태예요")
      );
    }

    const updated: Invitation = { ...invitation, status: "revoked" };
    mockDb.set(
      "invitations",
      invitations.map((inv) => (inv.id === invitationId ? updated : inv))
    );

    return delay(ok({ id: invitationId, status: "revoked" as InvitationStatus }));
  }

  /**
   * Get invitation by token (public - for accept-invite page)
   */
  async getInvitationByToken(token: string) {
    const invitations = mockDb.get("invitations");
    const invitation = invitations.find((inv) => inv.token === token);

    if (!invitation) {
      return delay(
        fail<{
          id: string;
          email: string;
          name: string;
          role: User["role"];
          organization_name: string;
          status: InvitationStatus;
          expires_at: string;
        }>("NOT_FOUND", "유효하지 않은 초대 링크예요")
      );
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      return delay(
        fail<{
          id: string;
          email: string;
          name: string;
          role: User["role"];
          organization_name: string;
          status: InvitationStatus;
          expires_at: string;
        }>("EXPIRED", "만료된 초대 링크예요")
      );
    }

    if (invitation.status !== "pending") {
      return delay(
        fail<{
          id: string;
          email: string;
          name: string;
          role: User["role"];
          organization_name: string;
          status: InvitationStatus;
          expires_at: string;
        }>("INVALID_STATUS", "이미 처리된 초대예요")
      );
    }

    // Get organization name
    const tenants = mockDb.get("tenants");
    const tenant = tenants.find((t) => t.id === invitation.organization_id);
    const organizationName = tenant?.name || "시공ON";

    return delay(
      ok({
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        organization_name: organizationName,
        status: invitation.status,
        expires_at: invitation.expires_at,
      })
    );
  }

  /**
   * Accept invitation and create user account (public - for accept-invite page)
   */
  async acceptInvitation(token: string, data: { password: string }) {
    const invitations = mockDb.get("invitations");
    const invitation = invitations.find((inv) => inv.token === token);

    if (!invitation) {
      return delay(
        fail<{ user_id: string; message: string }>(
          "NOT_FOUND",
          "유효하지 않은 초대 링크예요"
        )
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return delay(
        fail<{ user_id: string; message: string }>(
          "EXPIRED",
          "만료된 초대 링크예요"
        )
      );
    }

    if (invitation.status !== "pending") {
      return delay(
        fail<{ user_id: string; message: string }>(
          "INVALID_STATUS",
          "이미 처리된 초대예요"
        )
      );
    }

    if (!data.password || data.password.length < 6) {
      return delay(
        fail<{ user_id: string; message: string }>(
          "VALIDATION",
          "비밀번호는 6자 이상이어야 해요"
        )
      );
    }

    // Create user
    const userId = randomId("u");
    const newUser: User = {
      id: userId,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      organization_id: invitation.organization_id,
      is_active: true,
      created_at: nowIso(),
    };

    mockDb.update("users", (prev) => [newUser, ...prev]);

    // Update invitation status
    const updated: Invitation = {
      ...invitation,
      status: "accepted",
      accepted_at: nowIso(),
    };
    mockDb.set(
      "invitations",
      invitations.map((inv) => (inv.token === token ? updated : inv))
    );

    // Update tenant user count
    const tenants = mockDb.get("tenants");
    mockDb.set(
      "tenants",
      tenants.map((t) =>
        t.id === invitation.organization_id
          ? { ...t, users_count: t.users_count + 1 }
          : t
      )
    );

    return delay(
      ok({
        user_id: userId,
        message: "계정이 생성되었어요. 로그인해 주세요.",
      })
    );
  }
}

export const mockApiClient = new MockAPIClient();
