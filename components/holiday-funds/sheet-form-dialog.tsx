"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HolidayFundSheet } from "@/lib/holiday-fund-types";

export function SheetFormDialog({
  open,
  onOpenChange,
  editingSheet,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSheet?: HolidayFundSheet | null;
  onSaved: () => void;
}) {
  const isEdit = !!editingSheet;
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editingSheet?.name ?? "");
    setYear(editingSheet?.default_year ?? new Date().getFullYear());
  }, [open, editingSheet]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên Sheet.");
      return;
    }
    setSaving(true);
    try {
      const res = isEdit
        ? await fetch(`/api/admin/holiday-sheets/${editingSheet!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, default_year: year }),
          })
        : await fetch("/api/admin/holiday-sheets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, default_year: year }),
          });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Có lỗi xảy ra");
      toast.success(isEdit ? "Đã lưu thay đổi" : "Đã tạo Sheet");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Đổi tên Sheet" : "Tạo Sheet"}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="sheet-name">Tên Sheet</Label>
          <Input id="sheet-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Hạ Long" />
        </div>
        <div>
          <Label htmlFor="sheet-year">Năm áp dụng</Label>
          <Input
            id="sheet-year"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            Sale thường chỉ viết "29/8" không ghi năm — hệ thống dùng năm này để tính ngày đầy đủ.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
