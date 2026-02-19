"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  FileUpload,
  Input,
  Modal,
  PrimitiveInput,
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
  Trash2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { api } from "@/lib/api";

type Partner = {
  id: string;
  name: string;
  representative_name: string;
  representative_phone: string;
  business_number: string;
  contact_name: string;
  contact_phone: string;
  license_type: string;
  is_women_owned: boolean;
  status: "active" | "inactive";
};

type PartnerForm = {
  name: string;
  representative_name: string;
  representative_phone: string;
  business_number: string;
  contact_name: string;
  contact_phone: string;
  licenses: LicenseFormItem[];
  is_women_owned: boolean;
};

type LicenseFileState = {
  id: string;
  original_filename: string;
  deleted?: boolean;
};

type LicenseFormItem = {
  local_id: string;
  id?: string;
  license_name: string;
  license_number: string;
  issuer: string;
  expires_on: string;
  is_primary: boolean;
  new_files: File[];
  existing_files: LicenseFileState[];
};

const createLicenseDraft = (): LicenseFormItem => ({
  local_id: Math.random().toString(36).slice(2, 10),
  license_name: "",
  license_number: "",
  issuer: "",
  expires_on: "",
  is_primary: false,
  new_files: [],
  existing_files: [],
});

const EMPTY_FORM: PartnerForm = {
  name: "",
  representative_name: "",
  representative_phone: "",
  business_number: "",
  contact_name: "",
  contact_phone: "",
  licenses: [],
  is_women_owned: false,
};

