"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { ProjectStatus, EstimateStatus } from "@yunigreen/types"

export { useAuth, useRequireAuth } from "@/lib/auth"

export function useProjects(params?: {
  page?: number
  per_page?: number
  status?: ProjectStatus
  search?: string
}) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => api.getProjects(params),
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => api.getProject(id),
    enabled: !!id,
  })
}

export function useDashboardStats() {
  const projects = useQuery({
    queryKey: ["projects", { per_page: 1000 }],
    queryFn: () => api.getProjects({ per_page: 1000 }),
    staleTime: 1000 * 60 * 5,
  })

  const stats = {
    total: projects.data?.meta?.total ?? 0,
    inProgress: 0,
    completed: 0,
    thisMonth: 0,
  }

  if (projects.data?.data) {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    projects.data.data.forEach((p) => {
      if (p.status === "in_progress") stats.inProgress++
      if (p.status === "completed" || p.status === "warranty") stats.completed++
      if (new Date(p.created_at) >= thisMonth) stats.thisMonth++
    })
  }

  return {
    ...projects,
    stats,
    recentProjects: projects.data?.data?.slice(0, 5) ?? [],
  }
}

export function useUsers(params?: {
  page?: number
  per_page?: number
  search?: string
  role?: string
  is_active?: boolean
}) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => api.getUsers(params),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      email: string
      password: string
      name: string
      phone?: string
      role?: string
    }) => api.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string
      data: { name?: string; phone?: string; role?: string; is_active?: boolean }
    }) => api.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => api.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}

export function useEstimate(estimateId: string) {
  return useQuery({
    queryKey: ["estimate", estimateId],
    queryFn: () => api.getEstimate(estimateId),
    enabled: !!estimateId,
  })
}

export function useEstimates() {
  return useQuery({
    queryKey: ["all-estimates"],
    queryFn: async () => {
      const projectsRes = await api.getProjects({ per_page: 100 })
      if (!projectsRes.success || !projectsRes.data) return []

      const estimates: Array<{
        id: string
        project_id: string
        project_name: string
        client_name?: string
        version: number
        status: EstimateStatus
        total_amount: string
        created_at: string
      }> = []

      // Fetch project details in parallel to get estimates
      const detailPromises = projectsRes.data.map((project) =>
        api.getProject(project.id).then((detail) => ({
          project,
          detail,
        }))
      )

      const results = await Promise.allSettled(detailPromises)

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const { project, detail } = result.value
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
              })
            })
          }
        }
      })

      return estimates.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useRevisions() {
  return useQuery({
    queryKey: ["revisions"],
    queryFn: () => api.getRevisions(),
  })
}

export function useStagingItems(revisionId: string, params?: {
  page?: number
  per_page?: number
  status?: string
}) {
  return useQuery({
    queryKey: ["staging", revisionId, params],
    queryFn: () => api.getStagingItems(revisionId, params),
    enabled: !!revisionId,
  })
}

export function useIssueEstimate(estimateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.issueEstimate(estimateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", estimateId] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export function useUpdateEstimateLine(estimateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      lineId,
      data,
    }: {
      lineId: string
      data: { quantity?: string; unit_price_snapshot?: string; description?: string }
    }) => api.updateEstimateLine(estimateId, lineId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", estimateId] })
    },
  })
}

export function useAddEstimateLine(estimateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      description: string
      specification?: string
      unit: string
      quantity: string
      unit_price_snapshot: string
    }) => api.addEstimateLine(estimateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", estimateId] })
    },
  })
}

export function useDeleteEstimateLine(estimateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (lineId: string) => api.deleteEstimateLine(estimateId, lineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", estimateId] })
    },
  })
}
