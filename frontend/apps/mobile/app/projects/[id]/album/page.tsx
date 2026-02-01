"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Image, FileDown, LayoutGrid } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, Button, StatusBadge } from "@sigongon/ui";
import { mockApiClient } from "@/lib/mocks/mockApi";

interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

interface Album {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  layout: "three_column" | "four_column";
  status: "draft" | "published";
  photo_count: number;
  created_at: string;
  updated_at: string;
}

export default function AlbumPage({ params }: AlbumPageProps) {
  const { id } = use(params);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAlbums = async () => {
      setIsLoading(true);
      try {
        const result = await mockApiClient.getPhotoAlbums(id);
        if (result.success && result.data) {
          setAlbums(result.data);
        }
      } catch (error) {
        console.error("앨범 목록 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAlbums();
  }, [id]);

  if (isLoading) {
    return (
      <MobileLayout title="사진 앨범" showBack>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-point-500 border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="사진 앨범" showBack>
      <div className="space-y-4 p-4">
        {/* Header info */}
        <div className="rounded-xl border-2 border-brand-point-200 bg-gradient-to-br from-brand-point-50 to-white p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="rounded-lg bg-brand-point-500 p-2">
                <LayoutGrid className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-brand-point-900">사진 앨범 관리</h2>
              <p className="mt-1 text-sm text-brand-point-700">
                프로젝트의 사진들을 앨범으로 정리하여 관리해요
              </p>
            </div>
          </div>
        </div>

        {/* Albums grid */}
        {albums.length > 0 ? (
          <div className="grid gap-4">
            {albums.map((album) => (
              <Link key={album.id} href={`/projects/${id}/album/${album.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    {/* Thumbnail section */}
                    <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image className="h-12 w-12 text-slate-400" />
                      </div>
                      <div className="absolute left-3 top-3">
                        <StatusBadge
                          status={album.status === "published" ? "completed" : "draft"}
                        />
                      </div>
                      <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        {album.photo_count}장
                      </div>
                    </div>

                    {/* Album info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-900">{album.name}</h3>
                      {album.description && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                          {album.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>
                          {album.layout === "three_column" ? "3열" : "4열"} 레이아웃
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-slate-100 p-6">
              <Image className="h-12 w-12 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              아직 앨범이 없어요
            </p>
            <p className="mt-1 text-xs text-slate-500">
              사진을 촬영하여 앨범을 만들어보세요
            </p>
          </div>
        )}

        {/* Info footer */}
        {albums.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <FileDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-600">
                  각 앨범을 열어서 PDF 파일로 다운로드할 수 있어요
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
