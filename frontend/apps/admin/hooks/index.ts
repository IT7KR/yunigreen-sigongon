"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProjectStatus, EstimateStatus } from "@sigongon/types";

export { useAuth, useRequireAuth } from "@/lib/auth";

export function useProjects(params?: {
  page?: number;
  per_page?: number;
  status?: ProjectStatus;
  search?: string;
}) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => api.getProjects(params),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => api.getProject(id),
    enabled: !!id,
  });
}

export function useDashboardStats() {
  const projectStats = useQuery({
    queryKey: ["dashboard-project-stats"],
    queryFn: () => api.getProjectStats(),
    staleTime: 1000 * 60 * 5,
  });

  const recentProjects = useQuery({
    queryKey: ["projects", { per_page: 5 }],
    queryFn: () => api.getProjects({ per_page: 5 }),
    staleTime: 1000 * 60 * 5,
  });

  const stats = {
    total: projectStats.data?.data?.total ?? 0,
    inProgress: projectStats.data?.data?.in_progress ?? 0,
    completed: projectStats.data?.data?.completed ?? 0,
    thisMonth: projectStats.data?.data?.this_month ?? 0,
  };

  return {
    isLoading: projectStats.isLoading || recentProjects.isLoading,
    error: projectStats.error || recentProjects.error,
    stats,
    recentProjects: recentProjects.data?.data?.slice(0, 5) ?? [],
  };
}

export function useUsers(params?: {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => api.getUsers(params),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      role?: string;
    }) => api.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: {
        name?: string;
        phone?: string;
        role?: string;
        is_active?: boolean;
      };
    }) => api.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => api.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useEstimate(estimateId: string) {
  return useQuery({
    queryKey: ["estimate", estimateId],
    queryFn: () => api.getEstimate(estimateId),
    enabled: !!estimateId,
  });
}

export function useEstimates() {
  return useQuery({
    queryKey: ["all-estimates"],
    queryFn: async () => {
      const projectsRes = await api.getProjects({ per_page: 100 });
      if (!projectsRes.success || !projectsRes.data) return [];

      const estimates: Array<{
        id: string;
        project_id: string;
        project_name: string;
        client_name?: string;
        version: number;
        status: EstimateStatus;
        total_amount: string;
        created_at: string;
      }> = [];

      // Fetch project details in parallel to get estimates
      const detailPromises = projectsRes.data.map((project) =>
        api.getProject(project.id).then((detail) => ({
          project,
          detail,
        })),
      );

      const results = await Promise.allSettled(detailPromises);

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const { project, detail } = result.value;
          if (detail.success && detail.data?.estimates) {
            detail.data.estimates.forEach((est) => {
              estimates.push({
                id: est.id,
                project_id: project.id,
                project_name: project.name,
                client_name: project.client_name,
                version: est.version,
                status: est.status as EstimateStatus,
                total_amount: est.total_amount,
                created_at: project.created_at,
              });
            });
          }
        }
      });

      return estimates.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useRevisions() {
  return useQuery({
    queryKey: ["revisions"],
    queryFn: () => api.getRevisions(),
  });
}

export function useStagingItems(
  revisionId: string,
  params?: {
    page?: number;
    per_page?: number;
    status?: string;
  },
) {
  return useQuery({
    queryKey: ["staging", revisionId, params],
    queryFn: () => api.getStagingItems(revisionId, params),
    enabled: !!revisionId,
  });
}

export function useIssueEstimate(estimateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.issueEstimate(estimateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateEstimateLine(estimateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lineId,
      data,
    }: {
      lineId: string;
      data: {
        quantity?: string;
        unit_price_snapshot?: string;
        description?: string;
      };
    }) => api.updateEstimateLine(estimateId, lineId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", estimateId] });
    },
  });
}

export function useAddEstimateLine(estimateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      description: string;
      specification?: string;
      unit: string;
      quantity: string;
      unit_price_snapshot: string;
    }) => api.addEstimateLine(estimateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", estimateId] });
    },
  });
}

export function useDeleteEstimateLine(estimateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lineId: string) => api.deleteEstimateLine(estimateId, lineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", estimateId] });
    },
  });
}

export function useSiteVisits(projectId: string) {
  return useQuery({
    queryKey: ["siteVisits", projectId],
    queryFn: () => api.getSiteVisits(projectId),
    enabled: !!projectId,
  });
}

export function useSiteVisit(visitId: string) {
  return useQuery({
    queryKey: ["siteVisit", visitId],
    queryFn: () => api.getSiteVisit(visitId),
    enabled: !!visitId,
  });
}

export function useDiagnoses(projectId: string) {
  return useQuery({
    queryKey: ["diagnoses", projectId],
    queryFn: () => api.getDiagnoses(projectId),
    enabled: !!projectId,
  });
}

export function useDiagnosis(diagnosisId: string) {
  return useQuery({
    queryKey: ["diagnosis", diagnosisId],
    queryFn: () => api.getDiagnosis(diagnosisId),
    enabled: !!diagnosisId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === "processing" ? 2000 : false;
    },
  });
}

export function useRequestDiagnosis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      visitId,
      data,
    }: {
      visitId: string;
      data?: {
        additional_notes?: string;
        photo_ids?: string[];
      };
    }) => api.requestDiagnosis(visitId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["siteVisit", variables.visitId] });
      queryClient.invalidateQueries({ queryKey: ["diagnoses"] });
    },
  });
}
