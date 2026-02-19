"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  User,
  Phone,
  MapPin,
  CreditCard,
  Building2,
  Globe,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, PrimitiveInput, PrimitiveSelect, toast } from "@sigongon/ui";
import { api } from "@/lib/api";
import type { DailyWorker } from "@sigongon/types";

export default function DailyWorkersPage() {
  const [workers, setWorkers] = useState<DailyWorker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<DailyWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<DailyWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingWorker, setDeletingWorker] = useState<DailyWorker | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    job_type: "보통인부",
    job_type_code: "",
    team: "",
    hire_date: "",
    birth_date: "",
    gender: "" as "" | "1" | "2" | "3" | "4",
    address: "",
    daily_rate: "",
    bank_name: "",
    account_number: "",
    phone: "",
    is_foreign: false,
    visa_status: "",
    nationality_code: "",
    english_name: "",
  });

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredWorkers(workers);
    } else {
      const searchLower = search.toLowerCase();
      setFilteredWorkers(
        workers.filter(
          (worker) =>
            worker.name.toLowerCase().includes(searchLower) ||
            worker.phone.includes(searchLower)
        )
      );
    }
  }, [search, workers]);

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const response = await api.getDailyWorkers();
      if (response.success && response.data) {
        setWorkers(response.data);
        setFilteredWorkers(response.data);
      }
    } catch (error) {
      toast.error("근로자 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      job_type: "보통인부",
      job_type_code: "",
      team: "",
      hire_date: "",
      birth_date: "",
      gender: "",
      address: "",
      daily_rate: "",
      bank_name: "",
      account_number: "",
      phone: "",
      is_foreign: false,
      visa_status: "",
      nationality_code: "",
      english_name: "",
    });
  };

  const handleRegister = async () => {
    if (!formData.name.trim()) {
      toast.error("성명을 입력하세요.");
      return;
    }
    if (!formData.birth_date || formData.birth_date.length !== 6) {
      toast.error("생년월일을 6자리로 입력하세요.");
      return;
    }
    if (!formData.gender) {
      toast.error("성별을 선택하세요.");
      return;
    }
    if (!formData.daily_rate || Number(formData.daily_rate) <= 0) {
      toast.error("일당을 입력하세요.");
      return;
    }

    setIsRegistering(true);
    try {
      const payload = {
        ...formData,
        daily_rate: Number(formData.daily_rate),
        gender: Number(formData.gender) as 1 | 2 | 3 | 4,
        organization_id: "org_1", // Hardcoded for mock
      };

      const response = await api.createDailyWorker(payload);
      if (response.success) {
        toast.success("근로자가 등록되었습니다.");
        setShowRegisterModal(false);
        resetForm();
        fetchWorkers();
      }
    } catch (error) {
      toast.error("근로자 등록에 실패했습니다.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleEdit = (worker: DailyWorker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      job_type: worker.job_type,
      job_type_code: worker.job_type_code,
      team: worker.team,
      hire_date: worker.hire_date,
      birth_date: worker.birth_date,
      gender: String(worker.gender) as "" | "1" | "2" | "3" | "4",
      address: worker.address,
      daily_rate: String(worker.daily_rate),
      bank_name: worker.bank_name,
      account_number: worker.account_number,
      phone: worker.phone,
      is_foreign: worker.is_foreign,
      visa_status: worker.visa_status || "",
      nationality_code: worker.nationality_code || "",
      english_name: worker.english_name || "",
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingWorker) return;

    if (!formData.name.trim()) {
      toast.error("성명을 입력하세요.");
      return;
    }
    if (!formData.birth_date || formData.birth_date.length !== 6) {
      toast.error("생년월일을 6자리로 입력하세요.");
      return;
    }
    if (!formData.gender) {
      toast.error("성별을 선택하세요.");
      return;
    }
    if (!formData.daily_rate || Number(formData.daily_rate) <= 0) {
      toast.error("일당을 입력하세요.");
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        ...formData,
        daily_rate: Number(formData.daily_rate),
        gender: Number(formData.gender) as 1 | 2 | 3 | 4,
      };

      const response = await api.updateDailyWorker(editingWorker.id, payload);
      if (response.success) {
        toast.success("근로자 정보가 수정되었습니다.");
        setShowEditModal(false);
        setEditingWorker(null);
        resetForm();
        fetchWorkers();
      }
    } catch (error) {
      toast.error("근로자 정보 수정에 실패했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = (worker: DailyWorker) => {
    setDeletingWorker(worker);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingWorker) return;

    setIsDeleting(true);
    try {
      const response = await api.deleteDailyWorker(deletingWorker.id);
      if (response.success) {
        toast.success("근로자가 삭제되었습니다.");
        setShowDeleteModal(false);
        setDeletingWorker(null);
        fetchWorkers();
      }
    } catch (error) {
      toast.error("근로자 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatMaskedSSN = (birthDate: string, gender: 1 | 2 | 3 | 4) => {
    if (!birthDate || birthDate.length < 6) return "-";
    return `${birthDate.slice(0, 6)}-${gender}******`;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ko-KR")}원`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">근로자 주소록</h1>
            <p className="mt-1 text-slate-500">전체 {filteredWorkers.length}명</p>
          </div>
          <Button onClick={() => setShowRegisterModal(true)}>
            <Plus className="h-4 w-4" />
            근로자 등록
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <PrimitiveInput
                type="search"
                placeholder="성명, 연락처로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Worker List Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                {search ? "검색 결과가 없습니다." : "등록된 근로자가 없습니다."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                      <th className="px-4 py-3 font-medium">No.</th>
                      <th className="px-4 py-3 font-medium">성명</th>
                      <th className="px-4 py-3 font-medium">직종</th>
                      <th className="px-4 py-3 font-medium">소속반</th>
                      <th className="px-4 py-3 font-medium">일당</th>
                      <th className="px-4 py-3 font-medium">연락처</th>
                      <th className="px-4 py-3 font-medium">외국인</th>
                      <th className="px-4 py-3 font-medium">계좌정보</th>
                      <th className="px-4 py-3 font-medium">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers.map((worker, index) => (
                      <tr
                        key={worker.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-4 py-4 text-slate-500">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{worker.name}</p>
                            {(worker.registration_status === "pending_consent" ||
                              worker.registration_status === "pending_docs" ||
                              worker.has_id_card === false) && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                서류 미완
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatMaskedSSN(worker.birth_date, worker.gender)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {worker.job_type}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{worker.team}</td>
                        <td className="px-4 py-4 text-slate-900 font-medium">
                          {formatCurrency(worker.daily_rate)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{worker.phone}</td>
                        <td className="px-4 py-4">
                          {worker.is_foreign ? (
                            <div>
                              <Badge variant="info">외국인</Badge>
                              {worker.visa_status && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {worker.visa_status}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-slate-900">{worker.bank_name}</p>
                          <p className="text-xs text-slate-500">
                            {worker.account_number}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEdit(worker)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              수정
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(worker)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              삭제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Registration Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false);
          resetForm();
        }}
        title="근로자 등록"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="성명 *"
              placeholder="홍길동"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                직종 *
              </label>
              <PrimitiveSelect
                value={formData.job_type}
                onChange={(e) =>
                  setFormData({ ...formData, job_type: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                <option value="보통인부">보통인부</option>
                <option value="특별인부">특별인부</option>
                <option value="기능공">기능공</option>
              </PrimitiveSelect>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="직종코드"
              placeholder="0101"
              value={formData.job_type_code}
              onChange={(e) =>
                setFormData({ ...formData, job_type_code: e.target.value })
              }
            />
            <Input
              label="소속반"
              placeholder="1반"
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="생년월일 (6자리) *"
              placeholder="예: 900101"
              value={formData.birth_date}
              onChange={(e) =>
                setFormData({ ...formData, birth_date: e.target.value.replace(/\D/g, "").slice(0, 6) })
              }
              maxLength={6}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                성별 *
              </label>
              <PrimitiveSelect
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value as "" | "1" | "2" | "3" | "4" })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                <option value="">선택하세요</option>
                <option value="1">남성 (내국인)</option>
                <option value="2">여성 (내국인)</option>
                <option value="3">남성 (외국인)</option>
                <option value="4">여성 (외국인)</option>
              </PrimitiveSelect>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="입사일"
              type="date"
              value={formData.hire_date}
              onChange={(e) =>
                setFormData({ ...formData, hire_date: e.target.value })
              }
            />
          </div>

          <Input
            label="주소"
            placeholder="서울시 강남구..."
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="일당 *"
              type="number"
              placeholder="200000"
              value={formData.daily_rate}
              onChange={(e) =>
                setFormData({ ...formData, daily_rate: e.target.value })
              }
            />
            <Input
              label="연락처"
              placeholder="010-0000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="은행명"
              placeholder="국민은행"
              value={formData.bank_name}
              onChange={(e) =>
                setFormData({ ...formData, bank_name: e.target.value })
              }
            />
            <Input
              label="계좌번호"
              placeholder="000000-00-000000"
              value={formData.account_number}
              onChange={(e) =>
                setFormData({ ...formData, account_number: e.target.value })
              }
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="flex items-center gap-2">
              <PrimitiveInput
                type="checkbox"
                checked={formData.is_foreign}
                onChange={(e) =>
                  setFormData({ ...formData, is_foreign: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-brand-point-600 focus:ring-brand-point-500"
              />
              <span className="text-sm font-medium text-slate-700">외국인 근로자</span>
            </label>
          </div>

          {formData.is_foreign && (
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="비자유형"
                placeholder="E-9"
                value={formData.visa_status}
                onChange={(e) =>
                  setFormData({ ...formData, visa_status: e.target.value })
                }
              />
              <Input
                label="국적코드"
                placeholder="VN"
                value={formData.nationality_code}
                onChange={(e) =>
                  setFormData({ ...formData, nationality_code: e.target.value })
                }
              />
              <Input
                label="영문이름"
                placeholder="NGUYEN VAN A"
                value={formData.english_name}
                onChange={(e) =>
                  setFormData({ ...formData, english_name: e.target.value })
                }
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowRegisterModal(false);
                resetForm();
              }}
              disabled={isRegistering}
            >
              <X className="h-4 w-4" />
              취소
            </Button>
            <Button
              onClick={handleRegister}
              className="flex-1"
              disabled={isRegistering}
            >
              {isRegistering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  등록
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingWorker(null);
          resetForm();
        }}
        title="근로자 정보 수정"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="성명 *"
              placeholder="홍길동"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                직종 *
              </label>
              <PrimitiveSelect
                value={formData.job_type}
                onChange={(e) =>
                  setFormData({ ...formData, job_type: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                <option value="보통인부">보통인부</option>
                <option value="특별인부">특별인부</option>
                <option value="기능공">기능공</option>
              </PrimitiveSelect>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="직종코드"
              placeholder="0101"
              value={formData.job_type_code}
              onChange={(e) =>
                setFormData({ ...formData, job_type_code: e.target.value })
              }
            />
            <Input
              label="소속반"
              placeholder="1반"
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="생년월일 (6자리) *"
              placeholder="예: 900101"
              value={formData.birth_date}
              onChange={(e) =>
                setFormData({ ...formData, birth_date: e.target.value.replace(/\D/g, "").slice(0, 6) })
              }
              maxLength={6}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                성별 *
              </label>
              <PrimitiveSelect
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value as "" | "1" | "2" | "3" | "4" })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                <option value="">선택하세요</option>
                <option value="1">남성 (내국인)</option>
                <option value="2">여성 (내국인)</option>
                <option value="3">남성 (외국인)</option>
                <option value="4">여성 (외국인)</option>
              </PrimitiveSelect>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="입사일"
              type="date"
              value={formData.hire_date}
              onChange={(e) =>
                setFormData({ ...formData, hire_date: e.target.value })
              }
            />
          </div>

          <Input
            label="주소"
            placeholder="서울시 강남구..."
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="일당 *"
              type="number"
              placeholder="200000"
              value={formData.daily_rate}
              onChange={(e) =>
                setFormData({ ...formData, daily_rate: e.target.value })
              }
            />
            <Input
              label="연락처"
              placeholder="010-0000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="은행명"
              placeholder="국민은행"
              value={formData.bank_name}
              onChange={(e) =>
                setFormData({ ...formData, bank_name: e.target.value })
              }
            />
            <Input
              label="계좌번호"
              placeholder="000000-00-000000"
              value={formData.account_number}
              onChange={(e) =>
                setFormData({ ...formData, account_number: e.target.value })
              }
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="flex items-center gap-2">
              <PrimitiveInput
                type="checkbox"
                checked={formData.is_foreign}
                onChange={(e) =>
                  setFormData({ ...formData, is_foreign: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-brand-point-600 focus:ring-brand-point-500"
              />
              <span className="text-sm font-medium text-slate-700">외국인 근로자</span>
            </label>
          </div>

          {formData.is_foreign && (
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="비자유형"
                placeholder="E-9"
                value={formData.visa_status}
                onChange={(e) =>
                  setFormData({ ...formData, visa_status: e.target.value })
                }
              />
              <Input
                label="국적코드"
                placeholder="VN"
                value={formData.nationality_code}
                onChange={(e) =>
                  setFormData({ ...formData, nationality_code: e.target.value })
                }
              />
              <Input
                label="영문이름"
                placeholder="NGUYEN VAN A"
                value={formData.english_name}
                onChange={(e) =>
                  setFormData({ ...formData, english_name: e.target.value })
                }
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowEditModal(false);
                setEditingWorker(null);
                resetForm();
              }}
              disabled={isUpdating}
            >
              <X className="h-4 w-4" />
              취소
            </Button>
            <Button
              onClick={handleUpdate}
              className="flex-1"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  저장
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingWorker(null);
        }}
        title="근로자 삭제"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {deletingWorker?.name}님의 정보를 삭제하시겠습니까?
            <br />
            삭제된 데이터는 복구할 수 없습니다.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingWorker(null);
              }}
              fullWidth
              disabled={isDeleting}
            >
              <X className="h-4 w-4" />
              취소
            </Button>
            <Button
              onClick={confirmDelete}
              fullWidth
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  삭제
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
