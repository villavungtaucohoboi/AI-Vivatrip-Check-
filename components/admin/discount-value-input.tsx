"use client";

import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { cn } from "@/lib/utils";

type DiscountType = "percent" | "amount";

export function DiscountValueInput({
  type,
  value,
  onTypeChange,
  onValueChange,
}: {
  type: DiscountType;
  value: number;
  onTypeChange: (type: DiscountType) => void;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="flex gap-2">
      <div className="flex shrink-0 rounded-xl border border-border p-0.5">
        {(["percent", "amount"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTypeChange(t)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              type === t ? "bg-teal text-white" : "text-ink-muted hover:bg-paper-dim"
            )}
          >
            {t === "percent" ? "%" : "VNĐ"}
          </button>
        ))}
      </div>
      {type === "percent" ? (
        <Input
          type="number"
          min={0}
          max={100}
          value={value || ""}
          onChange={(e) => onValueChange(Number(e.target.value) || 0)}
          placeholder="VD: 10"
          className="flex-1"
        />
      ) : (
        <div className="flex-1">
          <PriceInput value={value || null} onChange={(v) => onValueChange(v ?? 0)} placeholder="VD: 500.000" />
        </div>
      )}
    </div>
  );
}
