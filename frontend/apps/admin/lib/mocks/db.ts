import type { ProjectStatus, UserRole, ProjectCategory, LaborInsuranceRates, DailyWorker, DailyWorkRecord } from "@sigongon/types";

// Invitation status types
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  organization_id: string;
  status: InvitationStatus;
  token: string;           // 초대 링크용 고유 토큰
  invited_by: string;      // 초대한 사용자 ID
  created_at: string;
  expires_at: string;      // 7일 후 만료
  accepted_at?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: UserRole;
  phone?: string;
  /** Organization ID. Null for system-level roles (super_admin, worker) */
  organization_id: string | null;
  is_active: boolean;
  created_at?: string;
  last_login_at?: string;
  password_hash?: string;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  status: ProjectStatus;
  category?: ProjectCategory;
  clientName: string;
  clientPhone: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  organization_id: string;
  visibleToSiteManager: boolean;
  createdAt: string;
}

export interface Estimate {
  id: string;
  projectId: string;
  version: number;
  totalAmount: number;
  status: "draft" | "issued" | "approved" | "rejected";
  items: any[];
  createdAt: string;
}

export interface Contract {
  id: string;
  projectId: string;
  estimateId: string;
  status: "draft" | "sent" | "signed";
  contractDate: string;
  startDate: string;
  endDate: string;
  signedAt?: string;
}

export interface DailyReport {
  id: string;
  projectId: string;
  date: string;
  todayWork: string;
  tomorrowWork: string;
  photos: string[];
  authorId: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  businessNumber?: string; // 사업자등록번호
  plan: "trial" | "basic" | "pro"; // 'free' → 'trial'로 변경
  users_count: number;
  projects_count: number;
  created_at: string;
  // 구독 관련 필드
  subscription_start_date: string; // 구독 시작일
  subscription_end_date: string; // 구독 종료일 (만료일)
  is_custom_trial: boolean; // 최고관리자이 부여한 커스텀 무료인지
  billing_amount?: number; // 결제 금액 (무료면 0)
  payment_id?: string; // 결제 ID (토스페이먼츠)
}

// 구독 상태 판단 로직
export type SubscriptionStatus =
  | "active"
  | "trial"
  | "expired"
  | "custom_trial";

export function getSubscriptionStatus(tenant: Tenant): SubscriptionStatus {
  const now = new Date();
  const endDate = new Date(tenant.subscription_end_date);

  if (now > endDate) return "expired";
  if (tenant.is_custom_trial) return "custom_trial";
  if (tenant.plan === "trial") return "trial";
  return "active";
}

