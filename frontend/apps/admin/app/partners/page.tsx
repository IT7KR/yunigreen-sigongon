"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, PrimitiveInput } from "@sigongon/ui";
import { Plus, Upload, Search, Loader2, Check, Trash2, Pencil, Save, X, ToggleLeft, ToggleRight } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Partner = {
  id: string;
  name: string;
  biz_no: string;
  owner: string;
  is_female_owned: boolean;
  license: string;
  status: "active" | "inactive";
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    owner: "",
    biz_no: "",
    license: "",
    is_female_owned: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await api.getPartners();
      if (response.success && response.data) {
        setPartners(response.data);
        setFilteredPartners(response.data);
      }
    } catch (err) {
      console.error("파트너 목록 불러오기 실패:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPartners(partners);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered = partners.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.biz_no.includes(term) ||
        p.owner.toLowerCase().includes(term)
    );
    setFilteredPartners(filtered);
  }, [searchTerm, partners]);

  // Format business number: XXX-XX-XXXXX
  const formatBizNo = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
  };

  const openCreateModal = () => {
    setEditingPartner(null);
    setFormData({
      name: "",
      owner: "",
      biz_no: "",
      license: "",
      is_female_owned: false,
    });
    setFormErrors({});
    setSaveSuccess(false);
    setShowModal(true);
  };

  const openEditModal = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      owner: partner.owner,
      biz_no: partner.biz_no,
      license: partner.license,
      is_female_owned: partner.is_female_owned,
    });
    setFormErrors({});
    setSaveSuccess(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPartner(null);
    setFormData({
      name: "",
      owner: "",
      biz_no: "",
      license: "",
      is_female_owned: false,
    });
    setFormErrors({});
    setSaveSuccess(false);
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "업체명을 입력하세요";
    }
    if (!formData.owner.trim()) {
      errors.owner = "대표자명을 입력하세요";
    }

    const bizNoRegex = /^\d{3}-\d{2}-\d{5}$/;
    if (!formData.biz_no || !bizNoRegex.test(formData.biz_no)) {
      errors.biz_no = "사업자번호를 올바른 형식으로 입력하세요 (XXX-XX-XXXXX)";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    setFormErrors({});

    try {
      if (editingPartner) {
        const res = await api.updatePartner(editingPartner.id, formData);
        if (res.success) {
          setSaveSuccess(true);
          await fetchData();
          setTimeout(() => {
            closeModal();
          }, 1500);
        }
      } else {
        const res = await api.createPartner(formData);
        if (res.success) {
          setSaveSuccess(true);
          await fetchData();
          setTimeout(() => {
            closeModal();
          }, 1500);
        }
      }
    } catch {
      setFormErrors({ submit: "저장에 실패했습니다" });
    }

    setIsSaving(false);
  };

  const handleToggleStatus = async (partner: Partner) => {
    const action = partner.status === "active" ? "비활성화" : "활성화";
    if (!confirm(`${partner.name}을(를) ${action}하시겠습니까?`)) {
      return;
    }

    try {
      const res = await api.togglePartnerStatus(partner.id);
      if (res.success) {
        await fetchData();
      }
    } catch {
      alert("상태 변경에 실패했습니다");
    }
  };

  const handleDelete = async (partner: Partner) => {
    if (!confirm(`${partner.name}을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const res = await api.deletePartner(partner.id);
      if (res.success) {
        await fetchData();
        closeModal();
      }
    } catch {
      alert("삭제에 실패했습니다");
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

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <PrimitiveInput
              type="text"
              placeholder="업체명, 사업자번호 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 pl-10 py-2 focus:outline-none focus:ring-2 focus:ring-brand-point-500"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                  <th className="px-6 py-3 font-medium">업체명</th>
                  <th className="px-6 py-3 font-medium">대표자</th>
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
                      colSpan={7}
                      className="px-6 py-6 text-center text-sm text-slate-400"
                    >
                      불러오는 중...
                    </td>
                  </tr>
                ) : filteredPartners.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-6 text-center text-sm text-slate-400"
                    >
                      {searchTerm ? "검색 결과가 없습니다." : "등록된 협력사가 없습니다."}
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
                        {partner.owner}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {partner.biz_no}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {partner.license}
                      </td>
                      <td className="px-6 py-4">
                        {partner.is_female_owned && (
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
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(partner)}>
                          <Pencil className="h-3.5 w-3.5" />수정
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

      {/* Partner Create/Edit Modal */}
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
              {editingPartner ? "협력사 정보가 수정되었습니다" : "협력사가 등록되었습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Form Fields */}
            <div className="space-y-4">
              <Input
                label="업체명"
                placeholder="(주)가나건설"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="대표자"
                  placeholder="홍길동"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  error={formErrors.owner}
                  required
                />
                <Input
                  label="사업자번호"
                  placeholder="123-45-67890"
                  value={formData.biz_no}
                  onChange={(e) => {
                    const formatted = formatBizNo(e.target.value);
                    setFormData({ ...formData, biz_no: formatted });
                  }}
                  error={formErrors.biz_no}
                  required
                />
              </div>
              <Input
                label="면허"
                placeholder="건축공사업"
                value={formData.license}
                onChange={(e) => setFormData({ ...formData, license: e.target.value })}
              />
              <label
                htmlFor="is_female_owned"
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <PrimitiveInput
                  type="checkbox"
                  id="is_female_owned"
                  checked={formData.is_female_owned}
                  onChange={(e) =>
                    setFormData({ ...formData, is_female_owned: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-point-600 focus:ring-brand-point-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">여성기업</span>
                  <span className="ml-2 text-xs text-slate-400">해당 시 체크</span>
                </div>
              </label>
            </div>

            {/* Error Message */}
            {formErrors.submit && (
              <p className="text-sm text-red-600">{formErrors.submit}</p>
            )}

            {/* Primary Actions */}
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

            {/* Danger Zone - only for edit mode */}
            {editingPartner && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">관리</p>
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
