"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@sigongon/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { PROJECT_CATEGORIES } from "@sigongon/types";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhoneFormat = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "프로젝트명을 입력하세요";
    }

    if (!address.trim()) {
      newErrors.address = "주소를 입력하세요";
    }

    if (!category) {
      newErrors.category = "공사 분류를 선택하세요";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createProject({
        name: name.trim(),
        address: address.trim(),
        category,
        client_name: clientName.trim() || undefined,
        client_phone: clientPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success && res.data) {
        router.push(`/projects/${res.data.id}`);
      }
    } catch {
      setErrors({ submit: "프로젝트 생성에 실패했습니다" });
    }
    setIsSubmitting(false);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">새 프로젝트 만들기</h1>
        <p className="mt-1 text-slate-600">
          프로젝트가 생성되면 견적→계약→준공까지 한 화면에서 관리됩니다.
        </p>
      </div>

      <Card className="max-w-2xl p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <Input
              label="프로젝트명 (필수)"
              placeholder="예: 강남구 역삼동 인테리어 공사"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
          </div>

          <div>
            <Input
              label="주소 (필수)"
              placeholder="주소를 입력하세요"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={errors.address}
            />
          </div>

          {/* 공사 분류 필드 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              공사 분류 (필수)
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setErrors({ ...errors, category: "" });
              }}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-point-500 ${
                errors.category
                  ? "border-red-300 focus:border-red-500"
                  : "border-slate-300 focus:border-brand-point-500"
              }`}
            >
              <option value="">분류 선택</option>
              {PROJECT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="고객명 (선택)"
              placeholder="홍길동"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <Input
              label="고객 연락처 (선택)"
              placeholder="010-0000-0000"
              value={clientPhone}
              onChange={(e) => setClientPhone(handlePhoneFormat(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">메모</label>
            <textarea
              className="w-full rounded-md border border-slate-300 p-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
              rows={4}
              placeholder="프로젝트 관련 특이사항을 입력하세요"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {errors.submit && (
            <p className="text-sm text-red-600">{errors.submit}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Link href="/projects">
              <Button variant="ghost" type="button">취소</Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "프로젝트 만들기"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </AdminLayout>
  );
}