export function getDaysRemaining(tenant: Tenant): number {
  const now = new Date();
  const endDate = new Date(tenant.subscription_end_date);
  const diff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export interface NotificationPrefs {
  user_id: string;
  email_notifications: boolean;
  project_status_change: boolean;
  estimate_contract_alerts: boolean;
  daily_report_alerts: boolean;
  platform_announcements: boolean;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description: string;
  ip_address: string;
  device_info: string;
  created_at: string;
}

export interface MockSchema {
  users: User[];
  projects: Project[];
  estimates: Estimate[];
  contracts: Contract[];
  dailyReports: DailyReport[];
  currentUser: User | null;
  tenants: Tenant[];
  invitations: Invitation[];
  notificationPrefs: NotificationPrefs[];
  activityLogs: ActivityLog[];
  dailyWorkers: DailyWorker[];
  dailyWorkRecords: DailyWorkRecord[];
  insuranceRates: LaborInsuranceRates[];
}

const STORAGE_KEY = "sigongon_mock_v3";

const nowIso = () => new Date().toISOString();

const normalizeRole = (role: unknown): UserRole => {
  // New role values
  if (
    role === "super_admin" ||
    role === "company_admin" ||
    role === "site_manager" ||
    role === "worker"
  )
    return role;
  // Legacy role mappings
  if (role === "admin") return "company_admin";
  if (role === "manager") return "company_admin";
  if (role === "technician") return "site_manager";
  if (role === "company_rep") return "company_admin";
  return "company_admin";
};

const normalizeStatus = (status: unknown): ProjectStatus => {
  if (
    status === "draft" ||
    status === "diagnosing" ||
    status === "estimating" ||
    status === "quoted" ||
    status === "contracted" ||
    status === "in_progress" ||
    status === "completed" ||
    status === "warranty"
  ) {
    return status;
  }

  if (status === "consulting") return "draft";
  if (status === "construction") return "in_progress";
  if (status === "completion") return "completed";
  if (status === "done") return "warranty";
  if (status === "contracting") return "contracted";
  return "draft";
};

const normalizeUser = (raw: any): User => {
  const role = normalizeRole(raw?.role);
  // System-level roles (super_admin, worker) have null organization_id
  const isSystemRole = role === "super_admin" || role === "worker";
  const organization_id = isSystemRole
    ? null
    : String(raw?.organization_id || "org_1");

  return {
    id: String(raw?.id || "u1"),
    username: String(raw?.username || raw?.email?.split("@")[0] || "user"),
    name: String(raw?.name || "사용자"),
    email: String(raw?.email || "user@example.com"),
    role,
    phone: raw?.phone ? String(raw.phone) : undefined,
    organization_id,
    is_active: typeof raw?.is_active === "boolean" ? raw.is_active : true,
    created_at: String(raw?.created_at || nowIso()),
    last_login_at: raw?.last_login_at ? String(raw.last_login_at) : undefined,
  };
};

const normalizeProject = (raw: any): Project => {
  return {
    id: String(raw?.id || "p1"),
    name: String(raw?.name || "프로젝트"),
    address: String(raw?.address || ""),
    status: normalizeStatus(raw?.status),
    clientName: String(raw?.clientName || raw?.client_name || ""),
    clientPhone: String(raw?.clientPhone || raw?.client_phone || ""),
    notes: raw?.notes ? String(raw.notes) : undefined,
    startDate: raw?.startDate ? String(raw.startDate) : undefined,
    endDate: raw?.endDate ? String(raw.endDate) : undefined,
    organization_id: String(raw?.organization_id || "org_1"),
    visibleToSiteManager:
      typeof raw?.visibleToSiteManager === "boolean"
        ? raw.visibleToSiteManager
        : true,
    createdAt: String(raw?.createdAt || raw?.created_at || nowIso()),
  };
};

const INITIAL_DATA: MockSchema = {
  users: [
    {
      id: "u0",
      username: "superadmin",
      name: "유니그린 관리자",
      email: "superadmin@yunigreen.com",
      role: "super_admin",
      organization_id: null, // System-level role
      is_active: true,
      created_at: nowIso(),
    },
    {
      id: "u1",
      username: "ceo_lee",
      name: "이중호",
      email: "ceo@customer.com",
      role: "company_admin",
      organization_id: "org_1", // Tenant-level role
      is_active: true,
      created_at: nowIso(),
    },
    {
      id: "u2",
      username: "site_kim",
      name: "김소장",
      email: "site@customer.com",
      role: "site_manager",
      organization_id: "org_1", // Tenant-level role
      is_active: true,
      created_at: nowIso(),
    },
    {
      id: "u3",
      username: "worker_hong",
      name: "홍길동",
      email: "worker_01012345678@sigongon.local",
      phone: "010-1234-5678",
      role: "worker",
      organization_id: null, // System-level role, linked via LaborContract
      is_active: true,
      created_at: nowIso(),
    },
  ],
  projects: [
    {
      id: "p1",
      name: "서울 강남구 삼성동 누수 공사",
      address: "서울 강남구 삼성동 123-45",
      status: "draft",
      category: "waterproof",
      clientName: "홍길동",
      clientPhone: "010-1234-5678",
      organization_id: "org_1",
      visibleToSiteManager: true,
      createdAt: nowIso(),
    },
    {
      id: "p2",
      name: "경기도 성남시 판교 아파트",
      address: "경기도 성남시 분당구 판교동 555",
      category: "architecture",
      status: "in_progress",
      clientName: "이순신",
      clientPhone: "010-9876-5432",
      organization_id: "org_1",
      visibleToSiteManager: true,
      startDate: "2026-01-10",
      endDate: "2026-02-10",
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: "p3",
      name: "인천 송도 조경공사",
      address: "인천 연수구 송도동 11-22",
      category: "landscape",
      status: "estimating",
      clientName: "김철수",
      clientPhone: "010-1111-2222",
      organization_id: "org_1",
      visibleToSiteManager: true,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: "p4",
      name: "대전 유성 전기공사",
      address: "대전 유성구 대학로 33-44",
      category: "electrical",
      status: "completed",
      clientName: "박영희",
      clientPhone: "010-3333-4444",
      organization_id: "org_1",
      visibleToSiteManager: true,
      startDate: "2025-12-01",
      endDate: "2026-01-15",
      createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    },
    {
      id: "p5",
      name: "부산 해운대 설비공사",
      address: "부산 해운대구 우동 77-88",
      category: "plumbing",
      status: "contracted",
      clientName: "최민수",
      clientPhone: "010-5555-6666",
      organization_id: "org_1",
      visibleToSiteManager: true,
      startDate: "2026-01-20",
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: "p6",
      name: "서초구 방배동 학교 균열보수",
      address: "서울 서초구 방배동 456-78",
      category: "architecture" as ProjectCategory,
      status: "diagnosing",
      clientName: "방배초등학교",
      clientPhone: "02-1234-5678",
      organization_id: "org_1",
      visibleToSiteManager: true,
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      id: "p7",
      name: "마포구 연남동 방수공사",
      address: "서울 마포구 연남동 223-11",
      category: "waterproof" as ProjectCategory,
      status: "quoted",
      clientName: "정대현",
      clientPhone: "010-7777-8888",
      organization_id: "org_1",
      visibleToSiteManager: true,
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    },
    {
      id: "p8",
      name: "송파구 잠실 아파트 하자보수",
      address: "서울 송파구 잠실동 100-1",
      category: "waterproof" as ProjectCategory,
      status: "warranty",
      clientName: "잠실래미안 관리사무소",
      clientPhone: "02-9999-0000",
      organization_id: "org_1",
      visibleToSiteManager: true,
      startDate: "2025-10-01",
      endDate: "2025-12-20",
      createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    },
  ],
  estimates: [],
  contracts: [],
  dailyReports: [],
  currentUser: null,
  tenants: [
    {
      id: "tenant_1",
      name: "유니그린개발",
      plan: "pro",
      users_count: 5,
      projects_count: 12,
      created_at: "2025-01-01T00:00:00Z",
      subscription_start_date: "2025-01-01T00:00:00Z",
      subscription_end_date: "2026-01-01T00:00:00Z",
      is_custom_trial: false,
      billing_amount: 1188000,
    },
    {
      id: "tenant_2",
      name: "ABC건설",
      plan: "basic",
      users_count: 3,
      projects_count: 5,
      created_at: "2025-06-15T00:00:00Z",
      subscription_start_date: "2025-06-15T00:00:00Z",
      subscription_end_date: "2026-06-15T00:00:00Z",
      is_custom_trial: false,
      billing_amount: 588000,
    },
  ],
  invitations: [],
  notificationPrefs: [
    {
      user_id: "u0",
      email_notifications: true,
      project_status_change: true,
      estimate_contract_alerts: true,
      daily_report_alerts: true,
      platform_announcements: true,
    },
    {
      user_id: "u1",
      email_notifications: true,
      project_status_change: true,
      estimate_contract_alerts: true,
      daily_report_alerts: true,
      platform_announcements: true,
    },
    {
      user_id: "u2",
      email_notifications: false,
      project_status_change: true,
      estimate_contract_alerts: false,
      daily_report_alerts: true,
      platform_announcements: true,
    },
  ],
  activityLogs: [
    { id: "al_1", user_id: "u1", action: "login", description: "로그인", ip_address: "192.168.1.100", device_info: "Chrome / Windows", created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: "al_2", user_id: "u1", action: "project_create", description: "프로젝트 '서울 강남구 삼성동 누수 공사' 생성", ip_address: "192.168.1.100", device_info: "Chrome / Windows", created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: "al_3", user_id: "u1", action: "estimate_create", description: "견적서 v1 작성", ip_address: "192.168.1.100", device_info: "Chrome / Windows", created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: "al_4", user_id: "u1", action: "profile_update", description: "프로필 정보 수정", ip_address: "192.168.1.101", device_info: "Safari / macOS", created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: "al_5", user_id: "u1", action: "password_change", description: "비밀번호 변경", ip_address: "192.168.1.101", device_info: "Safari / macOS", created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: "al_6", user_id: "u1", action: "contract_sign", description: "계약서 서명 완료", ip_address: "192.168.1.100", device_info: "Chrome / Windows", created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: "al_7", user_id: "u1", action: "settings_change", description: "알림 설정 변경", ip_address: "192.168.1.100", device_info: "Chrome / Windows", created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: "al_8", user_id: "u1", action: "login", description: "로그인", ip_address: "10.0.0.5", device_info: "Mobile Safari / iOS", created_at: new Date(Date.now() - 86400000 * 6).toISOString() },
    { id: "al_9", user_id: "u1", action: "project_update", description: "프로젝트 상태 변경: 진행 중", ip_address: "10.0.0.5", device_info: "Mobile Safari / iOS", created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: "al_10", user_id: "u1", action: "logout", description: "로그아웃", ip_address: "10.0.0.5", device_info: "Mobile Safari / iOS", created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  ],
  dailyWorkers: [
    {
      id: "dw_1", name: "김철수", job_type: "보통인부", job_type_code: "010", team: "1반",
      hire_date: "2025-03-01", ssn: "750315-1234567", address: "서울시 강남구 역삼동 123",
      daily_rate: 200000, account_number: "110-123-456789", bank_name: "신한은행",
      phone: "010-1111-2222", is_foreign: false, organization_id: "org_1",
    },
    {
      id: "dw_2", name: "박영수", job_type: "특별인부", job_type_code: "020", team: "1반",
      hire_date: "2025-06-15", ssn: "820720-1345678", address: "경기도 성남시 분당구 정자동 456",
      daily_rate: 220000, account_number: "352-0123-4567-89", bank_name: "농협은행",
      phone: "010-3333-4444", is_foreign: false, organization_id: "org_1",
    },
    {
      id: "dw_3", name: "이순자", job_type: "보통인부", job_type_code: "010", team: "2반",
      hire_date: "2025-01-10", ssn: "680812-2456789", address: "서울시 서초구 서초동 789",
      daily_rate: 200000, account_number: "3333-01-1234567", bank_name: "우리은행",
      phone: "010-5555-6666", is_foreign: false, organization_id: "org_1",
    },
    {
      id: "dw_4", name: "최만복", job_type: "기능공", job_type_code: "030", team: "1반",
      hire_date: "2024-11-01", ssn: "590105-1567890", address: "인천시 남동구 구월동 321",
      daily_rate: 250000, account_number: "100-123-456789", bank_name: "국민은행",
      phone: "010-7777-8888", is_foreign: false, organization_id: "org_1",
    },
    {
      id: "dw_5", name: "정미영", job_type: "보통인부", job_type_code: "010", team: "2반",
      hire_date: "2025-09-01", ssn: "610425-2678901", address: "서울시 마포구 합정동 654",
      daily_rate: 200000, account_number: "110-987-654321", bank_name: "신한은행",
      phone: "010-9999-0000", is_foreign: false, organization_id: "org_1",
    },
    {
      id: "dw_6", name: "NGUYEN VAN A", job_type: "보통인부", job_type_code: "010", team: "1반",
      hire_date: "2025-08-01", ssn: "950610-5789012", address: "경기도 안산시 단원구 원곡동 111",
      daily_rate: 200000, account_number: "352-0987-6543-21", bank_name: "농협은행",
      phone: "010-1234-5678", is_foreign: true, visa_status: "E-9", nationality_code: "VN",
      english_name: "NGUYEN VAN A", organization_id: "org_1",
    },
    {
      id: "dw_7", name: "한상수", job_type: "특별인부", job_type_code: "020", team: "2반",
      hire_date: "2025-04-15", ssn: "880930-1890123", address: "부산시 해운대구 좌동 222",
      daily_rate: 230000, account_number: "3333-02-9876543", bank_name: "우리은행",
      phone: "010-2468-1357", is_foreign: false, organization_id: "org_1",
    },
  ],
  dailyWorkRecords: (() => {
    const records: DailyWorkRecord[] = [];
    let idx = 0;
    // 2026년 1월 근무기록 - p2 현장
    const jan2026Workers = [
      { wid: "dw_1", days: [13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31] },
      { wid: "dw_2", days: [13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30] },
      { wid: "dw_3", days: [13, 14, 15, 16, 20, 21, 22, 23, 27, 28, 29, 30] },
      { wid: "dw_4", days: [13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31] },
      { wid: "dw_5", days: [14, 15, 16, 17, 21, 22, 23, 24, 28, 29, 30] },
      { wid: "dw_6", days: [13, 14, 15, 16, 17, 20, 21, 22, 23, 24] },
      { wid: "dw_7", days: [15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31] },
    ];
    for (const w of jan2026Workers) {
      for (const day of w.days) {
        records.push({ id: `dwr_${++idx}`, worker_id: w.wid, project_id: "p2", work_date: `2026-01-${String(day).padStart(2, "0")}`, man_days: 1 });
      }
    }
    // 2026년 1월 근무기록 - p5 현장 (일부 근로자)
    const jan2026P5 = [
      { wid: "dw_1", days: [6, 7, 8, 9, 10] },
      { wid: "dw_3", days: [6, 7, 8, 9, 10] },
    ];
    for (const w of jan2026P5) {
      for (const day of w.days) {
        records.push({ id: `dwr_${++idx}`, worker_id: w.wid, project_id: "p5", work_date: `2026-01-${String(day).padStart(2, "0")}`, man_days: 1 });
      }
    }
    // 2026년 2월 근무기록 - p2 현장
    const feb2026Workers = [
      { wid: "dw_1", days: [2, 3, 4, 5, 6] },
      { wid: "dw_2", days: [2, 3, 4, 5, 6] },
      { wid: "dw_4", days: [2, 3, 4, 5, 6] },
      { wid: "dw_7", days: [2, 3, 4, 5] },
    ];
    for (const w of feb2026Workers) {
      for (const day of w.days) {
        records.push({ id: `dwr_${++idx}`, worker_id: w.wid, project_id: "p2", work_date: `2026-02-${String(day).padStart(2, "0")}`, man_days: 1 });
      }
    }
    return records;
  })(),
  insuranceRates: [
    {
      id: "ir_2026",
      effective_year: 2026,
      income_deduction: 150000,
      simplified_tax_rate: 0.027,
      local_tax_rate: 0.1,
      employment_insurance_rate: 0.009,
      health_insurance_rate: 0.03595,
      longterm_care_rate: 0.1314,
      national_pension_rate: 0.045,
      pension_upper_limit: 6170000,
      pension_lower_limit: 390000,
      health_premium_upper: 7822560,
      health_premium_lower: 19780,
    },
    {
      id: "ir_2025",
      effective_year: 2025,
      income_deduction: 150000,
      simplified_tax_rate: 0.027,
      local_tax_rate: 0.1,
      employment_insurance_rate: 0.009,
      health_insurance_rate: 0.03545,
      longterm_care_rate: 0.1281,
      national_pension_rate: 0.045,
      pension_upper_limit: 5900000,
      pension_lower_limit: 370000,
      health_premium_upper: 7822560,
      health_premium_lower: 19500,
    },
  ],
};

class MockDB {
  private data: MockSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): MockSchema {
    if (typeof window === "undefined") return INITIAL_DATA;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      this.save(INITIAL_DATA);
      return INITIAL_DATA;
    }

    const parsed = JSON.parse(stored);
    const users = Array.isArray(parsed?.users)
      ? parsed.users.map(normalizeUser)
      : INITIAL_DATA.users;
    const projects = Array.isArray(parsed?.projects)
      ? parsed.projects.map(normalizeProject)
      : INITIAL_DATA.projects;
    const currentUser = parsed?.currentUser
      ? normalizeUser(parsed.currentUser)
      : null;

    const normalized: MockSchema = {
      users,
      projects,
      estimates: Array.isArray(parsed?.estimates) ? parsed.estimates : [],
      contracts: Array.isArray(parsed?.contracts) ? parsed.contracts : [],
      dailyReports: Array.isArray(parsed?.dailyReports)
        ? parsed.dailyReports
        : [],
      currentUser,
      tenants: Array.isArray(parsed?.tenants)
        ? parsed.tenants
        : INITIAL_DATA.tenants,
      invitations: Array.isArray(parsed?.invitations)
        ? parsed.invitations
        : [],
      notificationPrefs: Array.isArray(parsed?.notificationPrefs) ? parsed.notificationPrefs : INITIAL_DATA.notificationPrefs,
      activityLogs: Array.isArray(parsed?.activityLogs) ? parsed.activityLogs : INITIAL_DATA.activityLogs,
      dailyWorkers: Array.isArray(parsed?.dailyWorkers) ? parsed.dailyWorkers : INITIAL_DATA.dailyWorkers,
      dailyWorkRecords: Array.isArray(parsed?.dailyWorkRecords) ? parsed.dailyWorkRecords : INITIAL_DATA.dailyWorkRecords,
      insuranceRates: Array.isArray(parsed?.insuranceRates) ? parsed.insuranceRates : INITIAL_DATA.insuranceRates,
    };

    return normalized;
  }

  private save(data: MockSchema) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    this.data = data;
  }

  get<K extends keyof MockSchema>(key: K): MockSchema[K] {
    return this.data[key];
  }

  set<K extends keyof MockSchema>(key: K, value: MockSchema[K]) {
    const newData = { ...this.data, [key]: value };
    this.save(newData);
  }

  update<K extends keyof MockSchema>(
    key: K,
    updater: (prev: MockSchema[K]) => MockSchema[K],
  ) {
    const newData = { ...this.data, [key]: updater(this.data[key]) };
    this.save(newData);
  }

  reset() {
    this.save(INITIAL_DATA);
    window.location.reload();
  }
}

export const mockDb = new MockDB();
