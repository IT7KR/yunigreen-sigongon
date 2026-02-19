import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";
import type {
  APIResponse,
  CustomerMaster,
  PaginatedResponse,
  LoginResponse,
  ProjectListItem,
  ProjectDetail,
  ProjectAccessPolicy,
  SiteVisitDetail,
  DiagnosisDetail,
  EstimateDetail,
  ContractDetail,
  LaborContractListItem,
  ProjectPhotoAlbum,
  ProjectStatus,
  VisitType,
  PhotoType,
  ContractStatus,
  ContractTemplateType,
  LaborContractStatus,
  EstimateStatus,
  ProjectUtilities,
  // Photo Album
  PhotoAlbumListItem,
  PhotoAlbumDetail,
  AlbumLayoutType,
  PhotoAlbumStatus,
  // Construction Report
  ConstructionReportListItem,
  ConstructionReportDetail,
  ReportType,
  ReportStatus,
  // Billing
  SubscriptionDetail,
  SubscriptionPlan,
  PaymentListItem,
  PaymentStatus,
  // Tax Invoice
  TaxInvoiceListItem,
  TaxInvoiceDetail,
  TaxInvoiceType,
  TaxInvoiceStatus,
  // Case / Season
  SeasonInfo,
  SeasonCategoryInfo,
  SeasonCategoryPurpose,
  SeasonDocumentInfo,
  SeasonDocumentStatusInfo,
  EstimationGovernanceOverview,
  DiagnosisCase,
  DiagnosisCaseImage,
  VisionResultDetail,
  DiagnosisCaseEstimate,
} from "@sigongon/types";

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
    public readonly isRetryable: boolean = true,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export interface APIClientConfig {
  baseURL: string;
  onUnauthorized?: () => void;
  getRefreshToken?: () => string | null;
  onTokenRefresh?: (accessToken: string) => void;
  maxRetries?: number;
  retryDelay?: number;
}

// ─── 현장대리인 (Field Representatives) Types ───────────────

export interface FieldRepresentativeRead {
  id: number;
  organization_id: number;
  name: string;
  phone: string;
  grade?: string;
  notes?: string;
  booklet_filename?: string;
  career_cert_filename?: string;
  career_cert_uploaded_at?: string;
  employment_cert_filename?: string;
  created_at: string;
  updated_at: string;
  career_cert_days_remaining?: number;
  assigned_project_ids: number[];
}

export interface FieldRepresentativeCreate {
  name: string;
  phone: string;
  grade?: string;
  notes?: string;
  booklet_filename?: string;
  career_cert_filename?: string;
  career_cert_uploaded_at?: string;
  employment_cert_filename?: string;
}

export interface RepresentativeAssignment {
  id: number;
  project_id: number;
  representative_id: number;
  effective_date: string;
  assigned_at: string;
}

export interface LaborCodebookResponse {
  version: string;
  nationality_codes: Record<string, string>;
  visa_status_codes: Record<string, string>;
  job_type_codes: Record<string, string>;
}

