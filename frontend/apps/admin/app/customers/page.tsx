"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  PrimitiveInput,
  Select,
  toast,
  useConfirmDialog,
} from "@sigongon/ui";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { api } from "@/lib/api";
import type { CustomerKind } from "@sigongon/types";

type Customer = {
  id: string;
  name: string;
  customer_kind: CustomerKind;
  representative_name: string;
  representative_phone: string;
  business_number: string;
  contact_name: string;
  contact_phone: string;
  license_type: string;
  is_women_owned: boolean;
  phone?: string;
  is_active: boolean;
};

type CustomerForm = {
  name: string;
  customer_kind: CustomerKind;
  representative_name: string;
  representative_phone: string;
  business_number: string;
  contact_name: string;
  contact_phone: string;
  license_type: string;
  is_women_owned: boolean;
};

const EMPTY_FORM: CustomerForm = {
  name: "",
  customer_kind: "company",
  representative_name: "",
  representative_phone: "",
  business_number: "",
  contact_name: "",
  contact_phone: "",
  license_type: "",
  is_women_owned: false,
};

const normalizeCustomer = (customer: any): Customer => {
  const representativeName =
    customer.representative_name || customer.name || "";
  const representativePhone =
    customer.representative_phone || customer.phone || "";
  const contactPhone = customer.contact_phone || "";
  const legacyWomenOwned =
    typeof customer.is_female_owned === "boolean"
      ? customer.is_female_owned
      : false;

  return {
    id: String(customer.id),
    name: customer.name || "",
    customer_kind:
      customer.customer_kind === "individual" ? "individual" : "company",
    representative_name: representativeName,
    representative_phone: representativePhone,
    business_number: customer.business_number || "",
    contact_name: customer.contact_name || "",
    contact_phone: contactPhone,
    license_type: customer.license_type || "",
    is_women_owned:
      typeof customer.is_women_owned === "boolean"
        ? customer.is_women_owned
        : legacyWomenOwned,
    phone: customer.phone || representativePhone || contactPhone || undefined,
    is_active: customer.is_active !== false,
  };
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { confirm } = useConfirmDialog();

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  const formatBizNo = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await api.getCustomers({
        per_page: 200,
        include_inactive: true,
      });
      if (response.success && response.data) {
        const normalized = response.data.map(normalizeCustomer);
        setCustomers(normalized);
        setFilteredCustomers(normalized);
      }
    } catch (error) {
      console.error("발주처 목록 조회 실패:", error);
      toast.error("발주처 목록을 불러오지 못했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(term) ||
        customer.representative_name.toLowerCase().includes(term) ||
        customer.representative_phone.includes(term) ||
        customer.contact_name.toLowerCase().includes(term) ||
        customer.contact_phone.includes(term) ||
        customer.business_number.includes(term)
      );
    });
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setSaveSuccess(false);
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      customer_kind: customer.customer_kind,
      representative_name: customer.representative_name,
      representative_phone: customer.representative_phone,
      business_number: customer.business_number,
      contact_name: customer.contact_name,
      contact_phone: customer.contact_phone,
      license_type: customer.license_type,
      is_women_owned: customer.is_women_owned,
    });
    setFormErrors({});
    setSaveSuccess(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setSaveSuccess(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = "발주처명은 필수입니다";
    }
    if (
      formData.customer_kind === "company" &&
      !formData.representative_name.trim()
    ) {
      errors.representative_name = "대표자명을 입력해 주세요";
    }
    if (
      formData.customer_kind === "company" &&
      !formData.representative_phone.trim()
    ) {
      errors.representative_phone = "대표자 연락처를 입력해 주세요";
    }

    const bizNoRegex = /^\d{3}-\d{2}-\d{5}$/;
    if (
      formData.business_number &&
      !bizNoRegex.test(formData.business_number)
    ) {
      errors.business_number = "사업자번호 형식은 XXX-XX-XXXXX 입니다";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      customer_kind: formData.customer_kind,
      representative_name: formData.representative_name.trim() || undefined,
      representative_phone: formData.representative_phone.trim() || undefined,
      business_number: formData.business_number.trim() || undefined,
      contact_name: formData.contact_name.trim() || undefined,
      contact_phone: formData.contact_phone.trim() || undefined,
      license_type: formData.license_type.trim() || undefined,
      is_women_owned: formData.is_women_owned,
      phone:
        formData.representative_phone.trim() ||
        formData.contact_phone.trim() ||
        undefined,
    };

    try {
      setIsSaving(true);
      setFormErrors({});
      if (editingCustomer) {
        const response = await api.updateCustomer(editingCustomer.id, payload);
        if (!response.success) {
          setFormErrors({ submit: "수정에 실패했습니다" });
          return;
        }
      } else {
        const response = await api.createCustomer(payload);
        if (!response.success) {
          setFormErrors({ submit: "등록에 실패했습니다" });
          return;
        }
      }

      setSaveSuccess(true);
      await fetchCustomers();
      setTimeout(closeModal, 1000);
    } catch (error) {
      console.error("발주처 저장 실패:", error);
      setFormErrors({ submit: "저장 중 오류가 발생했습니다" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (customer: Customer) => {
    const nextActive = !customer.is_active;
    const actionLabel = nextActive ? "활성화" : "비활성화";
    const confirmed = await confirm({
      title: `${customer.name}을(를) ${actionLabel}하시겠습니까?`,
      confirmLabel: actionLabel,
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const response = await api.updateCustomer(customer.id, {
        is_active: nextActive,
      });
      if (!response.success) {
        toast.error("상태 변경에 실패했습니다");
        return;
      }
      await fetchCustomers();
      toast.success(`발주처를 ${actionLabel}했습니다`);
    } catch (error) {
      console.error("발주처 상태 변경 실패:", error);
      toast.error("상태 변경 중 오류가 발생했습니다");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">발주처 관리</h1>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            발주처 등록
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <PrimitiveInput
            type="text"
            placeholder="발주처명, 대표자, 연락처, 사업자번호 검색"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-brand-point-500"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                  <th className="px-6 py-3 font-medium">발주처명</th>
                  <th className="px-6 py-3 font-medium">구분</th>
                  <th className="px-6 py-3 font-medium">대표자</th>
                  <th className="px-6 py-3 font-medium">실무자</th>
                  <th className="px-6 py-3 font-medium">사업자번호</th>
                  <th className="px-6 py-3 font-medium">면허</th>
                  <th className="px-6 py-3 font-medium">여성기업</th>
                  <th className="px-6 py-3 font-medium">상태</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-6 text-center text-sm text-slate-400"
                    >
                      불러오는 중...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-6 text-center text-sm text-slate-400"
                    >
                      {searchTerm
                        ? "검색 결과가 없습니다."
                        : "등록된 발주처가 없습니다."}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {customer.customer_kind === "individual"
                          ? "개인"
                          : "기업"}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <p>{customer.representative_name || "-"}</p>
                        <p className="text-xs text-slate-400">
                          {customer.representative_phone || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <p>{customer.contact_name || "-"}</p>
                        <p className="text-xs text-slate-400">
                          {customer.contact_phone || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {customer.business_number || "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {customer.license_type || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {customer.is_women_owned && (
                          <span className="inline-flex items-center rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-800">
                            여성기업
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={customer.is_active ? "success" : "default"}
                        >
                          {customer.is_active ? "활성" : "비활성"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(customer)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          수정
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingCustomer ? "발주처 수정" : "발주처 등록"}
      >
        {saveSuccess ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-slate-600">
              {editingCustomer
                ? "발주처 정보가 수정되었습니다"
                : "발주처가 등록되었습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <Select
                  label="구분"
                  value={formData.customer_kind}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      customer_kind:
                        value === "individual" ? "individual" : "company",
                    })
                  }
                  options={[
                    { value: "company", label: "기업" },
                    { value: "individual", label: "개인" },
                  ]}
                />
                <Input
                  label="발주처명"
                  placeholder="예: 유니그린개발 또는 홍길동"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  error={formErrors.name}
                  required
                />

                <Input
                  label="대표자명"
                  placeholder="홍길동"
                  value={formData.representative_name}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      representative_name: event.target.value,
                    })
                  }
                  error={formErrors.representative_name}
                />
                <Input
                  label="대표자 연락처"
                  placeholder="010-1234-5678"
                  value={formData.representative_phone}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      representative_phone: formatPhone(event.target.value),
                    })
                  }
                  error={formErrors.representative_phone}
                />

                <Input
                  label="사업자번호 (선택)"
                  placeholder="123-45-67890"
                  value={formData.business_number}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      business_number: formatBizNo(event.target.value),
                    })
                  }
                  error={formErrors.business_number}
                />
                <Input
                  label="면허"
                  placeholder="예: 건축공사업"
                  value={formData.license_type}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      license_type: event.target.value,
                    })
                  }
                />

                <Input
                  label="실무자명"
                  placeholder="김대리"
                  value={formData.contact_name}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      contact_name: event.target.value,
                    })
                  }
                />
                <Input
                  label="실무자 연락처"
                  placeholder="010-0000-0000"
                  value={formData.contact_phone}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      contact_phone: formatPhone(event.target.value),
                    })
                  }
                />
              </div>

              <label
                htmlFor="customer_is_women_owned"
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <PrimitiveInput
                  type="checkbox"
                  id="customer_is_women_owned"
                  checked={formData.is_women_owned}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      is_women_owned: event.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-point-600 focus:ring-brand-point-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    여성기업
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    해당 시 체크
                  </span>
                </div>
              </label>
            </div>

            {formErrors.submit && (
              <p className="text-sm text-red-600">{formErrors.submit}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : editingCustomer ? (
                  <>
                    <Save className="mr-1.5 h-4 w-4" />
                    저장
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 h-4 w-4" />
                    등록
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={closeModal}>
                취소
              </Button>
            </div>

            {editingCustomer && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  관리
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleActive(editingCustomer)}
                  className="w-full"
                >
                  {editingCustomer.is_active ? (
                    <>
                      <ToggleLeft className="mr-1.5 h-4 w-4" />
                      비활성화
                    </>
                  ) : (
                    <>
                      <ToggleRight className="mr-1.5 h-4 w-4" />
                      활성화
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
