"use client";

import { use, useState, useEffect } from "react";
import { FileDown, X, ChevronLeft, ChevronRight } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { Button, PrimitiveButton, StatusBadge } from "@sigongon/ui";
import { mockApiClient } from "@/lib/mocks/mockApi";
import { buildSampleFileDownloadUrl } from "@/lib/sampleFiles";

interface AlbumDetailPageProps {
  params: Promise<{ id: string; albumId: string }>;
}

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

interface AlbumDetail {
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

export default function AlbumDetailPage({ params }: AlbumDetailPageProps) {
  const { id, albumId } = use(params);
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadAlbum = async () => {
      setIsLoading(true);
      try {
        const result = await mockApiClient.getPhotoAlbum(albumId);
        if (result.success && result.data) {
          setAlbum(result.data);
        }
      } catch (error) {
        console.error("앨범 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAlbum();
  }, [albumId]);

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const response = await mockApiClient.exportAlbumPdf(albumId);
      if (!response.success || !response.data) {
        return;
      }

      const samplePath = response.data.sample_file_path || response.data.pdf_url;
      const downloadUrl = buildSampleFileDownloadUrl(samplePath);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${album?.name || "앨범"}.pdf`;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      console.error("앨범 PDF 다운로드 실패:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  const handleNextPhoto = () => {
    if (
      selectedPhotoIndex !== null &&
      album &&
      selectedPhotoIndex < album.photos.length - 1
    ) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      handlePrevPhoto();
    } else if (e.key === "ArrowRight") {
      handleNextPhoto();
    } else if (e.key === "Escape") {
      setSelectedPhotoIndex(null);
    }
  };

  if (isLoading) {
    return (
      <MobileLayout title="앨범" showBack>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-point-500 border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  if (!album) {
    return (
      <MobileLayout title="앨범" showBack>
        <div className="flex flex-col items-center justify-center gap-4 p-4">
          <p className="text-slate-500">앨범을 찾을 수 없어요</p>
        </div>
      </MobileLayout>
    );
  }

  const gridCols = album.layout === "three_column" ? "grid-cols-3" : "grid-cols-4";

  return (
    <MobileLayout
      title={album.name}
      showBack
      rightAction={
        <StatusBadge status={album.status === "published" ? "completed" : "draft"} />
      }
    >
      <div className="space-y-4 p-4">
        {/* Album info */}
        {album.description && (
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-700">{album.description}</p>
          </div>
        )}

        {/* Download button */}
        <Button
          variant="primary"
          fullWidth
          onClick={handleDownloadPDF}
          loading={isDownloading}
          disabled={isDownloading}
          className="shadow-lg shadow-brand-point-500/20"
        >
          <FileDown className="h-5 w-5" />
          PDF 다운로드
        </Button>

        {/* Photo count */}
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>총 {album.photos.length}장</span>
          <span>{album.layout === "three_column" ? "3열" : "4열"} 레이아웃</span>
        </div>

        {/* Photo grid */}
        <div className={`grid ${gridCols} gap-1`}>
          {album.photos.map((photo, index) => (
            <PrimitiveButton
              key={photo.id}
              onClick={() => setSelectedPhotoIndex(index)}
              className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-point-500"
            >
              <img
                src={photo.storage_path}
                alt={photo.caption || `사진 ${index + 1}`}
                className="h-full w-full object-cover transition-transform hover:scale-110"
                loading="lazy"
              />
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                  <p className="text-xs text-white line-clamp-1">
                    {photo.caption}
                  </p>
                </div>
              )}
            </PrimitiveButton>
          ))}
        </div>
      </div>

      {/* Full screen photo viewer */}
      {selectedPhotoIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Header */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4">
            <div className="text-white">
              <p className="text-sm font-medium">
                {selectedPhotoIndex + 1} / {album.photos.length}
              </p>
            </div>
            <PrimitiveButton
              onClick={() => setSelectedPhotoIndex(null)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              aria-label="닫기"
            >
              <X className="h-6 w-6" />
            </PrimitiveButton>
          </div>

          {/* Photo */}
          <div className="flex h-full items-center justify-center p-4">
            <img
              src={album.photos[selectedPhotoIndex].storage_path}
              alt={
                album.photos[selectedPhotoIndex].caption ||
                `사진 ${selectedPhotoIndex + 1}`
              }
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Caption */}
          {album.photos[selectedPhotoIndex].caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-center">
              <p className="text-sm text-white">
                {album.photos[selectedPhotoIndex].caption}
              </p>
            </div>
          )}

          {/* Navigation arrows */}
          {selectedPhotoIndex > 0 && (
            <PrimitiveButton
              onClick={handlePrevPhoto}
              className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              aria-label="이전 사진"
            >
              <ChevronLeft className="h-8 w-8" />
            </PrimitiveButton>
          )}
          {selectedPhotoIndex < album.photos.length - 1 && (
            <PrimitiveButton
              onClick={handleNextPhoto}
              className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              aria-label="다음 사진"
            >
              <ChevronRight className="h-8 w-8" />
            </PrimitiveButton>
          )}

          {/* Touch swipe hint (mobile) */}
          <div className="absolute inset-x-0 bottom-20 flex justify-center md:hidden">
            <div className="rounded-full bg-black/50 px-4 py-2 text-xs text-white backdrop-blur-sm">
              좌우로 스와이프하여 이동
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