const normalizePartner = (partner: any): Partner => {
  const representativeName = partner.representative_name || partner.owner || "";
  const businessNumber = partner.business_number || partner.biz_no || "";
  const licenseType = partner.license_type || partner.license || "";
  const legacyWomenOwned =
    typeof partner.is_female_owned === "boolean"
      ? partner.is_female_owned
      : false;

  return {
    id: String(partner.id),
    name: partner.name || "",
    representative_name: representativeName,
    representative_phone: partner.representative_phone || "",
    business_number: businessNumber,
    contact_name: partner.contact_name || "",
    contact_phone: partner.contact_phone || "",
    license_type: licenseType,
    is_women_owned:
      typeof partner.is_women_owned === "boolean"
        ? partner.is_women_owned
        : legacyWomenOwned,
    status: partner.status === "inactive" ? "inactive" : "active",
  };
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<PartnerForm>(EMPTY_FORM);
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

  const updateLicenseItem = (
    localId: string,
    updater: (item: LicenseFormItem) => LicenseFormItem,
  ) => {
    setFormData((prev) => ({
      ...prev,
      licenses: prev.licenses.map((item) =>
        item.local_id === localId ? updater(item) : item,
      ),
    }));
  };

  const loadPartnerLicenses = async (partner: Partner) => {
    try {
      const response = await api.getLicenses({
        owner_type: "partner",
        owner_id: partner.id,
      });
      if (response.success && response.data && response.data.length > 0) {
        return response.data.map((record, index) => ({
          local_id: Math.random().toString(36).slice(2, 10),
          id: String(record.id),
          license_name: record.license_name || "",
          license_number: record.license_number || "",
          issuer: record.issuer || "",
          expires_on: record.expires_on || "",
          is_primary: record.is_primary || index === 0,
          new_files: [],
          existing_files: (record.files || []).map((file) => ({
            id: String(file.id),
            original_filename: file.original_filename || "첨부파일",
          })),
        }));
      }
    } catch (error) {
      console.error("협력사 면허 목록 조회 실패:", error);
    }

    if (partner.license_type) {
      return [
        {
          ...createLicenseDraft(),
          license_name: partner.license_type,
          is_primary: true,
        },
      ];
    }
    return [];
  };

  const syncPartnerLicenses = async (
    partnerId: string,
    licenseDrafts: LicenseFormItem[],
  ) => {
    const normalized = licenseDrafts
      .map((item) => ({
        ...item,
        license_name: item.license_name.trim(),
        license_number: item.license_number.trim(),
        issuer: item.issuer.trim(),
      }))
      .filter(
        (item) =>
          item.license_name ||
          item.new_files.length > 0 ||
          item.existing_files.some((file) => !file.deleted),
      );

    const hasAnyFile = normalized.some(
      (item) =>
        item.new_files.length > 0 ||
        item.existing_files.some((file) => !file.deleted),
    );
    if (!normalized.length || !hasAnyFile) {
      throw new Error("협력사는 최소 1건의 면허와 증빙파일이 필요합니다");
    }

    const existingResponse = await api.getLicenses({
      owner_type: "partner",
      owner_id: partnerId,
    });
    if (!existingResponse.success) {
      throw new Error("면허 목록 조회 실패");
    }
    const existingRecords = existingResponse.data || [];
    const existingById = new Map(existingRecords.map((item) => [String(item.id), item]));

    const primaryIndex = normalized.findIndex((item) => item.is_primary);
    normalized.forEach((item, index) => {
      item.is_primary = primaryIndex >= 0 ? index === primaryIndex : index === 0;
    });

    for (const item of normalized) {
      if (!item.license_name) continue;

      const payload = {
        license_name: item.license_name,
        license_number: item.license_number || undefined,
        issuer: item.issuer || undefined,
        expires_on: item.expires_on || undefined,
        status: "active" as const,
        is_primary: item.is_primary,
      };

      let recordId = item.id;
      if (recordId) {
        const response = await api.updateLicense(recordId, payload);
        if (!response.success) {
          throw new Error("면허 수정 실패");
        }
        existingById.delete(recordId);
      } else {
        const response = await api.createLicense({
          owner_type: "partner",
          owner_id: partnerId,
          ...payload,
        });
        if (!response.success || !response.data) {
          throw new Error("면허 등록 실패");
        }
        recordId = String(response.data.id);
      }

      if (!recordId) continue;

      for (const file of item.existing_files) {
        if (!file.deleted) continue;
        const deleteResponse = await api.deleteLicenseFile(recordId, file.id);
        if (!deleteResponse.success) {
          throw new Error("면허 첨부 삭제 실패");
        }
      }

      for (const file of item.new_files) {
        const uploadResponse = await api.uploadLicenseFile(recordId, file);
        if (!uploadResponse.success) {
          throw new Error("면허 첨부 업로드 실패");
        }
      }
    }

    for (const staleRecord of existingById.values()) {
      const deleteResponse = await api.deleteLicense(String(staleRecord.id));
      if (!deleteResponse.success) {
        throw new Error("기존 면허 삭제 실패");
      }
    }
  };

  const fetchPartners = async () => {
    setIsLoading(true);
    try {
      const response = await api.getPartners();
      if (response.success && response.data) {
        const normalized = response.data.map(normalizePartner);
        setPartners(normalized);
        setFilteredPartners(normalized);
      }
    } catch (error) {
      console.error("협력사 목록 조회 실패:", error);
      toast.error("협력사 목록을 불러오지 못했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      setFilteredPartners(partners);
      return;
    }

    const filtered = partners.filter((partner) => {
      return (
        partner.name.toLowerCase().includes(term) ||
        partner.representative_name.toLowerCase().includes(term) ||
        partner.representative_phone.includes(term) ||
        partner.contact_name.toLowerCase().includes(term) ||
        partner.contact_phone.includes(term) ||
        partner.business_number.includes(term)
      );
    });
    setFilteredPartners(filtered);
  }, [searchTerm, partners]);

  const openCreateModal = () => {
    setEditingPartner(null);
    setFormData({ ...EMPTY_FORM, licenses: [] });
    setFormErrors({});
    setSaveSuccess(false);
    setShowModal(true);
  };

  const openEditModal = async (partner: Partner) => {
    const licenses = await loadPartnerLicenses(partner);
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      representative_name: partner.representative_name,
      representative_phone: partner.representative_phone,
      business_number: partner.business_number,
      contact_name: partner.contact_name,
      contact_phone: partner.contact_phone,
      licenses,
      is_women_owned: partner.is_women_owned,
    });
    setFormErrors({});
    setSaveSuccess(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPartner(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setSaveSuccess(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "업체명을 입력하세요";
    }
    if (!formData.representative_name.trim()) {
      errors.representative_name = "대표자명을 입력하세요";
    }
    if (!formData.representative_phone.trim()) {
      errors.representative_phone = "대표자 연락처를 입력하세요";
    }

    const bizNoRegex = /^\d{3}-\d{2}-\d{5}$/;
    if (!bizNoRegex.test(formData.business_number)) {
      errors.business_number = "사업자번호 형식은 XXX-XX-XXXXX 입니다";
    }
    if (
      formData.licenses.some(
        (item) =>
          !item.license_name.trim() &&
          (item.new_files.length > 0 ||
            item.existing_files.some((file) => !file.deleted)),
      )
    ) {
      errors.licenses = "첨부파일이 있는 면허는 면허명을 입력하세요";
    }
    const hasLicense = formData.licenses.some((item) => item.license_name.trim());
    const hasLicenseFile = formData.licenses.some(
      (item) =>
        item.new_files.length > 0 ||
        item.existing_files.some((file) => !file.deleted),
    );
    if (!hasLicense || !hasLicenseFile) {
      errors.licenses = "협력사는 최소 1건의 면허와 증빙파일을 등록해야 합니다";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      representative_name: formData.representative_name.trim(),
      representative_phone: formData.representative_phone.trim() || undefined,
      business_number: formData.business_number.trim(),
      contact_name: formData.contact_name.trim() || undefined,
      contact_phone: formData.contact_phone.trim() || undefined,
      license_type:
        formData.licenses.find((item) => item.is_primary && item.license_name.trim())
          ?.license_name.trim() ||
        formData.licenses.find((item) => item.license_name.trim())?.license_name.trim() ||
        undefined,
      is_women_owned: formData.is_women_owned,
    };

    try {
      setIsSaving(true);
      setFormErrors({});
      let targetPartnerId = editingPartner?.id || "";

      if (editingPartner) {
        const response = await api.updatePartner(editingPartner.id, payload);
        if (!response.success || !response.data) {
          setFormErrors({ submit: "수정에 실패했습니다" });
          return;
        }
        targetPartnerId = String(response.data.id || editingPartner.id);
      } else {
        const response = await api.createPartner(payload);
        if (!response.success || !response.data) {
          setFormErrors({ submit: "등록에 실패했습니다" });
          return;
        }
        targetPartnerId = String(response.data.id);
      }

      if (targetPartnerId) {
        await syncPartnerLicenses(targetPartnerId, formData.licenses);
      }

      setSaveSuccess(true);
      await fetchPartners();
      setTimeout(closeModal, 1000);
    } catch (error) {
      console.error("협력사 저장 실패:", error);
      setFormErrors({ submit: "저장 중 오류가 발생했습니다" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (partner: Partner) => {
    const actionLabel = partner.status === "active" ? "비활성화" : "활성화";
    const confirmed = await confirm({
      title: `${partner.name}을(를) ${actionLabel}하시겠습니까?`,
      confirmLabel: actionLabel,
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const response = await api.togglePartnerStatus(partner.id);
      if (!response.success) {
        toast.error("상태 변경에 실패했습니다");
        return;
      }
      await fetchPartners();
      toast.success(`협력사를 ${actionLabel}했습니다`);
    } catch (error) {
      console.error("협력사 상태 변경 실패:", error);
      toast.error("상태 변경 중 오류가 발생했습니다");
    }
  };

  const handleDelete = async (partner: Partner) => {
    const confirmed = await confirm({
      title: `${partner.name}을(를) 삭제하시겠습니까?`,
      description: "이 작업은 되돌릴 수 없습니다.",
      confirmLabel: "삭제",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const response = await api.deletePartner(partner.id);
      if (!response.success) {
        toast.error("삭제에 실패했습니다");
        return;
      }
      await fetchPartners();
      closeModal();
      toast.success("협력사를 삭제했습니다");
    } catch (error) {
      console.error("협력사 삭제 실패:", error);
      toast.error("삭제 중 오류가 발생했습니다");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">협력사 관리</h1>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            협력사 등록
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <PrimitiveInput
            type="text"
            placeholder="업체명, 대표자, 연락처, 사업자번호 검색"
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
                  <th className="px-6 py-3 font-medium">업체명</th>
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
                      colSpan={8}
                      className="px-6 py-6 text-center text-sm text-slate-400"
                    >
                      불러오는 중...
                    </td>
                  </tr>
                ) : filteredPartners.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-6 text-center text-sm text-slate-400"
                    >
                      {searchTerm
                        ? "검색 결과가 없습니다."
                        : "등록된 협력사가 없습니다."}
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map((partner) => (
                    <tr
                      key={partner.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {partner.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <p>{partner.representative_name}</p>
                        <p className="text-xs text-slate-400">
                          {partner.representative_phone || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <p>{partner.contact_name || "-"}</p>
                        <p className="text-xs text-slate-400">
                          {partner.contact_phone || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {partner.business_number}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {partner.license_type || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {partner.is_women_owned && (
                          <span className="inline-flex items-center rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-800">
                            여성기업
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            partner.status === "active" ? "success" : "default"
                          }
                        >
                          {partner.status === "active" ? "정상" : "정지"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(partner)}
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
        title={editingPartner ? "협력사 수정" : "협력사 등록"}
      >
        {saveSuccess ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-slate-600">
              {editingPartner
                ? "협력사 정보가 수정되었습니다"
                : "협력사가 등록되었습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-4">
              <Input
                label="업체명"
                placeholder="(주)가나건설"
                value={formData.name}
                onChange={(event) =>
                  setFormData({ ...formData, name: event.target.value })
                }
                error={formErrors.name}
                required
              />
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
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
                  required
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
                  required
                />

                <Input
                  label="사업자번호"
                  placeholder="123-45-67890"
                  value={formData.business_number}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      business_number: formatBizNo(event.target.value),
                    })
                  }
                  error={formErrors.business_number}
                  required
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

              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">면허 정보 (필수)</p>
                    <p className="text-xs text-slate-500">
                      면허명과 증빙파일을 함께 등록해야 합니다.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        licenses: [...prev.licenses, createLicenseDraft()],
                      }))
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    면허 추가
                  </Button>
                </div>

                {formData.licenses.length === 0 ? (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    등록된 면허가 없습니다.
                  </p>
                ) : (
                  formData.licenses.map((license, index) => (
                    <div
                      key={license.local_id}
                      className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-600">
                          면허 {index + 1}
                          {license.is_primary ? " (대표)" : ""}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              licenses: prev.licenses.filter(
                                (item) => item.local_id !== license.local_id,
                              ),
                            }))
                          }
                        >
                          제거
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="면허명"
                          placeholder="예: 건축공사업"
                          value={license.license_name}
                          onChange={(event) =>
                            updateLicenseItem(license.local_id, (item) => ({
                              ...item,
                              license_name: event.target.value,
                            }))
                          }
                        />
                        <Input
                          label="면허번호"
                          placeholder="예: 제2026-12345호"
                          value={license.license_number}
                          onChange={(event) =>
                            updateLicenseItem(license.local_id, (item) => ({
                              ...item,
                              license_number: event.target.value,
                            }))
                          }
                        />
                        <Input
                          label="발급기관"
                          placeholder="예: 국토교통부"
                          value={license.issuer}
                          onChange={(event) =>
                            updateLicenseItem(license.local_id, (item) => ({
                              ...item,
                              issuer: event.target.value,
                            }))
                          }
                        />
                        <Input
                          type="date"
                          label="유효기간"
                          value={license.expires_on}
                          onChange={(event) =>
                            updateLicenseItem(license.local_id, (item) => ({
                              ...item,
                              expires_on: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <FileUpload
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          maxSize={10 * 1024 * 1024}
                          multiple
                          onFiles={(files) =>
                            updateLicenseItem(license.local_id, (item) => ({
                              ...item,
                              new_files: files,
                            }))
                          }
                        />
                      </div>

                      {license.existing_files.some((file) => !file.deleted) && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-600">기존 첨부</p>
                          {license.existing_files.map((file) =>
                            file.deleted ? null : (
                              <div
                                key={file.id}
                                className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
                              >
                                <p className="truncate text-xs text-slate-600">
                                  {file.original_filename}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    updateLicenseItem(license.local_id, (item) => ({
                                      ...item,
                                      existing_files: item.existing_files.map((existing) =>
                                        existing.id === file.id
                                          ? { ...existing, deleted: true }
                                          : existing,
                                      ),
                                    }))
                                  }
                                >
                                  삭제
                                </Button>
                              </div>
                            ),
                          )}
                        </div>
                      )}

                      <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                        <PrimitiveInput
                          type="checkbox"
                          checked={license.is_primary}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              licenses: prev.licenses.map((item) => ({
                                ...item,
                                is_primary:
                                  item.local_id === license.local_id
                                    ? event.target.checked
                                    : false,
                              })),
                            }))
                          }
                        />
                        대표 면허로 지정
                      </label>
                    </div>
                  ))
                )}
                {formErrors.licenses && (
                  <p className="text-xs text-red-600">{formErrors.licenses}</p>
                )}
              </div>

              <label
                htmlFor="is_women_owned"
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <PrimitiveInput
                  type="checkbox"
                  id="is_women_owned"
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
                ) : editingPartner ? (
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

            {editingPartner && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  관리
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleToggleStatus(editingPartner)}
                    className="flex-1"
                  >
                    {editingPartner.status === "active" ? (
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
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(editingPartner)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    삭제
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
