"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Download,
  Plus,
  Loader2,
  LayoutGrid,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
} from "@sigongon/ui";
import { mockApiClient } from "@/lib/mocks/mockApi";
import { PhotoAlbumGrid } from "@/components/PhotoAlbumGrid";
import { PhotoSelector } from "@/components/PhotoSelector";

interface AlbumPhoto {
  id: string;
  album_photo_id: string;
  storage_path: string;
  caption?: string;
  caption_override?: string;
  photo_type: "before" | "during" | "after" | "detail";
  taken_at?: string;
  sort_order: number;
}

interface PhotoAlbumDetail {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  layout: "three_column" | "four_column";
  status: "draft" | "published";
  photos: AlbumPhoto[];
  created_at: string;
  updated_at: string;
}

export default function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string; albumId: string }>;
}) {
  const { id: projectId, albumId } = use(params);
  const router = useRouter();
  const [album, setAlbum] = useState<PhotoAlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [layout, setLayout] = useState<"three_column" | "four_column">(
    "three_column"
  );
  const [status, setStatus] = useState<"draft" | "published">("draft");

  useEffect(() => {
    loadAlbum();
  }, [albumId]);

  useEffect(() => {
    if (album) {
      setName(album.name);
      setDescription(album.description || "");
      setLayout(album.layout);
      setStatus(album.status);
    }
  }, [album]);

  async function loadAlbum() {
    try {
      setLoading(true);
      const response = await mockApiClient.getPhotoAlbum(albumId);
      if (response.success && response.data) {
        setAlbum(response.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await mockApiClient.updatePhotoAlbum(albumId, {
        name,
        description,
        layout,
        status,
      });
      loadAlbum();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    try {
      setExporting(true);
      const response = await mockApiClient.exportAlbumPdf(albumId);
      if (response.success && response.data) {
        alert(`PDF 다운로드: ${response.data.pdf_url}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  async function handleReorder(photos: AlbumPhoto[]) {
    const reordered = photos.map((photo, idx) => ({
      id: photo.id,
      sort_order: idx,
    }));

    try {
      await mockApiClient.reorderAlbumPhotos(albumId, reordered);
      loadAlbum();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRemovePhoto(photoId: string) {
    if (!confirm("사진을 삭제하시겠어요?")) return;

    try {
      await mockApiClient.removePhotoFromAlbum(albumId, photoId);
      loadAlbum();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSelectPhotos(photoIds: string[]) {
    try {
      await mockApiClient.addPhotosToAlbum(albumId, photoIds);
      setShowPhotoSelector(false);
      loadAlbum();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading || !album) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => router.push(`/projects/${projectId}/album`)}
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Button>
        <h1 className="flex-1 text-2xl font-bold text-slate-900">
          앨범 편집
        </h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            저장
          </Button>
          <Button onClick={handleExportPdf} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            PDF 다운로드
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>앨범 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              앨범 이름
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="앨범 이름을 입력하세요"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="앨범 설명을 입력하세요 (선택)"
              className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                레이아웃
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLayout("three_column")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 transition-colors ${
                    layout === "three_column"
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <LayoutGrid className="h-5 w-5" />
                  3열
                </button>
                <button
                  onClick={() => setLayout("four_column")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 transition-colors ${
                    layout === "four_column"
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <LayoutGrid className="h-5 w-5" />
                  4열
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                상태
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStatus("draft")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 transition-colors ${
                    status === "draft"
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  초안
                </button>
                <button
                  onClick={() => setStatus("published")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 transition-colors ${
                    status === "published"
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  발행
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            사진 ({album.photos.length}장)
          </CardTitle>
          <Button onClick={() => setShowPhotoSelector(true)}>
            <Plus className="h-4 w-4" />
            사진 추가
          </Button>
        </CardHeader>
        <CardContent>
          {album.photos.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-500">
                아직 사진이 없어요. 사진을 추가해보세요!
              </p>
            </div>
          ) : (
            <PhotoAlbumGrid
              photos={album.photos}
              columns={layout === "three_column" ? 3 : 4}
              onReorder={handleReorder}
              onRemove={handleRemovePhoto}
            />
          )}
        </CardContent>
      </Card>

      {showPhotoSelector && (
        <PhotoSelector
          projectId={projectId}
          existingPhotoIds={album.photos.map((p) => p.album_photo_id)}
          onSelect={handleSelectPhotos}
          onClose={() => setShowPhotoSelector(false)}
        />
      )}
    </div>
  );
}
