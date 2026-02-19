"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PrimitiveButton, PrimitiveInput, toast } from "@sigongon/ui";
import { Eye, EyeOff, Loader2, Search, ShieldCheck, Users, X } from "lucide-react";
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
  const [query, setQuery] = useState("");

  const visibleCount = useMemo(
    () => managers.filter((manager) => manager.visible).length,
    [managers],
  );

  const selectedManagers = useMemo(
    () => managers.filter((manager) => manager.visible),
    [managers],
  );

  const filteredManagers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return managers;

    return managers.filter((manager) => {
      const name = manager.name.toLowerCase();
      const phone = (manager.phone || "").toLowerCase();
      return name.includes(keyword) || phone.includes(keyword);
    });
  }, [managers, query]);

  const loadManagers = useCallback(async () => {
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
  }, [projectId]);

  useEffect(() => {
    void loadManagers();
  }, [loadManagers]);

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
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">현장소장 검색</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <PrimitiveInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이름 또는 연락처로 검색"
                className="pl-9"
              />
            </div>
          </div>

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

          <div className="space-y-2 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <p className="text-sm font-medium text-slate-700">검색 결과</p>
              <p className="text-xs text-slate-500">{filteredManagers.length}명</p>
            </div>

            {loading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-brand-point-500" />
              </div>
            ) : filteredManagers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                검색된 현장소장이 없습니다.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {filteredManagers.map((manager) => (
                  <label
                    key={manager.id}
                    className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{manager.name}</p>
                      <p className="truncate text-xs text-slate-500">{manager.phone || "-"}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={manager.visible}
                      onChange={() => toggleVisibility(manager.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-point-500 focus:ring-brand-point-500"
                      aria-label={`${manager.name} 접근권한 선택`}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            선택된 현장소장
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-point-500" />
            </div>
          ) : selectedManagers.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              선택된 현장소장이 없습니다.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedManagers.map((manager) => (
                <PrimitiveButton
                  key={manager.id}
                  type="button"
                  onClick={() => toggleVisibility(manager.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-point-200 bg-brand-point-50 px-3 py-1.5 text-xs font-medium text-brand-point-700 hover:bg-brand-point-100"
                >
                  <span>{manager.name}</span>
                  <span className="text-brand-point-500">·</span>
                  <span>{manager.phone || "-"}</span>
                  <X className="h-3.5 w-3.5" />
                </PrimitiveButton>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
