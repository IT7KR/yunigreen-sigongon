"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge, Button, Card, CardContent, LoadingOverlay, Modal, Pagination, PrimitiveButton, PrimitiveInput, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDate, toast, useConfirmDialog } from "@sigongon/ui";
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
  X,
} from "lucide-react";
import { api } from "@/lib/api";

import type { UserRole } from "@sigongon/types";

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
  tenant_id: string;
  last_login_at?: string;
  created_at: string;
  is_active: boolean;
}

export default function SAUsersPage() {
  const [users, setUsers] = useState<SAUserItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<SAUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<SAUserItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const { confirm } = useConfirmDialog();

  function openDetailModal(user: SAUserItem) {
    setSelectedUser(user);
    setDetailModalOpen(true);
  }

  function closeDetailModal() {
    setDetailModalOpen(false);
    setSelectedUser(null);
  }

  useEffect(() => {
    loadUsers();
  }, [currentPage]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, users]);

  async function loadUsers() {
    try {
      setIsLoading(true);
      const response = await api.getUsers({ page: currentPage, per_page: 20 });

      if (response.success && response.data) {
        // Mock: Add tenant info to users
        const usersWithTenant = response.data.map((u: any) => ({
          ...u,
          tenant_name: "유니그린개발",
          tenant_id: "tenant_1",
        }));
        setUsers(usersWithTenant);
        if (response.meta) {
          setTotalPages(response.meta.total_pages);
        }
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...users];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.tenant_name.toLowerCase().includes(q) ||
          (u.phone && u.phone.includes(q)),
      );
    }

    setFilteredUsers(filtered);
  }

  async function handleResetPassword(_userId: string, userName: string) {
    const confirmed = await confirm({
      title: `${userName} 사용자의 비밀번호를 초기화할까요?`,
      confirmLabel: "초기화",
    });
    if (!confirmed) return;

    // Mock reset
    toast.success("비밀번호 초기화 링크를 이메일로 전송했어요.");
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    const confirmed = await confirm({
      title: `정말 이 계정을 ${isActive ? "비활성화" : "활성화"}할까요?`,
      confirmLabel: isActive ? "비활성화" : "활성화",
      variant: "destructive",
    });
    if (!confirmed) return;

    // Mock toggle
    setUsers(
      users.map((u) => (u.id === userId ? { ...u, is_active: !isActive } : u)),
    );
    toast.success(`계정을 ${isActive ? "비활성화" : "활성화"}했어요.`);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            전체 사용자 관리
          </h1>
          <p className="mt-1 text-slate-500">
            전체 {users.length}명 · 활성 {users.filter(u => u.is_active).length}명
          </p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <PrimitiveInput
                type="search"
                placeholder="이름, 이메일, 고객사, 전화번호로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full max-w-md rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <LoadingOverlay variant="inline" text="사용자 목록을 불러오는 중..." />
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>사용자</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead>소속 고객사</TableHead>
                      <TableHead>마지막 로그인</TableHead>
                      <TableHead>가입일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          <div className="py-12 text-slate-500">
                            {searchQuery ? "검색 결과가 없어요" : "사용자가 없어요"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-medium text-slate-600">
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
                              const roleInfo = ROLE_CONFIG[user.role] || { label: user.role, color: "bg-slate-100 text-slate-700" };
                              return (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${roleInfo.color}`}>
                                  <Shield className="h-3.5 w-3.5" />
                                  {roleInfo.label}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-900">
                                {user.tenant_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {user.last_login_at
                              ? formatDate(user.last_login_at)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {formatDate(user.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={user.is_active ? "success" : "default"}
                            >
                              {user.is_active ? "활성" : "비활성"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <PrimitiveButton
                                onClick={() => openDetailModal(user)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                                title="상세정보"
                              >
                                <Eye className="h-4 w-4 text-slate-400" />
                              </PrimitiveButton>
                              <PrimitiveButton
                                onClick={() =>
                                  handleResetPassword(user.id, user.name)
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                                title="비밀번호 초기화"
                              >
                                <Key className="h-4 w-4 text-slate-400" />
                              </PrimitiveButton>
                              <PrimitiveButton
                                onClick={() =>
                                  handleToggleActive(user.id, user.is_active)
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50"
                                title={
                                  user.is_active ? "비활성화" : "활성화"
                                }
                              >
                                <Ban className="h-4 w-4 text-red-400" />
                              </PrimitiveButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

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

      {/* 사용자 상세정보 모달 */}
      {selectedUser && (
        <Modal
          isOpen={detailModalOpen}
          onClose={closeDetailModal}
          title="사용자 상세정보"
          size="md"
        >
          <div className="space-y-6">
            {/* 프로필 헤더 */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-2xl font-bold text-slate-600">
                {selectedUser.name[0]}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {selectedUser.name}
                </h3>
                {(() => {
                  const roleInfo = ROLE_CONFIG[selectedUser.role] || { label: selectedUser.role, color: "bg-slate-100 text-slate-700" };
                  return (
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${roleInfo.color}`}>
                      <Shield className="h-3.5 w-3.5" />
                      {roleInfo.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* 상세정보 */}
            <div className="space-y-4 rounded-lg bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">이메일</p>
                  <p className="font-medium text-slate-900">{selectedUser.email}</p>
                </div>
              </div>

              {selectedUser.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">전화번호</p>
                    <p className="font-medium text-slate-900">{selectedUser.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">소속 고객사</p>
                  <p className="font-medium text-slate-900">{selectedUser.tenant_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">가입일</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedUser.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">마지막 로그인</p>
                  <p className="font-medium text-slate-900">
                    {selectedUser.last_login_at ? formatDate(selectedUser.last_login_at) : "없음"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">상태</p>
                  <Badge variant={selectedUser.is_active ? "success" : "default"}>
                    {selectedUser.is_active ? "활성" : "비활성"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  handleResetPassword(selectedUser.id, selectedUser.name);
                }}
              >
                <Key className="h-4 w-4" />
                비밀번호 초기화
              </Button>
              <Button
                variant={selectedUser.is_active ? "destructive" : "primary"}
                className="flex-1"
                onClick={() => {
                  handleToggleActive(selectedUser.id, selectedUser.is_active);
                  closeDetailModal();
                }}
              >
                <Ban className="h-4 w-4" />
                {selectedUser.is_active ? "비활성화" : "활성화"}
              </Button>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={closeDetailModal}
            >
              <X className="h-4 w-4" />닫기
            </Button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
