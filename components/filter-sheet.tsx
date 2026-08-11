"use client";

import { useState, useEffect } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PRODUCT_TYPE_LABEL, type SearchFilters } from "@/lib/types";

const AMENITIES: { key: "pool" | "near_beach" | "karaoke" | "bbq"; label: string }[] = [
  { key: "pool", label: "Hồ bơi" },
  { key: "near_beach", label: "Gần biển" },
  { key: "karaoke", label: "Karaoke" },
  { key: "bbq", label: "BBQ" },
];

export function FilterSheet({
  open,
  onOpenChange,
  areas,
  value,
  onApply,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: string[];
  value: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<SearchFilters>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  function set<K extends keyof SearchFilters>(key: K, val: SearchFilters[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Bộ lọc"
      footer={
        <>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setDraft({});
              onClear();
              onOpenChange(false);
            }}
          >
            Xóa bộ lọc
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Áp dụng bộ lọc
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <Label htmlFor="f-area">Khu vực</Label>
          <Select
            id="f-area"
            value={draft.area ?? ""}
            onChange={(e) => set("area", e.target.value || undefined)}
          >
            <option value="">Tất cả khu vực</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="f-type">Loại sản phẩm</Label>
          <Select
            id="f-type"
            value={draft.type ?? ""}
            onChange={(e) =>
              set("type", (e.target.value || undefined) as SearchFilters["type"])
            }
          >
            <option value="">Tất cả loại</option>
            {Object.entries(PRODUCT_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="f-date">Ngày đi</Label>
          <Input
            id="f-date"
            type="date"
            value={draft.date ?? ""}
            onChange={(e) => set("date", e.target.value || undefined)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="f-guests">Số khách</Label>
            <Input
              id="f-guests"
              type="number"
              min={1}
              inputMode="numeric"
              value={draft.guests ?? ""}
              onChange={(e) =>
                set("guests", e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="VD: 15"
            />
          </div>
          <div>
            <Label htmlFor="f-bedrooms">Số phòng ngủ</Label>
            <Input
              id="f-bedrooms"
              type="number"
              min={1}
              inputMode="numeric"
              value={draft.bedrooms ?? ""}
              onChange={(e) =>
                set("bedrooms", e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="VD: 5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="f-price-from">Giá từ</Label>
            <Input
              id="f-price-from"
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.priceFrom ?? ""}
              onChange={(e) =>
                set("priceFrom", e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="VNĐ"
            />
          </div>
          <div>
            <Label htmlFor="f-price-to">Giá đến</Label>
            <Input
              id="f-price-to"
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.priceTo ?? ""}
              onChange={(e) =>
                set("priceTo", e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="VNĐ"
            />
          </div>
        </div>

        <div>
          <Label>Tiện ích</Label>
          <div className="grid grid-cols-2 gap-3 pt-1">
            {AMENITIES.map(({ key, label }) => (
              <Checkbox
                key={key}
                id={`f-${key}`}
                label={label}
                checked={!!draft[key]}
                onChange={(e) => set(key, e.target.checked || undefined)}
              />
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
