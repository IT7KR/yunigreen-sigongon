export interface RepresentativeDocumentMeta {
  fileName: string;
  uploadedAt: string;
}

export interface FieldRepresentative {
  id: string;
  name: string;
  phone: string;
  grade?: string;
  notes?: string;
  booklet?: RepresentativeDocumentMeta;
  careerCertificate?: RepresentativeDocumentMeta;
  employmentCertificate?: RepresentativeDocumentMeta;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRepresentativeAssignment {
  projectId: string;
  representativeId: string;
  effectiveDate: string;
  assignedAt: string;
}

const REPRESENTATIVE_STORAGE_KEY = "sigongon_field_representatives_v1";
const ASSIGNMENT_STORAGE_KEY = "sigongon_project_representatives_v1";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readStorage<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getFieldRepresentatives(): FieldRepresentative[] {
  return readStorage<FieldRepresentative[]>(REPRESENTATIVE_STORAGE_KEY, []);
}

export function saveFieldRepresentatives(items: FieldRepresentative[]) {
  writeStorage(REPRESENTATIVE_STORAGE_KEY, items);
}

export function upsertFieldRepresentative(
  payload: Omit<FieldRepresentative, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
) {
  const nowIso = new Date().toISOString();
  const items = getFieldRepresentatives();
  const existing = payload.id ? items.find((item) => item.id === payload.id) : null;

  if (existing) {
    const nextItems = items.map((item) =>
      item.id === payload.id
        ? {
            ...item,
            ...payload,
            updatedAt: nowIso,
          }
        : item,
    );
    saveFieldRepresentatives(nextItems);
    return payload.id;
  }

  const id = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const nextItems = [
    {
      ...payload,
      id,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    ...items,
  ];
  saveFieldRepresentatives(nextItems);
  return id;
}

export function deleteFieldRepresentative(representativeId: string) {
  const items = getFieldRepresentatives().filter((item) => item.id !== representativeId);
  saveFieldRepresentatives(items);

  const assignments = getRepresentativeAssignments().filter(
    (assignment) => assignment.representativeId !== representativeId,
  );
  saveRepresentativeAssignments(assignments);
}

export function getRepresentativeAssignments(): ProjectRepresentativeAssignment[] {
  return readStorage<ProjectRepresentativeAssignment[]>(ASSIGNMENT_STORAGE_KEY, []);
}

export function saveRepresentativeAssignments(
  assignments: ProjectRepresentativeAssignment[],
) {
  writeStorage(ASSIGNMENT_STORAGE_KEY, assignments);
}

export function assignRepresentativeToProject(
  projectId: string,
  representativeId: string,
  effectiveDate: string,
) {
  const assignments = getRepresentativeAssignments();
  const nextAssignments = [
    ...assignments.filter((assignment) => assignment.projectId !== projectId),
    {
      projectId,
      representativeId,
      effectiveDate,
      assignedAt: new Date().toISOString(),
    },
  ];
  saveRepresentativeAssignments(nextAssignments);
}

export function getAssignmentByProjectId(projectId: string) {
  return getRepresentativeAssignments().find(
    (assignment) => assignment.projectId === projectId,
  );
}

export function getRepresentativeById(representativeId: string) {
  return getFieldRepresentatives().find((item) => item.id === representativeId);
}

export function getCareerCertificateRemainingDays(
  representative: FieldRepresentative,
) {
  const uploadedAt = representative.careerCertificate?.uploadedAt;
  if (!uploadedAt) return null;

  const uploadedDate = new Date(uploadedAt);
  if (Number.isNaN(uploadedDate.getTime())) return null;

  const expiryDate = new Date(uploadedDate);
  expiryDate.setDate(expiryDate.getDate() + 90);

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
