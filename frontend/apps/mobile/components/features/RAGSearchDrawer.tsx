"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Sparkles, Plus, Loader2, X, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Badge, Button, PrimitiveButton, PrimitiveInput, cn, toast } from "@sigongon/ui";
import { api } from "@/lib/api";

interface RAGSearchResult {
  id: string;
  description: string;
  specification?: string;
  unit: string;
  unit_price: number;
  confidence: number;
}

interface RAGSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: {
    description: string;
    specification?: string;
    unit: string;
    quantity: string;
    unit_price_snapshot: string;
  }) => Promise<void>;
}

export function RAGSearchDrawer({
  isOpen,
  onClose,
  onAddItem,
}: RAGSearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RAGSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Perform search
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    async function search() {
      try {
        setLoading(true);
        setError(null);
        const response = await api.searchRAG(debouncedQuery, 10);

        if (response.success && response.data) {
          // Type assertion to handle mock API response structure
          setResults(response.data as any);
        } else {
          setError("검색에 실패했어요");
        }
      } catch (err) {
        setError("검색 중 오류가 발생했어요");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    search();
  }, [debouncedQuery]);

  const handleAddItem = useCallback(
    async (result: RAGSearchResult) => {
      try {
        setAdding(result.id);
        await onAddItem({
          description: result.description,
          specification: result.specification,
          unit: result.unit,
          quantity: "1",
          unit_price_snapshot: result.unit_price.toString(),
        });
        onClose();
      } catch (err) {
        toast.error("항목 추가에 실패했어요");
        console.error(err);
      } finally {
        setAdding(null);
      }
    },
    [onAddItem, onClose]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-point-600" />
            <h2 className="text-lg font-semibold text-slate-900">AI 검색</h2>
          </div>
          <PrimitiveButton
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </PrimitiveButton>
        </div>

        {/* Search Input */}
        <div className="border-b border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <PrimitiveInput
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 우레탄 방수, 실리콘 코킹..."
              className="h-12 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-base focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
            </div>
          )}

          {error && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && results.length === 0 && debouncedQuery && (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <Search className="h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">검색 결과가 없어요</p>
            </div>
          )}

          {!loading && !error && results.length === 0 && !debouncedQuery && (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <Sparkles className="h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">
                적산 내역을 검색해 보세요
              </p>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="space-y-3">
              {results.map((result) => {
                const isHighConfidence = result.confidence >= 0.9;
                const isMediumConfidence = result.confidence >= 0.7 && result.confidence < 0.9;
                const isLowConfidence = result.confidence < 0.7;

                return (
                  <div
                    key={result.id}
                    className={cn(
                      "rounded-lg border p-4 transition-all",
                      isHighConfidence && "bg-green-50 border-green-200",
                      isMediumConfidence && "bg-amber-50 border-amber-200",
                      isLowConfidence && "bg-red-50 border-red-300 ring-1 ring-red-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {result.description}
                        </p>
                        {result.specification && (
                          <p className="mt-1 text-sm text-slate-500">
                            {result.specification}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          isHighConfidence
                            ? "success"
                            : isMediumConfidence
                              ? "warning"
                              : "error"
                        }
                        className="shrink-0 flex items-center gap-1"
                      >
                        {isHighConfidence && <CheckCircle2 className="h-3 w-3" />}
                        {isMediumConfidence && <Info className="h-3 w-3" />}
                        {isLowConfidence && <AlertTriangle className="h-3 w-3" />}
                        {Math.round(result.confidence * 100)}%
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-sm text-slate-500">
                      <span>단위: {result.unit}</span>
                      <span className="text-slate-900 font-semibold">
                        {result.unit_price.toLocaleString()}원
                      </span>
                    </div>

                    {/* Confidence guidance message */}
                    {isHighConfidence && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        정확도 높음
                      </div>
                    )}
                    {isMediumConfidence && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                        <Info className="h-3 w-3" />
                        확인 권장
                      </div>
                    )}
                    {isLowConfidence && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-red-700">
                        <AlertTriangle className="h-3 w-3" />
                        수동 검증 필수
                      </div>
                    )}

                    <Button
                      size="sm"
                      fullWidth
                      className="mt-3"
                      variant={isLowConfidence ? "secondary" : "primary"}
                      onClick={() => handleAddItem(result)}
                      loading={adding === result.id}
                      disabled={adding !== null}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      {isLowConfidence ? "확인 후 추가" : "추가"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
