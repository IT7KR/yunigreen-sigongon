"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckSquare, Square } from "lucide-react";
import { Button, Modal } from "@sigongon/ui";
import { mockApiClient } from "@/lib/mocks/mockApi";

interface ProjectPhoto {
  id: string;
  storage_path: string;
  caption?: string;
  taken_at?: string;
}

interface PhotoSelectorProps {
  projectId: string;
  existingPhotoIds: string[];
  onSelect: (photoIds: string[]) => void;
  onClose: () => void;
}

export function PhotoSelector({
  projectId,
  existingPhotoIds,
  onSelect,
  onClose,
}: PhotoSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<{
    before: ProjectPhoto[];
    during: ProjectPhoto[];
    after: ProjectPhoto[];
  }>({ before: [], during: [], after: [] });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPhotos();
  }, [projectId]);

  async function loadPhotos() {
    try {
      setLoading(true);
      const response = await mockApiClient.getProjectPhotoAlbum(projectId);
      if (response.success && response.data) {
        setPhotos(response.data.photos);
      }
    } catch (err) {
      console.error(err);
      // Mock fallback data
      setPhotos({
        before: Array.from({ length: 5 }, (_, i) => ({
          id: `before_${i}`,
          storage_path: `mock://photo/before_${i}`,
          caption: `시공 전 사진 ${i + 1}`,
        })),
        during: Array.from({ length: 8 }, (_, i) => ({
          id: `during_${i}`,
          storage_path: `mock://photo/during_${i}`,
          caption: `시공 중 사진 ${i + 1}`,
        })),
        after: Array.from({ length: 6 }, (_, i) => ({
          id: `after_${i}`,
          storage_path: `mock://photo/after_${i}`,
          caption: `시공 후 사진 ${i + 1}`,
        })),
      });
    } finally {
      setLoading(false);
    }
  }

  function togglePhoto(photoId: string) {
    if (existingPhotoIds.includes(photoId)) return; // Already in album

    const newSelected = new Set(selectedIds);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedIds(newSelected);
  }

  function handleSubmit() {
    onSelect(Array.from(selectedIds));
  }

  const photoTypeLabels: Record<string, string> = {
    before: "시공 전",
    during: "시공 중",
    after: "시공 후",
  };

  function renderPhotoGroup(
    title: string,
    photoList: ProjectPhoto[],
    photoType: keyof typeof photoTypeLabels
  ) {
    if (photoList.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <div className="grid grid-cols-4 gap-3">
          {photoList.map((photo) => {
            const isExisting = existingPhotoIds.includes(photo.id);
            const isSelected = selectedIds.has(photo.id);
            const isDisabled = isExisting;

            return (
              <button
                key={photo.id}
                onClick={() => togglePhoto(photo.id)}
                disabled={isDisabled}
                className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                  isDisabled
                    ? "cursor-not-allowed border-slate-200 opacity-50"
                    : isSelected
                      ? "border-teal-500 ring-2 ring-teal-200"
                      : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Mock image placeholder */}
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                  <span className="text-xs text-slate-400">
                    {photo.caption || photoTypeLabels[photoType]}
                  </span>
                </div>

                {/* Selection indicator */}
                <div className="absolute right-2 top-2">
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5 text-teal-500" />
                  ) : isDisabled ? (
                    <div className="rounded bg-white/80 px-1.5 py-0.5 text-xs text-slate-500">
                      추가됨
                    </div>
                  ) : (
                    <Square className="h-5 w-5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="사진 선택" size="xl">
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="max-h-[60vh] space-y-6 overflow-y-auto">
            {renderPhotoGroup("시공 전", photos.before, "before")}
            {renderPhotoGroup("시공 중", photos.during, "during")}
            {renderPhotoGroup("시공 후", photos.after, "after")}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600">
              {selectedIds.size}장 선택됨
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose}>
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={selectedIds.size === 0}
              >
                추가
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
