"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { api } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, toast } from "@sigongon/ui";

interface StartReportFormData {
  construction_name: string;
  site_address: string;
  start_date: string;
  expected_end_date: string;
  supervisor_name: string;
  supervisor_phone: string;
  notes: string;
}

const emptyForm: StartReportFormData = {
  construction_name: "",
  site_address: "",
  start_date: "",
  expected_end_date: "",
  supervisor_name: "",
  supervisor_phone: "",
  notes: "",
};

export default function MobileStartReportCreatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");

  const [loading, setLoading] = useState(Boolean(reportId));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    "draft" | "submitted" | "approved" | "rejected" | null
  >(null);
  const [form, setForm] = useState<StartReportFormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof StartReportFormData, string>>>({});

  useEffect(() => {
    if (!reportId) {
      return;
    }

    let ignore = false;
    const loadReport = async () => {
      try {
        setLoading(true);
        const response = await api.getConstructionReport(reportId);
        if (!response.success || !response.data) {
          toast.error("착공계를 불러오지 못했어요.");
          return;
        }
        if (ignore) {
          return;
        }

        const data = response.data;
        setReportStatus(data.status);
        setForm({
          construction_name: data.construction_name || "",
          site_address: data.site_address || "",
          start_date: data.start_date || "",
          expected_end_date: data.expected_end_date || "",
          supervisor_name: data.supervisor_name || "",
          supervisor_phone: data.supervisor_phone || "",
          notes: data.notes || "",
        });
      } catch (error) {
        console.error("Failed to load start report:", error);
        toast.error("착공계를 불러오지 못했어요.");
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadReport();
    return () => {
      ignore = true;
    };
  }, [reportId]);

  const isReadOnly = useMemo(
    () => reportStatus === "submitted" || reportStatus === "approved",
    [reportStatus],
  );

  const handleChange = (field: keyof StartReportFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof StartReportFormData, string>> = {};
    if (!form.construction_name.trim()) nextErrors.construction_name = "공사명을 입력해 주세요.";
    if (!form.site_address.trim()) nextErrors.site_address = "현장 주소를 입력해 주세요.";
    if (!form.start_date) nextErrors.start_date = "착공일을 입력해 주세요.";
    if (!form.expected_end_date) nextErrors.expected_end_date = "준공예정일을 입력해 주세요.";
    if (!form.supervisor_name.trim()) nextErrors.supervisor_name = "현장 책임자를 입력해 주세요.";
    if (!form.supervisor_phone.trim()) nextErrors.supervisor_phone = "책임자 연락처를 입력해 주세요.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    construction_name: form.construction_name.trim(),
    site_address: form.site_address.trim(),
    start_date: form.start_date,
    expected_end_date: form.expected_end_date,
    supervisor_name: form.supervisor_name.trim(),
    supervisor_phone: form.supervisor_phone.trim(),
    notes: form.notes.trim() || undefined,
    auto_link_representative_docs: true,
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = buildPayload();
      if (reportId) {
        const updateResponse = await api.updateConstructionReport(reportId, payload);
        if (!updateResponse.success) {
          throw new Error(updateResponse.error?.message || "failed to update");
        }
      } else {
        const createResponse = await api.createStartReport(projectId, payload);
        if (!createResponse.success) {
          throw new Error(createResponse.error?.message || "failed to create");
        }
      }
      toast.success("착공계를 저장했어요.");
      router.push(`/projects/${projectId}/reports`);
    } catch (error) {
      console.error("Failed to save start report:", error);
      toast.error("착공계 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = buildPayload();
      let targetReportId = reportId;

      if (targetReportId) {
        const updateResponse = await api.updateConstructionReport(targetReportId, payload);
        if (!updateResponse.success) {
          throw new Error(updateResponse.error?.message || "failed to update");
        }
      } else {
        const createResponse = await api.createStartReport(projectId, payload);
        if (!createResponse.success || !createResponse.data) {
          throw new Error(createResponse.error?.message || "failed to create");
        }
        targetReportId = String(createResponse.data.id);
      }

      const submitResponse = await api.submitConstructionReport(targetReportId);
      if (!submitResponse.success) {
        throw new Error(submitResponse.error?.message || "failed to submit");
      }
      toast.success("착공계를 제출했어요.");
      router.push(`/projects/${projectId}/reports`);
    } catch (error) {
      console.error("Failed to submit start report:", error);
      toast.error("착공계 제출에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileLayout title={reportId ? "착공계 상세" : "착공계 작성"} showBack>
      <div className="space-y-4 p-4">
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/projects/${projectId}/reports`}>
            <ArrowLeft className="h-4 w-4" />
            목록으로
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>착공계</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex h-24 items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-point-500 border-t-transparent" />
              </div>
            ) : (
              <>
                {isReadOnly && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                    제출 또는 승인 상태의 착공계는 수정할 수 없습니다.
                  </div>
                )}

                <Input
                  label="공사명"
                  value={form.construction_name}
                  onChange={(event) => handleChange("construction_name", event.target.value)}
                  error={errors.construction_name}
                  required
                  disabled={isReadOnly}
                />
                <Input
                  label="현장 주소"
                  value={form.site_address}
                  onChange={(event) => handleChange("site_address", event.target.value)}
                  error={errors.site_address}
                  required
                  disabled={isReadOnly}
                />
                <Input
                  label="착공일"
                  type="date"
                  value={form.start_date}
                  onChange={(event) => handleChange("start_date", event.target.value)}
                  error={errors.start_date}
                  required
                  disabled={isReadOnly}
                />
                <Input
                  label="준공예정일"
                  type="date"
                  value={form.expected_end_date}
                  onChange={(event) => handleChange("expected_end_date", event.target.value)}
                  error={errors.expected_end_date}
                  required
                  disabled={isReadOnly}
                />
                <Input
                  label="현장 책임자"
                  value={form.supervisor_name}
                  onChange={(event) => handleChange("supervisor_name", event.target.value)}
                  error={errors.supervisor_name}
                  required
                  disabled={isReadOnly}
                />
                <Input
                  label="책임자 연락처"
                  type="tel"
                  value={form.supervisor_phone}
                  onChange={(event) => handleChange("supervisor_phone", event.target.value)}
                  error={errors.supervisor_phone}
                  placeholder="010-0000-0000"
                  required
                  disabled={isReadOnly}
                />
                <Textarea
                  label="비고"
                  value={form.notes}
                  onChange={(event) => handleChange("notes", event.target.value)}
                  rows={4}
                  placeholder="현장 메모를 입력해 주세요."
                  disabled={isReadOnly}
                />

                {!isReadOnly && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleSave}
                      disabled={saving || submitting}
                    >
                      {saving ? "저장 중..." : "임시저장"}
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving || submitting}>
                      {submitting ? "제출 중..." : "제출"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