export class APIClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onUnauthorized?: () => void;
  private getRefreshToken?: () => string | null;
  private onTokenRefresh?: (accessToken: string) => void;
  private isRefreshing = false;
  private refreshQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  }> = [];
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: APIClientConfig) {
    this.onUnauthorized = config.onUnauthorized;
    this.getRefreshToken = config.getRefreshToken;
    this.onTokenRefresh = config.onTokenRefresh;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
          _retryCount?: number;
        };

        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;

          const refreshToken = this.refreshToken || this.getRefreshToken?.();

          if (refreshToken) {
            try {
              const newAccessToken =
                await this.handleTokenRefresh(refreshToken);
              if (newAccessToken && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return this.client(originalRequest);
              }
            } catch {
              this.accessToken = null;
              this.onUnauthorized?.();
            }
          } else {
            this.accessToken = null;
            this.onUnauthorized?.();
          }
        }

        if (this.isRetryableError(error) && originalRequest) {
          const retryCount = originalRequest._retryCount ?? 0;

          if (retryCount < this.maxRetries) {
            originalRequest._retryCount = retryCount + 1;

            await this.delay(this.retryDelay * Math.pow(2, retryCount));

            return this.client(originalRequest);
          }
        }

        return Promise.reject(this.transformError(error));
      },
    );
  }

  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      return true;
    }

    const status = error.response.status;
    return status === 408 || status === 429 || status >= 500;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private transformError(error: AxiosError): Error {
    if (!error.response) {
      return new NetworkError(
        "네트워크에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.",
        error,
        true,
      );
    }

    const status = error.response.status;
    const data = error.response.data as
      | Record<string, unknown>
      | undefined;
    const detail = data?.detail;
    const messageFromDetail = typeof detail === "string" ? detail : undefined;
    const messageFromDetailObject =
      detail && typeof detail === "object" && typeof (detail as { message?: unknown }).message === "string"
        ? ((detail as { message: string }).message)
        : undefined;
    const messageFromBody =
      typeof data?.message === "string" ? data.message : undefined;
    const code =
      typeof data?.code === "string" ? data.code : undefined;

    const messages: Record<number, string> = {
      400: "잘못된 요청이에요",
      401: "로그인이 필요해요",
      403: "권한이 없어요",
      404: "요청한 정보를 찾을 수 없어요",
      409: "이미 존재하는 데이터예요",
      422: "입력 값을 확인해 주세요",
      429: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요",
      500: "서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요",
      502: "서버에 연결할 수 없어요",
      503: "서비스가 일시적으로 중단됐어요",
    };

    return new APIError(
      messageFromBody || messageFromDetail || messageFromDetailObject || messages[status] || "알 수 없는 오류가 발생했어요",
      status,
      code,
      detail,
    );
  }

  private async handleTokenRefresh(
    refreshToken: string,
  ): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await axios.post<
        APIResponse<{ access_token: string; expires_in: number }>
      >(
        `${this.client.defaults.baseURL}/auth/refresh`,
        { refresh_token: refreshToken },
        { headers: { "Content-Type": "application/json" } },
      );

      if (response.data.success && response.data.data) {
        const newAccessToken = response.data.data.access_token;
        this.setAccessToken(newAccessToken);
        this.onTokenRefresh?.(newAccessToken);

        this.refreshQueue.forEach(({ resolve }) => resolve(newAccessToken));
        this.refreshQueue = [];

        return newAccessToken;
      }

      throw new Error("Token refresh failed");
    } catch (error) {
      this.refreshQueue.forEach(({ reject }) => reject(error as Error));
      this.refreshQueue = [];
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
  }

  // ============================================
  // Auth
  // ============================================

  async login(username: string, password: string) {
    const response = await this.client.post<APIResponse<LoginResponse>>(
      "/auth/login",
      { username, password },
    );

    if (response.data.success && response.data.data) {
      this.setAccessToken(response.data.data.access_token);
    }

    return response.data;
  }

  async getMe() {
    const response = await this.client.get<
      APIResponse<{
        id: string;
        username?: string;
        email: string;
        name: string;
        phone?: string;
        role: string;
        organization?: {
          id: string;
          name: string;
        };
      }>
    >("/auth/me");
    return response.data;
  }

  async checkUsername(username: string) {
    const response = await this.client.get<APIResponse<{ available: boolean }>>(
      "/auth/check-username",
      { params: { username } },
    );
    return response.data;
  }

  async checkPhone(phone: string) {
    const response = await this.client.get<APIResponse<{ available: boolean }>>(
      "/auth/check-phone",
      { params: { phone } },
    );
    return response.data;
  }

  async checkBusinessNumber(businessNumber: string) {
    const response = await this.client.get<APIResponse<{ available: boolean }>>(
      "/auth/check-business-number",
      { params: { business_number: businessNumber } },
    );
    return response.data;
  }

  async sendOtp(phone: string) {
    const response = await this.client.post<
      APIResponse<{ request_id: string; message: string }>
    >("/auth/otp/send", { phone });
    return response.data;
  }

  async verifyOtp(requestId: string, code: string) {
    const response = await this.client.post<
      APIResponse<{ verified: boolean; message: string }>
    >("/auth/otp/verify", { request_id: requestId, code });
    return response.data;
  }

  async requestPasswordReset(username: string) {
    const response = await this.client.post<
      APIResponse<{ request_id: string; masked_phone: string; message: string }>
    >("/auth/password-reset/request", { username });
    return response.data;
  }

  async confirmPasswordReset(requestId: string, code: string, newPassword: string) {
    const response = await this.client.post<
      APIResponse<{ verified: boolean; message: string }>
    >("/auth/password-reset/confirm", {
      request_id: requestId,
      code,
      new_password: newPassword,
    });
    return response.data;
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
    plan: string;
  }) {
    const response = await this.client.post<
      APIResponse<{ tenant_id: string; user_id: string; access_token: string }>
    >("/auth/register", data);

    if (response.data.success && response.data.data) {
      this.setAccessToken(response.data.data.access_token);
    }

    return response.data;
  }

  // ============================================
  // Customer Masters
  // ============================================

  async getCustomers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    include_inactive?: boolean;
  }) {
    const response = await this.client.get<PaginatedResponse<CustomerMaster>>(
      "/customers",
      { params },
    );
    return response.data;
  }

  async getCustomer(id: string) {
    const response = await this.client.get<APIResponse<CustomerMaster>>(
      `/customers/${id}`,
    );
    return response.data;
  }

  async createCustomer(data: {
    name: string;
    customer_kind?: "company" | "individual";
    representative_name?: string;
    representative_phone?: string;
    business_number?: string;
    contact_name?: string;
    contact_phone?: string;
    license_type?: string;
    is_women_owned?: boolean;
    phone?: string;
    memo?: string;
  }) {
    const response = await this.client.post<APIResponse<CustomerMaster>>(
      "/customers",
      data,
    );
    return response.data;
  }

  async updateCustomer(
    id: string,
    data: {
      name?: string;
      customer_kind?: "company" | "individual";
      representative_name?: string;
      representative_phone?: string;
      business_number?: string;
      contact_name?: string;
      contact_phone?: string;
      license_type?: string;
      is_women_owned?: boolean;
      phone?: string;
      memo?: string;
      is_active?: boolean;
    },
  ) {
    const response = await this.client.patch<APIResponse<CustomerMaster>>(
      `/customers/${id}`,
      data,
    );
    return response.data;
  }

  async upsertCustomer(data: {
    name: string;
    customer_kind?: "company" | "individual";
    representative_name?: string;
    representative_phone?: string;
    business_number?: string;
    contact_name?: string;
    contact_phone?: string;
    license_type?: string;
    is_women_owned?: boolean;
    phone?: string;
    memo?: string;
  }) {
    const response = await this.client.post<APIResponse<CustomerMaster>>(
      "/customers/upsert",
      data,
    );
    return response.data;
  }

  // ============================================
  // Projects
  // ============================================

  async getProjects(params?: {
    page?: number;
    per_page?: number;
    status?: ProjectStatus;
    search?: string;
  }) {
    const response = await this.client.get<PaginatedResponse<ProjectListItem>>(
      "/projects",
      { params },
    );
    return response.data;
  }

  async getProject(id: string) {
    const response = await this.client.get<APIResponse<ProjectDetail>>(
      `/projects/${id}`,
    );
    return response.data;
  }

  async createProject(data: {
    name: string;
    address: string;
    category?: string;
    customer_master_id?: string;
    client_name?: string;
    client_phone?: string;
    notes?: string;
  }) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        name: string;
        status: ProjectStatus;
      }>
    >("/projects", data);
    return response.data;
  }

  async updateProject(
    id: string,
    data: {
      name?: string;
      address?: string;
      category?: string;
      customer_master_id?: string;
      client_name?: string;
      client_phone?: string;
      notes?: string;
    },
  ) {
    const response = await this.client.patch<
      APIResponse<{
        id: string;
        name: string;
        status: ProjectStatus;
      }>
    >(`/projects/${id}`, data);
    return response.data;
  }

  async updateProjectStatus(id: string, status: ProjectStatus) {
    const response = await this.client.patch<
      APIResponse<{
        id: string;
        status: ProjectStatus;
      }>
    >(`/projects/${id}/status`, { status });
    return response.data;
  }

  async deleteProject(id: string) {
    const response = await this.client.delete<APIResponse<void>>(
      `/projects/${id}`,
    );
    return response.data;
  }

  // ============================================
  // Site Visits
  // ============================================

  async getSiteVisits(projectId: string) {
    const response = await this.client.get<APIResponse<SiteVisitDetail[]>>(
      `/projects/${projectId}/site-visits`,
    );
    return response.data;
  }

  async getSiteVisit(visitId: string) {
    const response = await this.client.get<APIResponse<SiteVisitDetail>>(
      `/site-visits/${visitId}`,
    );
    return response.data;
  }

  async createSiteVisit(
    projectId: string,
    data: {
      visit_type: VisitType;
      visited_at: string;
      estimated_area_m2?: string;
      notes?: string;
    },
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        visit_type: VisitType;
        visited_at: string;
        estimated_area_m2?: string;
      }>
    >(`/projects/${projectId}/site-visits`, data);
    return response.data;
  }

  async uploadPhoto(
    visitId: string,
    file: File,
    photoType: PhotoType,
    caption?: string,
  ) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("photo_type", photoType);
    if (caption) {
      formData.append("caption", caption);
    }

    const response = await this.client.post<
      APIResponse<{
        id: string;
        storage_path: string;
        photo_type: PhotoType;
      }>
    >(`/site-visits/${visitId}/photos`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  // ============================================
  // Diagnoses
  // ============================================

  async requestDiagnosis(
    visitId: string,
    data?: {
      additional_notes?: string;
      photo_ids?: string[];
    },
  ) {
    const response = await this.client.post<
      APIResponse<{
        diagnosis_id: string;
        status: string;
        message: string;
      }>
    >(`/site-visits/${visitId}/diagnose`, data || {});
    return response.data;
  }

  async getDiagnosis(diagnosisId: string) {
    const response = await this.client.get<APIResponse<DiagnosisDetail>>(
      `/diagnoses/${diagnosisId}`,
    );
    return response.data;
  }

  async getDiagnoses(projectId: string) {
    const response = await this.client.get<APIResponse<DiagnosisDetail[]>>(
      `/projects/${projectId}/diagnoses`,
    );
    return response.data;
  }

  async updateDiagnosisFieldOpinion(
    diagnosisId: string,
    data: { field_opinion_text: string },
  ) {
    const response = await this.client.patch<
      APIResponse<{
        id: string;
        field_opinion_text: string;
        updated_at: string;
      }>
    >(`/diagnoses/${diagnosisId}/field-opinion`, data);
    return response.data;
  }

  // ============================================
  // Estimates
  // ============================================

  async createEstimate(projectId: string, diagnosisId?: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        version: number;
        status: string;
        total_amount: string;
        lines: Array<{
          id: string;
          description: string;
          quantity: string;
          unit_price_snapshot: string;
          amount: string;
        }>;
      }>
    >(`/projects/${projectId}/estimates`, {
      diagnosis_id: diagnosisId,
      include_confirmed_only: false,
    });
    return response.data;
  }

  async getEstimate(estimateId: string) {
    const response = await this.client.get<APIResponse<EstimateDetail>>(
      `/estimates/${estimateId}`,
    );
    return response.data;
  }

  async issueEstimate(estimateId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: string;
        issued_at: string;
        message: string;
      }>
    >(`/estimates/${estimateId}/issue`);
    return response.data;
  }

  async decideEstimate(
    estimateId: string,
    data: {
      action: "accepted" | "rejected";
      reason?: string;
    },
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: EstimateStatus;
        accepted_at?: string;
        rejected_at?: string;
        message: string;
      }>
    >(`/estimates/${estimateId}/decision`, data);
    return response.data;
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
    const response = await this.client.patch<
      APIResponse<{
        id: string;
        quantity: string;
        unit_price_snapshot: string;
        amount: string;
      }>
    >(`/estimates/${estimateId}/lines/${lineId}`, data);
    return response.data;
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
    const response = await this.client.post<
      APIResponse<{
        id: string;
        description: string;
        amount: string;
      }>
    >(`/estimates/${estimateId}/lines`, data);
    return response.data;
  }

  async deleteEstimateLine(estimateId: string, lineId: string) {
    const response = await this.client.delete<APIResponse<{ message: string }>>(
      `/estimates/${estimateId}/lines/${lineId}`,
    );
    return response.data;
  }

  // ============================================
  // Contracts (계약)
  // ============================================

  async getContracts(projectId: string) {
    const response = await this.client.get<APIResponse<ContractDetail[]>>(
      `/projects/${projectId}/contracts`,
    );
    return response.data;
  }

  async getContract(contractId: string) {
    const response = await this.client.get<APIResponse<ContractDetail>>(
      `/contracts/${contractId}`,
    );
    return response.data;
  }

  async createContract(
    projectId: string,
    data: {
      estimate_id: string;
      template_type?: ContractTemplateType;
      start_date?: string;
      expected_end_date?: string;
      notes?: string;
    },
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        contract_number: string;
        template_type?: ContractTemplateType;
        status: ContractStatus;
      }>
    >(`/projects/${projectId}/contracts`, data);
    return response.data;
  }

  async sendContractForSignature(contractId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: ContractStatus;
        sent_at: string;
        signature_url: string;
      }>
    >(`/contracts/${contractId}/send`);
    return response.data;
  }

  async signContract(
    contractId: string,
    signatureData: string,
    signerType: "client" | "company",
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: ContractStatus;
        signed_at: string;
      }>
    >(`/contracts/${contractId}/sign`, {
      signature_data: signatureData,
      signer_type: signerType,
    });
    return response.data;
  }

  async updateContractStatus(contractId: string, status: ContractStatus) {
    const response = await this.client.patch<
      APIResponse<{
        id: string;
        status: ContractStatus;
      }>
    >(`/contracts/${contractId}`, { status });
    return response.data;
  }

  // Modusign integration
  async requestModusign(
    contractId: string,
    data: { signer_name: string; signer_email: string; signer_phone?: string },
  ) {
    const response = await this.client.post<APIResponse<any>>(
      `/contracts/${contractId}/modusign/request`,
      data,
    );
    return response.data;
  }

  async getModusignStatus(contractId: string) {
    const response = await this.client.get<APIResponse<any>>(
      `/contracts/${contractId}/modusign/status`,
    );
    return response.data;
  }

  async cancelModusign(contractId: string) {
    const response = await this.client.post<APIResponse<void>>(
      `/contracts/${contractId}/modusign/cancel`,
    );
    return response.data;
  }

  async downloadSignedDocument(contractId: string) {
    const response = await this.client.get<APIResponse<any>>(
      `/contracts/${contractId}/modusign/download`,
    );
    return response.data;
  }

  // ============================================
  // Labor Contracts (노무비 관리)
  // ============================================

  async getLaborContracts(projectId: string) {
    const response = await this.client.get<
      APIResponse<LaborContractListItem[]>
    >(`/projects/${projectId}/labor-contracts`);
    return response.data;
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
    const response = await this.client.post<
      APIResponse<{
        id: string;
        worker_name: string;
        status: LaborContractStatus;
      }>
    >(`/projects/${projectId}/labor-contracts`, data);
    return response.data;
  }

  async sendLaborContractForSignature(laborContractId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: LaborContractStatus;
        signature_url: string;
      }>
    >(`/labor-contracts/${laborContractId}/send`);
    return response.data;
  }

  async signLaborContract(laborContractId: string, signatureData: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: LaborContractStatus;
        signed_at: string;
      }>
    >(`/labor-contracts/${laborContractId}/sign`, {
      signature_data: signatureData,
    });
    return response.data;
  }

  async updateLaborContractStatus(
    laborContractId: string,
    status: LaborContractStatus,
  ) {
    const response = await this.client.patch<
      APIResponse<{
        id: string;
        status: LaborContractStatus;
      }>
    >(`/labor-contracts/${laborContractId}`, { status });
    return response.data;
  }

  async getLaborContractsSummary(projectId: string) {
    const response = await this.client.get<
      APIResponse<{
        total_workers: number;
        total_amount: string;
        by_status: Record<LaborContractStatus, number>;
        by_work_type: Record<string, { count: number; amount: string }>;
      }>
    >(`/projects/${projectId}/labor-contracts/summary`);
    return response.data;
  }

  async registerWorker(data: { name: string; phone: string; id_number?: string }) {
    const response = await this.client.post<
      APIResponse<{
        user_id: string;
        is_new: boolean;
        message: string;
      }>
    >("/labor-contracts/workers/register", data);
    return response.data;
  }

  // ============================================
  // Daily Reports (작업일지)
  // ============================================

  async getDailyReports(projectId: string) {
    const response = await this.client.get<
      APIResponse<
        Array<{
          id: string;
          project_id: string;
          work_date: string;
          weather?: string;
          temperature?: string;
          work_description: string;
          tomorrow_plan?: string;
          photos: string[];
          photo_count: number;
          created_at: string;
        }>
      >
    >(`/projects/${projectId}/daily-reports`);
    return response.data;
  }

  async getDailyReport(projectId: string, reportId: string | number) {
    const response = await this.client.get<
      APIResponse<{
        id: string;
        project_id: string;
        work_date: string;
        weather?: string;
        temperature?: string;
        work_description: string;
        tomorrow_plan?: string;
        photos: string[];
        photo_count: number;
        created_at: string;
      }>
    >(`/projects/${projectId}/daily-reports/${reportId}`);
    return response.data;
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
    const response = await this.client.post<
      APIResponse<{
        id: string;
        project_id: string;
        work_date: string;
        weather?: string;
        temperature?: string;
        work_description: string;
        tomorrow_plan?: string;
        photos: string[];
        created_at: string;
      }>
    >(`/projects/${projectId}/daily-reports`, data);
    return response.data;
  }

  async downloadDailyReportHwpx(
    projectId: string,
    reportId: string | number,
  ): Promise<Blob> {
    const response = await this.client.post<Blob>(
      `/projects/${projectId}/daily-reports/${reportId}/hwpx`,
      {},
      { responseType: "blob" },
    );
    return response.data;
  }

  // ============================================
  // Photo Album (준공사진첩)
  // ============================================

  async getProjectPhotoAlbum(projectId: string) {
    const response = await this.client.get<APIResponse<ProjectPhotoAlbum>>(
      `/projects/${projectId}/photo-album`,
    );
    return response.data;
  }

  async getPhotoAlbums(
    projectId: string,
    params?: { page?: number; per_page?: number; status?: PhotoAlbumStatus },
  ) {
    const response = await this.client.get<
      PaginatedResponse<PhotoAlbumListItem>
    >(`/projects/${projectId}/albums`, { params });
    return response.data;
  }

  async getPhotoAlbum(albumId: string) {
    const response = await this.client.get<APIResponse<PhotoAlbumDetail>>(
      `/albums/${albumId}`,
    );
    return response.data;
  }

  async createPhotoAlbum(
    projectId: string,
    data: {
      name: string;
      description?: string;
      layout?: AlbumLayoutType;
    },
  ) {
    const response = await this.client.post<APIResponse<PhotoAlbumDetail>>(
      `/projects/${projectId}/albums`,
      data,
    );
    return response.data;
  }

  async updatePhotoAlbum(
    albumId: string,
    data: {
      name?: string;
      description?: string;
      layout?: AlbumLayoutType;
      status?: PhotoAlbumStatus;
    },
  ) {
    const response = await this.client.put<APIResponse<PhotoAlbumDetail>>(
      `/albums/${albumId}`,
      data,
    );
    return response.data;
  }

  async deletePhotoAlbum(albumId: string) {
    const response = await this.client.delete<APIResponse<void>>(
      `/albums/${albumId}`,
    );
    return response.data;
  }

  async addPhotosToAlbum(albumId: string, photoIds: string[]) {
    const response = await this.client.post<APIResponse<PhotoAlbumDetail>>(
      `/albums/${albumId}/photos`,
      { photo_ids: photoIds },
    );
    return response.data;
  }

  async removePhotoFromAlbum(albumId: string, photoId: string) {
    const response = await this.client.delete<APIResponse<void>>(
      `/albums/${albumId}/photos/${photoId}`,
    );
    return response.data;
  }

  async reorderAlbumPhotos(
    albumId: string,
    photos: Array<{ photo_id: string; sort_order: number }>,
  ) {
    const response = await this.client.put<APIResponse<PhotoAlbumDetail>>(
      `/albums/${albumId}/photos/reorder`,
      { photos },
    );
    return response.data;
  }

  async exportAlbumPdf(albumId: string) {
    const response = await this.client.get<
      APIResponse<{
        album_id: string;
        album_name: string;
        project_name: string;
        layout: string;
        columns: number;
        photo_count: number;
        photos: Array<{
          id: string;
          storage_path: string;
          caption?: string;
          sort_order: number;
        }>;
      }>
    >(`/albums/${albumId}/export`);
    return response.data;
  }

  // ============================================
  // Construction Reports (착공계/준공계)
  // ============================================

  async getConstructionReports(
    projectId: string,
    params?: {
      page?: number;
      per_page?: number;
      report_type?: ReportType;
      status?: ReportStatus;
    },
  ) {
    const response = await this.client.get<
      PaginatedResponse<ConstructionReportListItem>
    >(`/projects/${projectId}/construction-reports`, { params });
    return response.data;
  }

  async getConstructionReport(reportId: string) {
    const response = await this.client.get<
      APIResponse<ConstructionReportDetail>
    >(`/construction-reports/${reportId}`);
    return response.data;
  }

  async createStartReport(
    projectId: string,
    data: {
      construction_name: string;
      site_address?: string;
      start_date: string;
      expected_end_date?: string;
      supervisor_name?: string;
      supervisor_phone?: string;
      auto_link_representative_docs?: boolean;
      notes?: string;
    },
  ) {
    const response = await this.client.post<
      APIResponse<ConstructionReportDetail>
    >(`/projects/${projectId}/construction-reports/start`, data);
    return response.data;
  }

  async createCompletionReport(
    projectId: string,
    data: {
      actual_end_date: string;
      final_amount?: string;
      defect_warranty_period?: number;
      notes?: string;
    },
  ) {
    const response = await this.client.post<
      APIResponse<ConstructionReportDetail>
    >(`/projects/${projectId}/construction-reports/completion`, data);
    return response.data;
  }

  async updateConstructionReport(
    reportId: string,
    data: {
      notes?: string;
      auto_link_representative_docs?: boolean;
      construction_name?: string;
      site_address?: string;
      start_date?: string;
      expected_end_date?: string;
      supervisor_name?: string;
      supervisor_phone?: string;
      actual_end_date?: string;
      final_amount?: string;
      defect_warranty_period?: number;
    },
  ) {
    const response = await this.client.put<
      APIResponse<ConstructionReportDetail>
    >(`/construction-reports/${reportId}`, data);
    return response.data;
  }

  async submitConstructionReport(reportId: string) {
    const response = await this.client.post<
      APIResponse<ConstructionReportDetail>
    >(`/construction-reports/${reportId}/submit`);
    return response.data;
  }

  async approveConstructionReport(reportId: string) {
    const response = await this.client.post<
      APIResponse<ConstructionReportDetail>
    >(`/construction-reports/${reportId}/approve`);
    return response.data;
  }

  async rejectConstructionReport(reportId: string, reason?: string) {
    const response = await this.client.post<
      APIResponse<ConstructionReportDetail>
    >(`/construction-reports/${reportId}/reject`, null, {
      params: { reason },
    });
    return response.data;
  }

  async exportConstructionReport(reportId: string) {
    const response = await this.client.get<
      APIResponse<{
        report_id: string;
        report_number?: string;
        report_type: string;
        report_type_name: string;
        status: string;
        project_name: string;
        [key: string]: unknown;
      }>
    >(`/construction-reports/${reportId}/export`);
    return response.data;
  }

  // ============================================
  // Billing & Subscription (토스페이먼츠)
  // ============================================

  async getSubscription() {
    const response = await this.client.get<APIResponse<SubscriptionDetail>>(
      "/billing/subscription",
    );
    return response.data;
  }

  async confirmPayment(data: {
    payment_key: string;
    order_id: string;
    amount: number;
  }) {
    const response = await this.client.post<
      APIResponse<{
        payment_id: string;
        subscription_id: string;
        status: string;
        expires_at: string;
        message: string;
      }>
    >("/billing/confirm", data);
    return response.data;
  }

  async issueBillingKey(authKey: string) {
    const response = await this.client.post<
      APIResponse<{
        subscription_id: string;
        has_billing_key: boolean;
        message: string;
      }>
    >("/billing/billing-key", { auth_key: authKey });
    return response.data;
  }

  async changePlan(newPlan: SubscriptionPlan) {
    const response = await this.client.put<
      APIResponse<{
        subscription_id: string;
        plan: SubscriptionPlan;
        proration_amount?: number;
        message: string;
      }>
    >("/billing/subscription", { plan: newPlan });
    return response.data;
  }

  async cancelSubscription() {
    const response = await this.client.delete<
      APIResponse<{
        subscription_id: string;
        status: string;
        expires_at: string;
        message: string;
      }>
    >("/billing/subscription");
    return response.data;
  }

  async getPaymentHistory(params?: {
    page?: number;
    per_page?: number;
    status?: PaymentStatus;
  }) {
    const response = await this.client.get<PaginatedResponse<PaymentListItem>>(
      "/billing/payments",
      { params },
    );
    return response.data;
  }

  // ============================================
  // Tax Invoice (팝빌 세금계산서)
  // ============================================

  async getTaxInvoices(
    projectId: string,
    params?: {
      page?: number;
      per_page?: number;
      status?: TaxInvoiceStatus;
    },
  ) {
    const response = await this.client.get<
      PaginatedResponse<TaxInvoiceListItem>
    >(`/projects/${projectId}/tax-invoices`, { params });
    return response.data;
  }

  async getTaxInvoice(invoiceId: string) {
    const response = await this.client.get<APIResponse<TaxInvoiceDetail>>(
      `/tax-invoices/${invoiceId}`,
    );
    return response.data;
  }

  async getTaxInvoiceDetail(invoiceId: string) {
    return this.getTaxInvoice(invoiceId);
  }

  async createTaxInvoice(
    projectId: string,
    data: {
      invoice_type?: TaxInvoiceType;
      supply_amount: string;
      tax_amount: string;
      buyer_corp_num: string;
      buyer_name: string;
      buyer_ceo?: string;
      buyer_address?: string;
      buyer_email?: string;
      description?: string;
      remark?: string;
      issue_date?: string;
    },
  ) {
    const response = await this.client.post<APIResponse<TaxInvoiceDetail>>(
      `/projects/${projectId}/tax-invoices`,
      data,
    );
    return response.data;
  }

  async updateTaxInvoice(
    invoiceId: string,
    data: {
      supply_amount?: string;
      tax_amount?: string;
      buyer_corp_num?: string;
      buyer_name?: string;
      buyer_ceo?: string;
      buyer_address?: string;
      buyer_email?: string;
      description?: string;
      remark?: string;
      issue_date?: string;
    },
  ) {
    const response = await this.client.put<APIResponse<TaxInvoiceDetail>>(
      `/tax-invoices/${invoiceId}`,
      data,
    );
    return response.data;
  }

  async issueTaxInvoice(invoiceId: string, data?: { memo?: string }) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: TaxInvoiceStatus;
        issue_id?: string;
        issued_at: string;
        message: string;
      }>
    >(`/tax-invoices/${invoiceId}/issue`, data || {});
    return response.data;
  }

  async cancelTaxInvoice(invoiceId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: TaxInvoiceStatus;
        cancelled_at: string;
        message: string;
      }>
    >(`/tax-invoices/${invoiceId}/cancel`);
    return response.data;
  }

  async retryTaxInvoice(invoiceId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: TaxInvoiceStatus;
        message: string;
      }>
    >(`/tax-invoices/${invoiceId}/retry`);
    return response.data;
  }

  async getTaxInvoicePopupUrl(invoiceId: string) {
    const response = await this.client.get<
      APIResponse<{
        popup_url: string;
        expires_at: string;
      }>
    >(`/tax-invoices/${invoiceId}/popup-url`);
    return response.data;
  }

  async getProjectAccess(projectId: string) {
    const response = await this.client.get<APIResponse<ProjectAccessPolicy>>(
      `/projects/${projectId}/access`,
    );
    return response.data;
  }

  async updateProjectAccess(
    projectId: string,
    data: { manager_ids: string[] },
  ) {
    const response = await this.client.put<APIResponse<ProjectAccessPolicy>>(
      `/projects/${projectId}/access`,
      data,
    );
    return response.data;
  }

  // ============================================
  // Warranty (하자보증)
  // ============================================

  async getWarrantyInfo(projectId: string) {
    const response = await this.client.get<
      APIResponse<{
        project_id: string;
        warranty_expires_at: string;
        days_remaining: number;
        is_expired: boolean;
        as_requests: Array<{
          id: string;
          description: string;
          status: string;
          created_at: string;
          resolved_at?: string;
        }>;
      }>
    >(`/projects/${projectId}/warranty`);
    return response.data;
  }

  async createASRequest(
    projectId: string,
    data: {
      description: string;
      photos?: string[];
    },
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: string;
        message: string;
      }>
    >(`/projects/${projectId}/warranty/as-requests`, data);
    return response.data;
  }

  async completeProject(projectId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: ProjectStatus;
        completed_at: string;
        warranty_expires_at: string;
      }>
    >(`/projects/${projectId}/complete`);
    return response.data;
  }

  // ============================================
  // Utilities (수도광열비)
  // ============================================

  async getUtilities(projectId: string) {
    const response = await this.client.get<APIResponse<ProjectUtilities>>(
      `/projects/${projectId}/utilities`,
    );
    return response.data;
  }

  async updateUtilityStatus(
    projectId: string,
    utilityId: string,
    data: {
      status?: "pending" | "completed";
      doc_status?: "pending" | "submitted";
    },
  ) {
    const response = await this.client.patch<APIResponse<{ id: string }>>(
      `/projects/${projectId}/utilities/${utilityId}`,
      data,
    );
    return response.data;
  }

  // ============================================
  // Partners (협력사)
  // ============================================

  async getPartners(params?: { search?: string; status?: string }) {
    const response = await this.client.get<
      APIResponse<
        Array<{
          id: string;
          name: string;
          representative_name: string;
          representative_phone?: string;
          business_number: string;
          contact_name?: string;
          contact_phone?: string;
          license_type?: string;
          is_women_owned: boolean;
          // Legacy compatibility
          owner?: string;
          biz_no?: string;
          license?: string;
          is_female_owned?: boolean;
          status: "active" | "inactive";
        }>
      >
    >("/partners", { params });
    return response.data;
  }

  async createPartner(data: {
    name: string;
    representative_name?: string;
    representative_phone?: string;
    business_number?: string;
    contact_name?: string;
    contact_phone?: string;
    license_type?: string;
    is_women_owned?: boolean;
    // Legacy compatibility
    owner?: string;
    biz_no?: string;
    license?: string;
    is_female_owned?: boolean;
  }) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        name: string;
        representative_name: string;
        representative_phone?: string;
        business_number: string;
        contact_name?: string;
        contact_phone?: string;
        license_type?: string;
        is_women_owned: boolean;
        // Legacy compatibility
        owner?: string;
        biz_no?: string;
        license?: string;
        is_female_owned?: boolean;
        status: "active" | "inactive";
      }>
    >("/partners", data);
    return response.data;
  }

  async updatePartner(
    id: string,
    data: {
      name?: string;
      representative_name?: string;
      representative_phone?: string;
      business_number?: string;
      contact_name?: string;
      contact_phone?: string;
      license_type?: string;
      is_women_owned?: boolean;
      // Legacy compatibility
      owner?: string;
      biz_no?: string;
      license?: string;
      is_female_owned?: boolean;
    },
  ) {
    const response = await this.client.patch<
      APIResponse<{
        id: string;
        name: string;
        representative_name: string;
        representative_phone?: string;
        business_number: string;
        contact_name?: string;
        contact_phone?: string;
        license_type?: string;
        is_women_owned: boolean;
        // Legacy compatibility
        owner?: string;
        biz_no?: string;
        license?: string;
        is_female_owned?: boolean;
        status: "active" | "inactive";
      }>
    >(`/partners/${id}`, data);
    return response.data;
  }

  async deletePartner(id: string) {
    const response = await this.client.delete<APIResponse<void>>(
      `/partners/${id}`,
    );
    return response.data;
  }

  async togglePartnerStatus(id: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: "active" | "inactive";
        message: string;
      }>
    >(`/partners/${id}/toggle-status`);
    return response.data;
  }

  // ============================================
  // Licenses (면허)
  // ============================================

  async getLicenses(params: {
    owner_type: "organization" | "customer" | "partner";
    owner_id: string | number;
    include_deleted?: boolean;
  }) {
    const response = await this.client.get<
      APIResponse<
        Array<{
          id: string;
          organization_id: string;
          owner_type: "organization" | "customer" | "partner";
          owner_id: string;
          license_name: string;
          license_number?: string;
          issuer?: string;
          issued_on?: string;
          expires_on?: string;
          status: "active" | "expired" | "revoked";
          is_primary: boolean;
          notes?: string;
          created_at: string;
          updated_at: string;
          files: Array<{
            id: string;
            license_record_id: string;
            storage_path: string;
            original_filename: string;
            mime_type?: string;
            file_size_bytes: number;
            page_type: "front" | "back" | "attachment" | "unknown";
            sort_order: number;
            uploaded_at: string;
          }>;
        }>
      >
    >("/licenses", { params });
    return response.data;
  }

  async createLicense(data: {
    owner_type: "organization" | "customer" | "partner";
    owner_id: string | number;
    license_name: string;
    license_number?: string;
    issuer?: string;
    issued_on?: string;
    expires_on?: string;
    status?: "active" | "expired" | "revoked";
    is_primary?: boolean;
    notes?: string;
  }) {
    const response = await this.client.post<APIResponse<any>>("/licenses", data);
    return response.data;
  }

  async updateLicense(
    licenseId: string,
    data: {
      license_name?: string;
      license_number?: string;
      issuer?: string;
      issued_on?: string;
      expires_on?: string;
      status?: "active" | "expired" | "revoked";
      is_primary?: boolean;
      notes?: string;
    },
  ) {
    const response = await this.client.patch<APIResponse<any>>(
      `/licenses/${licenseId}`,
      data,
    );
    return response.data;
  }

  async deleteLicense(licenseId: string) {
    const response = await this.client.delete<
      APIResponse<{ deleted: boolean; id: string }>
    >(`/licenses/${licenseId}`);
    return response.data;
  }

  async uploadLicenseFile(
    licenseId: string,
    file: File,
    options?: {
      page_type?: "front" | "back" | "attachment" | "unknown";
      sort_order?: number;
    },
  ) {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.page_type) {
      formData.append("page_type", options.page_type);
    }
    if (typeof options?.sort_order === "number") {
      formData.append("sort_order", String(options.sort_order));
    }
    const response = await this.client.post<
      APIResponse<{
        id: string;
        license_record_id: string;
        storage_path: string;
        original_filename: string;
        mime_type?: string;
        file_size_bytes: number;
        page_type: "front" | "back" | "attachment" | "unknown";
        sort_order: number;
        uploaded_at: string;
      }>
    >(`/licenses/${licenseId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async deleteLicenseFile(licenseId: string, fileId: string) {
    const response = await this.client.delete<
      APIResponse<{ deleted: boolean; id: string }>
    >(`/licenses/${licenseId}/files/${fileId}`);
    return response.data;
  }

  // ============================================
  // Labor Overview (노무 관리)
  // ============================================

  async getSALaborOverview() {
    const response = await this.client.get<
      APIResponse<{
        summary: {
          active_workers: number;
          pending_paystubs: number;
          unsigned_contracts: number;
          organizations_with_workers: number;
        };
        workers: Array<{
          id: string;
          name: string;
          role: string;
          organization_id: string;
          organization_name: string;
          status: "active" | "inactive";
          contract_status: "signed" | "pending";
          last_work_date: string;
        }>;
        tenant_worker_distribution: Array<{
          organization_id: string;
          organization_name: string;
          worker_count: number;
        }>;
      }>
    >("/admin/labor/overview");
    return response.data;
  }

  async getLaborOverview() {
    const response = await this.client.get<
      APIResponse<{
        summary: {
          active_workers: number;
          pending_paystubs: number;
          unsigned_contracts: number;
        };
        workers: Array<{
          id: string;
          name: string;
          role: string;
          status: "active" | "inactive";
          contract_status: "signed" | "pending";
          last_work_date: string;
        }>;
      }>
    >("/labor/overview");
    return response.data;
  }

  async batchSendPaystubs() {
    const response = await this.client.post<
      APIResponse<{
        sent_count: number;
        message?: string;
      }>
    >("/labor/paystubs/batch-send");
    return response.data;
  }

  // ============================================
  // Daily Labor Reporting (일용신고)
  // ============================================

  async getDailyWorkers() {
    const response = await this.client.get<APIResponse<any[]>>("/labor/daily-workers");
    return response.data;
  }

  async getLaborCodebook() {
    const response = await this.client.get<APIResponse<LaborCodebookResponse>>("/labor/codebook");
    return response.data;
  }

  async createDailyWorker(data: any) {
    const response = await this.client.post<APIResponse<any>>("/labor/daily-workers", data);
    return response.data;
  }

  async updateDailyWorker(id: string, data: any) {
    const response = await this.client.patch<APIResponse<any>>(`/labor/daily-workers/${id}`, data);
    return response.data;
  }

  async deleteDailyWorker(id: string) {
    const response = await this.client.delete<APIResponse<any>>(`/labor/daily-workers/${id}`);
    return response.data;
  }

  async getWorkRecords(projectId: string, year: number, month: number) {
    const response = await this.client.get<APIResponse<any[]>>(`/labor/work-records`, {
      params: { project_id: projectId, year, month },
    });
    return response.data;
  }

  async upsertWorkRecords(records: any[]) {
    const response = await this.client.post<APIResponse<any>>("/labor/work-records/batch", { records });
    return response.data;
  }

  async deleteWorkRecord(id: string) {
    const response = await this.client.delete<APIResponse<any>>(`/labor/work-records/${id}`);
    return response.data;
  }

  async generateSiteReport(projectId: string, year: number, month: number) {
    const response = await this.client.get<APIResponse<any>>(`/labor/reports/site`, {
      params: { project_id: projectId, year, month },
    });
    return response.data;
  }

  async generateConsolidatedReport(year: number, month: number) {
    const response = await this.client.get<APIResponse<any>>(`/labor/reports/consolidated`, {
      params: { year, month },
    });
    return response.data;
  }

  async getInsuranceRates(year?: number) {
    const response = await this.client.get<APIResponse<any[]>>("/labor/insurance-rates", {
      params: year ? { year } : {},
    });
    return response.data;
  }

  async updateInsuranceRates(id: string, data: any) {
    const response = await this.client.patch<APIResponse<any>>(`/labor/insurance-rates/${id}`, data);
    return response.data;
  }

  async createInsuranceRates(data: any) {
    const response = await this.client.post<APIResponse<any>>("/labor/insurance-rates", data);
    return response.data;
  }

  // ============================================
  // Billing (구독)
  // ============================================

  async getBillingOverview() {
    const response = await this.client.get<
      APIResponse<{
        plan: string;
        interval: "monthly" | "yearly";
        next_billing_at: string;
        seats_used: number;
        seats_total: number;
        payment_method: {
          brand: string;
          last4: string;
          expires: string;
        } | null;
        history: Array<{
          id: string;
          date: string;
          description: string;
          amount: number;
          status: "paid" | "failed";
        }>;
      }>
    >("/billing/overview");
    return response.data;
  }

  async changePaymentMethod(data: { card_number: string; expiry: string }) {
    const response = await this.client.post<
      APIResponse<{
        billing_key: string;
        payment_method: {
          brand: string;
          last4: string;
          expires: string;
        };
        message: string;
      }>
    >("/billing/payment-method", data);
    return response.data;
  }

  async getSADashboard() {
    const response = await this.client.get<
      APIResponse<{
        total_tenants: number;
        active_tenants: number;
        total_revenue: number;
        monthly_revenue: number;
        recent_signups: Array<{
          id: string;
          company_name: string;
          plan: string;
          created_at: string;
        }>;
        subscription_breakdown: Record<string, number>;
      }>
    >("/admin/sa-dashboard");
    return response.data;
  }

  async getDashboardSummary(): Promise<
    APIResponse<{
      monthly_revenue: number;
      monthly_collection: number;
      receivables: number;
      monthly_workers: number;
      recent_logs: Array<{
        id: string;
        project: string;
        date: string;
        summary: string;
      }>;
    }>
  > {
    const response = await this.client.get<
      APIResponse<{
        monthly_revenue: number;
        monthly_collection: number;
        receivables: number;
        monthly_workers: number;
        recent_logs: Array<{
          id: string;
          project: string;
          date: string;
          summary: string;
        }>;
      }>
    >("/dashboard/summary");
    return response.data;
  }

  async getProjectStats(): Promise<
    APIResponse<{
      total: number;
      in_progress: number;
      completed: number;
      this_month: number;
    }>
  > {
    const response = await this.client.get<
      APIResponse<{
        total: number;
        in_progress: number;
        completed: number;
        this_month: number;
      }>
    >("/dashboard/projects/stats");
    return response.data;
  }

  async getExpiringSubscriptions(days?: number): Promise<
    APIResponse<{
      items: Array<{
        id: string;
        company_name: string;
        plan: string;
        expires_at: string;
        days_remaining: number;
      }>;
      total: number;
    }>
  > {
    const response = await this.client.get<
      APIResponse<{
        items: Array<{
          id: string;
          company_name: string;
          plan: string;
          expires_at: string;
          days_remaining: number;
        }>;
        total: number;
      }>
    >("/admin/subscriptions/expiring", { params: { days } });
    return response.data;
  }

  async getTenants(params?: { page?: number; search?: string }) {
    const response = await this.client.get<
      PaginatedResponse<{
        id: string;
        name: string;
        plan: "trial" | "basic" | "pro";
        users_count: number;
        projects_count: number;
        created_at: string;
        billing_amount?: number;
      }>
    >("/admin/tenants", { params });
    return response.data;
  }

  async getTenant(tenantId: string) {
    const response = await this.client.get<
      APIResponse<{
        id: string;
        name: string;
        plan: "trial" | "basic" | "pro";
        users_count: number;
        projects_count: number;
        created_at: string;
        business_number?: string;
        representative?: string;
        rep_phone?: string;
        rep_email?: string;
        contact_name?: string;
        contact_phone?: string;
        contact_position?: string;
        subscription_start_date: string;
        subscription_end_date: string;
        is_custom_trial: boolean;
        billing_amount: number;
        is_active?: boolean;
      }>
    >(`/admin/tenants/${tenantId}`);
    return response.data;
  }

  async setCustomTrialPeriod(
    tenantId: string,
    data: {
      end_date: string;
      reason?: string;
    },
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        subscription_end_date: string;
        is_custom_trial: boolean;
      }>
    >(`/admin/tenants/${tenantId}/custom-trial`, data);
    return response.data;
  }

  async createInvitation(data: {
    phone: string;
    name: string;
    role: string;
    organization_id?: string;
  }) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        token: string;
        invite_url: string;
      }>
    >("/invitations", data);
    return response.data;
  }

  async getInvitations(params?: {
    status?: "pending" | "accepted" | "expired" | "revoked";
    page?: number;
    per_page?: number;
  }) {
    const response = await this.client.get<
      PaginatedResponse<{
        id: string;
        phone: string;
        name: string;
        role: string;
        status: "pending" | "accepted" | "expired" | "revoked";
        created_at: string;
        expires_at: string;
      }>
    >("/invitations", { params });
    return response.data;
  }

  async getInvitationByToken(token: string) {
    const response = await this.client.get<
      APIResponse<{
        id: string;
        email: string;
        name: string;
        role: string;
        organization_name: string;
        status: string;
        expires_at: string;
      }>
    >(`/invitations/${token}`);
    return response.data;
  }

  async acceptInvitation(token: string, data: { password: string }) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: string;
      }>
    >(`/invitations/${token}/accept`, data);
    return response.data;
  }

  async resendInvitation(invitationId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        token: string;
        invite_url: string;
      }>
    >(`/invitations/${invitationId}/resend`);
    return response.data;
  }

  async revokeInvitation(invitationId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: "revoked";
      }>
    >(`/invitations/${invitationId}/revoke`);
    return response.data;
  }

  // ============================================
  // Workers (일용직 앱)
  // ============================================

  async requestWorkerAccess(phone: string) {
    const response = await this.client.post<
      APIResponse<{ request_id: string }>
    >("/workers/access", { phone });
    return response.data;
  }

  async verifyWorkerAccess(requestId: string, code: string) {
    const response = await this.client.post<APIResponse<{ worker_id: string }>>(
      "/workers/verify",
      { request_id: requestId, code },
    );
    return response.data;
  }

  async verifyWorkerInvite(inviteToken: string) {
    const response = await this.client.post<APIResponse<{ worker_id: string }>>(
      "/workers/invite/verify",
      { invite_token: inviteToken },
    );
    return response.data;
  }

  async getWorkerContract(contractId: string) {
    const response = await this.client.get<
      APIResponse<{
        id: string;
        project_name: string;
        work_date: string;
        role: string;
        daily_rate: number;
        status: "pending" | "signed";
        content: string;
      }>
    >(`/workers/contracts/${contractId}`);
    return response.data;
  }

  async signWorkerContract(contractId: string, signatureData: string) {
    const response = await this.client.post<
      APIResponse<{ id: string; status: "signed"; signed_at: string }>
    >(`/workers/contracts/${contractId}/sign`, {
      signature_data: signatureData,
    });
    return response.data;
  }

  async getWorkerPaystubs(workerId: string) {
    const response = await this.client.get<
      APIResponse<
        Array<{
          id: string;
          month: string;
          amount: number;
          status: "sent" | "confirmed";
          date: string;
        }>
      >
    >(`/workers/${workerId}/paystubs`);
    return response.data;
  }

  async getWorkerPaystub(workerId: string, paystubId: string) {
    const response = await this.client.get<
      APIResponse<{
        id: string;
        title: string;
        total_amount: number;
        deductions: number;
        net_amount: number;
        items: Array<{ label: string; amount: number }>;
        status: "sent" | "confirmed";
      }>
    >(`/workers/${workerId}/paystubs/${paystubId}`);
    return response.data;
  }

  async ackWorkerPaystub(workerId: string, paystubId: string) {
    const response = await this.client.post<
      APIResponse<{ received_at: string }>
    >(`/workers/${workerId}/paystubs/${paystubId}/ack`);
    return response.data;
  }

  async getWorkerProfile(workerId: string) {
    const response = await this.client.get<
      APIResponse<{
        id: string;
        name: string;
        role: string;
        documents: Array<{
          id: string;
          name: string;
          status: "submitted" | "pending";
        }>;
      }>
    >(`/workers/${workerId}/profile`);
    return response.data;
  }

  async uploadWorkerDocument(workerId: string, docId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.client.post<
      APIResponse<{
        id: string;
        document_id: string;
        storage_path: string;
        status: "submitted";
        uploaded_at: string;
      }>
    >(`/workers/${workerId}/documents/${docId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  // ============================================
  // Notifications (모바일)
  // ============================================

  async getNotifications() {
    const response = await this.client.get<
      APIResponse<
        Array<{
          id: string;
          type: "contract" | "paystub" | "notice";
          title: string;
          message: string;
          time: string;
          read: boolean;
        }>
      >
    >("/notifications");
    return response.data;
  }

  async markNotificationRead(notificationId: string) {
    const response = await this.client.post<
      APIResponse<{ id: string; read: boolean }>
    >(`/notifications/${notificationId}/read`);
    return response.data;
  }

  // ============================================
  // MyPage / Account
  // ============================================

  async updateMyProfile(data: {
    name?: string;
    email?: string;
    phone?: string;
  }) {
    const response = await this.client.patch<
      APIResponse<{
        id: string;
        name: string;
        email?: string;
        phone?: string;
      }>
    >("/me/profile", data);
    return response.data;
  }

  async getMyNotificationPrefs() {
    const response = await this.client.get<
      APIResponse<{
        user_id: string;
        email_notifications: boolean;
        project_status_change: boolean;
        estimate_contract_alerts: boolean;
        daily_report_alerts: boolean;
        platform_announcements: boolean;
      }>
    >("/me/notification-prefs");
    return response.data;
  }

  async updateMyNotificationPrefs(data: {
    email_notifications: boolean;
    project_status_change: boolean;
    estimate_contract_alerts: boolean;
    daily_report_alerts: boolean;
    platform_announcements: boolean;
  }) {
    const response = await this.client.put<
      APIResponse<{
        user_id: string;
        email_notifications: boolean;
        project_status_change: boolean;
        estimate_contract_alerts: boolean;
        daily_report_alerts: boolean;
        platform_announcements: boolean;
      }>
    >("/me/notification-prefs", data);
    return response.data;
  }

  async getMyActivityLog(page: number = 1, perPage: number = 20) {
    const response = await this.client.get<
      PaginatedResponse<{
        id: string;
        user_id: string;
        action: string;
        description: string;
        ip_address: string;
        device_info: string;
        created_at: string;
      }>
    >("/me/activity-log", {
      params: { page, per_page: perPage },
    });
    return response.data;
  }

  async changeMyPassword(data: {
    current_password: string;
    new_password: string;
  }) {
    const response = await this.client.post<
      APIResponse<{
        changed: boolean;
      }>
    >("/me/change-password", data);
    return response.data;
  }

  async logoutAllDevices() {
    const response = await this.client.post<
      APIResponse<{
        logged_out: boolean;
      }>
    >("/me/logout-all-devices");
    return response.data;
  }

  async requestAccountDeactivation() {
    const response = await this.client.post<
      APIResponse<{
        requested: boolean;
      }>
    >("/me/account-deactivation");
    return response.data;
  }

  async requestAccountDeletion(data: { password: string; reason?: string }) {
    const response = await this.client.post<
      APIResponse<{
        requested: boolean;
      }>
    >("/me/account-deletion", data);
    return response.data;
  }

  // ============================================
  // RAG
  // ============================================

  async searchRAG(query: string, topK: number = 5) {
    const response = await this.client.post<
      APIResponse<
        Array<{
          chunk_text: string;
          source_file: string;
          source_page?: number;
          category?: string;
          relevance_score: number;
        }>
      >
    >("/rag/search", { query, top_k: topK });
    return response.data;
  }

  // ============================================
  // Users (Admin)
  // ============================================

  async getUsers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    role?: string;
    is_active?: boolean;
  }) {
    const response = await this.client.get<
      PaginatedResponse<{
        id: string;
        email: string;
        name: string;
        phone?: string;
        role: string;
        is_active: boolean;
        created_at: string;
        last_login_at?: string;
      }>
    >("/users", { params });
    return response.data;
  }

  async createUser(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: string;
  }) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        email: string;
        name: string;
        role: string;
        message: string;
      }>
    >("/users", data);
    return response.data;
  }

  async updateUser(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      role?: string;
      is_active?: boolean;
    },
  ) {
    const response = await this.client.patch<
      APIResponse<{
        id: string;
        email: string;
        name: string;
        role: string;
        is_active: boolean;
      }>
    >(`/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.client.delete<APIResponse<void>>(
      `/users/${userId}`,
    );
    return response.data;
  }

  // ============================================
  // Pricebooks (Admin)
  // ============================================

  async getRevisions(pricebookId?: string) {
    const response = await this.client.get<
      APIResponse<
        Array<{
          id: string;
          pricebook_id: string;
          version_label: string;
          effective_from: string;
          effective_to?: string;
          status: string;
          created_at: string;
          activated_at?: string;
          item_count: number;
        }>
      >
    >("/pricebooks/revisions", { params: { pricebook_id: pricebookId } });
    return response.data;
  }

  async getStagingItems(
    revisionId: string,
    params?: {
      page?: number;
      per_page?: number;
      status?: string;
      confidence?: string;
    },
  ) {
    const response = await this.client.get<
      PaginatedResponse<{
        id: string;
        item_name: string;
        specification?: string;
        unit: string;
        unit_price_extracted: string;
        confidence_score: number;
        confidence_level: string;
        status: string;
        source_page?: number;
        created_at: string;
      }>
    >(`/pricebooks/revisions/${revisionId}/staging`, { params });
    return response.data;
  }

  async reviewStagingItem(
    stagingId: string,
    data: {
      action: "approved" | "rejected";
      corrected_price?: string;
      corrected_item_name?: string;
      corrected_unit?: string;
      review_note?: string;
    },
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        status: string;
      }>
    >(`/pricebooks/staging/${stagingId}/review`, data);
    return response.data;
  }

  async bulkReviewStaging(
    revisionId: string,
    data: {
      staging_ids: string[];
      action: "approved" | "rejected";
      review_note?: string;
    },
  ) {
    const response = await this.client.post<
      APIResponse<{
        updated_count: number;
        message: string;
      }>
    >(`/pricebooks/revisions/${revisionId}/staging/bulk-review`, data);
    return response.data;
  }

  async uploadPricebookPdf(
    file: File,
    versionLabel: string,
    effectiveFrom: string,
  ) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("version_label", versionLabel);
    formData.append("effective_from", effectiveFrom);

    const response = await this.client.post<
      APIResponse<{
        id: string;
        version_label: string;
        status: string;
        processing_status: string;
        staging_items_count: number;
        message: string;
      }>
    >("/pricebooks/revisions", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  async activateRevision(revisionId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        version_label: string;
        status: string;
        message: string;
      }>
    >(`/pricebooks/revisions/${revisionId}/activate`);
    return response.data;
  }

  async deleteRevision(revisionId: string) {
    const response = await this.client.delete<APIResponse<void>>(
      `/pricebooks/revisions/${revisionId}`,
    );
    return response.data;
  }

  async promoteApprovedStaging(revisionId: string) {
    const response = await this.client.post<
      APIResponse<{
        promoted_count: number;
        message: string;
      }>
    >(`/pricebooks/revisions/${revisionId}/promote`);
    return response.data;
  }

  async autoApproveStaging(
    revisionId: string,
    minConfidence: number = 0.9,
    requireGrounding: boolean = true,
  ) {
    const response = await this.client.post<
      APIResponse<{
        approved_count: number;
        message: string;
      }>
    >(`/pricebooks/revisions/${revisionId}/staging/auto-approve`, null, {
      params: {
        min_confidence: minConfidence,
        require_grounding: requireGrounding,
      },
    });
    return response.data;
  }

  async validatePricebookRevision(revisionId: number | string): Promise<
    APIResponse<{
      total_items: number;
      valid_count: number;
      warning_count: number;
      error_count: number;
      is_valid: boolean;
      issues: Array<{
        item_index: number;
        item_name: string;
        field: string;
        severity: "ok" | "warning" | "error";
        message: string;
        value?: string | null;
      }>;
    }>
  > {
    const response = await this.client.get(
      `/pricebooks/revisions/${revisionId}/validate`,
    );
    return response.data;
  }

  // ============================================
  // Case / Season Estimation
  // ============================================

  async getSeasons() {
    const response = await this.client.get<APIResponse<SeasonInfo[]>>("/seasons");
    return response.data;
  }

  async getActiveSeason() {
    const response = await this.client.get<APIResponse<SeasonInfo>>("/seasons/active");
    return response.data;
  }

  async createSeason(data: { name: string; is_active?: boolean }) {
    const response = await this.client.post<APIResponse<SeasonInfo>>(
      "/admin/seasons",
      data,
    );
    return response.data;
  }

  async updateSeason(seasonId: number, data: { is_active: boolean }) {
    const response = await this.client.patch<APIResponse<SeasonInfo>>(
      `/admin/seasons/${seasonId}`,
      data,
    );
    return response.data;
  }

  async getAdminSeasonCategories(params?: {
    season_id?: number;
    purpose?: SeasonCategoryPurpose;
    is_enabled?: boolean;
  }) {
    const response = await this.client.get<APIResponse<SeasonCategoryInfo[]>>(
      "/admin/season-categories",
      { params },
    );
    return response.data;
  }

  async createAdminSeasonCategory(data: {
    season_id: number;
    name: string;
    purpose?: SeasonCategoryPurpose;
    is_enabled?: boolean;
    sort_order?: number;
  }) {
    const response = await this.client.post<APIResponse<SeasonCategoryInfo>>(
      "/admin/season-categories",
      data,
    );
    return response.data;
  }

  async updateAdminSeasonCategory(
    categoryId: number,
    data: {
      name?: string;
      is_enabled?: boolean;
      sort_order?: number;
    },
  ) {
    const response = await this.client.patch<APIResponse<SeasonCategoryInfo>>(
      `/admin/season-categories/${categoryId}`,
      data,
    );
    return response.data;
  }

  async getAdminDocuments(params?: {
    season_id?: number;
    category_id?: number;
    purpose?: SeasonCategoryPurpose;
    is_enabled?: boolean;
  }) {
    const response = await this.client.get<APIResponse<SeasonDocumentInfo[]>>(
      "/admin/documents",
      { params },
    );
    return response.data;
  }

  async createAdminDocument(data: {
    season_id: number;
    category_id?: number;
    category?: string;
    title: string;
    file_name: string;
  }) {
    const response = await this.client.post<APIResponse<SeasonDocumentInfo>>(
      "/admin/documents",
      data,
    );
    return response.data;
  }

  async uploadAdminDocumentFile(data: {
    season_id: number;
    category_id?: number;
    category?: string;
    title?: string;
    file: File;
  }) {
    const formData = new FormData();
    formData.append("season_id", String(data.season_id));
    if (data.category_id) {
      formData.append("category_id", String(data.category_id));
    }
    if (data.category) {
      formData.append("category", data.category);
    }
    if (data.title) {
      formData.append("title", data.title);
    }
    formData.append("file", data.file);

    const response = await this.client.post<APIResponse<SeasonDocumentInfo>>(
      "/admin/documents/upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  }

  async ingestAdminDocument(documentId: number) {
    const response = await this.client.post<APIResponse<SeasonDocumentStatusInfo>>(
      `/admin/documents/${documentId}/ingest`,
    );
    return response.data;
  }

  async updateAdminDocument(documentId: number, data: { is_enabled: boolean }) {
    const response = await this.client.patch<APIResponse<SeasonDocumentInfo>>(
      `/admin/documents/${documentId}`,
      data,
    );
    return response.data;
  }

  async getAdminDocumentStatus(documentId: number) {
    const response = await this.client.get<APIResponse<SeasonDocumentStatusInfo>>(
      `/admin/documents/${documentId}/status`,
    );
    return response.data;
  }

  async getEstimationGovernanceOverview() {
    const response = await this.client.get<APIResponse<EstimationGovernanceOverview>>(
      "/admin/estimation-governance/overview",
    );
    return response.data;
  }

  async listCases() {
    const response = await this.client.get<APIResponse<DiagnosisCase[]>>("/cases");
    return response.data;
  }

  async createCase(data?: { season_id?: number }) {
    const response = await this.client.post<APIResponse<DiagnosisCase>>(
      "/cases",
      data || {},
    );
    return response.data;
  }

  async getCase(caseId: number) {
    const response = await this.client.get<APIResponse<DiagnosisCase>>(
      `/cases/${caseId}`,
    );
    return response.data;
  }

  async getCaseImages(caseId: number) {
    const response = await this.client.get<APIResponse<DiagnosisCaseImage[]>>(
      `/cases/${caseId}/images`,
    );
    return response.data;
  }

  async uploadCaseImage(
    caseId: number,
    file: File,
    metaJson?: Record<string, unknown>,
  ) {
    const formData = new FormData();
    formData.append("file", file);
    if (metaJson) {
      formData.append("meta_json", JSON.stringify(metaJson));
    }
    const response = await this.client.post<APIResponse<DiagnosisCaseImage>>(
      `/cases/${caseId}/images`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  }

  async runCaseVision(caseId: number, data?: { extra_context?: string }) {
    const response = await this.client.post<APIResponse<VisionResultDetail>>(
      `/cases/${caseId}/vision`,
      data || {},
    );
    return response.data;
  }

  async updateCaseVision(
    caseId: number,
    data: { result_json: VisionResultDetail["result_json"]; confidence?: number },
  ) {
    const response = await this.client.patch<APIResponse<VisionResultDetail>>(
      `/cases/${caseId}/vision`,
      data,
    );
    return response.data;
  }

  async createCaseEstimate(caseId: number) {
    const response = await this.client.post<APIResponse<DiagnosisCaseEstimate>>(
      `/cases/${caseId}/estimate`,
    );
    return response.data;
  }

  async getCaseEstimate(caseId: number) {
    const response = await this.client.get<APIResponse<DiagnosisCaseEstimate>>(
      `/cases/${caseId}/estimate`,
    );
    return response.data;
  }

  async downloadCaseEstimateCsv(caseId: number) {
    const response = await this.client.get<Blob>(
      `/cases/${caseId}/estimate.csv`,
      { responseType: "blob" },
    );
    return response.data;
  }

  async downloadCaseEstimateXlsx(caseId: number) {
    const response = await this.client.get<Blob>(
      `/cases/${caseId}/estimate.xlsx`,
      { responseType: "blob" },
    );
    return response.data;
  }

  // ============================================
  // Material Orders (자재 발주)
  // ============================================

  async getMaterialOrders(projectId: string) {
    const response = await this.client.get<
      APIResponse<
        Array<{
          id: string;
          project_id: string;
          order_number: string;
          status: string;
          total_amount: number;
          requested_at?: string;
          confirmed_at?: string;
          delivered_at?: string;
          created_at: string;
        }>
      >
    >(`/projects/${projectId}/material-orders`);
    return response.data;
  }

  async createMaterialOrder(
    projectId: string,
    data: {
      items: Array<{
        description: string;
        specification?: string;
        unit: string;
        quantity: number;
        unit_price: number;
      }>;
      notes?: string;
    },
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string;
        order_number: string;
        status: string;
        total_amount: number;
      }>
    >(`/projects/${projectId}/material-orders`, data);
    return response.data;
  }

  async getMaterialOrder(orderId: string) {
    const response = await this.client.get<
      APIResponse<{
        id: string;
        project_id: string;
        order_number: string;
        status: string;
        items: Array<{
          id: string;
          description: string;
          specification?: string;
          unit: string;
          quantity: number;
          unit_price: number;
          amount: number;
        }>;
        total_amount: number;
        requested_at?: string;
        confirmed_at?: string;
        delivered_at?: string;
        notes?: string;
        created_at: string;
      }>
    >(`/material-orders/${orderId}`);
    return response.data;
  }

  async updateMaterialOrderStatus(orderId: string, status: string) {
    const response = await this.client.patch<
      APIResponse<{
        id: string;
        status: string;
        message: string;
      }>
    >(`/material-orders/${orderId}`, { status });
    return response.data;
  }

  async cancelMaterialOrder(orderId: string) {
    const response = await this.client.delete<APIResponse<void>>(
      `/material-orders/${orderId}`,
    );
    return response.data;
  }

  // ============================================
  // 현장대리인 (Field Representatives)
  // ============================================

  async listFieldRepresentatives() {
    const response = await this.client.get<
      APIResponse<FieldRepresentativeRead[]>
    >("/field-representatives");
    return response.data;
  }

  async createFieldRepresentative(data: FieldRepresentativeCreate) {
    const response = await this.client.post<
      APIResponse<FieldRepresentativeRead>
    >("/field-representatives", data);
    return response.data;
  }

  async updateFieldRepresentative(
    repId: number,
    data: FieldRepresentativeCreate,
  ) {
    const response = await this.client.put<
      APIResponse<FieldRepresentativeRead>
    >(`/field-representatives/${repId}`, data);
    return response.data;
  }

  async deleteFieldRepresentative(repId: number) {
    const response = await this.client.delete<
      APIResponse<{ deleted: boolean; id: number }>
    >(`/field-representatives/${repId}`);
    return response.data;
  }

  async getProjectRepresentative(projectId: string) {
    const response = await this.client.get<
      APIResponse<RepresentativeAssignment>
    >(`/projects/${projectId}/representative`);
    return response.data;
  }

  async assignProjectRepresentative(
    projectId: string,
    data: { representative_id: number; effective_date: string },
  ) {
    const response = await this.client.post<
      APIResponse<RepresentativeAssignment>
    >(`/projects/${projectId}/representative`, data);
    return response.data;
  }

  async removeProjectRepresentative(projectId: string) {
    const response = await this.client.delete<
      APIResponse<{ deleted: boolean; project_id: number }>
    >(`/projects/${projectId}/representative`);
    return response.data;
  }

  async runFieldRepresentativeReminders(data?: {
    organization_id?: number;
    run_date?: string;
  }) {
    const response = await this.client.post<APIResponse<{
      run_date: string;
      organization_id?: number;
      checked_count: number;
      eligible_count: number;
      notifications_created: number;
      alimtalk_success: number;
      alimtalk_failure: number;
      skipped_duplicate: number;
      skipped_no_receiver: number;
    }>>("/field-representatives/reminders/run", data ?? {});
    return response.data;
  }

  // ─── 알림톡 ───────────────────────────────────────────────

  async sendAlimTalk(payload: {
    phone: string;
    template_code: string;
    variables: Record<string, string>;
  }) {
    const response = await this.client.post<APIResponse<{
      message_id: string;
      success: boolean;
      message: string;
    }>>("/notifications/alimtalk", payload);
    return response.data;
  }

  async getAlimTalkStatus(messageId: string) {
    const response = await this.client.get<APIResponse<{
      message_id: string;
      status: string;
    }>>(`/notifications/alimtalk/${messageId}/status`);
    return response.data;
  }

  // ─── 동의 기록 ────────────────────────────────────────────

  async saveConsentRecords(payload: {
    records: Array<{
      consent_type: string;
      consented: boolean;
      invite_token?: string;
      consent_version?: string;
    }>;
    invite_token?: string;
  }) {
    const response = await this.client.post<APIResponse<Array<{
      id: number;
      consent_type: string;
      consented: boolean;
      consented_at: string;
    }>>>("/consent/records", payload);
    return response.data;
  }

  async checkWorkerDocuments(workerId: number) {
    const response = await this.client.get<APIResponse<{
      worker_id: number;
      documents_complete: boolean;
      missing_documents: Array<{ type: string; name: string; required: boolean }>;
    }>>(`/labor-contracts/workers/${workerId}/document-check`);
    return response.data;
  }

  async downloadLaborContractHwpx(laborContractId: number | string): Promise<Blob> {
    const response = await this.client.get<Blob>(
      `/labor-contracts/${laborContractId}/hwpx`,
      { responseType: "blob" },
    );
    return response.data;
  }
}
