import { api } from "@/lib/api";
import type { FieldRepresentativeRead } from "@sigongon/api";

// Keep type aliases for backward compatibility
export type FieldRepresentative = FieldRepresentativeRead;
export type ProjectRepresentativeAssignment = {
  projectId: string;
  representativeId: number;
  effectiveDate: string;
  assignedAt?: string;
};

// ─── Async API-based functions ────────────────────────────

export async function getFieldRepresentatives(): Promise<FieldRepresentative[]> {
  const response = await api.listFieldRepresentatives();
  return response.success && response.data ? response.data : [];
}

export async function upsertFieldRepresentative(
  payload: {
    id?: number;
    name: string;
    phone: string;
    grade?: string;
    notes?: string;
    booklet_filename?: string;
    career_cert_filename?: string;
    career_cert_uploaded_at?: string;
    employment_cert_filename?: string;
  },
): Promise<number> {
  const createData = {
    name: payload.name,
    phone: payload.phone,
    grade: payload.grade,
    notes: payload.notes,
    booklet_filename: payload.booklet_filename,
    career_cert_filename: payload.career_cert_filename,
    career_cert_uploaded_at: payload.career_cert_uploaded_at,
    employment_cert_filename: payload.employment_cert_filename,
  };

  if (payload.id) {
    const response = await api.updateFieldRepresentative(payload.id, createData);
    if (!response.success || !response.data) throw new Error("수정 실패");
    return response.data.id;
  } else {
    const response = await api.createFieldRepresentative(createData);
    if (!response.success || !response.data) throw new Error("생성 실패");
    return response.data.id;
  }
}

export async function deleteFieldRepresentative(
  representativeId: number,
): Promise<void> {
  await api.deleteFieldRepresentative(representativeId);
}

export async function getRepresentativeAssignmentByProjectId(
  projectId: string,
): Promise<{
  representativeId: number;
  effectiveDate: string;
  assignedAt?: string;
} | null> {
  const response = await api.getProjectRepresentative(projectId);
  if (!response.success || !response.data) return null;
  return {
    representativeId: response.data.representative_id,
    effectiveDate: response.data.effective_date,
    assignedAt: response.data.assigned_at,
  };
}

export async function assignRepresentativeToProject(
  projectId: string,
  representativeId: number,
  effectiveDate: string,
): Promise<void> {
  await api.assignProjectRepresentative(projectId, {
    representative_id: representativeId,
    effective_date: effectiveDate,
  });
}

export async function removeRepresentativeFromProject(
  projectId: string,
): Promise<void> {
  await api.removeProjectRepresentative(projectId);
}

export async function getRepresentativeById(
  representativeId: number,
): Promise<FieldRepresentative | null> {
  const all = await getFieldRepresentatives();
  return all.find((r) => r.id === representativeId) ?? null;
}

// Legacy compatibility function - delegates to backend calculation
export function getCareerCertificateRemainingDays(
  representative: FieldRepresentative,
): number | null {
  return representative.career_cert_days_remaining ?? null;
}
