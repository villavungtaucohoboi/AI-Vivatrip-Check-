"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { formatDateVN } from "@/lib/pricing";
import type { Holiday } from "@/lib/types";

export function HolidaysManager({ initialHolidays }: { initialHolidays: Holiday[] }) {
  const router = useRouter();
  const [holidays, setHolidays] = useState(
    [...initialHolidays].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
  );
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !name.trim()) {
      toast.error("Vui lòng nhập đủ ngày và tên ngày lễ.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holiday_date: date, holiday_name: name.trim() }),
    });
    const result = await res.json();
    setSaving(false);

    if (!res.ok || "error" in result) {
      toast.error(result.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
      return;
    }
    toast.success("Đã thêm ngày lễ");
    setDate("");
    setName("");
    router.refresh();
    setHolidays((prev) =>
      [...prev, { id: crypto.randomUUID(), holiday_date: date, holiday_name: name.trim(), created_at: new Date().toISOString() }].sort(
        (a, b) => a.holiday_date.localeCompare(b.holiday_date)
      )
    );
  }

  async function handleDelete(h: Holiday) {
    setRemovingId(h.id);
    const res = await fetch(`/api/admin/holidays/${h.id}`, { method: "DELETE" });
    const result = await res.json();
    setRemovingId(null);

    if (!res.ok || "error" in result) {
      toast.error("Không thể xóa: " + (result.error ?? "Lỗi không xác định"));
      return;
    }
    setHolidays((prev) => prev.filter((x) => x.id !== h.id));
    toast.success(`Đã xóa "${h.holiday_name}"`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <h2 className="mb-3 font-display text-base text-ink">Thêm ngày lễ</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <div>
            <Label htmlFor="holiday_date">Ngày</Label>
            <Input id="holiday_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="holiday_name">Tên ngày lễ</Label>
            <Input
              id="holiday_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Quốc khánh"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Thêm
          </Button>
        </form>
      </Card>

      {holidays.length === 0 ? (
        <EmptyState
          title="Chưa có ngày lễ nào"
          description="Thêm ngày lễ để hệ thống tự áp giá Thứ 7 & Ngày lễ cho những ngày này."
        />
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-white">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 p-3.5">
              <div>
                <p className="text-sm font-medium text-ink">{h.holiday_name}</p>
                <p className="text-xs text-ink-muted">{formatDateVN(h.holiday_date)}</p>
              </div>
              <button
                onClick={() => handleDelete(h)}
                disabled={removingId === h.id}
                className="rounded-lg p-2 text-ink-muted hover:bg-danger-light hover:text-danger"
                aria-label="Xóa"
              >
                {removingId === h.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
