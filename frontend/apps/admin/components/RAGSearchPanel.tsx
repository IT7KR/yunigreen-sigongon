"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Sparkles, Plus, Loader2, X } from "lucide-react";
import { Button, Card } from "@sigongon/ui";
import { api } from "@/lib/api";

interface RAGSearchResult {
  id: string;
  description: string;
  specification?: string;
  unit: string;
  unit_price: number;
  confidence: number;
}

interface RAGSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: {
    description: string;
    specification?: string;
    unit: string;
    quantity: string;
    unit_price_snapshot: string;
  }) => void;
}

export function RAGSearchPanel({
  isOpen,
  onClose,
  onAddItem,
}: RAGSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RAGSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

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
    (result: RAGSearchResult) => {
      onAddItem({
        description: result.description,
        specification: result.specification,
        unit: result.unit,
        quantity: "1",
        unit_price_snapshot: result.unit_price.toString(),
      });
    },
    [onAddItem]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200 bg-white shadow-xl">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-point-600" />
            <h2 className="text-lg font-semibold text-slate-900">적산 검색</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Search Input */}
        <div className="border-b border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 우레탄 방수, 실리콘 코킹..."
              className="h-10 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-point-500" />
            </div>
          )}

          {error && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && results.length === 0 && debouncedQuery && (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <Search className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">검색 결과가 없어요</p>
            </div>
          )}

          {!loading && !error && results.length === 0 && !debouncedQuery && (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                적산 내역을 검색해 보세요
              </p>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="space-y-3">
              {results.map((result) => (
                <Card key={result.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-slate-900">
                          {result.description}
                        </p>
                        <span
                          className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            result.confidence >= 0.9
                              ? "bg-green-100 text-green-700"
                              : result.confidence >= 0.7
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {Math.round(result.confidence * 100)}%
                        </span>
                      </div>
                      {result.specification && (
                        <p className="mt-1 text-sm text-slate-500">
                          {result.specification}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="text-slate-500">
                          단위: <span className="font-medium">{result.unit}</span>
                        </span>
                        <span className="text-slate-900">
                          단가:{" "}
                          <span className="font-semibold">
                            {result.unit_price.toLocaleString()}원
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => handleAddItem(result)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    추가
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
