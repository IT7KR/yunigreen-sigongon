// ============================================
// Enums & Literal Types
// ============================================

export type ProjectStatus =
  | "draft"
  | "diagnosing"
  | "estimating"
  | "quoted"
  | "contracted"
  | "in_progress"
  | "completed"
  | "warranty"
  | "closed"

/**
 * User role types.
 *
 * System-level roles (organization_id = null):
 * - super_admin: Unigreen internal staff, manages all tenants
 * - worker: Daily laborers, linked to projects via LaborContract
 *
 * Tenant-level roles (organization_id required):
 * - company_admin: Customer company CEO, full access within company
 * - site_manager: Field supervisor, project-scoped access
 */
export type UserRole = "super_admin" | "company_admin" | "site_manager" | "worker"

/** Tenant-level roles that require organization_id */
export const TENANT_ROLES: UserRole[] = ["company_admin", "site_manager"]

/** System-level roles that have organization_id = null */
export const SYSTEM_ROLES: UserRole[] = ["super_admin", "worker"]

/** Check if a role is tenant-level (requires organization_id) */
export function isTenantRole(role: UserRole): boolean {
  return TENANT_ROLES.includes(role)
}

/** Check if a role is system-level (no organization_id) */
export function isSystemRole(role: UserRole): boolean {
  return SYSTEM_ROLES.includes(role)
}

export type PhotoType = "before" | "during" | "after" | "detail"

export type VisitType = "initial" | "progress" | "completion"

export type DiagnosisStatus = "pending" | "processing" | "completed" | "failed"

export type EstimateStatus = "draft" | "issued" | "accepted" | "rejected" | "void"

export type EstimateLineSource = "ai" | "manual" | "template"

export type ContractStatus = "draft" | "sent" | "signed" | "active" | "completed" | "cancelled"

export type LaborContractStatus = "draft" | "sent" | "signed" | "paid"

// Photo Album
export type AlbumLayoutType = "three_column" | "four_column"
export type PhotoAlbumStatus = "draft" | "published"

// Construction Report (착공계/준공계)
export type ReportType = "start" | "completion"
export type ReportStatus = "draft" | "submitted" | "approved" | "rejected"

// Weather & Daily Reports
export type WeatherType = "sunny" | "cloudy" | "rain" | "snow" | "wind"

// Subscription & Billing (토스페이먼츠)
export type SubscriptionPlan = "starter" | "standard" | "premium"
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "past_due"
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"

// Tax Invoice (팝빌)
export type TaxInvoiceStatus = "draft" | "issued" | "cancelled" | "failed"
export type TaxInvoiceType = "regular" | "simplified"

// Material Orders (자재 발주)
export type MaterialOrderStatus = "draft" | "requested" | "confirmed" | "shipped" | "delivered" | "cancelled"

// Case/Season Estimation
export type SeasonDocumentStatus = "queued" | "running" | "done" | "failed"
export type SeasonCategoryPurpose = "estimation" | "labor_rule" | "legal" | "safety"
export type DiagnosisCaseStatus = "draft" | "vision_ready" | "estimated"
export type EstimateExportType = "csv" | "xlsx"

// Project Categories (건물 용도 분류)
export const PROJECT_CATEGORIES = [
  { id: "detached_house", label: "단독주택 및 연립주택" },
  { id: "low_rise_apt", label: "저층아파트(5층이하)" },
  { id: "mid_rise_apt", label: "고층아파트(6~15층이하)" },
  { id: "high_rise_apt", label: "초고층아파트(16층이상)" },
  { id: "mixed_use", label: "주거·상업용겸용건물" },
  { id: "commercial", label: "상가·백화점·쇼핑센타" },
  { id: "office", label: "사무실빌딩" },
  { id: "officetel", label: "오피스텔" },
  { id: "intelligent", label: "인텔리전트빌딩" },
  { id: "gov_low", label: "관공서건물(11층이하)" },
  { id: "gov_high", label: "관공서건물(12층이상)" },
  { id: "hotel", label: "호텔숙박시설" },
  { id: "school", label: "학교" },
  { id: "hospital", label: "병원" },
  { id: "religious", label: "교회·사찰 등 종교용 건물" },
  { id: "traditional", label: "전통양식건축" },
  { id: "heritage", label: "기타문화재,유적건물" },
  { id: "performance", label: "공연, 집회장소" },
  { id: "stadium", label: "경기장·운동장" },
  { id: "exhibition", label: "전시시설" },
  { id: "factory", label: "공장,작업장용건물" },
  { id: "machinery", label: "기계기구설치(플랜트제외)" },
  { id: "power_plant", label: "변,발전소용건물" },
  { id: "warehouse", label: "창고,차고,터미널건물" },
  { id: "hazmat", label: "위험물저장소" },
  { id: "other", label: "기타" },
] as const

