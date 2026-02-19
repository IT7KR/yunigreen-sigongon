"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, Button, Input } from "@sigongon/ui";
import { useCreateProject } from "@/hooks";

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    client_name: "",
    client_phone: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "프로젝트명을 입력해 주세요";
    }
    if (!formData.address.trim()) {
      newErrors.address = "주소를 입력해 주세요";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const result = await createProject.mutateAsync({
        name: formData.name.trim(),
        address: formData.address.trim(),
        client_name: formData.client_name.trim() || undefined,
        client_phone: formData.client_phone.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      if (result.success && result.data) {
        router.push(`/projects/${result.data.id}`);
      }
    } catch (error) {
      console.error("프로젝트 생성 실패:", error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <MobileLayout title="새 프로젝트" showBack>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            <Input
              label="프로젝트명"
              placeholder="예: 강남역 인근 상가 누수"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              error={errors.name}
              required
            />

            <Input
              label="주소"
              placeholder="서울시 강남구 테헤란로 123"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              error={errors.address}
              required
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <h3 className="text-sm font-medium text-slate-700">
              고객 정보 (선택)
            </h3>

            <Input
              label="고객명"
              placeholder="홍길동"
              value={formData.client_name}
              onChange={(e) => handleChange("client_name", e.target.value)}
            />

            <Input
              type="tel"
              label="연락처"
              placeholder="010-1234-5678"
              value={formData.client_phone}
              onChange={(e) => handleChange("client_phone", e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              메모 (선택)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="프로젝트에 대한 메모를 남겨주세요"
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base placeholder:text-slate-400 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            />
          </CardContent>
        </Card>

        <Button
          type="submit"
          fullWidth
          loading={createProject.isPending}
          disabled={createProject.isPending}
        >
          프로젝트 만들기
        </Button>
      </form>
    </MobileLayout>
  );
}
