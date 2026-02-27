"use client";

import { useState, useEffect } from "react";
import { Button, Calendar, PrimitiveButton, PrimitiveInput, Textarea } from "@sigongon/ui";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";

interface TaxInvoiceFormData {
  buyer_corp_num: string;
  buyer_name: string;
  buyer_ceo: string;
  buyer_address: string;
  buyer_email: string;
  supply_amount: number;
  tax_amount: number;
  description: string;
  remark?: string;
  issue_date: string;
}

interface TaxInvoiceFormProps {
  initialData?: Partial<TaxInvoiceFormData>;
  onSave?: (data: TaxInvoiceFormData) => Promise<void>;
  onIssue?: (data: TaxInvoiceFormData) => Promise<void>;
  mode: "create" | "edit";
  loading?: boolean;
}

// 사업자등록번호 유효성 검사
const validateBusinessNumber = (value: string): boolean => {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (cleaned.length !== 10) return false;

  const checksum = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * checksum[i];
  }
  sum += Math.floor((parseInt(cleaned[8]) * 5) / 10);
  const remainder = (10 - (sum % 10)) % 10;

  return remainder === parseInt(cleaned[9]);
};

// 사업자등록번호 포맷팅 (123-45-67890)
const formatBusinessNumber = (value: string): string => {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
};

