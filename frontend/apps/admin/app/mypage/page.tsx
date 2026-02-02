"use client";

import { useState } from "react";
import { User, Lock, Bell, Clock, Shield } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@sigongon/ui";
import { useAuth } from "@/lib/auth";
import { ProfileSection } from "@/components/mypage/ProfileSection";
import { PasswordSection } from "@/components/mypage/PasswordSection";
import { NotificationPrefsSection } from "@/components/mypage/NotificationPrefsSection";
import { ActivityLogSection } from "@/components/mypage/ActivityLogSection";
import { AccountManagementSection } from "@/components/mypage/AccountManagementSection";

export default function MyPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const { user } = useAuth();

  const sections = [
    { id: "profile", label: "기본 정보", icon: User },
    { id: "password", label: "비밀번호 변경", icon: Lock },
    { id: "notifications", label: "알림 설정", icon: Bell },
    { id: "activity", label: "활동 내역", icon: Clock },
    { id: "account", label: "계정 관리", icon: Shield },
  ];

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; color: string }> = {
      super_admin: { label: "최고관리자", color: "bg-purple-100 text-purple-700" },
      company_admin: { label: "대표", color: "bg-teal-100 text-teal-700" },
      site_manager: { label: "현장소장", color: "bg-teal-100 text-teal-700" },
      worker: { label: "작업자", color: "bg-slate-100 text-slate-700" },
    };

    const roleInfo = roleMap[role] || { label: role, color: "bg-slate-100 text-slate-700" };
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${roleInfo.color}`}>
        {roleInfo.label}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">마이페이지</h1>
          <p className="mt-1 text-slate-500">개인 계정 및 프로필을 관리합니다</p>
        </div>

        {user && (
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-point-100 text-2xl font-bold text-brand-point-700">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <div>{getRoleBadge(user.role)}</div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-4">
          <Card className="lg:col-span-1">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-point-50 text-brand-point-700"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-3">
            {activeSection === "profile" && <ProfileSection />}
            {activeSection === "password" && <PasswordSection />}
            {activeSection === "notifications" && <NotificationPrefsSection />}
            {activeSection === "activity" && <ActivityLogSection />}
            {activeSection === "account" && <AccountManagementSection />}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
