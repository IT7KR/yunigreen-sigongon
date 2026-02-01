"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, ArrowLeft } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { Button } from "@sigongon/ui";
import {
  CameraCapture,
  PhotoTypeSelector,
  PhotoThumbnails,
  PhotoUploader,
  OfflineBanner,
} from "@/components/camera";
import type { PhotoType } from "@/components/camera/PhotoTypeSelector";
import type { PhotoItem } from "@/components/camera/PhotoThumbnails";

interface PhotosPageProps {
  params: Promise<{ id: string }>;
}

export default function PhotosPage({ params }: PhotosPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PhotoType>("current");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<
    Array<{
      id: string;
      blob: Blob;
      type: PhotoType;
      facingMode: "user" | "environment";
    }>
  >([]);

  const handleCapture = (blob: Blob, facingMode: "user" | "environment") => {
    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add to captured photos for upload
    setCapturedPhotos((prev) => [
      ...prev,
      {
        id: photoId,
        blob,
        type: selectedType,
        facingMode,
      },
    ]);

    // Create preview URL and add to photos list
    const url = URL.createObjectURL(blob);
    const newPhoto: PhotoItem = {
      id: photoId,
      url,
      type: selectedType,
      timestamp: new Date(),
    };

    setPhotos((prev) => [...prev, newPhoto]);
    setIsCameraOpen(false);
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setCapturedPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleUploadComplete = (photoId: string, url: string) => {
    console.log(`Photo ${photoId} uploaded successfully:`, url);
    // Update photo with server URL if needed
  };

  const handleUploadError = (photoId: string, error: string) => {
    console.error(`Photo ${photoId} upload failed:`, error);
    // Show error toast or notification
  };

  const handleSubmit = () => {
    // In real implementation, this would finalize the photo submission
    console.log("Submitting photos:", photos);
    router.back();
  };

  return (
    <MobileLayout title="현장 사진 촬영" showBack>
      {/* Offline banner */}
      <OfflineBanner />

      <div className="space-y-6 p-4">
        {/* Instructions */}
        <div className="rounded-xl border-2 border-brand-point-200 bg-gradient-to-br from-brand-point-50 to-white p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="rounded-lg bg-brand-point-500 p-2">
                <Camera className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-brand-point-900">촬영 가이드</h2>
              <ul className="mt-2 space-y-1 text-sm text-brand-point-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0 text-brand-point-500">
                    •
                  </span>
                  <span>사진 유형을 선택한 후 촬영해주세요</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0 text-brand-point-500">
                    •
                  </span>
                  <span>밝은 곳에서 선명하게 촬영하세요</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0 text-brand-point-500">
                    •
                  </span>
                  <span>오프라인에서도 촬영 가능하며, 자동으로 동기화됩니다</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Photo type selector */}
        <PhotoTypeSelector
          selectedType={selectedType}
          onTypeChange={setSelectedType}
        />

        {/* Camera button */}
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={() => setIsCameraOpen(true)}
          className="h-14 text-base font-bold shadow-lg shadow-brand-point-500/20"
        >
          <Camera className="h-6 w-6" strokeWidth={2.5} />
          사진 촬영하기
        </Button>

        {/* Photo thumbnails */}
        <PhotoThumbnails photos={photos} onDelete={handleDeletePhoto} />

        {/* Upload progress */}
        {capturedPhotos.length > 0 && (
          <PhotoUploader
            photos={capturedPhotos}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        )}

        {/* Submit button */}
        {photos.length > 0 && (
          <div className="space-y-3 pt-4">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => router.back()}
                className="flex-1"
              >
                <ArrowLeft className="h-5 w-5" />
                뒤로
              </Button>

              <Button
                variant="primary"
                onClick={handleSubmit}
                className="flex-[2] shadow-lg shadow-brand-point-500/20"
              >
                <Upload className="h-5 w-5" strokeWidth={2.5} />
                완료 ({photos.length}장)
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Camera modal */}
      {isCameraOpen && (
        <CameraCapture onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />
      )}
    </MobileLayout>
  );
}
