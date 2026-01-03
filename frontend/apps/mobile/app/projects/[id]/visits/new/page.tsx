"use client"

import { use, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Camera, X } from "lucide-react"
import { MobileLayout } from "@/components/MobileLayout"
import { Card, CardContent, Button, Input } from "@yunigreen/ui"
import { useCreateSiteVisit } from "@/hooks"
import type { VisitType, PhotoType } from "@yunigreen/types"

interface NewSiteVisitPageProps {
  params: Promise<{ id: string }>
}

const visitTypes: { value: VisitType; label: string }[] = [
  { value: "initial", label: "최초방문" },
  { value: "progress", label: "중간점검" },
  { value: "completion", label: "준공검사" },
]

const photoTypes: { value: PhotoType; label: string }[] = [
  { value: "before", label: "시공 전" },
  { value: "during", label: "시공 중" },
  { value: "after", label: "시공 후" },
  { value: "detail", label: "상세" },
]

interface PendingPhoto {
  id: string
  file: File
  preview: string
  type: PhotoType
}

export default function NewSiteVisitPage({ params }: NewSiteVisitPageProps) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [visitType, setVisitType] = useState<VisitType>("initial")
  const [visitedAt, setVisitedAt] = useState(new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [currentPhotoType, setCurrentPhotoType] = useState<PhotoType>("before")
  const [error, setError] = useState<string | null>(null)

  const createVisit = useCreateSiteVisit(projectId)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 올릴 수 있어요")
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("사진 용량이 너무 커요. 10MB 이하로 올려주세요")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        setPhotos((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).slice(2, 9),
            file,
            preview: reader.result as string,
            type: currentPhotoType,
          },
        ])
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
  }

  const handleSubmit = async () => {
    setError(null)

    try {
      const result = await createVisit.mutateAsync({
        visit_type: visitType,
        visited_at: new Date(visitedAt).toISOString(),
        notes: notes || undefined,
      })

      if (result.success && result.data) {
        // TODO: 사진 업로드 로직 추가
        router.push(`/projects/${projectId}`)
      }
    } catch (err) {
      console.error("방문 기록 생성 실패:", err)
      setError("방문 기록을 저장하지 못했어요. 다시 시도해 주세요")
    }
  }

  return (
    <MobileLayout title="현장방문 기록" showBack>
      <div className="space-y-4 p-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 방문 유형 */}
        <Card>
          <CardContent className="p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              방문 유형
            </label>
            <div className="grid grid-cols-3 gap-2">
              {visitTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setVisitType(type.value)}
                  className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                    visitType === type.value
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 방문 일시 */}
        <Card>
          <CardContent className="p-4">
            <Input
              type="datetime-local"
              label="방문 일시"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              required
            />
          </CardContent>
        </Card>

        {/* 사진 업로드 */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                현장 사진
              </label>
              <span className="text-xs text-slate-400">
                {photos.length}장 선택됨
              </span>
            </div>

            {/* 사진 타입 선택 */}
            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
              {photoTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setCurrentPhotoType(type.value)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    currentPhotoType === type.value
                      ? "bg-teal-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* 사진 그리드 */}
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square">
                  <img
                    src={photo.preview}
                    alt="미리보기"
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                    {photoTypes.find((t) => t.value === photo.type)?.label}
                  </span>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-500"
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs">추가</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <p className="mt-2 text-xs text-slate-400">
              최대 10MB, JPG/PNG 형식
            </p>
          </CardContent>
        </Card>

        {/* 메모 */}
        <Card>
          <CardContent className="p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              메모 (선택)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="현장 상황이나 특이사항을 기록해 주세요"
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
          </CardContent>
        </Card>

        <Button
          fullWidth
          onClick={handleSubmit}
          loading={createVisit.isPending}
          disabled={createVisit.isPending}
        >
          저장하기
        </Button>
      </div>
    </MobileLayout>
  )
}
