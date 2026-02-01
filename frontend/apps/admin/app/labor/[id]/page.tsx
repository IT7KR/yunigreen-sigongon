"use client";

import { use, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
} from "@sigongon/ui";
import { ArrowLeft, Edit, Save, X, FileText, Camera } from "lucide-react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import { api } from "@/lib/api";

type WorkerDetail = {
  id: string;
  name: string;
  phone: string;
  ssn_masked: string;
  address: string;
  bank_name: string;
  account_number: string;
  role: string;
  status: "active" | "inactive";
  documents: Array<{
    id: string;
    type: "id_card" | "safety_cert";
    name: string;
    uploaded_at: string;
  }>;
  work_history: Array<{
    id: string;
    project_name: string;
    start_date: string;
    end_date?: string;
    days_worked: number;
  }>;
  contract_summary: {
    signed: number;
    pending: number;
  };
};

export default function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    bank_name: "",
    account_number: "",
    role: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Mock data - replace with actual API call
      const mockWorker: WorkerDetail = {
        id,
        name: "김철수",
        phone: "010-1234-5678",
        ssn_masked: "850101-1******",
        address: "서울시 강남구 테헤란로 123",
        bank_name: "국민은행",
        account_number: "123-456-789012",
        role: "목수",
        status: "active",
        documents: [
          {
            id: "doc_1",
            type: "id_card",
            name: "주민등록증.jpg",
            uploaded_at: "2024-01-15",
          },
          {
            id: "doc_2",
            type: "safety_cert",
            name: "안전교육이수증.pdf",
            uploaded_at: "2024-01-15",
          },
        ],
        work_history: [
          {
            id: "wh_1",
            project_name: "강남 아파트 리모델링",
            start_date: "2024-01-10",
            end_date: "2024-01-20",
            days_worked: 10,
          },
          {
            id: "wh_2",
            project_name: "서초 상가 인테리어",
            start_date: "2024-01-22",
            days_worked: 5,
          },
        ],
        contract_summary: {
          signed: 2,
          pending: 1,
        },
      };
      setWorker(mockWorker);
      setFormData({
        name: mockWorker.name,
        phone: mockWorker.phone,
        address: mockWorker.address,
        bank_name: mockWorker.bank_name,
        account_number: mockWorker.account_number,
        role: mockWorker.role,
      });
      setIsLoading(false);
    };

    fetchData();
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (worker) {
      setFormData({
        name: worker.name,
        phone: worker.phone,
        address: worker.address,
        bank_name: worker.bank_name,
        account_number: worker.account_number,
        role: worker.role,
      });
    }
  };

  const handleSave = async () => {
    // Save logic here
    setIsEditing(false);
    if (worker) {
      setWorker({ ...worker, ...formData });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/labor"
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              일용직 근로자 상세
            </h1>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="secondary" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  취소
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  저장
                </Button>
              </>
            ) : (
              <Button onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                정보 수정
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">불러오는 중...</div>
        ) : !worker ? (
          <div className="text-center py-12 text-slate-400">
            근로자 정보를 찾을 수 없습니다.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column - Main info */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>기본 정보</CardTitle>
                    <Badge
                      variant={worker.status === "active" ? "success" : "default"}
                    >
                      {worker.status === "active" ? "재직" : "대기"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm text-slate-500">성명</label>
                      {isEditing ? (
                        <Input
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 font-medium text-slate-900">
                          {worker.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">연락처</label>
                      {isEditing ? (
                        <Input
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 font-medium text-slate-900">
                          {worker.phone}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">주민번호</label>
                      <p className="mt-1 font-medium text-slate-900">
                        {worker.ssn_masked}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">직종</label>
                      {isEditing ? (
                        <Input
                          value={formData.role}
                          onChange={(e) =>
                            setFormData({ ...formData, role: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 font-medium text-slate-900">
                          {worker.role}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-slate-500">주소</label>
                      {isEditing ? (
                        <Input
                          value={formData.address}
                          onChange={(e) =>
                            setFormData({ ...formData, address: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 font-medium text-slate-900">
                          {worker.address}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>계좌 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm text-slate-500">은행명</label>
                      {isEditing ? (
                        <Input
                          value={formData.bank_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bank_name: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 font-medium text-slate-900">
                          {worker.bank_name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">계좌번호</label>
                      {isEditing ? (
                        <Input
                          value={formData.account_number}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              account_number: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 font-medium text-slate-900">
                          {worker.account_number}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>등록 서류</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {worker.documents.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        등록된 서류가 없습니다.
                      </p>
                    ) : (
                      worker.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                              {doc.type === "id_card" ? (
                                <Camera className="h-5 w-5 text-slate-600" />
                              ) : (
                                <FileText className="h-5 w-5 text-slate-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {doc.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {doc.type === "id_card"
                                  ? "신분증"
                                  : "안전교육이수증"}{" "}
                                • {doc.uploaded_at}
                              </p>
                            </div>
                          </div>
                          <Button variant="secondary" size="sm">
                            보기
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column - Summary & History */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>계약 현황</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">서명 완료</span>
                      <span className="text-lg font-bold text-green-600">
                        {worker.contract_summary.signed}건
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">서명 대기</span>
                      <span className="text-lg font-bold text-amber-600">
                        {worker.contract_summary.pending}건
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>근무 이력</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {worker.work_history.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        근무 이력이 없습니다.
                      </p>
                    ) : (
                      worker.work_history.map((history) => (
                        <div
                          key={history.id}
                          className="rounded-lg border border-slate-200 p-3"
                        >
                          <p className="font-medium text-slate-900">
                            {history.project_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {history.start_date}
                            {history.end_date ? ` ~ ${history.end_date}` : " ~"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {history.days_worked}일 근무
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
