"use client"

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"
import { Button } from "@yunigreen/ui"

interface LineData {
  id?: string
  description: string
  specification?: string
  unit: string
  quantity: string
  unit_price_snapshot: string
}

interface EstimateLineModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: LineData) => Promise<void>
  line?: LineData | null
}

export function EstimateLineModal({ isOpen, onClose, onSave, line }: EstimateLineModalProps) {
  const [description, setDescription] = useState("")
  const [specification, setSpecification] = useState("")
  const [unit, setUnit] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unitPrice, setUnitPrice] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = !!line

  useEffect(() => {
    if (line) {
      setDescription(line.description)
      setSpecification(line.specification || "")
      setUnit(line.unit)
      setQuantity(line.quantity)
      setUnitPrice(line.unit_price_snapshot)
    } else {
      setDescription("")
      setSpecification("")
      setUnit("")
      setQuantity("")
      setUnitPrice("")
    }
    setError(null)
  }, [line, isOpen])

  const calculatedAmount = (() => {
    const qty = parseFloat(quantity) || 0
    const price = parseFloat(unitPrice) || 0
    return qty * price
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!description.trim()) {
      setError("품목명을 입력해주세요")
      return
    }
    if (!unit.trim()) {
      setError("단위를 입력해주세요")
      return
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError("수량을 입력해주세요")
      return
    }
    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      setError("단가를 입력해주세요")
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      await onSave({
        id: line?.id,
        description: description.trim(),
        specification: specification.trim() || undefined,
        unit: unit.trim(),
        quantity,
        unit_price_snapshot: unitPrice,
      })
      
      onClose()
    } catch (err) {
      setError("저장에 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditMode ? "항목 수정" : "항목 추가"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              품목명 *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              placeholder="예: 우레탄 도막방수재"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              규격
            </label>
            <input
              type="text"
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              placeholder="예: 1액형, KS F 4911"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                단위 *
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                placeholder="예: kg"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                수량 *
              </label>
              <input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              단가 *
            </label>
            <input
              type="number"
              step="1"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              placeholder="0"
            />
          </div>

          <div className="rounded-lg bg-teal-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-teal-700">금액</span>
              <span className="text-lg font-bold text-teal-700">
                {calculatedAmount.toLocaleString()}원
              </span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isEditMode ? "수정" : "추가"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
