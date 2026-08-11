"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { HotelRateInput } from "@/lib/admin-types";

function emptyRate(): HotelRateInput {
  return { room_type: "", price: 0, capacity: 2, breakfast: false, extra_bed_price: null, note: "" };
}

export function HotelRateEditor({
  value,
  onChange,
}: {
  value: HotelRateInput[];
  onChange: (rates: HotelRateInput[]) => void;
}) {
  function updateRow(index: number, patch: Partial<HotelRateInput>) {
    onChange(value.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-ink-muted">Chưa có loại phòng nào. Thêm ít nhất 1 loại phòng.</p>
      )}

      {value.map((rate, index) => (
        <div key={index} className="rounded-xl border border-border p-3.5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Loại phòng
                </label>
                <Input
                  value={rate.room_type}
                  onChange={(e) => updateRow(index, { room_type: e.target.value })}
                  placeholder="VD: Deluxe Room"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Giá / đêm (VNĐ)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={rate.price || ""}
                  onChange={(e) => updateRow(index, { price: Number(e.target.value) || 0 })}
                  placeholder="1800000"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Sức chứa
                </label>
                <Input
                  type="number"
                  min={1}
                  value={rate.capacity ?? ""}
                  onChange={(e) =>
                    updateRow(index, { capacity: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Extra bed (VNĐ)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={rate.extra_bed_price ?? ""}
                  onChange={(e) =>
                    updateRow(index, {
                      extra_bed_price: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="Không bắt buộc"
                />
              </div>
              <div className="flex items-end">
                <Checkbox
                  id={`breakfast-${index}`}
                  label="Có ăn sáng"
                  checked={rate.breakfast}
                  onChange={(e) => updateRow(index, { breakfast: e.target.checked })}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Ghi chú
                </label>
                <Input
                  value={rate.note ?? ""}
                  onChange={(e) => updateRow(index, { note: e.target.value })}
                  placeholder="Không bắt buộc"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="shrink-0 rounded-lg p-2 text-danger hover:bg-danger-light"
              aria-label="Xóa loại phòng"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, emptyRate()])}
      >
        <Plus className="h-4 w-4" />
        Thêm loại phòng
      </Button>
    </div>
  );
}
