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

// Subscription & Billing (토스페이먼츠)
export type SubscriptionPlan = "starter" | "standard" | "premium"
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "past_due"
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"

// Tax Invoice (팝빌)
export type TaxInvoiceStatus = "draft" | "issued" | "cancelled" | "failed"
export type TaxInvoiceType = "regular" | "simplified"

// Project Categories (건설업 신고 기준)
export const PROJECT_CATEGORIES = [
  { id: "architecture", label: "건축공사업" },
  { id: "civil", label: "토목공사업" },
  { id: "landscape", label: "조경공사업" },
  { id: "waterproof", label: "방수공사업" },
  { id: "plumbing", label: "설비공사업" },
  { id: "electrical", label: "전기공사업" },
  { id: "interior", label: "실내건축공사업" },
  { id: "steel", label: "철강재설치공사업" },
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
