"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Camera, 
  ImageIcon,
  Upload,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Download
} from "lucide-react"
import { MobileLayout } from "@/components/MobileLayout"
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  Button, 
  Badge,
  formatDate
} from "@yunigreen/ui"
import { useProjectPhotoAlbum, useProject } from "@/hooks"
import type { PhotoType } from "@yunigreen/types"

interface PhotosPageProps {
  params: Promise<{ id: string }>
}

const photoTypeConfig: Record<PhotoType, { label: string; color: string }> = {
  before: { label: "공사 전", color: "bg-blue-500" },
  during: { label: "공사 중", color: "bg-amber-500" },
  after: { label: "공사 후", color: "bg-green-500" },
  detail: { label: "상세", color: "bg-slate-500" },
}

type TabType = "before" | "during" | "after"

export default function PhotosPage({ params }: PhotosPageProps) {
  const { id: projectId } = use(params)
  const router = useRouter()
  
  const { data: projectData } = useProject(projectId)
  const { data: albumData, isLoading } = useProjectPhotoAlbum(projectId)

  const [activeTab, setActiveTab] = useState<TabType>("before")
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  const project = projectData?.data
  const album = albumData?.data
  const photos = album?.photos[activeTab] || []

  const tabs: { key: TabType; label: string }[] = [
    { key: "before", label: "공사 전" },
    { key: "during", label: "공사 중" },
    { key: "after", label: "공사 후" },
  ]

  if (isLoading) {
    return (
      <MobileLayout title="준공 사진첩" showBack>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="준공 사진첩" showBack>
      <div className="flex flex-col">
        <div className="border-b bg-white">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-b-2 border-teal-500 text-teal-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {album?.photos[tab.key] && (
                  <span className="ml-1 text-xs">
                    ({album.photos[tab.key].length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {photos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <Camera className="h-12 w-12 text-slate-300" />
                <div className="text-center">
                  <p className="font-medium text-slate-900">
                    {activeTab === "before" && "공사 전 사진이 없어요"}
                    {activeTab === "during" && "공사 중 사진이 없어요"}
                    {activeTab === "after" && "공사 후 사진이 없어요"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    현장방문에서 사진을 업로드해 주세요
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  className="aspect-square overflow-hidden rounded-lg bg-slate-100"
                  onClick={() => setSelectedPhoto(photo.storage_path)}
                >
                  <div className="flex h-full items-center justify-center bg-slate-200">
                    <ImageIcon className="h-8 w-8 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {album && (
            <div className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">사진 비교</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="mb-2 text-center text-xs text-slate-500">공사 전</p>
                      <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                        {album.photos.before[0] ? (
                          <div className="flex h-full items-center justify-center bg-blue-50">
                            <ImageIcon className="h-8 w-8 text-blue-300" />
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <p className="text-xs text-slate-400">사진 없음</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-center text-xs text-slate-500">공사 후</p>
                      <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                        {album.photos.after[0] ? (
                          <div className="flex h-full items-center justify-center bg-green-50">
                            <ImageIcon className="h-8 w-8 text-green-300" />
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <p className="text-xs text-slate-400">사진 없음</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button variant="secondary" fullWidth>
                <Download className="mr-2 h-4 w-4" />
                사진첩 내보내기
              </Button>
            </div>
          )}
        </div>
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="flex h-full w-full items-center justify-center p-4">
            <div className="aspect-square w-full max-w-md rounded-lg bg-slate-800">
              <div className="flex h-full items-center justify-center">
                <ImageIcon className="h-16 w-16 text-slate-600" />
              </div>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  )
}
