"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  X,
  FolderKanban,
  AlertCircle,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { MobileListCard } from "@/components/MobileListCard";
import {
  AppLink,
  Button,
  Card,
  CardContent,
  ConfirmModal,
  EmptyState,
  Input,
  LoadingOverlay,
  Modal,
  PageHeader,
  PrimitiveButton,
  PrimitiveInput,
  Select,
  Skeleton,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatDate,
  useAppNavigation,
} from "@sigongcore/ui";
import { useProjects } from "@/hooks";
import { api } from "@/lib/api";
import type {
  CustomerMaster,
  ProjectCategory,
  ProjectStatus,
} from "@sigongcore/types";
import { PROJECT_CATEGORIES } from "@sigongcore/types";

export default function ProjectsPage() {
  const navigation = useAppNavigation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory | "">(
    "",
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<{
    id: string;
    name: string;
    address: string;
    client_name: string;
    client_phone: string;
    category: string;
    customer_master_id: string;
  } | null>(null);
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error, refetch } = useProjects({
    status: statusFilter || undefined,
    search: search || undefined,
  });

  // Client-side category filtering (until API supports it)
  const allProjects = data?.data ?? [];
  const projects = categoryFilter
    ? allProjects.filter((p) => p.category === categoryFilter)
    : allProjects;
  const total = projects.length;

  const categoryMap = Object.fromEntries(
    PROJECT_CATEGORIES.map((c) => [c.id, c.label]),
  );

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  const getCustomerPrimaryPhone = (customer: CustomerMaster) =>
    customer.representative_phone ||
    customer.contact_phone ||
    customer.phone ||
    "";

  const loadCustomers = async () => {
    try {
      const response = await api.getCustomers({ per_page: 100 });
      if (response.success && response.data) {
        setCustomers(response.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuId]);

  async function handleUpdateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editProject) return;
    const formData = new FormData(e.currentTarget);
    try {
      setUpdating(true);
      await api.updateProject(editProject.id, {
        name: formData.get("name") as string,
        address: formData.get("address") as string,
        category: (formData.get("category") as string) || undefined,
        customer_master_id:
          (formData.get("customer_master_id") as string) || undefined,
        client_name: (formData.get("client_name") as string) || undefined,
        client_phone: (formData.get("client_phone") as string) || undefined,
      });
      setEditProject(null);
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteProject() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      setCreating(true);
      const result = await api.createProject({
        name: formData.get("name") as string,
        address: formData.get("address") as string,
        category: (formData.get("category") as string) || undefined,
        customer_master_id:
          (formData.get("customer_master_id") as string) || undefined,
        client_name: (formData.get("client_name") as string) || undefined,
        client_phone: (formData.get("client_phone") as string) || undefined,
      });

      if (result.success && result.data) {
        setShowCreateModal(false);
        refetch();
        navigation.push(`/projects/${result.data.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedName = newCustomerName.trim();
    if (!trimmedName) {
      setCustomerError("발주처명을 입력하세요");
      return;
    }

    try {
      setCreatingCustomer(true);
      setCustomerError("");
      const response = await api.createCustomer({
        name: trimmedName,
        representative_phone: newCustomerPhone.trim() || undefined,
        phone: newCustomerPhone.trim() || undefined,
      });
      if (!response.success || !response.data) {
        setCustomerError("발주처 등록에 실패했습니다");
        return;
      }
      await loadCustomers();
      setNewCustomerName("");
      setNewCustomerPhone("");
      setShowCustomerModal(false);
    } catch (err) {
      console.error(err);
      setCustomerError("발주처 등록에 실패했습니다");
    } finally {
      setCreatingCustomer(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="프로젝트"
          description={`전체 ${total}개 프로젝트`}
          actions={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />새 프로젝트
            </Button>
          }
        />

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <PrimitiveInput
                  type="search"
                  placeholder="프로젝트명, 주소, 고객명으로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                />
              </div>
              <div className="flex gap-2 sm:contents">
                <Select
                  value={categoryFilter}
                  onChange={(value) =>
                    setCategoryFilter(value as ProjectCategory | "")
                  }
                  options={[
                    { value: "", label: "모든 카테고리" },
                    ...PROJECT_CATEGORIES.map((cat) => ({
                      value: cat.id,
                      label: cat.label,
                    })),
                  ]}
                />
                <Select
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(value as ProjectStatus | "")
                  }
                  options={[
                    { value: "", label: "모든 상태" },
                    { value: "draft", label: "초안" },
                    { value: "diagnosing", label: "진단중" },
                    { value: "estimating", label: "견적중" },
                    { value: "quoted", label: "견적발송" },
                    { value: "contracted", label: "계약완료" },
                    { value: "in_progress", label: "공사중" },
                    { value: "completed", label: "준공" },
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <>
                {/* 모바일: 스켈레톤 리스트 */}
                <div className="space-y-3 p-4 md:hidden">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-slate-100 p-4 space-y-3 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                      <div className="grid gap-1 pt-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
                {/* 데스크톱: 스켈레톤 테이블 */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>프로젝트</TableHead>
                        <TableHead>카테고리</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>고객</TableHead>
                        <TableHead>방문</TableHead>
                        <TableHead>견적</TableHead>
                        <TableHead>등록일</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-48" />
                            </div>
                          </TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : error ? (
              <EmptyState
                icon={AlertCircle}
                title="데이터를 불러오는데 실패했어요"
                description="잠시 후 다시 시도해주세요"
              />
            ) : projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="프로젝트가 없어요"
                description="새 프로젝트를 만들어 시작하세요"
                action={{
                  label: "새 프로젝트",
                  onClick: () => setShowCreateModal(true),
                }}
              />
            ) : (
              <>
                {/* 모바일: 카드 리스트 */}
                <div className="space-y-3 p-4 md:hidden">
                  {projects.map((project) => (
                    <MobileListCard
                      key={project.id}
                      title={project.name}
                      subtitle={project.address}
                      badge={<StatusBadge status={project.status} />}
                      metadata={[
                        {
                          value: project.category
                            ? categoryMap[project.category] || "-"
                            : "-",
                        },
                        { label: "고객", value: project.client_name || "-" },
                        {
                          value: `방문 ${project.site_visit_count}회 · 견적 ${project.estimate_count}건 · ${formatDate(project.created_at)}`,
                        },
                      ]}
                      onClick={() => navigation.push(`/projects/${project.id}`)}
                    />
                  ))}
                </div>
                {/* 데스크톱: 기존 테이블 */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>프로젝트</TableHead>
                        <TableHead>카테고리</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>고객</TableHead>
                        <TableHead>방문</TableHead>
                        <TableHead>견적</TableHead>
                        <TableHead>등록일</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow
                          key={project.id}
                          clickable
                          onClick={() =>
                            navigation.push(`/projects/${project.id}`)
                          }
                        >
                          <TableCell>
                            <AppLink
                              href={`/projects/${project.id}`}
                              className="block"
                            >
                              <p className="font-medium text-slate-900 hover:text-brand-point-600">
                                {project.name}
                              </p>
                              <p className="mt-0.5 text-sm text-slate-500">
                                {project.address}
                              </p>
                            </AppLink>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {project.category
                              ? categoryMap[project.category] || "-"
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={project.status} />
                          </TableCell>
                          <TableCell>
                            <p className="text-slate-900">
                              {project.client_name || "-"}
                            </p>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {project.site_visit_count}회
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {project.estimate_count}건
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {formatDate(project.created_at)}
                          </TableCell>
                          <TableCell>
                            <div
                              className="relative"
                              ref={
                                openMenuId === project.id ? menuRef : undefined
                              }
                            >
                              <PrimitiveButton
                                className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(
                                    openMenuId === project.id
                                      ? null
                                      : project.id,
                                  );
                                }}
                              >
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </PrimitiveButton>
                              {openMenuId === project.id && (
                                <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                  <PrimitiveButton
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setEditProject({
                                        id: project.id,
                                        name: project.name,
                                        address: project.address,
                                        client_name: project.client_name || "",
                                        client_phone:
                                          project.client_phone || "",
                                        category: project.category || "",
                                        customer_master_id:
                                          project.customer_master_id || "",
                                      });
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    수정
                                  </PrimitiveButton>
                                  <PrimitiveButton
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setDeleteTarget({
                                        id: project.id,
                                        name: project.name,
                                      });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    삭제
                                  </PrimitiveButton>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="새 프로젝트"
        size="lg"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            name="name"
            label="프로젝트명 *"
            placeholder="예: 강남아파트 옥상방수"
            required
          />
          <Input
            name="address"
            label="주소 *"
            placeholder="서울시 강남구..."
            required
          />
          <Select
            name="category"
            label="건물 구분"
            placeholder="건물 구분 선택"
            required
            options={PROJECT_CATEGORIES.map((cat) => ({
              value: cat.id,
              label: cat.label,
            }))}
          />
          <Select
            name="customer_master_id"
            label="발주처 선택"
            placeholder="선택 안 함"
            options={customers.map((customer) => ({
              value: customer.id,
              label: getCustomerPrimaryPhone(customer)
                ? `${customer.name} (${getCustomerPrimaryPhone(customer)})`
                : customer.name,
            }))}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCustomerModal(true);
                setCustomerError("");
              }}
            >
              발주처 신규 등록
            </Button>
          </div>
          <Input
            name="client_name"
            label="고객명 (스냅샷)"
            placeholder="홍길동"
          />
          <Input
            name="client_phone"
            label="고객 연락처 (스냅샷)"
            placeholder="010-1234-5678"
            onChange={(e) => {
              e.currentTarget.value = formatPhone(e.currentTarget.value);
            }}
          />
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setShowCreateModal(false)}
            >
              <X className="h-4 w-4" />
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  생성
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={!!editProject}
        onClose={() => setEditProject(null)}
        title="프로젝트 수정"
        size="lg"
      >
        {editProject && (
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <Input
              name="name"
              label="프로젝트명 *"
              defaultValue={editProject.name}
              required
            />
            <Input
              name="address"
              label="주소 *"
              defaultValue={editProject.address}
              required
            />
            <Select
              name="category"
              label="건물 구분"
              placeholder="건물 구분 선택"
              value={editProject.category}
              onChange={(value) =>
                setEditProject({ ...editProject, category: value })
              }
              required
              options={PROJECT_CATEGORIES.map((cat) => ({
                value: cat.id,
                label: cat.label,
              }))}
            />
            <Select
              name="customer_master_id"
              label="발주처 선택"
              placeholder="선택 안 함"
              value={editProject.customer_master_id}
              onChange={(value) =>
                setEditProject({ ...editProject, customer_master_id: value })
              }
              options={customers.map((customer) => ({
                value: customer.id,
                label: getCustomerPrimaryPhone(customer)
                  ? `${customer.name} (${getCustomerPrimaryPhone(customer)})`
                  : customer.name,
              }))}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCustomerModal(true);
                  setCustomerError("");
                }}
              >
                발주처 신규 등록
              </Button>
            </div>
            <Input
              name="client_name"
              label="고객명 (스냅샷)"
              defaultValue={editProject.client_name}
            />
            <Input
              name="client_phone"
              label="고객 연락처 (스냅샷)"
              placeholder="010-1234-5678"
              defaultValue={editProject.client_phone}
              onChange={(e) => {
                e.currentTarget.value = formatPhone(e.currentTarget.value);
              }}
            />
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setEditProject(null)}
              >
                취소
              </Button>
              <Button type="submit" className="flex-1" disabled={updating}>
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "저장"
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="발주처 신규 등록"
        size="md"
      >
        <form className="space-y-4" onSubmit={handleCreateCustomer}>
          <Input
            label="발주처명 *"
            value={newCustomerName}
            onChange={(e) => {
              setNewCustomerName(e.target.value);
              setCustomerError("");
            }}
            required
          />
          <Input
            label="연락처"
            placeholder="010-1234-5678"
            value={newCustomerPhone}
            onChange={(e) => setNewCustomerPhone(formatPhone(e.target.value))}
          />
          {customerError && (
            <p className="text-sm text-red-600">{customerError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCustomerModal(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={creatingCustomer}>
              {creatingCustomer ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "등록"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteProject}
        title="프로젝트 삭제"
        description={`"${deleteTarget?.name}" 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="destructive"
        loading={deleting}
      />
    </AdminLayout>
  );
}
