"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, Button, StatusBadge } from "@sigongon/ui";
import { mockApiClient } from "@/lib/mocks/mockApi";
import {
  MOBILE_MOCK_EXPORT_SAMPLE_FILES,
  buildSampleFileDownloadUrl,
} from "@/lib/sampleFiles";
import { Image, LayoutGrid, Download, Loader2 } from "lucide-react";

interface AlbumItem {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  layout: "three_column" | "four_column";
  status: "draft" | "published";
  photo_count: number;
}

export default function MobileCompletionPhotoAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);

  useEffect(() => {
    loadAlbums();
  }, [projectId]);

  const totalPhotos = useMemo(
    () => albums.reduce((sum, album) => sum + album.photo_count, 0),
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

  function downloadSamplePdf() {
    const anchor = document.createElement("a");
    anchor.href = buildSampleFileDownloadUrl(MOBILE_MOCK_EXPORT_SAMPLE_FILES.albumPdf);
    anchor.download = "준공사진첩_샘플.pdf";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <MobileLayout title="준공사진첩" showBack>
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">앨범/사진 수</p>
                <p className="text-2xl font-bold text-slate-900">
                  {albums.length}개 / {totalPhotos}장
                </p>
              </div>
              <Image className="h-8 w-8 text-brand-point-600" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/projects/${projectId}/album`}>
                <Button variant="secondary" fullWidth>
                  <LayoutGrid className="h-4 w-4" />
                  앨범 목록
                </Button>
              </Link>
              <Button variant="secondary" fullWidth onClick={downloadSamplePdf}>
                <Download className="h-4 w-4" />
                샘플 PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-brand-point-500" />
          </div>
        ) : albums.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-slate-500">준공사진첩 앨범이 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {albums.slice(0, 5).map((album) => (
              <Link
                key={album.id}
                href={`/projects/${projectId}/album/${album.id}`}
                className="block"
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate font-medium text-slate-900">{album.name}</p>
                      <StatusBadge
                        status={album.status === "published" ? "completed" : "draft"}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {album.layout === "three_column" ? "3열" : "4열"} ·{" "}
                      {album.photo_count}장
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

