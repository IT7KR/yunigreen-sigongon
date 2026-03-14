"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Modal,
  Pagination,
  PrimitiveButton,
  PrimitiveInput,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatDate,
  toast,
  useConfirmDialog,
  Select,
} from "@sigongcore/ui";
import {
  Search,
  Shield,
  Mail,
  Phone,
  Building2,
  Key,
  Ban,
  Eye,
  Calendar,
  Clock,
  User,
  CheckCircle,
  X,
  Trash2,
} from "lucide-react";
import { DeleteUserModal } from "./_components/DeleteUserModal";
import { useDeleteUser } from "./_components/useDeleteUser";
import { api } from "@/lib/api";
import { MobileListCard } from "@/components/MobileListCard";

import type { UserRole } from "@sigongcore/types";

/** 역할별 한글 라벨 및 스타일 */
const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  super_admin: { label: "슈퍼관리자", color: "bg-red-100 text-red-700" },
  company_admin: { label: "대표", color: "bg-purple-100 text-purple-700" },
  site_manager: { label: "현장소장", color: "bg-blue-100 text-blue-700" },
  worker: { label: "근로자", color: "bg-slate-100 text-slate-700" },
};

interface SAUserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  tenant_name: string;
  tenant_id: string | null;
  last_login_at?: string;
  created_at: string;
  is_active: boolean;
  organization_id?: string | null;
}

