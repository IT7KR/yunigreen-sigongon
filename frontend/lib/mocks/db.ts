import type {
  ProjectStatus,
  UserRole,
  ProjectCategory,
  LaborInsuranceRates,
  DailyWorker,
  DailyWorkRecord,
} from "@sigongcore/types";

// Invitation status types
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invitation {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  organization_id: string;
  status: InvitationStatus;
  token: string; // 초대 링크용 고유 토큰
  invited_by: string; // 초대한 사용자 ID
  created_at: string;
  expires_at: string; // 7일 후 만료
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
  deleted_at?: string | null;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  status: ProjectStatus;
  category?: ProjectCategory;
  customerMasterId?: string;
  clientName: string;
  clientPhone: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  organization_id: string;
  visibleToSiteManager: boolean;
  siteManagerVisibility?: string[];
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
  organization_id?: string; // mockDb User.organization_id 와 매핑
  businessNumber?: string; // 사업자등록번호
  plan: "trial" | "basic" | "pro" | "none";
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
  | "custom_trial"
  | "pending_payment";

export function getSubscriptionStatus(tenant: Tenant): SubscriptionStatus {
  const now = new Date();
  const endDate = new Date(tenant.subscription_end_date);

  if (tenant.plan === "none") return "pending_payment";
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
  constructionCostRates: any[];
  costCalculations: any[];
  constructionPlans: any[];
  constructionPhases: any[];
  constructionLabors: any[];
  constructionMaterials: any[];
}

const STORAGE_KEY = "sigongcore_mock_v4";

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
    status === "warranty" ||
    status === "closed"
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
    customerMasterId: raw?.customerMasterId
      ? String(raw.customerMasterId)
      : raw?.customer_master_id
        ? String(raw.customer_master_id)
        : undefined,
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
    siteManagerVisibility: Array.isArray(raw?.siteManagerVisibility)
      ? raw.siteManagerVisibility.map((item: unknown) => String(item))
      : undefined,
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
      email: "worker_01012345678@sigongcore.local",
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
      category: "low_rise_apt",
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
      category: "mid_rise_apt",
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
      category: "commercial",
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
      category: "office",
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
      category: "high_rise_apt",
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
      category: "school",
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
      category: "detached_house",
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
      category: "high_rise_apt",
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
      organization_id: "org_1",
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
      organization_id: "org_2",
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
    {
      id: "al_1",
      user_id: "u1",
      action: "login",
      description: "로그인",
      ip_address: "192.168.1.100",
      device_info: "Chrome / Windows",
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "al_2",
      user_id: "u1",
      action: "project_create",
      description: "프로젝트 '서울 강남구 삼성동 누수 공사' 생성",
      ip_address: "192.168.1.100",
      device_info: "Chrome / Windows",
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "al_3",
      user_id: "u1",
      action: "estimate_create",
      description: "견적서 v1 작성",
      ip_address: "192.168.1.100",
      device_info: "Chrome / Windows",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "al_4",
      user_id: "u1",
      action: "profile_update",
      description: "프로필 정보 수정",
      ip_address: "192.168.1.101",
      device_info: "Safari / macOS",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "al_5",
      user_id: "u1",
      action: "password_change",
      description: "비밀번호 변경",
      ip_address: "192.168.1.101",
      device_info: "Safari / macOS",
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: "al_6",
      user_id: "u1",
      action: "contract_sign",
      description: "계약서 서명 완료",
      ip_address: "192.168.1.100",
      device_info: "Chrome / Windows",
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: "al_7",
      user_id: "u1",
      action: "settings_change",
      description: "알림 설정 변경",
      ip_address: "192.168.1.100",
      device_info: "Chrome / Windows",
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: "al_8",
      user_id: "u1",
      action: "login",
      description: "로그인",
      ip_address: "10.0.0.5",
      device_info: "Mobile Safari / iOS",
      created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
    {
      id: "al_9",
      user_id: "u1",
      action: "project_update",
      description: "프로젝트 상태 변경: 진행 중",
      ip_address: "10.0.0.5",
      device_info: "Mobile Safari / iOS",
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      id: "al_10",
      user_id: "u1",
      action: "logout",
      description: "로그아웃",
      ip_address: "10.0.0.5",
      device_info: "Mobile Safari / iOS",
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
  ],
  dailyWorkers: [
    {
      id: "dw_1",
      name: "김철수",
      job_type: "보통인부",
      job_type_code: "010",
      team: "1반",
      hire_date: "2025-03-01",
      birth_date: "750315",
      gender: 1 as const,
      address: "서울시 강남구 역삼동 123",
      daily_rate: 200000,
      account_number: "110-123-456789",
      bank_name: "신한은행",
      phone: "010-1111-2222",
      is_foreign: false,
      organization_id: "org_1",
    },
    {
      id: "dw_2",
      name: "박영수",
      job_type: "특별인부",
      job_type_code: "020",
      team: "1반",
      hire_date: "2025-06-15",
      birth_date: "820720",
      gender: 1 as const,
      address: "경기도 성남시 분당구 정자동 456",
      daily_rate: 220000,
      account_number: "352-0123-4567-89",
      bank_name: "농협은행",
      phone: "010-3333-4444",
      is_foreign: false,
      organization_id: "org_1",
    },
    {
      id: "dw_3",
      name: "이순자",
      job_type: "보통인부",
      job_type_code: "010",
      team: "2반",
      hire_date: "2025-01-10",
      birth_date: "680812",
      gender: 2 as const,
      address: "서울시 서초구 서초동 789",
      daily_rate: 200000,
      account_number: "3333-01-1234567",
      bank_name: "우리은행",
      phone: "010-5555-6666",
      is_foreign: false,
      organization_id: "org_1",
    },
    {
      id: "dw_4",
      name: "최만복",
      job_type: "기능공",
      job_type_code: "030",
      team: "1반",
      hire_date: "2024-11-01",
      birth_date: "590105",
      gender: 1 as const,
      address: "인천시 남동구 구월동 321",
      daily_rate: 250000,
      account_number: "100-123-456789",
      bank_name: "국민은행",
      phone: "010-7777-8888",
      is_foreign: false,
      organization_id: "org_1",
    },
    {
      id: "dw_5",
      name: "정미영",
      job_type: "보통인부",
      job_type_code: "010",
      team: "2반",
      hire_date: "2025-09-01",
      birth_date: "610425",
      gender: 2 as const,
      address: "서울시 마포구 합정동 654",
      daily_rate: 200000,
      account_number: "110-987-654321",
      bank_name: "신한은행",
      phone: "010-9999-0000",
      is_foreign: false,
      organization_id: "org_1",
    },
    {
      id: "dw_6",
      name: "NGUYEN VAN A",
      job_type: "보통인부",
      job_type_code: "010",
      team: "1반",
      hire_date: "2025-08-01",
      birth_date: "950610",
      gender: 3 as const,
      address: "경기도 안산시 단원구 원곡동 111",
      daily_rate: 200000,
      account_number: "352-0987-6543-21",
      bank_name: "농협은행",
      phone: "010-1234-5678",
      is_foreign: true,
      visa_status: "E-9",
      nationality_code: "VN",
      english_name: "NGUYEN VAN A",
      organization_id: "org_1",
    },
    {
      id: "dw_7",
      name: "한상수",
      job_type: "특별인부",
      job_type_code: "020",
      team: "2반",
      hire_date: "2025-04-15",
      birth_date: "880930",
      gender: 1 as const,
      address: "부산시 해운대구 좌동 222",
      daily_rate: 230000,
      account_number: "3333-02-9876543",
      bank_name: "우리은행",
      phone: "010-2468-1357",
      is_foreign: false,
      organization_id: "org_1",
    },
  ],
  dailyWorkRecords: (() => {
    const records: DailyWorkRecord[] = [];
    let idx = 0;
    const workerDailyRates: Record<string, number> = {
      dw_1: 200000,
      dw_2: 220000,
      dw_3: 200000,
      dw_4: 250000,
      dw_5: 200000,
      dw_6: 200000,
      dw_7: 230000,
    };
    // 2025년 12월 근무기록 - p2 현장 (연도 경계 테스트)
    const dec2025Workers = [
      {
        wid: "dw_1",
        days: [
          1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 26,
          29, 30, 31,
        ],
      },
      {
        wid: "dw_2",
        days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24],
      },
      {
        wid: "dw_3",
        days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19],
      },
      {
        wid: "dw_4",
        days: [
          1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 26,
          29, 30, 31,
        ],
      },
    ];
    for (const w of dec2025Workers) {
      for (const day of w.days) {
        records.push({
          id: `dwr_${++idx}`,
          worker_id: w.wid,
          project_id: "p2",
          work_date: `2025-12-${String(day).padStart(2, "0")}`,
          man_days: 1,
          daily_rate: workerDailyRates[w.wid],
        });
      }
    }
    // 2026년 1월 근무기록 - p2 현장
    const jan2026Workers = [
      {
        wid: "dw_1",
        days: [13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31],
      },
      {
        wid: "dw_2",
        days: [13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30],
      },
      { wid: "dw_3", days: [13, 14, 15, 16, 20, 21, 22, 23, 27, 28, 29, 30] },
      {
        wid: "dw_4",
        days: [13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31],
      },
      { wid: "dw_5", days: [14, 15, 16, 17, 21, 22, 23, 24, 28, 29, 30] },
      { wid: "dw_6", days: [13, 14, 15, 16, 17, 20, 21, 22, 23, 24] },
      {
        wid: "dw_7",
        days: [15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31],
      },
    ];
    for (const w of jan2026Workers) {
      for (const day of w.days) {
        records.push({
          id: `dwr_${++idx}`,
          worker_id: w.wid,
          project_id: "p2",
          work_date: `2026-01-${String(day).padStart(2, "0")}`,
          man_days: 1,
          daily_rate: workerDailyRates[w.wid],
        });
      }
    }
    // 2026년 1월 근무기록 - p5 현장 (일부 근로자)
    const jan2026P5 = [
      { wid: "dw_1", days: [6, 7, 8, 9, 10] },
      { wid: "dw_3", days: [6, 7, 8, 9, 10] },
    ];
    for (const w of jan2026P5) {
      for (const day of w.days) {
        records.push({
          id: `dwr_${++idx}`,
          worker_id: w.wid,
          project_id: "p5",
          work_date: `2026-01-${String(day).padStart(2, "0")}`,
          man_days: 1,
          daily_rate: workerDailyRates[w.wid],
        });
      }
    }
    // 2026년 2월 근무기록 - p2 현장
    const feb2026Workers = [
      {
        wid: "dw_1",
        days: [2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20],
      },
      {
        wid: "dw_2",
        days: [2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20],
      },
      { wid: "dw_3", days: [3, 4, 5, 6, 9, 10, 11, 12, 16, 17, 18, 19] },
      {
        wid: "dw_4",
        days: [2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20],
      },
      { wid: "dw_5", days: [3, 4, 5, 6, 10, 11, 12, 13, 17, 18, 19, 20] },
      { wid: "dw_6", days: [2, 3, 4, 5, 6, 9, 10, 11, 12, 13] },
      {
        wid: "dw_7",
        days: [2, 3, 4, 5, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20],
      },
    ];
    for (const w of feb2026Workers) {
      for (const day of w.days) {
        records.push({
          id: `dwr_${++idx}`,
          worker_id: w.wid,
          project_id: "p2",
          work_date: `2026-02-${String(day).padStart(2, "0")}`,
          man_days: 1,
          daily_rate: workerDailyRates[w.wid],
        });
      }
    }
    // 2026년 2월 근무기록 - p5 현장
    const feb2026P5 = [
      { wid: "dw_1", days: [2, 3, 4, 5, 6, 9, 10] },
      { wid: "dw_3", days: [2, 3, 4, 5, 6, 9, 10] },
      { wid: "dw_5", days: [2, 3, 4, 5, 6] },
      { wid: "dw_7", days: [3, 4, 5, 6, 9, 10] },
    ];
    for (const w of feb2026P5) {
      for (const day of w.days) {
        records.push({
          id: `dwr_${++idx}`,
          worker_id: w.wid,
          project_id: "p5",
          work_date: `2026-02-${String(day).padStart(2, "0")}`,
          man_days: 1,
          daily_rate: workerDailyRates[w.wid],
        });
      }
    }
    // 2025년 12월 근무기록 - p4 현장 (완료 프로젝트, 2026-01-15 종료)
    const dec2025P4 = [
      {
        wid: "dw_2",
        days: [
          1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 26,
        ],
      },
      {
        wid: "dw_4",
        days: [
          1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 26,
          29, 30, 31,
        ],
      },
      {
        wid: "dw_6",
        days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23],
      },
      {
        wid: "dw_7",
        days: [3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 26],
      },
    ];
    for (const w of dec2025P4) {
      for (const day of w.days) {
        records.push({
          id: `dwr_${++idx}`,
          worker_id: w.wid,
          project_id: "p4",
          work_date: `2025-12-${String(day).padStart(2, "0")}`,
          man_days: 1,
          daily_rate: workerDailyRates[w.wid],
        });
      }
    }
    // 2026년 1월 근무기록 - p4 현장 (1월 15일까지 공사)
    const jan2026P4 = [
      { wid: "dw_2", days: [2, 5, 6, 7, 8, 9, 12, 13, 14, 15] },
      { wid: "dw_4", days: [2, 5, 6, 7, 8, 9, 12, 13, 14, 15] },
      { wid: "dw_6", days: [5, 6, 7, 8, 9, 12, 13, 14] },
      { wid: "dw_7", days: [6, 7, 8, 9, 12, 13, 14, 15] },
    ];
    for (const w of jan2026P4) {
      for (const day of w.days) {
        records.push({
          id: `dwr_${++idx}`,
          worker_id: w.wid,
          project_id: "p4",
          work_date: `2026-01-${String(day).padStart(2, "0")}`,
          man_days: 1,
          daily_rate: workerDailyRates[w.wid],
        });
      }
    }
    // 2026년 1월 근무기록 - p8 현장 (하자보수)
    const jan2026P8 = [
      { wid: "dw_1", days: [19, 20, 21, 22, 23, 26, 27, 28, 29, 30] },
      { wid: "dw_3", days: [20, 21, 22, 23, 26, 27, 28] },
      { wid: "dw_5", days: [21, 22, 23, 26, 27, 28, 29, 30] },
    ];
    for (const w of jan2026P8) {
      for (const day of w.days) {
        records.push({
          id: `dwr_${++idx}`,
          worker_id: w.wid,
          project_id: "p8",
          work_date: `2026-01-${String(day).padStart(2, "0")}`,
          man_days: 1,
          daily_rate: workerDailyRates[w.wid],
        });
      }
    }
    // 2026년 2월 근무기록 - p8 현장 (하자보수 계속)
    const feb2026P8 = [
      { wid: "dw_1", days: [2, 3, 4, 5, 6, 9, 10, 11, 12] },
      { wid: "dw_3", days: [3, 4, 5, 6, 9, 10, 11] },
      { wid: "dw_5", days: [2, 3, 4, 5, 9, 10, 11, 12] },
      { wid: "dw_7", days: [4, 5, 6, 9, 10, 11, 12, 13] },
    ];
    for (const w of feb2026P8) {
      for (const day of w.days) {
        records.push({
          id: `dwr_${++idx}`,
          worker_id: w.wid,
          project_id: "p8",
          work_date: `2026-02-${String(day).padStart(2, "0")}`,
          man_days: 1,
          daily_rate: workerDailyRates[w.wid],
        });
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
  // Construction Cost Rates (건설 원가 요율) - SA managed
  constructionCostRates: [
    {
      id: "rate-001",
      label: "2025년 하반기",
      effective_from: "2025-07-01",
      effective_to: "2025-12-31",
      status: "active",
      industrial_accident_rate: "3.56",
      employment_insurance_rate: "1.01",
      health_insurance_rate: "3.545",
      national_pension_rate: "4.50",
      longterm_care_rate: "12.95",
      safety_management_rate: "3.11",
      environmental_rate: "0.30",
      indirect_labor_rate: "15.00",
      other_expense_rate: "4.60",
      general_admin_rate: "5.50",
      profit_rate_cap: "12.00",
      subcontract_guarantee_rate: "0.081",
      equipment_guarantee_rate: "0.10",
      health_insurance_min_days: 31,
      pension_min_days: 31,
      longterm_care_min_days: 31,
      created_at: "2025-07-01T00:00:00Z",
    },
  ],
  // Cost Calculations (원가계산서) - one per estimate
  costCalculations: [] as any[],
  constructionPlans: [
    // p2: 판교 아파트 - 진행 중 (일부 완료, 일부 지연)
    {
      id: "plan_p2",
      project_id: "p2",
      organization_id: "org_1",
      title: "판교 아파트 방수공사 시공계획서",
      notes: "공사 기간: 1월 15일 ~ 4월 15일 (3개월)",
      created_by: "user_admin",
      created_at: "2026-01-14T09:00:00Z",
      updated_at: "2026-03-10T15:30:00Z",
    },
    // p4: 대전 유성 - 완료
    {
      id: "plan_p4",
      project_id: "p4",
      organization_id: "org_1",
      title: "대전 유성 전기공사 시공계획서",
      notes: null,
      created_by: "user_admin",
      created_at: "2025-11-28T09:00:00Z",
      updated_at: "2026-01-15T18:00:00Z",
    },
    // p1: 서울 강남구 삼성동 누수 공사 (draft) - 계획만 세움, 아직 시작 안함
    {
      id: "plan_p1",
      project_id: "p1",
      organization_id: "org_1",
      title: "삼성동 누수 공사 시공계획서",
      notes: null,
      created_by: "user_admin",
      created_at: "2026-03-10T10:00:00Z",
      updated_at: "2026-03-10T10:00:00Z",
    },
    // p3: 인천 송도 조경공사 (estimating) - 계획 초안
    {
      id: "plan_p3",
      project_id: "p3",
      organization_id: "org_1",
      title: "송도 조경공사 시공계획서",
      notes: null,
      created_by: "user_admin",
      created_at: "2026-03-06T09:00:00Z",
      updated_at: "2026-03-06T09:00:00Z",
    },
    // p5: 부산 해운대 설비공사 (contracted) - 착공 예정, 전부 pending
    {
      id: "plan_p5",
      project_id: "p5",
      organization_id: "org_1",
      title: "해운대 설비공사 시공계획서",
      notes: "착공일: 2026-03-20 예정",
      created_by: "user_admin",
      created_at: "2026-03-08T09:00:00Z",
      updated_at: "2026-03-08T09:00:00Z",
    },
    // p6: 서초구 방배동 학교 균열보수 (diagnosing) - 진단 중, 계획 초안
    {
      id: "plan_p6",
      project_id: "p6",
      organization_id: "org_1",
      title: "방배동 학교 균열보수 시공계획서",
      notes: "진단 결과에 따라 공정 조정 예정",
      created_by: "user_admin",
      created_at: "2026-03-04T09:00:00Z",
      updated_at: "2026-03-04T09:00:00Z",
    },
    // p7: 마포구 연남동 방수공사 (quoted) - 견적 단계, 계획 초안
    {
      id: "plan_p7",
      project_id: "p7",
      organization_id: "org_1",
      title: "연남동 방수공사 시공계획서",
      notes: null,
      created_by: "user_admin",
      created_at: "2026-02-25T09:00:00Z",
      updated_at: "2026-02-25T09:00:00Z",
    },
    // p8: 송파구 잠실 아파트 하자보수 (warranty) - 완료됨
    {
      id: "plan_p8",
      project_id: "p8",
      organization_id: "org_1",
      title: "잠실 아파트 하자보수 시공계획서",
      notes: null,
      created_by: "user_admin",
      created_at: "2025-09-28T09:00:00Z",
      updated_at: "2025-12-20T18:00:00Z",
    },
  ] as any[],
  constructionPhases: [
    // === plan_p2 (판교 아파트) phases ===
    {
      id: "phase_p2_1",
      plan_id: "plan_p2",
      sort_order: 0,
      name: "가설공사",
      planned_start: "2026-01-15",
      planned_end: "2026-01-20",
      actual_start: "2026-01-15",
      actual_end: "2026-01-20",
      status: "completed",
      notes: null,
      completed_at: "2026-01-20T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2026-01-14T09:00:00Z",
      updated_at: "2026-01-20T17:00:00Z",
      planned_days: 6,
      actual_days: 6,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p2_2",
      plan_id: "plan_p2",
      sort_order: 1,
      name: "철거공사",
      planned_start: "2026-01-21",
      planned_end: "2026-01-25",
      actual_start: "2026-01-21",
      actual_end: "2026-01-26",
      status: "completed",
      notes: "1일 지연 (우천)",
      completed_at: "2026-01-26T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2026-01-14T09:00:00Z",
      updated_at: "2026-01-26T17:00:00Z",
      planned_days: 5,
      actual_days: 6,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p2_3",
      plan_id: "plan_p2",
      sort_order: 2,
      name: "하부방수",
      planned_start: "2026-01-27",
      planned_end: "2026-02-06",
      actual_start: "2026-01-27",
      actual_end: "2026-02-07",
      status: "completed",
      notes: null,
      completed_at: "2026-02-07T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2026-01-14T09:00:00Z",
      updated_at: "2026-02-07T17:00:00Z",
      planned_days: 11,
      actual_days: 12,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p2_4",
      plan_id: "plan_p2",
      sort_order: 3,
      name: "상부방수",
      planned_start: "2026-02-08",
      planned_end: "2026-02-17",
      actual_start: "2026-02-08",
      actual_end: "2026-02-20",
      status: "completed",
      notes: "우천으로 3일 지연",
      completed_at: "2026-02-20T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2026-01-14T09:00:00Z",
      updated_at: "2026-02-20T17:00:00Z",
      planned_days: 10,
      actual_days: 13,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p2_5",
      plan_id: "plan_p2",
      sort_order: 4,
      name: "미장공사",
      planned_start: "2026-02-21",
      planned_end: "2026-03-02",
      actual_start: "2026-02-21",
      actual_end: null,
      status: "in_progress",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-01-14T09:00:00Z",
      updated_at: "2026-03-01T09:00:00Z",
      planned_days: 10,
      actual_days: null,
      is_delayed: true,
      delay_days: 9,
    },
    {
      id: "phase_p2_6",
      plan_id: "plan_p2",
      sort_order: 5,
      name: "도장공사",
      planned_start: "2026-03-03",
      planned_end: "2026-03-15",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-01-14T09:00:00Z",
      updated_at: "2026-01-14T09:00:00Z",
      planned_days: 13,
      actual_days: null,
      is_delayed: true,
      delay_days: 8,
    },
    {
      id: "phase_p2_7",
      plan_id: "plan_p2",
      sort_order: 6,
      name: "외벽도장",
      planned_start: "2026-03-16",
      planned_end: "2026-03-28",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-01-14T09:00:00Z",
      updated_at: "2026-01-14T09:00:00Z",
      planned_days: 13,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p2_8",
      plan_id: "plan_p2",
      sort_order: 7,
      name: "마감 및 청소",
      planned_start: "2026-03-29",
      planned_end: "2026-04-05",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-01-14T09:00:00Z",
      updated_at: "2026-01-14T09:00:00Z",
      planned_days: 8,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    // === plan_p4 (대전 유성 전기공사) phases - 모두 완료 ===
    {
      id: "phase_p4_1",
      plan_id: "plan_p4",
      sort_order: 0,
      name: "전기 배선 설치",
      planned_start: "2025-12-01",
      planned_end: "2025-12-10",
      actual_start: "2025-12-01",
      actual_end: "2025-12-10",
      status: "completed",
      notes: null,
      completed_at: "2025-12-10T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2025-11-28T09:00:00Z",
      updated_at: "2025-12-10T17:00:00Z",
      planned_days: 10,
      actual_days: 10,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p4_2",
      plan_id: "plan_p4",
      sort_order: 1,
      name: "분전반 설치",
      planned_start: "2025-12-11",
      planned_end: "2025-12-20",
      actual_start: "2025-12-11",
      actual_end: "2025-12-21",
      status: "completed",
      notes: "자재 도착 지연 1일",
      completed_at: "2025-12-21T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2025-11-28T09:00:00Z",
      updated_at: "2025-12-21T17:00:00Z",
      planned_days: 10,
      actual_days: 11,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p4_3",
      plan_id: "plan_p4",
      sort_order: 2,
      name: "조명 설치",
      planned_start: "2025-12-22",
      planned_end: "2025-12-31",
      actual_start: "2025-12-22",
      actual_end: "2026-01-02",
      status: "completed",
      notes: "연말 연휴로 2일 지연",
      completed_at: "2026-01-02T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2025-11-28T09:00:00Z",
      updated_at: "2026-01-02T17:00:00Z",
      planned_days: 10,
      actual_days: 12,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p4_4",
      plan_id: "plan_p4",
      sort_order: 3,
      name: "마감 및 검수",
      planned_start: "2026-01-03",
      planned_end: "2026-01-15",
      actual_start: "2026-01-03",
      actual_end: "2026-01-15",
      status: "completed",
      notes: null,
      completed_at: "2026-01-15T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2025-11-28T09:00:00Z",
      updated_at: "2026-01-15T17:00:00Z",
      planned_days: 13,
      actual_days: 13,
      is_delayed: false,
      delay_days: 0,
    },
    // === plan_p1 (삼성동 누수공사) - draft, 전부 pending ===
    {
      id: "phase_p1_1",
      plan_id: "plan_p1",
      sort_order: 0,
      name: "누수 탐지 및 진단",
      planned_start: "2026-04-01",
      planned_end: "2026-04-03",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-10T10:00:00Z",
      updated_at: "2026-03-10T10:00:00Z",
      planned_days: 3,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p1_2",
      plan_id: "plan_p1",
      sort_order: 1,
      name: "배관 교체",
      planned_start: "2026-04-04",
      planned_end: "2026-04-10",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-10T10:00:00Z",
      updated_at: "2026-03-10T10:00:00Z",
      planned_days: 7,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p1_3",
      plan_id: "plan_p1",
      sort_order: 2,
      name: "방수처리",
      planned_start: "2026-04-11",
      planned_end: "2026-04-17",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-10T10:00:00Z",
      updated_at: "2026-03-10T10:00:00Z",
      planned_days: 7,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p1_4",
      plan_id: "plan_p1",
      sort_order: 3,
      name: "마감 및 복구",
      planned_start: "2026-04-18",
      planned_end: "2026-04-21",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-10T10:00:00Z",
      updated_at: "2026-03-10T10:00:00Z",
      planned_days: 4,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    // === plan_p3 (송도 조경공사) - estimating, 전부 pending ===
    {
      id: "phase_p3_1",
      plan_id: "plan_p3",
      sort_order: 0,
      name: "부지 정리 및 토공",
      planned_start: "2026-04-10",
      planned_end: "2026-04-20",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-06T09:00:00Z",
      updated_at: "2026-03-06T09:00:00Z",
      planned_days: 11,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p3_2",
      plan_id: "plan_p3",
      sort_order: 1,
      name: "급배수 설비",
      planned_start: "2026-04-21",
      planned_end: "2026-04-28",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-06T09:00:00Z",
      updated_at: "2026-03-06T09:00:00Z",
      planned_days: 8,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p3_3",
      plan_id: "plan_p3",
      sort_order: 2,
      name: "조경 식재",
      planned_start: "2026-04-29",
      planned_end: "2026-05-15",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-06T09:00:00Z",
      updated_at: "2026-03-06T09:00:00Z",
      planned_days: 17,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p3_4",
      plan_id: "plan_p3",
      sort_order: 3,
      name: "포장 및 시설물 설치",
      planned_start: "2026-05-16",
      planned_end: "2026-05-25",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-06T09:00:00Z",
      updated_at: "2026-03-06T09:00:00Z",
      planned_days: 10,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p3_5",
      plan_id: "plan_p3",
      sort_order: 4,
      name: "준공 검수",
      planned_start: "2026-05-26",
      planned_end: "2026-05-30",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-06T09:00:00Z",
      updated_at: "2026-03-06T09:00:00Z",
      planned_days: 5,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    // === plan_p5 (해운대 설비공사) - contracted, 전부 pending ===
    {
      id: "phase_p5_1",
      plan_id: "plan_p5",
      sort_order: 0,
      name: "가설공사 및 현장 준비",
      planned_start: "2026-03-20",
      planned_end: "2026-03-25",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-08T09:00:00Z",
      updated_at: "2026-03-08T09:00:00Z",
      planned_days: 6,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p5_2",
      plan_id: "plan_p5",
      sort_order: 1,
      name: "배관 설치",
      planned_start: "2026-03-26",
      planned_end: "2026-04-05",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-08T09:00:00Z",
      updated_at: "2026-03-08T09:00:00Z",
      planned_days: 11,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p5_3",
      plan_id: "plan_p5",
      sort_order: 2,
      name: "위생기구 설치",
      planned_start: "2026-04-06",
      planned_end: "2026-04-15",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-08T09:00:00Z",
      updated_at: "2026-03-08T09:00:00Z",
      planned_days: 10,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p5_4",
      plan_id: "plan_p5",
      sort_order: 3,
      name: "보온 및 단열",
      planned_start: "2026-04-16",
      planned_end: "2026-04-22",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-08T09:00:00Z",
      updated_at: "2026-03-08T09:00:00Z",
      planned_days: 7,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p5_5",
      plan_id: "plan_p5",
      sort_order: 4,
      name: "시험 및 검수",
      planned_start: "2026-04-23",
      planned_end: "2026-04-28",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-08T09:00:00Z",
      updated_at: "2026-03-08T09:00:00Z",
      planned_days: 6,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    // === plan_p6 (방배동 학교 균열보수) - diagnosing, 전부 pending ===
    {
      id: "phase_p6_1",
      plan_id: "plan_p6",
      sort_order: 0,
      name: "균열 보수 (외벽)",
      planned_start: "2026-04-01",
      planned_end: "2026-04-10",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-04T09:00:00Z",
      updated_at: "2026-03-04T09:00:00Z",
      planned_days: 10,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p6_2",
      plan_id: "plan_p6",
      sort_order: 1,
      name: "균열 보수 (내벽)",
      planned_start: "2026-04-11",
      planned_end: "2026-04-18",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-04T09:00:00Z",
      updated_at: "2026-03-04T09:00:00Z",
      planned_days: 8,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p6_3",
      plan_id: "plan_p6",
      sort_order: 2,
      name: "도장 마감",
      planned_start: "2026-04-19",
      planned_end: "2026-04-25",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-03-04T09:00:00Z",
      updated_at: "2026-03-04T09:00:00Z",
      planned_days: 7,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    // === plan_p7 (연남동 방수공사) - quoted, 전부 pending ===
    {
      id: "phase_p7_1",
      plan_id: "plan_p7",
      sort_order: 0,
      name: "옥상 방수",
      planned_start: "2026-04-05",
      planned_end: "2026-04-12",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-02-25T09:00:00Z",
      updated_at: "2026-02-25T09:00:00Z",
      planned_days: 8,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p7_2",
      plan_id: "plan_p7",
      sort_order: 1,
      name: "지하 방수",
      planned_start: "2026-04-13",
      planned_end: "2026-04-22",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-02-25T09:00:00Z",
      updated_at: "2026-02-25T09:00:00Z",
      planned_days: 10,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p7_3",
      plan_id: "plan_p7",
      sort_order: 2,
      name: "외벽 코팅",
      planned_start: "2026-04-23",
      planned_end: "2026-04-30",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-02-25T09:00:00Z",
      updated_at: "2026-02-25T09:00:00Z",
      planned_days: 8,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p7_4",
      plan_id: "plan_p7",
      sort_order: 3,
      name: "마감 청소",
      planned_start: "2026-05-01",
      planned_end: "2026-05-03",
      actual_start: null,
      actual_end: null,
      status: "pending",
      notes: null,
      completed_at: null,
      completed_by: null,
      created_at: "2026-02-25T09:00:00Z",
      updated_at: "2026-02-25T09:00:00Z",
      planned_days: 3,
      actual_days: null,
      is_delayed: false,
      delay_days: 0,
    },
    // === plan_p8 (잠실 아파트 하자보수) - warranty, 전부 completed ===
    {
      id: "phase_p8_1",
      plan_id: "plan_p8",
      sort_order: 0,
      name: "균열 부위 조사",
      planned_start: "2025-10-01",
      planned_end: "2025-10-05",
      actual_start: "2025-10-01",
      actual_end: "2025-10-05",
      status: "completed",
      notes: null,
      completed_at: "2025-10-05T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2025-09-28T09:00:00Z",
      updated_at: "2025-10-05T17:00:00Z",
      planned_days: 5,
      actual_days: 5,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p8_2",
      plan_id: "plan_p8",
      sort_order: 1,
      name: "균열 보수 공사",
      planned_start: "2025-10-06",
      planned_end: "2025-10-31",
      actual_start: "2025-10-06",
      actual_end: "2025-11-02",
      status: "completed",
      notes: "작업 범위 확대로 3일 연장",
      completed_at: "2025-11-02T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2025-09-28T09:00:00Z",
      updated_at: "2025-11-02T17:00:00Z",
      planned_days: 26,
      actual_days: 28,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p8_3",
      plan_id: "plan_p8",
      sort_order: 2,
      name: "방수 처리",
      planned_start: "2025-11-03",
      planned_end: "2025-11-25",
      actual_start: "2025-11-03",
      actual_end: "2025-11-25",
      status: "completed",
      notes: null,
      completed_at: "2025-11-25T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2025-09-28T09:00:00Z",
      updated_at: "2025-11-25T17:00:00Z",
      planned_days: 23,
      actual_days: 23,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p8_4",
      plan_id: "plan_p8",
      sort_order: 3,
      name: "도장 마감",
      planned_start: "2025-11-26",
      planned_end: "2025-12-10",
      actual_start: "2025-11-26",
      actual_end: "2025-12-10",
      status: "completed",
      notes: null,
      completed_at: "2025-12-10T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2025-09-28T09:00:00Z",
      updated_at: "2025-12-10T17:00:00Z",
      planned_days: 15,
      actual_days: 15,
      is_delayed: false,
      delay_days: 0,
    },
    {
      id: "phase_p8_5",
      plan_id: "plan_p8",
      sort_order: 4,
      name: "검수 및 인계",
      planned_start: "2025-12-11",
      planned_end: "2025-12-20",
      actual_start: "2025-12-11",
      actual_end: "2025-12-20",
      status: "completed",
      notes: null,
      completed_at: "2025-12-20T17:00:00Z",
      completed_by: "user_admin",
      created_at: "2025-09-28T09:00:00Z",
      updated_at: "2025-12-20T17:00:00Z",
      planned_days: 10,
      actual_days: 10,
      is_delayed: false,
      delay_days: 0,
    },
  ] as any[],
  constructionLabors: [] as any[],
  constructionMaterials: [] as any[],
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
      invitations: Array.isArray(parsed?.invitations) ? parsed.invitations : [],
      notificationPrefs: Array.isArray(parsed?.notificationPrefs)
        ? parsed.notificationPrefs
        : INITIAL_DATA.notificationPrefs,
      activityLogs: Array.isArray(parsed?.activityLogs)
        ? parsed.activityLogs
        : INITIAL_DATA.activityLogs,
      dailyWorkers: Array.isArray(parsed?.dailyWorkers)
        ? parsed.dailyWorkers
        : INITIAL_DATA.dailyWorkers,
      dailyWorkRecords: Array.isArray(parsed?.dailyWorkRecords)
        ? parsed.dailyWorkRecords
        : INITIAL_DATA.dailyWorkRecords,
      insuranceRates: Array.isArray(parsed?.insuranceRates)
        ? parsed.insuranceRates
        : INITIAL_DATA.insuranceRates,
      constructionCostRates: Array.isArray(parsed?.constructionCostRates)
        ? parsed.constructionCostRates
        : INITIAL_DATA.constructionCostRates,
      costCalculations: Array.isArray(parsed?.costCalculations)
        ? parsed.costCalculations
        : INITIAL_DATA.costCalculations,
      constructionPlans: Array.isArray(parsed?.constructionPlans)
        ? parsed.constructionPlans
        : INITIAL_DATA.constructionPlans,
      constructionPhases: Array.isArray(parsed?.constructionPhases)
        ? parsed.constructionPhases
        : INITIAL_DATA.constructionPhases,
      constructionLabors: Array.isArray(parsed?.constructionLabors)
        ? parsed.constructionLabors
        : INITIAL_DATA.constructionLabors,
      constructionMaterials: Array.isArray(parsed?.constructionMaterials)
        ? parsed.constructionMaterials
        : INITIAL_DATA.constructionMaterials,
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
