"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_TYPE_LABEL, type SearchFilters } from "@/lib/types";

export function FilterBar({
  areas,
  value,
  onApply,
}: {
  areas: string[];
  value: SearchFilters;
  onApply: (filters: SearchFilters) => void;
}) {
  const [draft, setDraft] = useState<SearchFilters>(value);
  const [subRegions, setSubRegions] = useState<string[]>([]);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (!draft.area) {
      setSubRegions([]);
      return;
    }
    let cancelled = false;
    createClient()
      .rpc("get_sub_regions_for_area", { p_area: draft.area })
      .then(({ data }) => {
        if (!cancelled) setSubRegions(((data ?? []) as { sub_region: string }[]).map((r) => r.sub_region));
      });
    return () => {
      cancelled = true;
    };
  }, [draft.area]);

  function set<K extends keyof SearchFilters>(key: K, val: SearchFilters[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  return (
    <div className="hidden items-end gap-2.5 lg:flex lg:flex-wrap">
      <div className="w-36">
        <Select
          aria-label="Khu vực"
          value={draft.area ?? ""}
          onChange={(e) => set("area", e.target.value || undefined)}
        >
          <option value="">Khu vực</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>

      {subRegions.length > 0 && (
        <div className="w-36">
          <Select
            aria-label="Tiểu khu vực"
            value={draft.subRegion ?? ""}
            onChange={(e) => set("subRegion", e.target.value || undefined)}
          >
            <option value="">Tất cả {draft.area}</option>
            {subRegions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="w-40">
        <Select
          aria-label="Loại sản phẩm"
          value={draft.type ?? ""}
          onChange={(e) => set("type", (e.target.value || undefined) as SearchFilters["type"])}
        >
          <option value="">Loại sản phẩm</option>
          {Object.entries(PRODUCT_TYPE_LABEL).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-40">
        <Input
          aria-label="Ngày đi"
          type="date"
          value={draft.date ?? ""}
          onChange={(e) => set("date", e.target.value || undefined)}
        />
      </div>

      <div className="w-24">
        <Input
          aria-label="Số khách"
          type="number"
          min={1}
          placeholder="Số khách"
          value={draft.guests ?? ""}
          onChange={(e) => set("guests", e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>

      <div className="w-24">
        <Input
          aria-label="Số phòng"
          type="number"
          min={1}
          placeholder="Số phòng"
          value={draft.bedrooms ?? ""}
          onChange={(e) => set("bedrooms", e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>

      <div className="w-28">
        <Input
          aria-label="Giá từ"
          type="number"
          min={0}
          placeholder="Giá từ"
          value={draft.priceFrom ?? ""}
          onChange={(e) => set("priceFrom", e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>

      <div className="w-28">
        <Input
          aria-label="Giá đến"
          type="number"
          min={0}
          placeholder="Giá đến"
          value={draft.priceTo ?? ""}
          onChange={(e) => set("priceTo", e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>

      <Button onClick={() => onApply(draft)} className="shrink-0">
        <Search className="h-4 w-4" />
        Tìm
      </Button>
    </div>
  );
}
