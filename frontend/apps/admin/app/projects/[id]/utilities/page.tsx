"use client";

import { use, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@sigongon/ui";
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";

export default function UtilitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [utilities, setUtilities] = useState<
    Array<{
      id: string;
      type: "수도" | "전기" | "가스" | "기타";
      month: string;
      status: "pending" | "completed";
      amount: number;
      due_date: string;
      doc_status: "pending" | "submitted";
    }>
  >([]);
  const [timeline, setTimeline] = useState<
    Array<{ id: string; date: string; message: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const response = await api.getUtilities(id);
    if (response.success && response.data) {
      setUtilities(response.data.items);
      setTimeline(response.data.timeline);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleToggle = async (
    itemId: string,
    status: "pending" | "completed",
  ) => {
    await api.updateUtilityStatus(id, itemId, {
      status: status === "completed" ? "pending" : "completed",
    });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          수도광열비 관리
        </h2>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          영수증/공문 업로드
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-slate-400">
              불러오는 중...
            </CardContent>
          </Card>
        ) : utilities.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-slate-400">
              등록된 항목이 없습니다.
            </CardContent>
          </Card>
        ) : (
          utilities.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {item.month} {item.type}요금
                </CardTitle>
                {item.status === "completed" ? (
                  <CheckCircle className="h-4 w-4 text-brand-point-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {item.amount.toLocaleString()}원
                </div>
                <p className="text-xs text-slate-500">
                  납부기한: {item.due_date}
                </p>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">공문 발송</span>
                    <Badge
                      variant={
                        item.doc_status === "submitted" ? "success" : "warning"
                      }
                    >
                      {item.doc_status === "submitted"
                        ? "발송 완료"
                        : "발송 대기"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">입금 확인</span>
                    <Badge
                      variant={
                        item.status === "completed" ? "success" : "warning"
                      }
                    >
                      {item.status === "completed" ? "입금 완료" : "입금 대기"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleToggle(item.id, item.status)}
                  >
                    상태 변경
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>타임라인</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-slate-400">불러오는 중...</div>
          ) : timeline.length === 0 ? (
            <div className="text-sm text-slate-400">타임라인이 없습니다.</div>
          ) : (
            <div className="relative border-l border-slate-200 pl-4 space-y-6">
              {timeline.map((entry, idx) => (
                <div key={entry.id} className="relative">
                  <div
                    className={`absolute -left-6 top-1 h-3 w-3 rounded-full ${
                      idx === 0 ? "bg-brand-point-500" : "bg-slate-300"
                    }`}
                  ></div>
                  <p className="text-sm font-medium text-slate-900">
                    {entry.date}
                  </p>
                  <p className="text-slate-500">{entry.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
