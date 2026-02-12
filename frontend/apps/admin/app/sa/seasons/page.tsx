"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { api } from "@/lib/api";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@sigongon/ui";
import type { SeasonDocumentInfo, SeasonInfo } from "@sigongon/types";

export default function SASeasonsPage() {
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [documents, setDocuments] = useState<SeasonDocumentInfo[]>([]);
  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState<number | "">("");
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("공통");
  const [fileName, setFileName] = useState("season-pricebook.pdf");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [seasonRes, docRes] = await Promise.all([api.getSeasons(), api.getAdminDocuments()]);
    if (seasonRes.success && seasonRes.data) {
      setSeasons(seasonRes.data);
      if (!seasonId && seasonRes.data[0]) setSeasonId(seasonRes.data[0].id);
    }
    if (docRes.success && docRes.data) setDocuments(docRes.data);
    setLoading(false);
  }

  async function handleCreateSeason() {
    if (!name.trim()) return;
    const res = await api.createSeason({ name: name.trim(), is_active: false });
    if (res.success) {
      setName("");
      await load();
    }
  }

  async function handleActivateSeason(targetSeasonId: number) {
    await api.updateSeason(targetSeasonId, { is_active: true });
    await load();
  }

  async function handleCreateDocument() {
    if (!seasonId || !docTitle.trim() || !fileName.trim()) return;
    const res = await api.createAdminDocument({
      season_id: seasonId,
      category: docCategory,
      title: docTitle.trim(),
      file_name: fileName.trim(),
    });
    if (res.success && res.data) {
      await api.ingestAdminDocument(res.data.id);
      setDocTitle("");
      await load();
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">시즌/문서 관리</h1>
          <p className="mt-1 text-sm text-slate-500">활성 시즌과 문서 인덱싱 상태를 관리합니다</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>시즌 생성</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="예: 2026H2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="md:max-w-xs"
            />
            <Button onClick={handleCreateSeason}>시즌 추가</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>시즌 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">불러오는 중...</p>
            ) : (
              <div className="space-y-2">
                {seasons.map((season) => (
                  <div
                    key={season.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{season.name}</span>
                      <Badge variant={season.is_active ? "success" : "default"}>
                        {season.is_active ? "활성" : "비활성"}
                      </Badge>
                    </div>
                    {!season.is_active && (
                      <Button size="sm" variant="secondary" onClick={() => void handleActivateSeason(season.id)}>
                        활성화
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>문서 등록 및 인덱싱</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <Input
                placeholder="season_id"
                value={String(seasonId || "")}
                onChange={(e) => setSeasonId(Number(e.target.value) || "")}
              />
              <Input value={docCategory} onChange={(e) => setDocCategory(e.target.value)} />
              <Input placeholder="문서 제목" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
              <Input placeholder="파일명.pdf" value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </div>
            <Button onClick={handleCreateDocument}>문서 등록 + 인덱싱</Button>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-2 font-medium">ID</th>
                    <th className="pb-2 font-medium">시즌</th>
                    <th className="pb-2 font-medium">제목</th>
                    <th className="pb-2 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 text-sm">{doc.id}</td>
                      <td className="py-2 text-sm">{doc.season_id}</td>
                      <td className="py-2">{doc.title}</td>
                      <td className="py-2">
                        <Badge variant={doc.status === "done" ? "success" : "info"}>{doc.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
