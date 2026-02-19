"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ProjectStatus,
  VisitType,
  PhotoType,
  ContractTemplateType,
  MaterialOrderStatus,
} from "@sigongon/types";

export { useAuth, useRequireAuth } from "@/lib/auth";

// ============================================
// Projects
// ============================================

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

export function useInfiniteProjects(params?: {
  per_page?: number;
  status?: ProjectStatus;
  search?: string;
}) {
  return useInfiniteQuery({
    queryKey: ["projects-infinite", params],
    queryFn: ({ pageParam }) => api.getProjects({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.success || !lastPage.data) return undefined;
      const { page, total_pages } = lastPage.meta || {
        page: 1,
        total_pages: 1,
      };
      return page < total_pages ? page + 1 : undefined;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => api.getProject(id),
    enabled: !!id,
  });
}

export function useConstructionReports(projectId: string) {
  return useQuery({
    queryKey: ["construction-reports", projectId],
    queryFn: () => api.getConstructionReports(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      address: string;
      category?: string;
      customer_master_id?: string;
      client_name?: string;
      client_phone?: string;
      notes?: string;
    }) => api.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ============================================
// Site Visits
// ============================================

export function useSiteVisits(projectId: string) {
  return useQuery({
    queryKey: ["site-visits", projectId],
    queryFn: () => api.getSiteVisits(projectId),
    enabled: !!projectId,
  });
}

export function useCreateSiteVisit(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      visit_type: VisitType;
      visited_at: string;
      estimated_area_m2?: string;
      notes?: string;
    }) => api.createSiteVisit(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-visits", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useUploadPhoto(visitId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      photoType,
      caption,
    }: {
      file: File;
      photoType: PhotoType;
      caption?: string;
    }) => api.uploadPhoto(visitId, file, photoType, caption),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-visits"] });
    },
  });
}

// ============================================
// Diagnoses
// ============================================

export function useDiagnosis(diagnosisId: string) {
  return useQuery({
    queryKey: ["diagnosis", diagnosisId],
    queryFn: () => api.getDiagnosis(diagnosisId),
    enabled: !!diagnosisId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.success && data.data?.status === "processing") {
        return 2000; // Poll every 2 seconds while processing
      }
      return false;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-visits"] });
    },
  });
}

// ============================================
// Estimates
// ============================================

export function useEstimate(estimateId: string) {
  return useQuery({
    queryKey: ["estimate", estimateId],
    queryFn: () => api.getEstimate(estimateId),
    enabled: !!estimateId,
  });
}

export function useCreateEstimate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (diagnosisId?: string) =>
      api.createEstimate(projectId, diagnosisId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useIssueEstimate(estimateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.issueEstimate(estimateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", estimateId] });
    },
  });
}

export function useDecideEstimate(estimateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { action: "accepted" | "rejected"; reason?: string }) =>
      api.decideEstimate(estimateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
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

export function useContracts(projectId: string) {
  return useQuery({
    queryKey: ["contracts", projectId],
    queryFn: () => api.getContracts(projectId),
    enabled: !!projectId,
  });
}

export function useContract(contractId: string) {
  return useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => api.getContract(contractId),
    enabled: !!contractId,
  });
}

export function useMaterialOrders(projectId: string) {
  return useQuery({
    queryKey: ["material-orders", projectId],
    queryFn: () => api.getMaterialOrders(projectId),
    enabled: !!projectId,
  });
}

export function useMaterialOrdersMobile(projectId: string) {
  return useQuery({
    queryKey: ["material-orders-mobile", projectId],
    queryFn: () => api.getMaterialOrdersMobile(projectId),
    enabled: !!projectId,
  });
}

export function useMaterialOrder(orderId: string) {
  return useQuery({
    queryKey: ["material-order", orderId],
    queryFn: () => api.getMaterialOrder(orderId),
    enabled: !!orderId,
  });
}

export function useUpdateMaterialOrderStatus(projectId: string, orderId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      orderId: string;
      status: MaterialOrderStatus;
      reason?: string;
      invoice_number?: string;
      invoice_amount?: number;
      invoice_file_url?: string;
    }) =>
      api.updateMaterialOrderStatus(payload.orderId, {
        status: payload.status,
        reason: payload.reason,
        invoice_number: payload.invoice_number,
        invoice_amount: payload.invoice_amount,
        invoice_file_url: payload.invoice_file_url,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["material-orders", projectId] });
      queryClient.invalidateQueries({ queryKey: ["material-orders-mobile", projectId] });
      queryClient.invalidateQueries({ queryKey: ["material-order", variables.orderId] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ["material-order", orderId] });
      }
    },
  });
}

export function useCreateContract(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      estimate_id: string;
      template_type?: ContractTemplateType;
      start_date?: string;
      expected_end_date?: string;
      notes?: string;
    }) => api.createContract(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useSendContractForSignature(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.sendContractForSignature(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
    },
  });
}

export function useSignContract(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      signatureData,
      signerType,
    }: {
      signatureData: string;
      signerType: "client" | "company";
    }) => api.signContract(contractId, signatureData, signerType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
    },
  });
}

export function useLaborContracts(projectId: string) {
  return useQuery({
    queryKey: ["labor-contracts", projectId],
    queryFn: () => api.getLaborContracts(projectId),
    enabled: !!projectId,
  });
}

export function useCreateLaborContract(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      worker_name: string;
      worker_phone?: string;
      work_date: string;
      work_type?: string;
      daily_rate: string;
      hours_worked?: string;
    }) => api.createLaborContract(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["labor-contracts", projectId],
      });
    },
  });
}

export function useSendLaborContractForSignature(laborContractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.sendLaborContractForSignature(laborContractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labor-contracts"] });
    },
  });
}

export function useLaborContractsSummary(projectId: string) {
  return useQuery({
    queryKey: ["labor-contracts-summary", projectId],
    queryFn: () => api.getLaborContractsSummary(projectId),
    enabled: !!projectId,
  });
}

export function useProjectPhotoAlbum(projectId: string) {
  return useQuery({
    queryKey: ["photo-album", projectId],
    queryFn: () => api.getProjectPhotoAlbum(projectId),
    enabled: !!projectId,
  });
}

export function useWarrantyInfo(projectId: string) {
  return useQuery({
    queryKey: ["warranty", projectId],
    queryFn: () => api.getWarrantyInfo(projectId),
    enabled: !!projectId,
  });
}

export function useCreateASRequest(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { description: string; photos?: string[] }) =>
      api.createASRequest(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranty", projectId] });
    },
  });
}

export function useCompleteProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.completeProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}
