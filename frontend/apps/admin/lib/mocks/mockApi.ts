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
} from "@yunigreen/types"
import { mockDb, type Project, type User } from "./db"

const DELAY = 200

const delay = <T,>(data: T): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), DELAY))
}

const nowIso = () => new Date().toISOString()

const randomId = (prefix: string) => {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

const ok = <T,>(data: T | null): APIResponse<T> => {
  return { success: true, data, error: null }
}

const fail = <T,>(code: string, message: string): APIResponse<T> => {
  return { success: false, data: null, error: { code, message } }
}

const okPage = <T,>(
  data: T[],
  meta: { page: number; per_page: number; total: number; total_pages: number }
): PaginatedResponse<T> => {
  return { success: true, data, error: null, meta }
}

type StoredEstimate = {
  id: string
  project_id: string
  version: number
  status: EstimateStatus
  subtotal: string
  vat_amount: string
  total_amount: string
  created_at: string
  issued_at?: string
  lines: Array<{
    id: string
    sort_order: number
    description: string
    specification?: string
    unit: string
    quantity: string
    unit_price_snapshot: string
    amount: string
    source: EstimateLineSource
  }>
}

const asNumber = (value: string) => {
  const n = Number(String(value).replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

const calcAmount = (quantity: string, unitPrice: string) => {
  const q = asNumber(quantity)
  const p = asNumber(unitPrice)
  return Math.round(q * p).toString()
}

const recalcTotals = (estimate: StoredEstimate): StoredEstimate => {
  const subtotalNum = estimate.lines.reduce((sum, line) => sum + asNumber(line.amount), 0)
  const vatNum = Math.round(subtotalNum * 0.1)
  return {
    ...estimate,
    subtotal: subtotalNum.toString(),
    vat_amount: vatNum.toString(),
    total_amount: (subtotalNum + vatNum).toString(),
  }
}

export class MockAPIClient {
  private accessToken: string | null = null
  private refreshToken: string | null = null

  private siteVisitsByProject: Record<string, SiteVisitDetail[]> = {}
  private visitProjectId: Record<string, string> = {}
  private visitById: Record<string, SiteVisitDetail> = {}

  private diagnosesById: Record<string, DiagnosisDetail> = {}
  private diagnosisPolls: Record<string, number> = {}

  private estimatesById: Record<string, StoredEstimate> = {}
  private projectEstimateIds: Record<string, string[]> = {}

  private contractsById: Record<string, ContractDetail> = {}
  private projectContractIds: Record<string, string[]> = {}

  private laborContractsByProject: Record<string, LaborContractListItem[]> = {}
  private warrantyRequestsByProject: Record<
    string,
    Array<{ id: string; description: string; status: string; created_at: string; resolved_at?: string }>
  > = {}

  private utilitiesByProject: Record<
    string,
    {
      items: Array<{
        id: string
        type: "수도" | "전기" | "가스" | "기타"
        month: string
        status: "pending" | "completed"
        amount: number
        due_date: string
        doc_status: "pending" | "submitted"
      }>
      timeline: Array<{ id: string; date: string; message: string }>
    }
  > = {}

  private taxInvoicesByProject: Record<
    string,
    {
      summary: { total_amount: number; success_count: number; failed_count: number }
      items: Array<{
        id: string
        type: "매출" | "매입"
        amount: number
        status: "published" | "failed"
        date: string
        customer: string
        failure_reason?: string
      }>
    }
  > = {}

  private workerContractsById: Record<
    string,
    {
      id: string
      project_name: string
      work_date: string
      role: string
      daily_rate: number
      status: "pending" | "signed"
      content: string
    }
  > = {}

  private workerPaystubsByWorker: Record<
    string,
    Array<{ id: string; month: string; amount: number; status: "sent" | "confirmed"; date: string }>
  > = {}

  private workerPaystubDetails: Record<
    string,
    Record<
      string,
      {
        id: string
        title: string
        total_amount: number
        deductions: number
        net_amount: number
        items: Array<{ label: string; amount: number }>
        status: "sent" | "confirmed"
      }
    >
  > = {}

  private notifications: Array<{
    id: string
    type: "contract" | "paystub" | "notice"
    title: string
    message: string
    time: string
    read: boolean
  }> = []

  private workerAccessRequests: Record<string, string> = {}

  private ensureUtilities(projectId: string) {
    if (this.utilitiesByProject[projectId]) return

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
        { id: "t1", date: "2026-01-20 14:00", message: "1월 수도요금 공문이 발송되었습니다." },
        { id: "t2", date: "2026-01-15 09:30", message: "전기요금 고지서가 업로드되었습니다." },
      ],
    }
  }

  private ensureTaxInvoices(projectId: string) {
    if (this.taxInvoicesByProject[projectId]) return

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
    }
  }

  private ensureWorkerContract(contractId: string) {
    if (this.workerContractsById[contractId]) return
    this.workerContractsById[contractId] = {
      id: contractId,
      project_name: "논현동 주택 리모델링",
      work_date: "2026.01.22",
      role: "목공",
      daily_rate: 250000,
      status: "pending",
      content: "(계약 내용 생략)",
    }
  }

  private ensureWorkerPaystubs(workerId: string) {
    if (this.workerPaystubsByWorker[workerId]) return

    this.workerPaystubsByWorker[workerId] = [
      { id: "ps_1", month: "2026년 1월", amount: 2500000, status: "sent", date: "2026.01.20" },
      { id: "ps_2", month: "2025년 12월", amount: 1800000, status: "confirmed", date: "2025.12.20" },
    ]
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
    }
  }

  private ensureNotifications() {
    if (this.notifications.length > 0) return
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
    ]
  }

  setAccessToken(token: string | null) {
    this.accessToken = token
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token
  }

  private getStoredUsers(): User[] {
    return mockDb.get("users")
  }

  private pickUser(email: string): User {
    const users = this.getStoredUsers()
    const byEmail = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    return byEmail || users[0]
  }

  private getCurrentUser(): User | null {
    const user = mockDb.get("currentUser")
    return user || null
  }

  async login(email: string, _password: string) {
    if (!email) {
      return delay(fail<LoginResponse>("INVALID_CREDENTIALS", "이메일을 입력해 주세요"))
    }

    const user = this.pickUser(email)
    mockDb.set("currentUser", user)

    const access_token = `mock_access_${randomId("t")}`
    const refresh_token = `mock_refresh_${randomId("t")}`
    this.setAccessToken(access_token)
    this.setRefreshToken(refresh_token)

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
      })
    )
  }

  async getMe() {
    if (!this.accessToken) {
      return delay(
        fail<{
          id: string
          email: string
          name: string
          phone?: string
          role: string
          organization?: { id: string; name: string }
        }>("UNAUTHORIZED", "로그인이 필요해요")
      )
    }

    const user = this.getCurrentUser() || this.getStoredUsers()[0]

    return delay(
      ok({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        organization: {
          id: user.organization_id,
          name: "유니그린",
        },
      })
    )
  }

  async getProjects(params?: {
    page?: number
    per_page?: number
    status?: ProjectStatus
    search?: string
  }) {
    let projects = mockDb.get("projects")

    if (params?.status) {
      projects = projects.filter((p) => p.status === params.status)
    }

    if (params?.search) {
      const q = params.search.toLowerCase()
      projects = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
      )
    }

    const page = params?.page || 1
    const per_page = params?.per_page || 10
    const total = projects.length
    const total_pages = Math.max(1, Math.ceil(total / per_page))

    const start = (page - 1) * per_page
    const pageItems = projects.slice(start, start + per_page)

    const items: ProjectListItem[] = pageItems.map((p) => {
      const siteVisits = this.siteVisitsByProject[p.id] || []
      const estimates = this.projectEstimateIds[p.id] || []

      return {
        id: p.id,
        name: p.name,
        address: p.address,
        status: p.status,
        client_name: p.clientName,
        created_at: p.createdAt,
        site_visit_count: siteVisits.length,
        estimate_count: estimates.length,
      }
    })

    return delay(okPage(items, { page, per_page, total, total_pages }))
  }

  async getProject(id: string) {
    const project = mockDb.get("projects").find((p) => p.id === id)
    if (!project) {
      return delay(fail<ProjectDetail>("NOT_FOUND", "프로젝트를 찾을 수 없어요"))
    }

    const visits = this.siteVisitsByProject[id] || []
    const estimateIds = this.projectEstimateIds[id] || []
    const estimates = estimateIds
      .map((estimateId) => this.estimatesById[estimateId])
      .filter(Boolean)
      .map((e) => ({
        id: e.id,
        version: e.version,
        status: e.status,
        total_amount: e.total_amount,
      }))

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
      })
    )
  }

  async createProject(data: {
    name: string
    address: string
    client_name?: string
    client_phone?: string
    notes?: string
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
    }

    mockDb.update("projects", (prev) => [newProject, ...prev])

    return delay(
      ok({
        id: newProject.id,
        name: newProject.name,
        status: newProject.status,
      })
    )
  }

  async getSiteVisits(projectId: string) {
    return delay(ok(this.siteVisitsByProject[projectId] || []))
  }

  async createSiteVisit(
    projectId: string,
    data: {
      visit_type: VisitType
      visited_at: string
      notes?: string
    }
  ) {
    const visitId = randomId("v")
    const visit: SiteVisitDetail = {
      id: visitId,
      visit_type: data.visit_type,
      visited_at: data.visited_at,
      notes: data.notes,
      photo_count: 0,
      photos: [],
    }

    this.siteVisitsByProject[projectId] = [...(this.siteVisitsByProject[projectId] || []), visit]
    this.visitProjectId[visitId] = projectId
    this.visitById[visitId] = visit

    return delay(ok({ id: visitId, visit_type: data.visit_type, visited_at: data.visited_at }))
  }

  async uploadPhoto(visitId: string, file: File, photoType: PhotoType, caption?: string) {
    const visit = this.visitById[visitId]
    if (!visit) {
      return delay(fail<{ id: string; storage_path: string; photo_type: PhotoType }>("NOT_FOUND", "방문 기록을 찾을 수 없어요"))
    }

    const photoId = randomId("ph")
    const storage_path = `mock://photos/${photoId}/${encodeURIComponent(file.name)}`
    const photo = { id: photoId, photo_type: photoType, storage_path, caption }

    visit.photos = [...visit.photos, photo]
    visit.photo_count = visit.photos.length

    return delay(ok({ id: photoId, storage_path, photo_type: photoType }))
  }

  async requestDiagnosis(
    visitId: string,
    _data?: {
      additional_notes?: string
      photo_ids?: string[]
    }
  ) {
    const projectId = this.visitProjectId[visitId]
    if (!projectId) {
      return delay(
        fail<{ diagnosis_id: string; status: string; message: string }>(
          "NOT_FOUND",
          "진단을 요청할 방문 기록을 찾을 수 없어요"
        )
      )
    }

    const diagnosisId = randomId("d")
    const status: DiagnosisStatus = "processing"
    const diagnosis: DiagnosisDetail = {
      id: diagnosisId,
      site_visit_id: visitId,
      project_id: projectId,
      status,
      leak_opinion_text: "누수 가능성이 있어요. 방수층과 배관 주변을 우선 확인해 주세요.",
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
    }

    this.diagnosesById[diagnosisId] = diagnosis
    this.diagnosisPolls[diagnosisId] = 0

    return delay(ok({ diagnosis_id: diagnosisId, status, message: "진단을 시작했어요" }))
  }

  async getDiagnosis(diagnosisId: string) {
    const diagnosis = this.diagnosesById[diagnosisId]
    if (!diagnosis) {
      return delay(fail<DiagnosisDetail>("NOT_FOUND", "진단 결과를 찾을 수 없어요"))
    }

    const polls = this.diagnosisPolls[diagnosisId] || 0
    if (diagnosis.status === "processing" && polls >= 1) {
      this.diagnosesById[diagnosisId] = {
        ...diagnosis,
        status: "completed",
        processing_time_ms: 1800,
      }
    }
    this.diagnosisPolls[diagnosisId] = polls + 1

    return delay(ok(this.diagnosesById[diagnosisId]))
  }

  async createEstimate(projectId: string, diagnosisId?: string) {
    const estimateId = randomId("e")
    const estimateIds = this.projectEstimateIds[projectId] || []
    const version = estimateIds.length + 1
    const created_at = nowIso()

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
    ]

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
    })

    this.estimatesById[estimateId] = estimate
    this.projectEstimateIds[projectId] = [...estimateIds, estimateId]

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
      })
    )
  }

  async getEstimate(estimateId: string) {
    const estimate = this.estimatesById[estimateId]
    if (!estimate) {
      return delay(fail<EstimateDetail>("NOT_FOUND", "견적서를 찾을 수 없어요"))
    }

    return delay(ok<EstimateDetail>(estimate))
  }

  async issueEstimate(estimateId: string) {
    const estimate = this.estimatesById[estimateId]
    if (!estimate) {
      return delay(
        fail<{ id: string; status: string; issued_at: string; message: string }>(
          "NOT_FOUND",
          "견적서를 찾을 수 없어요"
        )
      )
    }

    const issued_at = nowIso()
    this.estimatesById[estimateId] = {
      ...estimate,
      status: "issued",
      issued_at,
    }

    return delay(ok({ id: estimateId, status: "issued", issued_at, message: "발송했어요" }))
  }

  async updateEstimateLine(
    estimateId: string,
    lineId: string,
    data: { quantity?: string; unit_price_snapshot?: string; description?: string }
  ) {
    const estimate = this.estimatesById[estimateId]
    if (!estimate) {
      return delay(
        fail<{ id: string; quantity: string; unit_price_snapshot: string; amount: string }>(
          "NOT_FOUND",
          "견적서를 찾을 수 없어요"
        )
      )
    }

    const nextLines = estimate.lines.map((l) => {
      if (l.id !== lineId) return l
      const quantity = data.quantity ?? l.quantity
      const unit_price_snapshot = data.unit_price_snapshot ?? l.unit_price_snapshot
      const amount = calcAmount(quantity, unit_price_snapshot)
      return {
        ...l,
        description: data.description ?? l.description,
        quantity,
        unit_price_snapshot,
        amount,
      }
    })

    const next = recalcTotals({ ...estimate, lines: nextLines })
    this.estimatesById[estimateId] = next
    const updated = next.lines.find((l) => l.id === lineId)

    if (!updated) {
      return delay(
        fail<{ id: string; quantity: string; unit_price_snapshot: string; amount: string }>(
          "NOT_FOUND",
          "항목을 찾을 수 없어요"
        )
      )
    }

    return delay(ok({ id: updated.id, quantity: updated.quantity, unit_price_snapshot: updated.unit_price_snapshot, amount: updated.amount }))
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
    const estimate = this.estimatesById[estimateId]
    if (!estimate) {
      return delay(fail<{ id: string; description: string; amount: string }>("NOT_FOUND", "견적서를 찾을 수 없어요"))
    }

    const id = randomId("el")
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
    }

    const next = recalcTotals({ ...estimate, lines: [...estimate.lines, nextLine] })
    this.estimatesById[estimateId] = next

    return delay(ok({ id, description: data.description, amount: nextLine.amount }))
  }

  async deleteEstimateLine(estimateId: string, lineId: string) {
    const estimate = this.estimatesById[estimateId]
    if (!estimate) {
      return delay(fail<{ message: string }>("NOT_FOUND", "견적서를 찾을 수 없어요"))
    }

    const nextLines = estimate.lines.filter((l) => l.id !== lineId)
    const normalized = nextLines.map((l, idx) => ({ ...l, sort_order: idx + 1 }))
    this.estimatesById[estimateId] = recalcTotals({ ...estimate, lines: normalized })

    return delay(ok({ message: "삭제했어요" }))
  }

  async getContracts(projectId: string) {
    const ids = this.projectContractIds[projectId] || []
    const contracts = ids.map((id) => this.contractsById[id]).filter(Boolean)
    return delay(ok(contracts))
  }

  async getContract(contractId: string) {
    const contract = this.contractsById[contractId]
    if (!contract) {
      return delay(fail<ContractDetail>("NOT_FOUND", "계약서를 찾을 수 없어요"))
    }
    return delay(ok(contract))
  }

  async createContract(
    projectId: string,
    data: { estimate_id: string; start_date?: string; expected_end_date?: string; notes?: string }
  ) {
    const project = mockDb.get("projects").find((p) => p.id === projectId)
    if (!project) {
      return delay(fail<{ id: string; contract_number: string; status: ContractStatus }>("NOT_FOUND", "프로젝트를 찾을 수 없어요"))
    }

    const contractId = randomId("c")
    const contract: ContractDetail = {
      id: contractId,
      project_id: projectId,
      estimate_id: data.estimate_id,
      contract_number: `CT-${Date.now()}`,
      contract_amount: this.estimatesById[data.estimate_id]?.total_amount || "0",
      status: "draft",
      notes: data.notes,
      created_at: nowIso(),
      start_date: data.start_date,
      expected_end_date: data.expected_end_date,
      project_name: project.name,
      client_name: project.clientName,
    }

    this.contractsById[contractId] = contract
    this.projectContractIds[projectId] = [...(this.projectContractIds[projectId] || []), contractId]

    return delay(ok({ id: contractId, contract_number: contract.contract_number || contractId, status: contract.status }))
  }

  async sendContractForSignature(contractId: string) {
    const contract = this.contractsById[contractId]
    if (!contract) {
      return delay(
        fail<{ id: string; status: ContractStatus; sent_at: string; signature_url: string }>(
          "NOT_FOUND",
          "계약서를 찾을 수 없어요"
        )
      )
    }

    const sent_at = nowIso()
    const next: ContractDetail = { ...contract, status: "sent", sent_at }
    this.contractsById[contractId] = next

    return delay(ok({ id: contractId, status: next.status, sent_at, signature_url: `mock://signature/${contractId}` }))
  }

  async signContract(contractId: string, _signatureData: string, _signerType: "client" | "company") {
    const contract = this.contractsById[contractId]
    if (!contract) {
      return delay(fail<{ id: string; status: ContractStatus; signed_at: string }>("NOT_FOUND", "계약서를 찾을 수 없어요"))
    }

    const signed_at = nowIso()
    const next: ContractDetail = { ...contract, status: "signed", signed_at }
    this.contractsById[contractId] = next
    return delay(ok({ id: contractId, status: next.status, signed_at }))
  }

  async getLaborContracts(projectId: string) {
    return delay(ok(this.laborContractsByProject[projectId] || []))
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
    const id = randomId("lc")
    const item: LaborContractListItem = {
      id,
      worker_name: data.worker_name,
      work_date: data.work_date,
      work_type: data.work_type,
      daily_rate: data.daily_rate,
      status: "draft",
      signed_at: undefined,
    }
    this.laborContractsByProject[projectId] = [...(this.laborContractsByProject[projectId] || []), item]
    return delay(ok({ id, worker_name: data.worker_name, status: item.status }))
  }

  async sendLaborContractForSignature(laborContractId: string) {
    return delay(ok({ id: laborContractId, status: "sent" as LaborContractStatus, signature_url: `mock://labor-sign/${laborContractId}` }))
  }

  async getLaborContractsSummary(projectId: string) {
    const items = this.laborContractsByProject[projectId] || []
    const by_status: Record<LaborContractStatus, number> = {
      draft: 0,
      sent: 0,
      signed: 0,
      paid: 0,
    }
    items.forEach((i) => {
      by_status[i.status] = (by_status[i.status] || 0) + 1
    })

    return delay(
      ok({
        total_workers: items.length,
        total_amount: "0",
        by_status,
        by_work_type: {},
      })
    )
  }

  async getProjectPhotoAlbum(projectId: string) {
    const project = mockDb.get("projects").find((p) => p.id === projectId)
    if (!project) {
      return delay(fail<ProjectPhotoAlbum>("NOT_FOUND", "프로젝트를 찾을 수 없어요"))
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
      })
    )
  }

  async getWarrantyInfo(projectId: string) {
    const warranty_expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString()
    const as_requests = this.warrantyRequestsByProject[projectId] || []
    return delay(
      ok({
        project_id: projectId,
        warranty_expires_at,
        days_remaining: 365,
        is_expired: false,
        as_requests,
      })
    )
  }

  async createASRequest(projectId: string, data: { description: string; photos?: string[] }) {
    const req = {
      id: randomId("as"),
      description: data.description,
      status: "received",
      created_at: nowIso(),
    }
    this.warrantyRequestsByProject[projectId] = [...(this.warrantyRequestsByProject[projectId] || []), req]
    return delay(ok({ id: req.id, status: req.status, message: "접수했어요" }))
  }

  async completeProject(projectId: string) {
    const completed_at = nowIso()
    const warranty_expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString()
    mockDb.update("projects", (prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: "completed" } : p))
    )
    return delay(ok({ id: projectId, status: "completed", completed_at, warranty_expires_at }))
  }

  async getUsers(params?: {
    page?: number
    per_page?: number
    search?: string
    role?: string
    is_active?: boolean
  }) {
    let users = mockDb.get("users")

    if (params?.role) {
      users = users.filter((u) => u.role === params.role)
    }
    if (typeof params?.is_active === "boolean") {
      users = users.filter((u) => u.is_active === params.is_active)
    }
    if (params?.search) {
      const q = params.search.toLowerCase()
      users = users.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone || "").includes(q)
      )
    }

    const page = params?.page || 1
    const per_page = params?.per_page || 10
    const total = users.length
    const total_pages = Math.max(1, Math.ceil(total / per_page))
    const start = (page - 1) * per_page
    const pageItems = users.slice(start, start + per_page)

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
        { page, per_page, total, total_pages }
      )
    )
  }

  async createUser(data: { email: string; password: string; name: string; phone?: string; role?: string }) {
    const role: User["role"] =
      data.role === "admin" || data.role === "manager" || data.role === "technician"
        ? data.role
        : "technician"

    const user: User = {
      id: randomId("u"),
      email: data.email,
      name: data.name,
      phone: data.phone,
      role,
      organization_id: "org_1",
      is_active: true,
      created_at: nowIso(),
      last_login_at: undefined,
    }

    mockDb.update("users", (prev) => [user, ...prev])
    return delay(ok({ id: user.id, email: user.email, name: user.name, role: user.role, message: "생성했어요" }))
  }

  async updateUser(userId: string, data: { name?: string; phone?: string; role?: string; is_active?: boolean }) {
    const role: User["role"] | undefined =
      data.role === "admin" || data.role === "manager" || data.role === "technician"
        ? data.role
        : undefined

    const users = mockDb.get("users")
    const idx = users.findIndex((u) => u.id === userId)
    if (idx < 0) {
      return delay(
        fail<{ id: string; email: string; name: string; role: string; is_active: boolean }>(
          "NOT_FOUND",
          "사용자를 찾을 수 없어요"
        )
      )
    }

    const current = users[idx]
    const updatedUser: User = {
      ...current,
      name: data.name ?? current.name,
      phone: data.phone ?? current.phone,
      role: role ?? current.role,
      is_active: typeof data.is_active === "boolean" ? data.is_active : current.is_active,
    }

    mockDb.set(
      "users",
      users.map((u) => (u.id === userId ? updatedUser : u))
    )

    return delay(
      ok({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        is_active: updatedUser.is_active,
      })
    )
  }

  async deleteUser(userId: string) {
    const before = mockDb.get("users")
    const exists = before.some((u) => u.id === userId)
    if (!exists) {
      return delay(fail<void>("NOT_FOUND", "사용자를 찾을 수 없어요"))
    }
    mockDb.update("users", (prev) => prev.filter((u) => u.id !== userId))
    const current = mockDb.get("currentUser")
    if (current?.id === userId) {
      mockDb.set("currentUser", null)
    }
    return delay(ok<void>(null))
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
      ])
    )
  }

  async getStagingItems(
    _revisionId: string,
    params?: { page?: number; per_page?: number; status?: string; confidence?: string }
  ) {
    const page = params?.page || 1
    const per_page = params?.per_page || 10
    const total = 0
    const total_pages = 1
    return delay(okPage([], { page, per_page, total, total_pages }))
  }

  async uploadPricebookPdf(file: File, versionLabel: string, effectiveFrom: string) {
    return delay(
      ok({
        id: randomId("rev"),
        version_label: versionLabel,
        status: "processing",
        processing_status: "processing",
        staging_items_count: 0,
        message: `업로드했어요: ${file.name} (${effectiveFrom})`,
      })
    )
  }

  async getUtilities(_projectId: string) {
    this.ensureUtilities(_projectId)
    return delay(ok(this.utilitiesByProject[_projectId]))
  }

  async updateUtilityStatus(
    projectId: string,
    utilityId: string,
    data: { status?: "pending" | "completed"; doc_status?: "pending" | "submitted" }
  ) {
    this.ensureUtilities(projectId)
    const utilities = this.utilitiesByProject[projectId]
    const item = utilities.items.find((entry) => entry.id === utilityId)
    if (item) {
      const nextStatus = data.status ?? item.status
      const nextDocStatus = data.doc_status ?? item.doc_status
      if (nextStatus !== item.status) {
        utilities.timeline.unshift({
          id: randomId("t"),
          date: nowIso(),
          message: `${item.month} ${item.type}요금 상태가 ${nextStatus === "completed" ? "완료" : "대기"}로 변경되었습니다.`,
        })
      }
      if (nextDocStatus !== item.doc_status) {
        utilities.timeline.unshift({
          id: randomId("t"),
          date: nowIso(),
          message: `${item.month} ${item.type}요금 공문 상태가 ${nextDocStatus === "submitted" ? "발송 완료" : "발송 대기"}로 변경되었습니다.`,
        })
      }
      item.status = nextStatus
      item.doc_status = nextDocStatus
    }
    return delay(ok({ id: utilityId }))
  }

  async getTaxInvoice(_projectId: string) {
    this.ensureTaxInvoices(_projectId)
    return delay(ok(this.taxInvoicesByProject[_projectId]))
  }

  async issueTaxInvoice(_projectId: string) {
    this.ensureTaxInvoices(_projectId)
    const state = this.taxInvoicesByProject[_projectId]
    const failed = state.items.find((item) => item.status === "failed")
    if (failed) {
      failed.status = "published"
      failed.failure_reason = undefined
      state.summary.failed_count = Math.max(0, state.summary.failed_count - 1)
      state.summary.success_count += 1
    } else {
      const newAmount = 1000000
      state.items.unshift({
        id: randomId("ti"),
        type: "매출",
        amount: newAmount,
        status: "published",
        date: nowIso().slice(0, 10),
        customer: "ABC 건설",
      })
      state.summary.success_count += 1
      state.summary.total_amount += newAmount
    }
    return delay(ok({ status: "published" as const, message: "발행했어요" }))
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
      ])
    )
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
      })
    )
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
      })
    )
  }

  async requestWorkerAccess(phone: string) {
    const requestId = `req_${phone}_${randomId("r")}`
    this.workerAccessRequests[requestId] = phone
    return delay(ok({ request_id: requestId }))
  }

  async verifyWorkerAccess(_requestId: string, _code: string) {
    const workerId = this.workerAccessRequests[_requestId] ? "worker_1" : "worker_1"
    return delay(ok({ worker_id: workerId }))
  }

  async getWorkerContract(contractId: string) {
    this.ensureWorkerContract(contractId)
    return delay(ok(this.workerContractsById[contractId]))
  }

  async signWorkerContract(contractId: string, _signatureData: string) {
    this.ensureWorkerContract(contractId)
    this.workerContractsById[contractId].status = "signed"
    return delay(ok({ id: contractId, status: "signed" as const, signed_at: nowIso() }))
  }

  async getWorkerPaystubs(_workerId: string) {
    this.ensureWorkerPaystubs(_workerId)
    return delay(ok(this.workerPaystubsByWorker[_workerId]))
  }

  async getWorkerPaystub(_workerId: string, paystubId: string) {
    this.ensureWorkerPaystubs(_workerId)
    const detail = this.workerPaystubDetails[_workerId]?.[paystubId]
    return delay(ok(detail))
  }

  async ackWorkerPaystub(_workerId: string, _paystubId: string) {
    this.ensureWorkerPaystubs(_workerId)
    const list = this.workerPaystubsByWorker[_workerId]
    const item = list.find((entry) => entry.id === _paystubId)
    if (item) {
      item.status = "confirmed"
    }
    const detail = this.workerPaystubDetails[_workerId]?.[_paystubId]
    if (detail) {
      detail.status = "confirmed"
    }
    return delay(ok({ received_at: nowIso() }))
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
      })
    )
  }

  async getNotifications() {
    this.ensureNotifications()
    return delay(ok(this.notifications))
  }

  async markNotificationRead(notificationId: string) {
    this.ensureNotifications()
    const target = this.notifications.find((item) => item.id === notificationId)
    if (target) target.read = true
    return delay(ok({ id: notificationId, read: true }))
  }
}

export const mockApiClient = new MockAPIClient()