export type ProjectCategory = typeof PROJECT_CATEGORIES[number]["id"]

// ============================================
// Domain Models
// ============================================

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: UserRole
  /** Organization ID. Null for system-level roles (super_admin, worker) */
  organization_id: string | null
  is_active: boolean
  created_at: string
  last_login_at?: string
}

export interface Organization {
  id: string
  name: string
  business_number?: string
  address?: string
  phone?: string
}

export interface Project {
  id: string
  name: string
  address: string
  client_name?: string
  client_phone?: string
  notes?: string
  status: ProjectStatus
  category?: ProjectCategory
  organization_id: string
  pricebook_revision_id?: string
  created_at: string
  contracted_at?: string
  completed_at?: string
  warranty_expires_at?: string
}

export interface SiteVisit {
  id: string
  project_id: string
  technician_id: string
  visit_type: VisitType
  visited_at: string
  notes?: string
  created_at: string
  photo_count: number
}

export interface Photo {
  id: string
  site_visit_id: string
  photo_type: PhotoType
  caption?: string
  storage_path: string
  original_filename?: string
  taken_at?: string
  created_at: string
}

export interface AIDiagnosis {
  id: string
  site_visit_id: string
  model_name: string
  leak_opinion_text: string
  field_opinion_text?: string
  confidence_score?: number
  status: DiagnosisStatus
  created_at: string
  processing_time_ms?: number
}

export interface AIMaterialSuggestion {
  id: string
  ai_diagnosis_id: string
  suggested_name: string
  suggested_spec?: string
  suggested_unit?: string
  suggested_quantity?: number
  matched_catalog_item_id?: string
  match_confidence?: number
  is_confirmed: boolean
}

export interface Estimate {
  id: string
  project_id: string
  version: number
  pricebook_revision_id: string
  status: EstimateStatus
  notes?: string
  subtotal: string
  vat_amount: string
  total_amount: string
  created_at: string
  issued_at?: string
}

export interface EstimateLine {
  id: string
  estimate_id: string
  sort_order: number
  description: string
  specification?: string
  unit: string
  quantity: string
  unit_price_snapshot: string
  amount: string
  source: EstimateLineSource
}

export interface Contract {
  id: string
  project_id: string
  estimate_id: string
  contract_number?: string
  contract_amount: string
  status: ContractStatus
  notes?: string
  created_at: string
  sent_at?: string
  signed_at?: string
  start_date?: string
  expected_end_date?: string
  actual_end_date?: string
  client_signature_path?: string
  company_signature_path?: string
  document_path?: string
}

export interface LaborContract {
  id: string
  project_id: string
  worker_name: string
  worker_phone?: string
  work_date: string
  work_type?: string
  daily_rate: string
  hours_worked?: string
  status: LaborContractStatus
  worker_signature_path?: string
  signed_at?: string
  created_at: string
}

export interface PhotoAlbum {
  id: string
  project_id: string
  name: string
  description?: string
  layout: AlbumLayoutType
  status: PhotoAlbumStatus
  photos: AlbumPhotoDetail[]
  created_at: string
  updated_at: string
}

export interface AlbumPhotoDetail {
  id: string
  album_photo_id: string
  storage_path: string
  caption?: string
  caption_override?: string
  photo_type: PhotoType
  taken_at?: string
  sort_order: number
}

export interface ConstructionReport {
  id: string
  project_id: string
  report_type: ReportType
  report_number?: string
  status: ReportStatus
  notes?: string
  // 착공계 fields
  construction_name?: string
  site_address?: string
  start_date?: string
  expected_end_date?: string
  supervisor_name?: string
  supervisor_phone?: string
  // 준공계 fields
  actual_end_date?: string
  final_amount?: string
  defect_warranty_period?: number
  // Timestamps
  created_at: string
  updated_at: string
  submitted_at?: string
  approved_at?: string
  created_by: string
  approved_by?: string
}

