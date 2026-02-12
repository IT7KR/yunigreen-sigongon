"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Image, Loader2, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PrimitiveButton, formatDate } from "@sigongon/ui";
import { mockApiClient } from "@/lib/mocks/mockApi";

interface PhotoAlbum {
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

export default function ProjectAlbumListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAlbums();
  }, [projectId]);

  async function loadAlbums() {
    try {
      setLoading(true);
      const response = await mockApiClient.getPhotoAlbums(projectId);
      if (response.success && response.data) {
        setAlbums(response.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAlbum() {
    try {
      setCreating(true);
      const response = await mockApiClient.createPhotoAlbum(projectId, {
        name: `새 앨범 ${albums.length + 1}`,
        layout: "three_column",
      });
      if (response.success && response.data) {
        router.push(`/projects/${projectId}/album/${response.data.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteAlbum(albumId: string) {
    if (!confirm("앨범을 삭제하시겠어요?")) return;

    try {
      await mockApiClient.deletePhotoAlbum(albumId);
      loadAlbums();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-slate-400" />
            사진 앨범
          </CardTitle>
          <Button onClick={handleCreateAlbum} disabled={creating}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            새 앨범 만들기
          </Button>
        </CardHeader>
        <CardContent>
          {albums.length === 0 ? (
            <div className="py-12 text-center">
              <Image className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">
                아직 앨범이 없어요. 첫 앨범을 만들어보세요!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {albums.map((album) => (
                <div
                  key={album.id}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white transition-all hover:shadow-md"
                >
                  <Link href={`/projects/${projectId}/album/${album.id}`}>
                    <div className="aspect-video bg-slate-100 p-8">
                      <div className="flex h-full items-center justify-center">
                        <Image className="h-16 w-16 text-slate-300" />
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {album.name}
                        </h3>
                        <Badge
                          variant={
                            album.status === "published"
                              ? "success"
                              : "default"
                          }
                        >
                          {album.status === "published" ? "발행" : "초안"}
                        </Badge>
                      </div>
                      {album.description && (
                        <p className="mb-2 line-clamp-2 text-sm text-slate-600">
                          {album.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <span>
                          {album.layout === "three_column" ? "3열" : "4열"} ·{" "}
                          {album.photo_count}장
                        </span>
                        <span>{formatDate(album.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                  <PrimitiveButton
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteAlbum(album.id);
                    }}
                    className="absolute right-2 top-2 rounded bg-white/80 p-2 opacity-0 shadow-sm transition-opacity hover:bg-red-50 group-hover:opacity-100"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
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
