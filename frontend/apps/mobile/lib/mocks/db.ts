import type { ProjectStatus, UserRole } from "@sigongon/types";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  status: ProjectStatus;
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

export interface MockSchema {
  users: User[];
  projects: Project[];
  estimates: Estimate[];
  contracts: Contract[];
  dailyReports: DailyReport[];
  currentUser: User | null;
}

const STORAGE_KEY = "sigongon_mock_v1";

const nowIso = () => new Date().toISOString();

const normalizeRole = (role: unknown): UserRole => {
  if (role === "admin" || role === "manager" || role === "technician")
    return role;
  if (role === "company_rep") return "manager";
  if (role === "site_manager") return "technician";
  return "admin";
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
  return {
    id: String(raw?.id || "u1"),
    name: String(raw?.name || "사용자"),
    email: String(raw?.email || "user@example.com"),
    role: normalizeRole(raw?.role),
    phone: raw?.phone ? String(raw.phone) : undefined,
    organization_id: String(raw?.organization_id || "org_1"),
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
      id: "u1",
      name: "이중호",
      email: "admin@sigongon.com",
      role: "admin",
      organization_id: "org_1",
      is_active: true,
      created_at: nowIso(),
    },
    {
      id: "u2",
      name: "김대표",
      email: "ceo@partner.com",
      role: "manager",
      organization_id: "org_1",
      is_active: true,
      created_at: nowIso(),
    },
    {
      id: "u3",
      name: "박소장",
      email: "site@partner.com",
      role: "technician",
      organization_id: "org_1",
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