export default function SAUsersPage() {
  const [users, setUsers] = useState<SAUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SAUserItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();

  const {
    flowState: deleteFlowState,
    isOpen: deleteModalOpen,
    startDeletionCheck,
    executeDelete,
    close: closeDeleteModal,
  } = useDeleteUser(() => {
    closeDetailModal();
    loadUsers();
    toast.success("계정이 삭제되었어요.");
  });

  // Avatar Colors
  const avatarColors = [
    "bg-red-100 text-red-600",
    "bg-orange-100 text-orange-600",
    "bg-amber-100 text-amber-600",
    "bg-green-100 text-green-600",
    "bg-emerald-100 text-emerald-600",
    "bg-teal-100 text-teal-600",
    "bg-cyan-100 text-cyan-600",
    "bg-blue-100 text-blue-600",
    "bg-indigo-100 text-indigo-600",
    "bg-violet-100 text-violet-600",
    "bg-purple-100 text-purple-600",
    "bg-fuchsia-100 text-fuchsia-600",
    "bg-pink-100 text-pink-600",
    "bg-rose-100 text-rose-600",
  ];

  function getAvatarColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % avatarColors.length;
    return avatarColors[index];
  }

  // Debounce timer ref for search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  function openDetailModal(user: SAUserItem) {
    setSelectedUser(user);
    setDetailModalOpen(true);
  }

  function closeDetailModal() {
    setDetailModalOpen(false);
    setSelectedUser(null);
  }

  // Load current user ID on mount
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const meResponse = await api.getMe();
        if (meResponse.success && meResponse.data) {
          setCurrentUserId(meResponse.data.id);
        }
      } catch {
        // Non-critical — self-protection will just be skipped
      }
    }
    loadCurrentUser();
  }, []);

  // Debounce search input
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: {
        page: number;
        per_page: number;
        search?: string;
        role?: string;
        is_active?: boolean;
      } = { page: currentPage, per_page: 20 };

      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter !== "all")
        params.is_active = statusFilter === "active";

      const response = await api.getUsers(params);

      if (response.success && response.data) {
        setUsers(response.data as SAUserItem[]);
        if (response.meta) {
          setTotalPages(response.meta.total_pages);
          setTotalCount(response.meta.total);
        }
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleResetPassword(userId: string, userName: string) {
    const confirmed = await confirm({
      title: `${userName} 사용자의 비밀번호를 초기화할까요?`,
      confirmLabel: "초기화",
    });
    if (!confirmed) return;

    try {
      setIsActionLoading(true);
      const result = await api.resetUserPassword(userId);
      if (result.success) {
        toast.success("비밀번호 초기화 링크를 이메일로 전송했어요.");
      } else {
        toast.error("비밀번호 초기화에 실패했어요.");
      }
    } catch {
      toast.error("비밀번호 초기화에 실패했어요.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    // Self-protection: prevent deactivating own account
    if (userId === currentUserId) {
      toast.error("자기 자신의 계정은 비활성화할 수 없어요.");
      return;
    }

    const confirmed = await confirm({
      title: `정말 이 계정을 ${isActive ? "비활성화" : "활성화"}할까요?`,
      confirmLabel: isActive ? "비활성화" : "활성화",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      setIsActionLoading(true);
      const result = await api.updateUser(userId, { is_active: !isActive });
      if (result.success) {
        setUsers(
          users.map((u) =>
            u.id === userId ? { ...u, is_active: !isActive } : u,
          ),
        );
        // Also update selectedUser if modal is open
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser({ ...selectedUser, is_active: !isActive });
        }
        toast.success(
          `계정을 ${isActive ? "비활성화" : "활성화"}했어요.`,
        );
      } else {
        toast.error("계정 상태 변경에 실패했어요.");
      }
    } catch {
      toast.error("계정 상태 변경에 실패했어요.");
    } finally {
      setIsActionLoading(false);
    }
  }

  const hasActiveFilters =
    debouncedSearch !== "" ||
    roleFilter !== "all" ||
    statusFilter !== "all";

  function clearAllFilters() {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  }

  /** Empty state component */
  function EmptyState() {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          {debouncedSearch ? (
            <Search className="h-6 w-6 text-slate-400" />
          ) : (
            <User className="h-6 w-6 text-slate-400" />
          )}
        </div>
        <p className="text-sm font-semibold text-slate-800">
          {debouncedSearch ? "검색 결과가 없어요" : "사용자가 없어요"}
        </p>
        {debouncedSearch && (
          <p className="mt-1 text-xs text-slate-500">
            &ldquo;{debouncedSearch}&rdquo;와 일치하는 사용자를 찾지 못했어요
          </p>
        )}
        {hasActiveFilters && (
          <Button
            variant="outline"
            className="mt-4"
            size="sm"
            onClick={clearAllFilters}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            검색 필터 초기화
          </Button>
        )}
      </div>
    );
  }

  /** Toggle active button for table/cards */
  function ToggleActiveButton({
    user,
    size = "table",
  }: {
    user: SAUserItem;
    size?: "table" | "modal";
  }) {
    const isSelf = user.id === currentUserId;

    if (size === "modal") {
      return (
        <Button
          variant={user.is_active ? "destructive" : "primary"}
          className="flex-1"
          disabled={isActionLoading || isSelf}
          onClick={() => {
            handleToggleActive(user.id, user.is_active);
          }}
        >
          {user.is_active ? (
            <Ban className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {user.is_active ? "비활성화" : "활성화"}
        </Button>
      );
    }

    return (
      <PrimitiveButton
        onClick={() => handleToggleActive(user.id, user.is_active)}
        disabled={isActionLoading || isSelf}
        aria-label={
          user.is_active
            ? `${user.name} 계정 비활성화`
            : `${user.name} 계정 활성화`
        }
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          isSelf
            ? "cursor-not-allowed opacity-30"
            : user.is_active
              ? "hover:bg-red-50"
              : "hover:bg-green-50"
        }`}
        title={
          isSelf
            ? "자기 자신은 비활성화할 수 없어요"
            : user.is_active
              ? "비활성화"
              : "활성화"
        }
      >
        {user.is_active ? (
          <Ban className="h-4 w-4 text-red-400" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
      </PrimitiveButton>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            전체 사용자 관리
          </h1>
          <p className="mt-1 text-slate-500">
            전체{" "}
            <span className="font-semibold text-slate-800">
              {totalCount}명
            </span>
            {" \u00B7 "}활성{" "}
            <span className="font-semibold text-slate-800">
              {users.filter((u) => u.is_active).length}명
            </span>
            {debouncedSearch && (
              <span className="text-blue-600">
                {" \u00B7 "}검색 결과 {users.length}명
              </span>
            )}
          </p>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <PrimitiveInput
                  type="search"
                  placeholder="이름, 이메일, 전화번호로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 text-sm placeholder:text-slate-400 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="검색어 지우기"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto shrink-0 sm:min-w-[280px]">
                {/* Role filter */}
                <div className="w-1/2 sm:w-36">
                  <Select
                    value={roleFilter}
                    onChange={(val) => setRoleFilter(val)}
                    aria-label="역할 필터"
                    className="h-10 text-sm"
                    options={[
                      { value: "all", label: "전체 역할" },
                      { value: "super_admin", label: "슈퍼관리자" },
                      { value: "company_admin", label: "대표" },
                      { value: "site_manager", label: "현장소장" },
                      { value: "worker", label: "근로자" },
                    ]}
                  />
                </div>

                {/* Status filter */}
                <div className="w-1/2 sm:w-32">
                  <Select
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    aria-label="상태 필터"
                    className="h-10 text-sm"
                    options={[
                      { value: "all", label: "전체 상태" },
                      { value: "active", label: "활성" },
                      { value: "inactive", label: "비활성" },
                    ]}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <>
            {/* Mobile skeleton */}
            <div className="space-y-3 md:hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-lg border border-slate-100 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex w-2/3 flex-col gap-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop skeleton */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>사용자</TableHead>
                        <TableHead className="w-[120px]">역할</TableHead>
                        <TableHead className="w-[160px]">소속 고객사</TableHead>
                        <TableHead className="w-[120px]">마지막 로그인</TableHead>
                        <TableHead className="w-[120px]">가입일</TableHead>
                        <TableHead className="w-[100px]">상태</TableHead>
                        <TableHead className="w-[120px] text-right">옵션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <div className="flex gap-2">
                                  <Skeleton className="h-3 w-32" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-20 rounded-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-12 rounded-full" />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Skeleton className="h-8 w-8 rounded-lg" />
                              <Skeleton className="h-8 w-8 rounded-lg" />
                              <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 md:hidden">
              {users.length === 0 ? (
                <EmptyState />
              ) : (
                users.map((user) => {
                  const roleInfo = ROLE_CONFIG[user.role] || {
                    label: user.role,
                    color: "bg-slate-100 text-slate-700",
                  };
                  return (
                    <MobileListCard
                      key={user.id}
                      title={user.name}
                      subtitle={user.email}
                      badge={
                        <Badge
                          variant={user.is_active ? "success" : "default"}
                        >
                          {user.is_active ? "활성" : "비활성"}
                        </Badge>
                      }
                      metadata={[
                        {
                          label: "역할",
                          value: (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleInfo.color}`}
                            >
                              <Shield className="h-3 w-3" />
                              {roleInfo.label}
                            </span>
                          ),
                        },
                        {
                          label: "소속",
                          value: user.tenant_name,
                        },
                        {
                          label: "가입일",
                          value: formatDate(user.created_at),
                        },
                      ]}
                      onClick={() => openDetailModal(user)}
                      actions={
                        <>
                          <PrimitiveButton
                            onClick={() => openDetailModal(user)}
                            aria-label={`${user.name} 상세정보 보기`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                            title="상세정보"
                          >
                            <Eye className="h-4 w-4 text-slate-400" />
                          </PrimitiveButton>
                          <PrimitiveButton
                            onClick={() =>
                              handleResetPassword(user.id, user.name)
                            }
                            disabled={isActionLoading}
                            aria-label={`${user.name} 비밀번호 초기화`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                            title="비밀번호 초기화"
                          >
                            <Key className="h-4 w-4 text-slate-400" />
                          </PrimitiveButton>
                          <ToggleActiveButton user={user} />
                        </>
                      }
                    />
                  );
                })
              )}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>사용자</TableHead>
                        <TableHead className="w-[120px]">역할</TableHead>
                        <TableHead className="w-[160px]">소속 고객사</TableHead>
                        <TableHead className="w-[120px]">마지막 로그인</TableHead>
                        <TableHead className="w-[120px]">가입일</TableHead>
                        <TableHead className="w-[100px]">상태</TableHead>
                        <TableHead className="w-[120px] text-right">옵션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">
                            <EmptyState />
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${getAvatarColor(user.name)}`}>
                                  {user.name[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {user.name}
                                  </p>
                                  <div className="mt-0.5 flex items-center gap-3 text-sm text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3.5 w-3.5" />
                                      {user.email}
                                    </span>
                                    {user.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" />
                                        {user.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const roleInfo = ROLE_CONFIG[
                                  user.role
                                ] || {
                                  label: user.role,
                                  color: "bg-slate-100 text-slate-700",
                                };
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${roleInfo.color}`}
                                  >
                                    <Shield className="h-3.5 w-3.5" />
                                    {roleInfo.label}
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                                <span className="text-slate-900 truncate max-w-[120px]" title={user.tenant_name}>
                                  {user.tenant_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {user.last_login_at ? (
                                formatDate(user.last_login_at)
                              ) : (
                                <span className="text-slate-400 italic">로그인 이력 없음</span>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {formatDate(user.created_at)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.is_active ? "success" : "default"
                                }
                              >
                                {user.is_active ? "활성" : "비활성"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <PrimitiveButton
                                  onClick={() => openDetailModal(user)}
                                  aria-label={`${user.name} 상세정보 보기`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                                  title="상세정보"
                                >
                                  <Eye className="h-4 w-4 text-slate-400" />
                                </PrimitiveButton>
                                <PrimitiveButton
                                  onClick={() =>
                                    handleResetPassword(
                                      user.id,
                                      user.name,
                                    )
                                  }
                                  disabled={isActionLoading}
                                  aria-label={`${user.name} 비밀번호 초기화`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                                  title="비밀번호 초기화"
                                >
                                  <Key className="h-4 w-4 text-slate-400" />
                                </PrimitiveButton>
                                <ToggleActiveButton user={user} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* User detail modal */}
      {selectedUser && (
        <Modal
          isOpen={detailModalOpen}
          onClose={closeDetailModal}
          title="사용자 상세정보"
          size="lg"
        >
          <div className="space-y-6">
            {/* Profile header */}
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${getAvatarColor(selectedUser.name)}`}>
                {selectedUser.name[0]}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-slate-900">
                  {selectedUser.name}
                </h3>
                {(() => {
                  const roleInfo = ROLE_CONFIG[selectedUser.role] || {
                    label: selectedUser.role,
                    color: "bg-slate-100 text-slate-700",
                  };
                  return (
                    <span
                      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${roleInfo.color}`}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      {roleInfo.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Detail info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl bg-slate-50 p-5 ring-1 ring-inset ring-slate-200/50">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">이메일</p>
                  <p className="font-medium text-slate-900">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              {selectedUser.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-0.5">전화번호</p>
                    <p className="font-medium text-slate-900">
                      {selectedUser.phone}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">소속 고객사</p>
                  <p className="font-medium text-slate-900">
                    {selectedUser.tenant_name}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">가입일</p>
                  <p className="font-medium text-slate-900">
                    {formatDate(selectedUser.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">마지막 로그인</p>
                  <p className="font-medium text-slate-900">
                    {selectedUser.last_login_at ? (
                      formatDate(selectedUser.last_login_at)
                    ) : (
                      <span className="text-slate-400 italic font-normal">로그인 이력 없음</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:col-span-2 pt-2 border-t border-slate-200/60">
                <User className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">상태</p>
                  <Badge
                    variant={
                      selectedUser.is_active ? "success" : "default"
                    }
                  >
                    {selectedUser.is_active ? "활성" : "비활성"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={isActionLoading}
                onClick={() => {
                  handleResetPassword(
                    selectedUser.id,
                    selectedUser.name,
                  );
                }}
              >
                <Key className="h-4 w-4" />
                비밀번호 초기화
              </Button>
              <ToggleActiveButton user={selectedUser} size="modal" />
            </div>

            {/* Danger zone - 계정 삭제 */}
            {selectedUser.id !== currentUserId && (
              <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
                <p className="text-xs text-slate-500">
                  계정을 영구적으로 삭제합니다.
                </p>
                <p className="mb-3 text-xs text-slate-400">
                  삭제된 계정은 복구할 수 없습니다.
                </p>
                <button
                  onClick={() => startDeletionCheck(selectedUser.id)}
                  disabled={isActionLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-transparent py-2.5 text-sm font-medium text-red-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  계정 삭제
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
      {/* Delete user modal */}
      {selectedUser && (
        <DeleteUserModal
          isOpen={deleteModalOpen}
          onClose={closeDeleteModal}
          user={selectedUser}
          flowState={deleteFlowState}
          onConfirm={(reason) => executeDelete(selectedUser.id, reason)}
          onDeactivate={() => {
            closeDeleteModal();
            handleToggleActive(selectedUser.id, selectedUser.is_active);
          }}
        />
      )}
    </AdminLayout>
  );
}
