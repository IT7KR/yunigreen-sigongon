"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  formatDate,
} from "@sigongon/ui";
import { Image, Download, ArrowRight, Loader2 } from "lucide-react";
import { mockApiClient } from "@/lib/mocks/mockApi";
import { buildSampleFileDownloadUrl } from "@/lib/sampleFiles";

interface PhotoAlbumItem {
  id: string;
  project_id: string;
  name: string;
  layout: "three_column" | "four_column";
  status: "draft" | "published";
  photo_count: number;
  created_at: string;
}

export default function CompletionPhotoAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<PhotoAlbumItem[]>([]);

  useEffect(() => {
    loadAlbums();
  }, [projectId]);

  const totalPhotos = useMemo(
    () => albums.reduce((sum, album) => sum + album.photo_count, 0),
    [albums],
  );
  const publishedCount = useMemo(
    () => albums.filter((album) => album.status === "published").length,
    [albums],
  );

  async function loadAlbums() {
    try {
      setLoading(true);
      const response = await mockApiClient.getPhotoAlbums(projectId);
      if (response.success && response.data) {
        setAlbums(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function downloadSampleWorkbook() {
    const anchor = document.createElement("a");
    anchor.href = buildSampleFileDownloadUrl(
      "sample/3. 관공서 준공서류/4. 준공사진첩.xlsx",
    );
    anchor.download = "준공사진첩_샘플.xlsx";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-slate-400" />
              준공사진첩
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              시공 전/중/후 사진을 앨범으로 정리하고 PDF로 제출합니다.
            </p>
          </div>
          <Badge className="bg-brand-point-50 text-brand-point-700">
            발행 {publishedCount}/{albums.length}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <MetricCard title="앨범 수" value={`${albums.length}개`} />
          <MetricCard title="총 사진 수" value={`${totalPhotos}장`} />
          <MetricCard title="발행 완료" value={`${publishedCount}개`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>바로가기</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild><Link href={`/projects/${projectId}/album`}>
              앨범 목록 열기
              <ArrowRight className="h-4 w-4" />
            </Link></Button>
          <Button variant="secondary" onClick={downloadSampleWorkbook}>
            <Download className="h-4 w-4" />
            준공사진첩 샘플 다운로드
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 앨범</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-point-500" />
            </div>
          ) : albums.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              아직 생성된 앨범이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {albums.slice(0, 5).map((album) => (
                <Link
                  key={album.id}
                  href={`/projects/${projectId}/album/${album.id}`}
                  className="block rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{album.name}</p>
                      <p className="text-xs text-slate-500">
                        {album.layout === "three_column" ? "3열" : "4열"} ·{" "}
                        {album.photo_count}장 · {formatDate(album.created_at)}
                      </p>
                    </div>
                    <Badge variant={album.status === "published" ? "success" : "default"}>
                      {album.status === "published" ? "발행" : "초안"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

