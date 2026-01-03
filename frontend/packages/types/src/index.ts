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

export type UserRole = "admin" | "manager" | "technician"

export type PhotoType = "before" | "during" | "after" | "detail"

export type VisitType = "initial" | "progress" | "completion"

export type DiagnosisStatus = "pending" | "processing" | "completed" | "failed"

export type EstimateStatus = "draft" | "issued" | "accepted" | "rejected" | "void"

export type EstimateLineSource = "ai" | "manual" | "template"

export type ContractStatus = "draft" | "sent" | "signed" | "active" | "completed" | "cancelled"

export type LaborContractStatus = "draft" | "sent" | "signed" | "paid"

// ============================================
// Domain Models
// ============================================

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: UserRole
  organization_id: string
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
  photos: {
    before: Photo[]
    during: Photo[]
    after: Photo[]
  }
  created_at: string
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
