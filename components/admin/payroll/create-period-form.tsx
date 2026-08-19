"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const now = new Date();
const YEARS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

export function CreatePeriodForm() {
  const router = useRouter();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    const res = await fetch("/api/admin/payroll-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year }),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(result.error ?? "Có lỗi xảy ra");
      return;
    }
    toast.success("Đã tạo kỳ lương");
    router.push(`/admin/payroll/periods/${result.id}`);
  }

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-border bg-white p-4">
      <div className="flex-1">
        <label className="mb-1 block text-[11.5px] font-bold text-ink-muted">Tháng</label>
        <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m) => (
            <option key={m} value={m}>Tháng {String(m).padStart(2, "0")}</option>
          ))}
        </Select>
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-[11.5px] font-bold text-ink-muted">Năm</label>
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </div>
      <button
        onClick={handleCreate}
        disabled={saving}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-teal px-4 text-[13px] font-semibold text-white hover:bg-teal-dark"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Tạo kỳ lương
      </button>
    </div>
  );
}
