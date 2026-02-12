"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PrimitiveButton, toast } from "@sigongon/ui";
import { Eye, EyeOff, Loader2, ShieldCheck, Users } from "lucide-react";
import { api } from "@/lib/api";

interface ManagerAccessItem {
  id: string;
  name: string;
  phone?: string;
  visible: boolean;
}

export default function ProjectAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [managers, setManagers] = useState<ManagerAccessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const visibleCount = useMemo(
    () => managers.filter((manager) => manager.visible).length,
    [managers],
  );

  useEffect(() => {
    loadManagers();
  }, [projectId]);

  async function loadManagers() {
    try {
      setLoading(true);
      const usersResponse = await api.getUsers({
        role: "site_manager",
        per_page: 50,
      });
      let accessResponse: Awaited<
        ReturnType<typeof api.getProjectAccess>
      > | null = null;
      try {
        accessResponse = await api.getProjectAccess(projectId);
      } catch {
        accessResponse = null;
      }

      if (usersResponse.success && usersResponse.data) {
        const visibleIds = new Set(
          accessResponse?.success && accessResponse.data
            ? accessResponse.data.manager_ids
            : [],
        );

        setManagers(
          usersResponse.data.map((user, index) => {
            const defaultVisible = index < 2;
            return {
              id: user.id,
              name: user.name,
              phone: user.phone,
              visible:
                visibleIds.size > 0 ? visibleIds.has(user.id) : defaultVisible,
            };
          }),
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("현장소장 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  function toggleVisibility(userId: string) {
    setManagers((prev) =>
      prev.map((manager) =>
        manager.id === userId
          ? { ...manager, visible: !manager.visible }
          : manager,
      ),
    );
  }

  function setAllVisibility(visible: boolean) {
    setManagers((prev) => prev.map((manager) => ({ ...manager, visible })));
  }

  async function handleSave() {
    try {
      setSaving(true);
      const managerIds = managers
        .filter((manager) => manager.visible)
        .map((manager) => manager.id);

      const response = await api.updateProjectAccess(projectId, {
        manager_ids: managerIds,
      });

      if (!response.success) {
        throw new Error(response.error?.message || "접근권한 저장 실패");
      }

      toast.success(
        `프로젝트 공개 대상을 저장했어요. (${visibleCount}/${managers.length}명)`,
      );
    } catch (error) {
      console.error(error);
      toast.error("저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-slate-400" />
              프로젝트 접근 권한
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              프로젝트 <span className="font-mono">{projectId}</span> 정보를
              열람할 현장소장을 지정합니다.
            </p>
          </div>
          <Badge className="bg-brand-point-50 text-brand-point-700">
            공개 {visibleCount}/{managers.length}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAllVisibility(true)}
              disabled={loading || managers.length === 0}
            >
              <Eye className="h-4 w-4" />
              전체 공개
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAllVisibility(false)}
              disabled={loading || managers.length === 0}
            >
              <EyeOff className="h-4 w-4" />
              전체 비공개
            </Button>
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              저장
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            현장소장별 공개 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-point-500" />
            </div>
          ) : managers.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              등록된 현장소장이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {managers.map((manager) => (
                <div
                  key={manager.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{manager.name}</p>
                    <p className="text-xs text-slate-500">{manager.phone || "-"}</p>
                  </div>
                  <PrimitiveButton
                    type="button"
                    onClick={() => toggleVisibility(manager.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-point-500 focus:ring-offset-2 ${
                      manager.visible ? "bg-brand-point-500" : "bg-slate-300"
                    }`}
                    aria-label={`${manager.name} 가시성 토글`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        manager.visible ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </PrimitiveButton>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
