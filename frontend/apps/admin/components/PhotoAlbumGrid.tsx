"use client";

import { useState } from "react";
import { GripVertical, X } from "lucide-react";

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

interface PhotoAlbumGridProps {
  photos: AlbumPhoto[];
  columns: 3 | 4;
  onReorder?: (photos: AlbumPhoto[]) => void;
  onRemove?: (photoId: string) => void;
}

export function PhotoAlbumGrid({
  photos,
  columns,
  onReorder,
  onRemove,
}: PhotoAlbumGridProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const gridCols = columns === 3 ? "grid-cols-3" : "grid-cols-4";

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragEnter(index: number) {
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  }

  function handleDragEnd() {
    if (draggedIndex === null || dragOverIndex === null) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...photos];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(dragOverIndex, 0, removed);

    onReorder?.(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  const photoTypeLabels = {
    before: "시공 전",
    during: "시공 중",
    after: "시공 후",
    detail: "상세",
  };

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          draggable={!!onReorder}
          onDragStart={() => handleDragStart(index)}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-slate-100 transition-all ${
            draggedIndex === index
              ? "scale-95 opacity-50"
              : dragOverIndex === index
                ? "border-teal-500"
                : "border-slate-200"
          } ${onReorder ? "cursor-move" : ""}`}
        >
          {/* Mock image placeholder */}
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <span className="text-sm text-slate-400">
              {photoTypeLabels[photo.photo_type]}
            </span>
          </div>

          {/* Caption overlay */}
          {(photo.caption || photo.caption_override) && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2 text-xs text-white">
              {photo.caption_override || photo.caption}
            </div>
          )}

          {/* Drag handle */}
          {onReorder && (
            <div className="absolute left-2 top-2 rounded bg-white/80 p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              <GripVertical className="h-4 w-4 text-slate-600" />
            </div>
          )}

          {/* Remove button */}
          {onRemove && (
            <button
              onClick={() => onRemove(photo.id)}
              className="absolute right-2 top-2 rounded bg-white/80 p-1 opacity-0 shadow-sm transition-opacity hover:bg-red-50 group-hover:opacity-100"
              title="제거"
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
