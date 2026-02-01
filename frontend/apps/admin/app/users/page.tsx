"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  Loader2,
  Clock,
  RotateCcw,
  X,
  UserPlus,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { UserModal } from "@/components/UserModal";
import { InviteUserModal } from "@/components/InviteUserModal";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  Button,
  formatDate,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@sigongon/ui";
import type { UserRole } from "@sigongon/types";
import { api } from "@/lib/api";
import type { InvitationStatus } from "@/lib/mocks/db";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

interface InvitationItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
}

const roleConfig: Record<
  UserRole,
  { label: string; color: string; belongsTo: string }
> = {
  super_admin: {
    label: "슈퍼관리자",
    color: "bg-red-100 text-red-700",
    belongsTo: "시스템",
  },
  company_admin: {
    label: "대표",
    color: "bg-purple-100 text-purple-700",
    belongsTo: "회사",
  },
  site_manager: {
    label: "현장소장",
    color: "bg-blue-100 text-blue-700",
    belongsTo: "회사",
  },
  worker: {
    label: "근로자",
    color: "bg-slate-100 text-slate-700",
    belongsTo: "시스템",
  },
};

const invitationStatusConfig: Record<
  InvitationStatus,
  { label: string; color: "default" | "success" | "warning" | "error" }
> = {
  pending: { label: "대기중", color: "warning" },
  accepted: { label: "수락됨", color: "success" },
  expired: { label: "만료됨", color: "error" },
  revoked: { label: "취소됨", color: "default" },
};

