import axios, { AxiosError, type AxiosInstance } from "axios"
import type {
  APIResponse,
  PaginatedResponse,
  LoginResponse,
  ProjectListItem,
  ProjectDetail,
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
  LaborContractStatus,
  EstimateStatus,
} from "@yunigreen/types"

export interface APIClientConfig {
  baseURL: string
  onUnauthorized?: () => void
  getRefreshToken?: () => string | null
  onTokenRefresh?: (accessToken: string) => void
}

export class APIClient {
  private client: AxiosInstance
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private onUnauthorized?: () => void
  private getRefreshToken?: () => string | null
  private onTokenRefresh?: (accessToken: string) => void
  private isRefreshing = false
  private refreshQueue: Array<{
    resolve: (token: string) => void
    reject: (error: Error) => void
  }> = []

  constructor(config: APIClientConfig) {
    this.onUnauthorized = config.onUnauthorized
    this.getRefreshToken = config.getRefreshToken
    this.onTokenRefresh = config.onTokenRefresh

    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    })

    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as typeof error.config & { _retry?: boolean }
        
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true
          
          const refreshToken = this.refreshToken || this.getRefreshToken?.()
          
          if (refreshToken) {
            try {
              const newAccessToken = await this.handleTokenRefresh(refreshToken)
              if (newAccessToken && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                return this.client(originalRequest)
              }
            } catch {
              this.accessToken = null
              this.onUnauthorized?.()
            }
          } else {
            this.accessToken = null
            this.onUnauthorized?.()
          }
        }
        return Promise.reject(error)
      }
    )
  }

  private async handleTokenRefresh(refreshToken: string): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject })
      })
    }

    this.isRefreshing = true

    try {
      const response = await axios.post<APIResponse<{ access_token: string; expires_in: number }>>(
        `${this.client.defaults.baseURL}/auth/refresh`,
        { refresh_token: refreshToken },
        { headers: { "Content-Type": "application/json" } }
      )

      if (response.data.success && response.data.data) {
        const newAccessToken = response.data.data.access_token
        this.setAccessToken(newAccessToken)
        this.onTokenRefresh?.(newAccessToken)
        
        this.refreshQueue.forEach(({ resolve }) => resolve(newAccessToken))
        this.refreshQueue = []
        
        return newAccessToken
      }
      
      throw new Error("Token refresh failed")
    } catch (error) {
      this.refreshQueue.forEach(({ reject }) => reject(error as Error))
      this.refreshQueue = []
      throw error
    } finally {
      this.isRefreshing = false
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token
  }

  // ============================================
  // Auth
  // ============================================

  async login(email: string, password: string) {
    const response = await this.client.post<APIResponse<LoginResponse>>(
      "/auth/login",
      { email, password }
    )

    if (response.data.success && response.data.data) {
      this.setAccessToken(response.data.data.access_token)
    }

    return response.data
  }

  async getMe() {
    const response = await this.client.get<
      APIResponse<{
        id: string
        email: string
        name: string
        phone?: string
        role: string
        organization?: {
          id: string
          name: string
        }
      }>
    >("/auth/me")
    return response.data
  }

  // ============================================
  // Projects
  // ============================================

  async getProjects(params?: {
    page?: number
    per_page?: number
    status?: ProjectStatus
    search?: string
  }) {
    const response = await this.client.get<PaginatedResponse<ProjectListItem>>(
      "/projects",
      { params }
    )
    return response.data
  }

  async getProject(id: string) {
    const response = await this.client.get<APIResponse<ProjectDetail>>(
      `/projects/${id}`
    )
    return response.data
  }

  async createProject(data: {
    name: string
    address: string
    client_name?: string
    client_phone?: string
    notes?: string
  }) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        name: string
        status: ProjectStatus
      }>
    >("/projects", data)
    return response.data
  }

  // ============================================
  // Site Visits
  // ============================================

  async getSiteVisits(projectId: string) {
    const response = await this.client.get<APIResponse<SiteVisitDetail[]>>(
      `/projects/${projectId}/site-visits`
    )
    return response.data
  }

  async createSiteVisit(
    projectId: string,
    data: {
      visit_type: VisitType
      visited_at: string
      notes?: string
    }
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        visit_type: VisitType
        visited_at: string
      }>
    >(`/projects/${projectId}/site-visits`, data)
    return response.data
  }

  async uploadPhoto(
    visitId: string,
    file: File,
    photoType: PhotoType,
    caption?: string
  ) {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("photo_type", photoType)
    if (caption) {
      formData.append("caption", caption)
    }

    const response = await this.client.post<
      APIResponse<{
        id: string
        storage_path: string
        photo_type: PhotoType
      }>
    >(`/site-visits/${visitId}/photos`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return response.data
  }

  // ============================================
  // Diagnoses
  // ============================================

  async requestDiagnosis(
    visitId: string,
    data?: {
      additional_notes?: string
      photo_ids?: string[]
    }
  ) {
    const response = await this.client.post<
      APIResponse<{
        diagnosis_id: string
        status: string
        message: string
      }>
    >(`/site-visits/${visitId}/diagnose`, data || {})
    return response.data
  }

  async getDiagnosis(diagnosisId: string) {
    const response = await this.client.get<APIResponse<DiagnosisDetail>>(
      `/diagnoses/${diagnosisId}`
    )
    return response.data
  }

  // ============================================
  // Estimates
  // ============================================

  async createEstimate(projectId: string, diagnosisId?: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        version: number
        status: string
        total_amount: string
        lines: Array<{
          id: string
          description: string
          quantity: string
          unit_price_snapshot: string
          amount: string
        }>
      }>
    >(`/projects/${projectId}/estimates`, {
      diagnosis_id: diagnosisId,
      include_confirmed_only: false,
    })
    return response.data
  }

  async getEstimate(estimateId: string) {
    const response = await this.client.get<APIResponse<EstimateDetail>>(
      `/estimates/${estimateId}`
    )
    return response.data
  }

  async issueEstimate(estimateId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        status: string
        issued_at: string
        message: string
      }>
    >(`/estimates/${estimateId}/issue`)
    return response.data
  }

  async updateEstimateLine(
    estimateId: string,
    lineId: string,
    data: {
      quantity?: string
      unit_price_snapshot?: string
      description?: string
    }
  ) {
    const response = await this.client.patch<
      APIResponse<{
        id: string
        quantity: string
        unit_price_snapshot: string
        amount: string
      }>
    >(`/estimates/${estimateId}/lines/${lineId}`, data)
    return response.data
  }

  async addEstimateLine(
    estimateId: string,
    data: {
      description: string
      specification?: string
      unit: string
      quantity: string
      unit_price_snapshot: string
    }
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        description: string
        amount: string
      }>
    >(`/estimates/${estimateId}/lines`, data)
    return response.data
  }

  async deleteEstimateLine(estimateId: string, lineId: string) {
    const response = await this.client.delete<APIResponse<{ message: string }>>(
      `/estimates/${estimateId}/lines/${lineId}`
    )
    return response.data
  }

  // ============================================
  // Contracts (계약)
  // ============================================

  async getContracts(projectId: string) {
    const response = await this.client.get<APIResponse<ContractDetail[]>>(
      `/projects/${projectId}/contracts`
    )
    return response.data
  }

  async getContract(contractId: string) {
    const response = await this.client.get<APIResponse<ContractDetail>>(
      `/contracts/${contractId}`
    )
    return response.data
  }

  async createContract(
    projectId: string,
    data: {
      estimate_id: string
      start_date?: string
      expected_end_date?: string
      notes?: string
    }
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        contract_number: string
        status: ContractStatus
      }>
    >(`/projects/${projectId}/contracts`, data)
    return response.data
  }

  async sendContractForSignature(contractId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        status: ContractStatus
        sent_at: string
        signature_url: string
      }>
    >(`/contracts/${contractId}/send`)
    return response.data
  }

  async signContract(
    contractId: string,
    signatureData: string,
    signerType: "client" | "company"
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        status: ContractStatus
        signed_at: string
      }>
    >(`/contracts/${contractId}/sign`, {
      signature_data: signatureData,
      signer_type: signerType,
    })
    return response.data
  }

  async updateContractStatus(contractId: string, status: ContractStatus) {
    const response = await this.client.patch<
      APIResponse<{
        id: string
        status: ContractStatus
      }>
    >(`/contracts/${contractId}`, { status })
    return response.data
  }

  // ============================================
  // Labor Contracts (노무비 관리)
  // ============================================

  async getLaborContracts(projectId: string) {
    const response = await this.client.get<
      APIResponse<LaborContractListItem[]>
    >(`/projects/${projectId}/labor-contracts`)
    return response.data
  }

  async createLaborContract(
    projectId: string,
    data: {
      worker_name: string
      worker_phone?: string
      work_date: string
      work_type?: string
      daily_rate: string
      hours_worked?: string
    }
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        worker_name: string
        status: LaborContractStatus
      }>
    >(`/projects/${projectId}/labor-contracts`, data)
    return response.data
  }

  async sendLaborContractForSignature(laborContractId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        status: LaborContractStatus
        signature_url: string
      }>
    >(`/labor-contracts/${laborContractId}/send`)
    return response.data
  }

  async signLaborContract(laborContractId: string, signatureData: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        status: LaborContractStatus
        signed_at: string
      }>
    >(`/labor-contracts/${laborContractId}/sign`, {
      signature_data: signatureData,
    })
    return response.data
  }

  async updateLaborContractStatus(
    laborContractId: string,
    status: LaborContractStatus
  ) {
    const response = await this.client.patch<
      APIResponse<{
        id: string
        status: LaborContractStatus
      }>
    >(`/labor-contracts/${laborContractId}`, { status })
    return response.data
  }

  async getLaborContractsSummary(projectId: string) {
    const response = await this.client.get<
      APIResponse<{
        total_workers: number
        total_amount: string
        by_status: Record<LaborContractStatus, number>
        by_work_type: Record<string, { count: number; amount: string }>
      }>
    >(`/projects/${projectId}/labor-contracts/summary`)
    return response.data
  }

  // ============================================
  // Photo Album (준공사진첩)
  // ============================================

  async getProjectPhotoAlbum(projectId: string) {
    const response = await this.client.get<APIResponse<ProjectPhotoAlbum>>(
      `/projects/${projectId}/photo-album`
    )
    return response.data
  }

  // ============================================
  // Warranty (하자보증)
  // ============================================

  async getWarrantyInfo(projectId: string) {
    const response = await this.client.get<
      APIResponse<{
        project_id: string
        warranty_expires_at: string
        days_remaining: number
        is_expired: boolean
        as_requests: Array<{
          id: string
          description: string
          status: string
          created_at: string
          resolved_at?: string
        }>
      }>
    >(`/projects/${projectId}/warranty`)
    return response.data
  }

  async createASRequest(
    projectId: string,
    data: {
      description: string
      photos?: string[]
    }
  ) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        status: string
        message: string
      }>
    >(`/projects/${projectId}/warranty/as-requests`, data)
    return response.data
  }

  async completeProject(projectId: string) {
    const response = await this.client.post<
      APIResponse<{
        id: string
        status: ProjectStatus
        completed_at: string
        warranty_expires_at: string
      }>
    >(`/projects/${projectId}/complete`)
    return response.data
  }

  // ============================================
  // RAG
  // ============================================

  async searchRAG(query: string, topK: number = 5) {
    const response = await this.client.post<
      APIResponse<
        Array<{
          chunk_text: string
          source_file: string
          source_page?: number
          category?: string
          relevance_score: number
        }>
      >
    >("/rag/search", { query, top_k: topK })
    return response.data
  }
}