export interface DailyReport {
  id: string
  project_id: string
  work_date: string
  weather?: WeatherType
  temperature?: string
  work_description: string
  tomorrow_plan?: string
  photos: string[]
  created_at: string
}

export interface Subscription {
  id: string
  organization_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  has_billing_key: boolean
  started_at: string
  expires_at: string
  cancelled_at?: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  subscription_id: string
  organization_id: string
  payment_key: string
  order_id: string
  amount: string
  status: PaymentStatus
  method?: string
  paid_at?: string
  failed_at?: string
  failure_reason?: string
  receipt_url?: string
  created_at: string
  updated_at: string
}

export interface TaxInvoice {
  id: string
  project_id: string
  organization_id: string
  issue_id?: string
  mgtkey: string
  invoice_type: TaxInvoiceType
  status: TaxInvoiceStatus
  supply_amount: string
  tax_amount: string
  total_amount: string
  // Supplier info
  supplier_corp_num: string
  supplier_name: string
  supplier_ceo?: string
  supplier_address?: string
  supplier_email?: string
  // Buyer info
  buyer_corp_num: string
  buyer_name: string
  buyer_ceo?: string
  buyer_address?: string
  buyer_email?: string
  // Description
  description?: string
  remark?: string
  // Timestamps
  issue_date?: string
  issued_at?: string
  cancelled_at?: string
  created_at: string
  updated_at: string
  created_by: string
}

export interface WarrantyInfo {
  project_id: string
  warranty_expires_at: string
  days_remaining: number
  as_requests: Array<{
    id: string
    description: string
    status: string
    created_at: string
  }>
}

export interface MaterialOrder {
  id: string
  project_id: string
  order_number: string
  status: MaterialOrderStatus
  items: MaterialOrderItem[]
  total_amount: number
  requested_at?: string
  confirmed_at?: string
  delivered_at?: string
  notes?: string
  created_at: string
}

export interface MaterialOrderItem {
  id: string
  description: string
  specification?: string
  unit: string
  quantity: number
  unit_price: number
  amount: number
}

export interface SeasonInfo {
  id: number
  name: string
  is_active: boolean
  created_at: string
}

export interface SeasonCategoryInfo {
  id: number
  season_id: number
  name: string
  purpose: SeasonCategoryPurpose
  is_enabled: boolean
  sort_order: number
  created_at: string
}

export interface SeasonDocumentInfo {
  id: number
  season_id: number
  category_id?: number
  purpose?: SeasonCategoryPurpose
  category: string
  title: string
  file_url: string
  version_hash: string
  status: SeasonDocumentStatus
  uploaded_at: string
  upload_url?: string
}

export interface SeasonDocumentStatusInfo {
  id: number
  status: SeasonDocumentStatus
  uploaded_at: string
  last_error?: string
  trace_chunk_count: number
  cost_item_count: number
}

export interface DiagnosisCase {
  id: number
  user_id: string
  season_id: number
  status: DiagnosisCaseStatus
  created_at: string
  updated_at: string
}

export interface DiagnosisCaseImage {
  id: number
  case_id: number
  file_url: string
  meta_json?: Record<string, unknown>
  created_at: string
}

export interface VisionResultDetail {
  id: number
  case_id: number
  model: string
  result_json: {
    findings: Array<{
      location?: string
      observed?: string
      hypothesis?: string
      severity?: "low" | "med" | "high"
      next_checks?: string[]
    }>
    work_items: Array<{
      name: string
      required?: boolean
      rationale?: string
    }>
    materials: Array<{
      name: string
      spec_hint?: string | null
      unit_hint?: string | null
      qty_hint?: string
      quantity?: number
    }>
    confidence: number
    questions_for_user: string[]
  }
  confidence?: number
  created_at: string
  updated_at: string
}

export interface EstimateEvidence {
  doc_title: string
  season_name: string
  page: number
  table_id?: string | null
  row_id?: string | null
  row_text: string
}

export interface DiagnosisCaseEstimateLine {
  work?: string
  item_name: string
  spec?: string
  unit: string
  quantity: number
  unit_price: number
  amount: number
  optional?: boolean
  evidence: EstimateEvidence[]
}

export interface DiagnosisCaseEstimate {
  id: number
  case_id: number
  version: number
  items: DiagnosisCaseEstimateLine[]
  totals: {
    subtotal: number
    vat_amount: number
    total_amount: number
  }
  version_hash_snapshot: string
  created_at: string
}

// ============================================
// API Response Types
// ============================================

