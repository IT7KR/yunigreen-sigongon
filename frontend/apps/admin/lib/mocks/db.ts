import type { ProjectStatus, UserRole, ProjectCategory } from "@sigongon/types";

// Invitation status types
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  email: string;
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

export interface MockSchema {
  users: User[];
  projects: Project[];
  estimates: Estimate[];
  contracts: Contract[];
  dailyReports: DailyReport[];
  currentUser: User | null;
  tenants: Tenant[];
  invitations: Invitation[];
}

const STORAGE_KEY = "sigongon_mock_v1";

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
      status: "in_progress",
      clientName: "이순신",
      clientPhone: "010-9876-5432",
      organization_id: "org_1",
      visibleToSiteManager: true,
      startDate: "2026-01-10",
      endDate: "2026-02-10",
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
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