export function TaxInvoiceForm({
  initialData,
  onSave,
  onIssue,
  mode,
  loading = false,
}: TaxInvoiceFormProps) {
  const [formData, setFormData] = useState<TaxInvoiceFormData>({
    buyer_corp_num: initialData?.buyer_corp_num || "",
    buyer_name: initialData?.buyer_name || "",
    buyer_ceo: initialData?.buyer_ceo || "",
    buyer_address: initialData?.buyer_address || "",
    buyer_email: initialData?.buyer_email || "",
    supply_amount: initialData?.supply_amount || 0,
    tax_amount: initialData?.tax_amount || 0,
    description: initialData?.description || "",
    remark: initialData?.remark || "",
    issue_date: initialData?.issue_date || new Date().toISOString().split("T")[0],
  });

  const [showCalendar, setShowCalendar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // VAT 자동 계산
  useEffect(() => {
    const vatAmount = Math.round(formData.supply_amount * 0.1);
    setFormData((prev) => ({ ...prev, tax_amount: vatAmount }));
  }, [formData.supply_amount]);

  const handleChange = (field: keyof TaxInvoiceFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleBusinessNumberChange = (value: string) => {
    const formatted = formatBusinessNumber(value);
    handleChange("buyer_corp_num", formatted);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.buyer_corp_num) {
      newErrors.buyer_corp_num = "사업자등록번호를 입력해주세요";
    } else if (!validateBusinessNumber(formData.buyer_corp_num)) {
      newErrors.buyer_corp_num = "올바른 사업자등록번호를 입력해주세요";
    }

    if (!formData.buyer_name.trim()) {
      newErrors.buyer_name = "상호를 입력해주세요";
    }

    if (!formData.buyer_ceo.trim()) {
      newErrors.buyer_ceo = "대표자명을 입력해주세요";
    }

    if (!formData.buyer_address.trim()) {
      newErrors.buyer_address = "주소를 입력해주세요";
    }

    if (!formData.buyer_email.trim()) {
      newErrors.buyer_email = "이메일을 입력해주세요";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.buyer_email)) {
      newErrors.buyer_email = "올바른 이메일 형식이 아닙니다";
    }

    if (formData.supply_amount <= 0) {
      newErrors.supply_amount = "공급가액을 입력해주세요";
    }

    if (!formData.description.trim()) {
      newErrors.description = "품목을 입력해주세요";
    }

    if (!formData.issue_date) {
      newErrors.issue_date = "발행일을 선택해주세요";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (action: "save" | "issue") => {
    if (!validate()) return;

    if (action === "save" && onSave) {
      await onSave(formData);
    } else if (action === "issue" && onIssue) {
      await onIssue(formData);
    }
  };

  const totalAmount = formData.supply_amount + formData.tax_amount;

  return (
    <form className="space-y-6">
      {/* 공급자 정보 (자동 입력) */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-700">
          공급자 정보 (자동 입력)
        </h3>
        <div className="space-y-3 rounded-lg bg-slate-50 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">사업자등록번호</label>
              <p className="text-sm text-slate-700">123-45-67890</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">상호</label>
              <p className="text-sm text-slate-700">유니그린개발</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">대표자</label>
              <p className="text-sm text-slate-700">이중호</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">이메일</label>
              <p className="text-sm text-slate-700">ceo@yunigreen.com</p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">주소</label>
            <p className="text-sm text-slate-700">서울특별시 강남구 테헤란로 123</p>
          </div>
        </div>
      </div>

      {/* 공급받는자 정보 */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-700">
          공급받는자 정보 *
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              사업자등록번호 *
            </label>
            <PrimitiveInput
              type="text"
              value={formData.buyer_corp_num}
              onChange={(e) => handleBusinessNumberChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              placeholder="123-45-67890"
              maxLength={12}
            />
            {errors.buyer_corp_num && (
              <p className="mt-1 text-xs text-red-500">{errors.buyer_corp_num}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                상호 *
              </label>
              <PrimitiveInput
                type="text"
                value={formData.buyer_name}
                onChange={(e) => handleChange("buyer_name", e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                placeholder="회사명"
              />
              {errors.buyer_name && (
                <p className="mt-1 text-xs text-red-500">{errors.buyer_name}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                대표자명 *
              </label>
              <PrimitiveInput
                type="text"
                value={formData.buyer_ceo}
                onChange={(e) => handleChange("buyer_ceo", e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                placeholder="대표자명"
              />
              {errors.buyer_ceo && (
                <p className="mt-1 text-xs text-red-500">{errors.buyer_ceo}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              주소 *
            </label>
            <PrimitiveInput
              type="text"
              value={formData.buyer_address}
              onChange={(e) => handleChange("buyer_address", e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              placeholder="사업장 주소"
            />
            {errors.buyer_address && (
              <p className="mt-1 text-xs text-red-500">{errors.buyer_address}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              이메일 *
            </label>
            <PrimitiveInput
              type="email"
              value={formData.buyer_email}
              onChange={(e) => handleChange("buyer_email", e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              placeholder="email@example.com"
            />
            {errors.buyer_email && (
              <p className="mt-1 text-xs text-red-500">{errors.buyer_email}</p>
            )}
          </div>
        </div>
      </div>

      {/* 금액 정보 */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-700">금액 정보 *</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              공급가액 *
            </label>
            <PrimitiveInput
              type="number"
              value={formData.supply_amount || ""}
              onChange={(e) => handleChange("supply_amount", Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              placeholder="0"
              min="0"
            />
            {errors.supply_amount && (
              <p className="mt-1 text-xs text-red-500">{errors.supply_amount}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              세액 (자동 계산)
            </label>
            <PrimitiveInput
              type="number"
              value={formData.tax_amount}
              readOnly
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-600"
            />
          </div>

          <div className="rounded-lg bg-brand-point-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-point-700">
                합계 금액
              </span>
              <span className="text-xl font-bold text-brand-point-700">
                {totalAmount.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 품목 및 비고 */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-700">품목 및 비고</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              품목 *
            </label>
            <PrimitiveInput
              type="text"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              placeholder="예: 리모델링 공사"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          <Textarea
            label="비고"
            value={formData.remark}
            onChange={(e) => handleChange("remark", e.target.value)}
            rows={3}
            placeholder="추가 메모"
          />
        </div>
      </div>

      {/* 발행일 */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-700">발행일 *</h3>
        <div className="relative">
          <PrimitiveButton
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 px-3 text-sm hover:border-brand-point-500"
          >
            <span className={formData.issue_date ? "text-slate-900" : "text-slate-400"}>
              {formData.issue_date || "날짜 선택"}
            </span>
            <CalendarIcon className="h-4 w-4 text-slate-400" />
          </PrimitiveButton>
          {showCalendar && (
            <div className="absolute top-12 z-10">
              <Calendar
                value={formData.issue_date ? new Date(formData.issue_date) : undefined}
                onChange={(date) => {
                  handleChange("issue_date", date.toISOString().split("T")[0]);
                  setShowCalendar(false);
                }}
              />
            </div>
          )}
          {errors.issue_date && (
            <p className="mt-1 text-xs text-red-500">{errors.issue_date}</p>
          )}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 pt-4">
        {mode === "create" && onSave && (
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => handleSubmit("save")}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
          </Button>
        )}
        {(mode === "create" ? onIssue : onSave) && (
          <Button
            type="button"
            className="flex-1"
            onClick={() => handleSubmit(mode === "create" ? "issue" : "save")}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "create" ? (
              "발행"
            ) : (
              "저장"
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
