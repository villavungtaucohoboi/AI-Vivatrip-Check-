"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onOpenFilters,
  activeFilterCount,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
}) {
  return (
    <div className="space-y-2.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex items-center gap-2 rounded-2xl border border-border bg-white p-2 shadow-card focus-within:ring-2 focus-within:ring-teal"
      >
        <Search className="ml-2 h-5 w-5 shrink-0 text-ink-muted" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="VD: Villa Phan Thiết 15 khách khoảng 10 triệu"
          className="h-11 w-full bg-transparent text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded-full p-1.5 text-ink-muted hover:bg-paper-dim"
            aria-label="Xoá"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <Button type="submit" size="default" className="shrink-0">
          Tìm ngay
        </Button>
      </form>

      <button
        type="button"
        onClick={onOpenFilters}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink",
          "hover:bg-paper-dim"
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="lg:hidden">Bộ lọc</span>
        <span className="hidden lg:inline">Tiện ích &amp; bộ lọc khác</span>
        {activeFilterCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[11px] text-white">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
}
