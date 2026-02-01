"use client";

import { useState } from "react";
import { Input, Button } from "@sigongon/ui";
import { Loader2 } from "lucide-react";

type ReportType = "start" | "completion";

interface ConstructionReportFormProps {
  reportType: ReportType;
  initialData?: {
    construction_name?: string;
    site_address?: string;
    start_date?: string;
    expected_end_date?: string;
    actual_end_date?: string;
    supervisor_name?: string;
    supervisor_phone?: string;
    final_amount?: string;
    defect_warranty_period?: string;
    notes?: string;
  };
  onSubmit: (data: any, isDraft: boolean) => Promise<void>;
  onSave?: (data: any) => Promise<void>;
}

export function ConstructionReportForm({
  reportType,
  initialData = {},
  onSubmit,
  onSave,
}: ConstructionReportFormProps) {
  const [formData, setFormData] = useState({
    construction_name: initialData.construction_name || "",
    site_address: initialData.site_address || "",
    start_date: initialData.start_date || "",
    expected_end_date: initialData.expected_end_date || "",
    actual_end_date: initialData.actual_end_date || "",
    supervisor_name: initialData.supervisor_name || "",
    supervisor_phone: initialData.supervisor_phone || "",
    final_amount: initialData.final_amount || "",
    defect_warranty_period: initialData.defect_warranty_period || "",
    notes: initialData.notes || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (reportType === "start") {
      if (!formData.construction_name)
        newErrors.construction_name = "공사명을 입력해 주세요";
      if (!formData.site_address)
        newErrors.site_address = "공사 장소를 입력해 주세요";
      if (!formData.start_date)
        newErrors.start_date = "착공일을 입력해 주세요";
      if (!formData.expected_end_date)
        newErrors.expected_end_date = "준공예정일을 입력해 주세요";
      if (!formData.supervisor_name)
        newErrors.supervisor_name = "감독자명을 입력해 주세요";
      if (!formData.supervisor_phone)
        newErrors.supervisor_phone = "감독자 연락처를 입력해 주세요";
    }

    if (reportType === "completion") {
      if (!formData.actual_end_date)
        newErrors.actual_end_date = "준공일을 입력해 주세요";
      if (!formData.final_amount)
        newErrors.final_amount = "최종 금액을 입력해 주세요";
      if (!formData.defect_warranty_period)
        newErrors.defect_warranty_period = "하자보증기간을 입력해 주세요";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft && !validateForm()) {
      return;
    }

    try {
      if (isDraft) {
        setSaving(true);
      } else {
        setSubmitting(true);
      }
      await onSubmit(formData, isDraft);
    } finally {
      if (isDraft) {
        setSaving(false);
      } else {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {reportType === "start" ? (
          <>
            <Input
              label="공사명"
              name="construction_name"
              value={formData.construction_name}
              onChange={handleChange}
              error={errors.construction_name}
              required
            />
            <Input
              label="공사 장소"
              name="site_address"
              value={formData.site_address}
              onChange={handleChange}
              error={errors.site_address}
              required
            />
            <Input
              label="착공일"
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleChange}
              error={errors.start_date}
              required
            />
            <Input
              label="준공예정일"
              name="expected_end_date"
              type="date"
              value={formData.expected_end_date}
              onChange={handleChange}
              error={errors.expected_end_date}
              required
            />
            <Input
              label="감독자명"
              name="supervisor_name"
              value={formData.supervisor_name}
              onChange={handleChange}
              error={errors.supervisor_name}
              required
            />
            <Input
              label="감독자 연락처"
              name="supervisor_phone"
              type="tel"
              value={formData.supervisor_phone}
              onChange={handleChange}
              error={errors.supervisor_phone}
              placeholder="010-0000-0000"
              required
            />
          </>
        ) : (
          <>
            <div className="md:col-span-2">
              <Input
                label="공사명"
                value={formData.construction_name}
                disabled
              />
            </div>
            <Input
              label="공사 장소"
              value={formData.site_address}
              disabled
            />
            <Input
              label="착공일"
              type="date"
              value={formData.start_date}
              disabled
            />
            <Input
              label="준공예정일"
              type="date"
              value={formData.expected_end_date}
              disabled
            />
            <Input
              label="실제 준공일"
              name="actual_end_date"
              type="date"
              value={formData.actual_end_date}
              onChange={handleChange}
              error={errors.actual_end_date}
              required
            />
            <Input
              label="최종 금액 (원)"
              name="final_amount"
              type="number"
              value={formData.final_amount}
              onChange={handleChange}
              error={errors.final_amount}
              placeholder="0"
              required
            />
            <Input
              label="하자보증기간 (개월)"
              name="defect_warranty_period"
              type="number"
              value={formData.defect_warranty_period}
              onChange={handleChange}
              error={errors.defect_warranty_period}
              placeholder="12"
              required
            />
            <Input
              label="감독자명"
              value={formData.supervisor_name}
              disabled
            />
            <Input
              label="감독자 연락처"
              value={formData.supervisor_phone}
              disabled
            />
          </>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          비고
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={4}
          className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-brand-point-500 focus:ring-brand-point-200"
          placeholder="추가 메모를 입력해 주세요"
        />
      </div>

      <div className="flex justify-end gap-3">
        {onSave && (
          <Button
            variant="secondary"
            onClick={() => handleSubmit(true)}
            disabled={saving || submitting}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
        )}
        <Button
          onClick={() => handleSubmit(false)}
          disabled={saving || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              제출 중...
            </>
          ) : (
            "제출"
          )}
        </Button>
      </div>
    </div>
  );
}