type TabType = "users" | "invitations";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [searchQuery, setSearchQuery] = useState("");

  // Users state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Invitations state
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  useEffect(() => {
    loadUsers();
    loadInvitations();
  }, []);

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      setError(null);
      const response = await api.getUsers({ per_page: 100 });
      if (response.success && response.data) {
        setUsers(response.data as UserItem[]);
      }
    } catch (err) {
      setError("사용자 목록을 불러오는데 실패했어요");
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadInvitations() {
    try {
      setLoadingInvitations(true);
      const response = await api.getInvitations({ per_page: 100 });
      if (response.success && response.data) {
        setInvitations(response.data as InvitationItem[]);
      }
    } catch (err) {
      console.error("Failed to load invitations:", err);
    } finally {
      setLoadingInvitations(false);
    }
  }

  async function handleInviteUser(data: {
    email: string;
    name: string;
    role: UserRole;
  }) {
    const response = await api.createInvitation(data);
    if (!response.success) {
      throw new Error(response.error?.message || "초대 실패");
    }
    await loadInvitations();
    return response.data!;
  }

  async function handleResendInvitation(invitationId: string) {
    try {
      const response = await api.resendInvitation(invitationId);
      if (response.success) {
        alert("초대를 재발송했어요");
        await loadInvitations();
      } else {
        alert(response.error?.message || "재발송에 실패했어요");
      }
    } catch (err) {
      alert("재발송에 실패했어요");
      console.error(err);
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    if (!confirm("정말 이 초대를 취소할까요?")) return;

    try {
      const response = await api.revokeInvitation(invitationId);
      if (response.success) {
        setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      } else {
        alert(response.error?.message || "취소에 실패했어요");
      }
    } catch (err) {
      alert("취소에 실패했어요");
      console.error(err);
    }
  }

  async function handleSaveUser(data: {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    password?: string;
  }) {
    if (data.id) {
      await api.updateUser(data.id, {
        name: data.name,
        phone: data.phone,
        role: data.role,
      });
    }
    await loadUsers();
  }

  async function handleDelete(userId: string) {
    if (!confirm("정말 이 사용자를 삭제할까요?")) return;

    try {
      await api.deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err) {
      alert("삭제에 실패했어요");
      console.error(err);
    }
  }

  function openEditModal(user: UserItem) {
    setEditingUser(user);
    setEditModalOpen(true);
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.includes(searchQuery) ||
      user.email.includes(searchQuery) ||
      (user.phone && user.phone.includes(searchQuery)),
  );

  const filteredInvitations = invitations.filter(
    (inv) =>
      inv.name.includes(searchQuery) ||
      inv.email.includes(searchQuery),
  );

  const pendingInvitations = invitations.filter((inv) => inv.status === "pending");
  const activeCount = users.filter((u) => u.is_active).length;

  const loading = loadingUsers || loadingInvitations;

  if (loading && users.length === 0) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-red-500">{error}</p>
          <Button onClick={loadUsers}>다시 시도</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">사용자 관리</h1>
            <p className="mt-1 text-slate-500">
              전체 {users.length}명 · 활성 {activeCount}명
              {pendingInvitations.length > 0 && (
                <span className="ml-2 text-amber-600">
                  · 대기중 초대 {pendingInvitations.length}건
                </span>
              )}
            </p>
          </div>
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            사용자 초대
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab("users")}
              className={`border-b-2 py-3 text-sm font-medium ${
                activeTab === "users"
                  ? "border-brand-point-500 text-brand-point-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              사용자
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {users.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("invitations")}
              className={`border-b-2 py-3 text-sm font-medium ${
                activeTab === "invitations"
                  ? "border-brand-point-500 text-brand-point-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              대기중인 초대
              {pendingInvitations.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  {pendingInvitations.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder={
                  activeTab === "users"
                    ? "이름, 이메일, 전화번호로 검색..."
                    : "이름, 이메일로 검색..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full max-w-md rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              />
            </div>
          </CardContent>
        </Card>

        {activeTab === "users" ? (
          // Users Tab
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>사용자</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>마지막 로그인</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const role = roleConfig[user.role];

                    return (
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
                              <div className="flex items-center gap-3 text-sm text-slate-500">
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
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${role.color}`}
                            >
                              <Shield className="h-3.5 w-3.5" />
                              {role.label}
                            </span>
                            <span className="text-xs text-slate-400">
                              {role.belongsTo}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                              <UserCheck className="h-4 w-4" />
                              활성
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                              <UserX className="h-4 w-4" />
                              비활성
                            </span>
                          )}
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
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditModal(user)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                            >
                              <Edit2 className="h-4 w-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                        {searchQuery ? "검색 결과가 없어요" : "등록된 사용자가 없어요"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          // Invitations Tab
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>초대 대상</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>초대일</TableHead>
                    <TableHead>만료일</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvitations.map((invitation) => {
                    const role = roleConfig[invitation.role];
                    const status = invitationStatusConfig[invitation.status];
                    const isExpired = new Date(invitation.expires_at) < new Date();
                    const canResend = invitation.status === "pending" || invitation.status === "expired";
                    const canRevoke = invitation.status === "pending";

                    return (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-medium text-slate-400">
                              <Mail className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {invitation.name}
                              </p>
                              <p className="text-sm text-slate-500">
                                {invitation.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${role.color}`}
                          >
                            <Shield className="h-3.5 w-3.5" />
                            {role.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.color}>
                            {isExpired && invitation.status === "pending"
                              ? "만료됨"
                              : status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {formatDate(invitation.created_at)}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(invitation.expires_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canResend && (
                              <button
                                onClick={() => handleResendInvitation(invitation.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                                title="재발송"
                              >
                                <RotateCcw className="h-4 w-4 text-slate-400" />
                              </button>
                            )}
                            {canRevoke && (
                              <button
                                onClick={() => handleRevokeInvitation(invitation.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50"
                                title="취소"
                              >
                                <X className="h-4 w-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredInvitations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                        {searchQuery ? "검색 결과가 없어요" : "대기중인 초대가 없어요"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <UserModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveUser}
        user={editingUser}
        currentUserRole={(currentUser?.role as UserRole) || "company_admin"}
      />

      <InviteUserModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={handleInviteUser}
        currentUserRole={(currentUser?.role as UserRole) || "company_admin"}
      />
    </AdminLayout>
  );
}
