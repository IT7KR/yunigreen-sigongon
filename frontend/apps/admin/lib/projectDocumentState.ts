import type { ProjectDocumentStatus } from "@sigongon/types";

export interface ProjectDocumentOverride {
  status?: ProjectDocumentStatus;
  file_path?: string;
  file_size?: number;
  generated_at?: string;
}

const STORAGE_KEY = "sigongon_project_document_overrides_v1";

type StoredOverrides = Record<string, Record<string, ProjectDocumentOverride>>;

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readAllOverrides(): StoredOverrides {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredOverrides;
  } catch {
    return {};
  }
}

function writeAllOverrides(data: StoredOverrides) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getProjectDocumentOverrides(
  projectId: string,
): Record<string, ProjectDocumentOverride> {
  const all = readAllOverrides();
  return all[projectId] || {};
}

export function upsertProjectDocumentOverride(
  projectId: string,
  documentId: string,
  patch: ProjectDocumentOverride,
) {
  const all = readAllOverrides();
  const currentProjectData = all[projectId] || {};
  const currentDocData = currentProjectData[documentId] || {};

  const nextProjectData = {
    ...currentProjectData,
    [documentId]: {
      ...currentDocData,
      ...patch,
    },
  };

  writeAllOverrides({
    ...all,
    [projectId]: nextProjectData,
  });
}