export interface APIError {
  code: string
  message: string
  details?: Array<{ field?: string; message: string }>
}

export interface APIResponse<T> {
  success: boolean
  data: T | null
  error: APIError | null
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  error: null
  meta: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

// ============================================
// API-specific Response Types
// ============================================

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export interface ProjectListItem {
  id: string
  name: string
  address: string
  status: ProjectStatus
  category?: ProjectCategory
  client_name?: string
  created_at: string
  site_visit_count: number
  estimate_count: number
}

export interface ProjectDetail {
  id: string
  name: string
  address: string
  status: ProjectStatus
  category?: ProjectCategory
  client_name?: string
  client_phone?: string
  notes?: string
  created_at: string
  site_visits: Array<{
    id: string
    visit_type: VisitType
    visited_at: string
    photo_count: number
  }>
  estimates: Array<{
    id: string
    version: number
    status: EstimateStatus
    total_amount: string
    created_at?: string
    issued_at?: string
  }>
  contracts?: Array<{
    id: string
    status: ContractStatus
  }>
  diagnoses_count?: number
}

export interface ProjectAccessPolicy {
  project_id: string
  manager_ids: string[]
}

export interface SiteVisitDetail {
  id: string
  visit_type: VisitType
  visited_at: string
  notes?: string
  photo_count: number
  photos: Array<{
    id: string
    photo_type: PhotoType
    storage_path: string
    caption?: string
  }>
}

export interface DiagnosisDetail {
  id: string
  site_visit_id: string
  project_id: string
  status: DiagnosisStatus
  leak_opinion_text: string
  field_opinion_text?: string
  confidence_score?: number
  suggested_materials: Array<{
    id: string
    suggested_name: string
    suggested_spec?: string
    suggested_unit?: string
    suggested_quantity?: number
    matched_catalog_item?: {
      id: string
      name_ko: string
      unit_price: string
    }
    match_confidence?: number
    is_confirmed: boolean
  }>
  processing_time_ms?: number
}

export interface EstimateDetail {
  id: string
  version: number
  status: EstimateStatus
  subtotal: string
  vat_amount: string
  total_amount: string
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

export interface ContractDetail {
  id: string
  project_id: string
  estimate_id: string
  contract_number?: string
  contract_amount: string
  status: ContractStatus
  notes?: string
  created_at: string
  sent_at?: string
  signed_at?: string
  start_date?: string
  expected_end_date?: string
  project_name: string
  client_name?: string
}

export interface LaborContractListItem {
  id: string
  worker_name: string
  work_date: string
  work_type?: string
  daily_rate: string
  status: LaborContractStatus
  signed_at?: string
}

export interface ProjectPhotoAlbum {
  project_id: string
  project_name: string
  photos: {
    before: Array<{
      id: string
      storage_path: string
      caption?: string
      taken_at?: string
    }>
    during: Array<{
      id: string
      storage_path: string
      caption?: string
      taken_at?: string
    }>
    after: Array<{
      id: string
      storage_path: string
      caption?: string
      taken_at?: string
    }>
  }
}

// Photo Album List/Detail
export interface PhotoAlbumListItem {
  id: string
  project_id: string
  name: string
  description?: string
  layout: AlbumLayoutType
  status: PhotoAlbumStatus
  photo_count: number
  created_at: string
  updated_at: string
}

export interface PhotoAlbumDetail {
  id: string
  project_id: string
  name: string
  description?: string
  layout: AlbumLayoutType
  status: PhotoAlbumStatus
  photos: AlbumPhotoDetail[]
  created_at: string
  updated_at: string
}

// Construction Report List/Detail
export interface ConstructionReportListItem {
  id: string
  project_id: string
  report_type: ReportType
  report_number?: string
  status: ReportStatus
  construction_name?: string
  start_date?: string
  actual_end_date?: string
  created_at: string
  submitted_at?: string
  approved_at?: string
}

export interface ConstructionReportDetail extends ConstructionReport {}

// Subscription & Payment List Items
export interface SubscriptionDetail extends Subscription {
  plan_name: string
  plan_price: number
  days_remaining: number
}

export interface PaymentListItem {
  id: string
  amount: string
  status: PaymentStatus
  method?: string
  paid_at?: string
  created_at: string
  receipt_url?: string
}

// Tax Invoice List/Detail
export interface TaxInvoiceListItem {
  id: string
  project_id: string
  mgtkey: string
  invoice_type: TaxInvoiceType
  status: TaxInvoiceStatus
  total_amount: string
  buyer_name: string
  issue_date?: string
  issued_at?: string
  created_at: string
}

export interface TaxInvoiceDetail extends TaxInvoice {}

// ============================================
// Document Workflow Types
// ============================================

export type DocumentPhase =
  | "contract"        // 계약 단계
  | "commencement"    // 착공 단계
  | "construction"    // 시공 단계
  | "completion"      // 준공 단계
  | "labor_report"    // 일용신고
  | "private_contract" // 민간 계약
  | "school"          // 학교 특수

export type DocumentGenerationType =
  | "auto"      // 시스템 자동 생성
  | "template"  // 템플릿 기반 생성
  | "ai"        // AI 기반 생성
  | "external"  // 외부 연동 (모두싸인, 팝빌)
  | "upload"    // 사용자 업로드

export type DocumentFileFormat = "xlsx" | "pdf" | "hwp" | "hwpx" | "docx"

export type ProjectDocumentStatus =
  | "not_started"   // 미작성
  | "generated"     // 생성완료
  | "uploaded"      // 업로드완료
  | "submitted"     // 제출완료

export interface ProjectDocumentItem {
  id: string
  phase: DocumentPhase
  name: string
  format: DocumentFileFormat
  generation_type: DocumentGenerationType
  is_required: boolean
  is_conditional: boolean
  condition_description?: string  // e.g. "2천만원 이상 공사만", "보증서 대체 시"
  status: ProjectDocumentStatus
  file_path?: string
  file_size?: number
  generated_at?: string
  uploaded_at?: string
  notes?: string
}

export interface ProjectDocumentPhaseGroup {
  phase: DocumentPhase
  phase_label: string
  documents: ProjectDocumentItem[]
  total_count: number
  completed_count: number
}

// ============================================
// Modusign Electronic Signature
// ============================================

export type SignatureMethod = "self" | "modusign"

export type ModusignStatus = "pending" | "sent" | "viewed" | "signed" | "rejected" | "expired"

export interface ModusignRequest {
  id: string
  contract_id: string
  document_id: string
  status: ModusignStatus
  signer_name: string
  signer_email: string
  signer_phone?: string
  sent_at: string
  signed_at?: string
  expired_at?: string
  document_url?: string
}

// ============================================
// MyPage / User Profile Types
// ============================================

export interface UserNotificationPrefs {
  email_notifications: boolean
  project_status_change: boolean
  estimate_contract_alerts: boolean
  daily_report_alerts: boolean
  platform_announcements: boolean
}

export type ActivityLogAction =
  | "login"
  | "logout"
  | "profile_update"
  | "password_change"
  | "project_create"
  | "project_update"
  | "estimate_create"
  | "contract_sign"
  | "settings_change"
  | "consent_recorded"
  | "invitation_create"
  | "invitation_resend"
  | "invitation_revoke"
  | "invitation_accept"
  | "notification_send_success"
  | "notification_send_failure"

export interface ActivityLogEntry {
  id: string
  user_id: string
  action: ActivityLogAction
  description: string
  ip_address: string
  device_info: string
  created_at: string
}

// ============================================
// Daily Labor Reporting Types (일용신고)
// ============================================

/** 보험/세율 설정 */
export interface LaborInsuranceRates {
  id: string
  effective_year: number
  income_deduction: number           // 소득공제금액 (default: 150000)
  simplified_tax_rate: number        // 속산세율 (default: 0.027 = 2.7%)
  local_tax_rate: number             // 지방소득세율 (default: 0.1 = 10%)
  employment_insurance_rate: number  // 고용보험 근로자 부담 (default: 0.009 = 0.9%)
  health_insurance_rate: number      // 건강보험 (default: 0.03595 = 3.595%)
  longterm_care_rate: number         // 요양보험/장기요양 (default: 0.1314 = 13.14%)
  national_pension_rate: number      // 국민연금 (default: 0.045 = 4.5%)
  pension_upper_limit: number        // 국민연금 상한 기준소득월액 (default: 6170000)
  pension_lower_limit: number        // 국민연금 하한 기준소득월액 (default: 390000)
  health_premium_upper: number       // 건강보험 납부상한 (default: 7822560)
  health_premium_lower: number       // 건강보험 납부하한 (default: 19780)
}

export interface LaborCodebook {
  version: string
  nationality_codes: Record<string, string>
  visa_status_codes: Record<string, string>
  job_type_codes: Record<string, string>
}

/** 일용 근로자 (주소록) */
export interface DailyWorker {
  id: string
  name: string
  job_type: string              // 직종 (보통인부, 특별인부, 기능공 등)
  job_type_code: string         // 직종코드
  team: string                  // 소속반
  hire_date: string             // 입사일
  visa_status?: string          // 비자유형 (외국인 근로자)
  nationality_code?: string     // 국적코드
  english_name?: string         // 영문이름 (외국인)
  birth_date: string            // 생년월일 (YYMMDD 형식)
  gender: 1 | 2 | 3 | 4         // 성별코드 (1:내국남, 2:내국여, 3:외국남, 4:외국여)
  address: string               // 주소
  daily_rate: number            // 일당
  account_number: string        // 계좌번호
  bank_name: string             // 은행명
  phone: string                 // 연락처
  is_foreign: boolean           // 외국인 여부
  organization_id: string       // 소속 조직 ID
  /** 근로자 가입 상태 */
  registration_status?: "invited" | "pending_consent" | "pending_docs" | "registered"
  /** 초대 토큰 (가입 전) */
  invite_token?: string
  /** 필수 서류 업로드 여부 */
  has_id_card?: boolean
  has_safety_cert?: boolean
}

/** 일별 근무 기록 */
export interface DailyWorkRecord {
  id: string
  worker_id: string
  project_id: string
  work_date: string             // YYYY-MM-DD
  man_days: number              // 공수 (0.5 = 반일, 1 = 1일)
}

/** 근로자별 월간 급여 항목 */
export interface SitePayrollWorkerEntry {
  worker_id: string
  worker_name: string
  job_type: string
  job_type_code?: string             // 직종코드 (근로복지공단 코드)
  team: string
  ssn_masked: string                 // 주민(외국인)등록번호 (마스킹 처리)
  ssn_full?: string                  // 주민(외국인)등록번호 (전체, 전자신고용)
  daily_rate: number
  // 외국인 근로자 정보 (근로복지공단 신고 필수)
  is_foreign?: boolean               // 외국인 여부
  nationality_code?: string          // 국적코드 (근로복지공단 코드표, 예: 100=한국)
  visa_status?: string               // 체류자격코드 (예: H-2, E-9)
  english_name?: string              // 영문 성명 (외국인)
  phone?: string                     // 전화번호
  // 보험 구분 (1=산재, 3=고용, 5=산재+고용)
  insurance_type?: "1" | "3" | "5"
  work_days: Record<number, number>  // day-of-month → man_days
  total_days: number                  // 총 출력일수
  total_man_days: number              // 총 공수
  total_labor_cost: number            // 총노무비 = daily_rate × total_man_days
  income_tax: number                  // 갑근세(소득세)
  resident_tax: number               // 주민세(지방소득세)
  health_insurance: number           // 건강보험
  longterm_care: number              // 요양보험(장기요양)
  national_pension: number           // 국민연금
  employment_insurance: number       // 고용보험
  total_deductions: number           // 공제 합계
  net_pay: number                    // 차감지급액
  // 국세청 신고용 추가 필드
  nts_pay_month?: string             // 지급월 (YYYYMM, 예: 202601)
  nts_work_month?: string            // 근무월 (YYYYMM)
  nts_last_work_date?: string        // 최종근무일 (YYYYMMDD)
  nontaxable_income?: number         // 비과세소득
}

/** 현장별 급여 보고서 */
export interface SitePayrollReport {
  project_id: string
  project_name: string
  year: number
  month: number
  organization_name: string
  entries: SitePayrollWorkerEntry[]
  totals: {
    total_labor_cost: number
    total_income_tax: number
    total_resident_tax: number
    total_health_insurance: number
    total_longterm_care: number
    total_national_pension: number
    total_employment_insurance: number
    total_deductions: number
    total_net_pay: number
  }
}

/** 월별 통합 보고서 */
export interface MonthlyConsolidatedReport {
  year: number
  month: number
  organization_name: string
  projects: Array<{ id: string; name: string }>
  entries: SitePayrollWorkerEntry[]
  totals: {
    total_labor_cost: number
    total_income_tax: number
    total_resident_tax: number
    total_health_insurance: number
    total_longterm_care: number
    total_national_pension: number
    total_employment_insurance: number
    total_deductions: number
    total_net_pay: number
  }
}
