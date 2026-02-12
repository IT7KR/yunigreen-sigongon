"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MobileLayout } from "@/components/MobileLayout";
import { api } from "@/lib/api";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@sigongon/ui";
import type { DiagnosisCase } from "@sigongon/types";
import { Plus } from "lucide-react";

export default function MobileCasesPage() {
  const [items, setItems] = useState<DiagnosisCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await api.listCases();
    if (res.success && res.data) setItems(res.data);
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await api.createCase();
      if (res.success) await load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <MobileLayout title="케이스 견적" showBack>
      <div className="space-y-4 p-4">
        <Button fullWidth onClick={handleCreate} loading={creating}>
          <Plus className="h-4 w-4" />
          새 케이스
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>케이스 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">불러오는 중...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-500">케이스가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/cases/${item.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">#{item.id}</p>
                      <p className="text-xs text-slate-500">시즌 {item.season_id}</p>
                    </div>
                    <Badge variant={item.status === "estimated" ? "success" : "info"}>
                      {item.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
