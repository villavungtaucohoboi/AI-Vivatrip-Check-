"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { AvailabilityLinkRegion } from "@/lib/availability-link-types";

export function RegionFormDialog({
  open,
  onOpenChange,
  editingRegion,
  defaultCategory = "villa",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRegion?: AvailabilityLinkRegion | null;
  defaultCategory?: "villa" | "khach_san_resort";
  onSaved: (newId?: string) => void;
}) {
  const isEdit = !!editingRegion;
  const [name, setName] = useState("");
  const [propertyCategory, setPropertyCategory] = useState<"villa" | "khach_san_resort">("villa");
  const [isChain, setIsChain] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editingRegion?.name ?? "");
    setPropertyCategory(editingRegion?.property_category ?? defaultCategory);
    setIsChain(editingRegion?.is_chain ?? false);
  }, [open, editingRegion, defaultCategory]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên khu vực.");
      return;
    }
    setSaving(true);
    try {
      const payload = { name, property_category: propertyCategory, is_chain: isChain };
      const res = isEdit
        ? await fetch(`/api/admin/availability-regions/${editingRegion!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/availability-regions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Có lỗi xảy ra");
      toast.success(isEdit ? "Đã lưu thay đổi" : "Đã tạo khu vực");
      onOpenChange(false);
      onSaved(result.id);
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
      title={isEdit ? "Sửa khu vực" : "Tạo khu vực"}
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
      <div className="space-y-3.5">
        <div>
          <Label htmlFor="region-name">Tên khu vực</Label>
          <Input
            id="region-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Quanh Hà Nội, hoặc Mường Thanh"
          />
        </div>
        <div>
          <Label htmlFor="region-category">Loại sản phẩm</Label>
          <Select
            id="region-category"
            value={propertyCategory}
            onChange={(e) => setPropertyCategory(e.target.value as "villa" | "khach_san_resort")}
          >
            <option value="villa">🏡 Villa</option>
            <option value="khach_san_resort">🏨 Khách sạn / Resort</option>
          </Select>
        </div>
        <Checkbox
          id="region-chain"
          label="Đây là hệ thống chuỗi (VD Mường Thanh) — gộp chung 1 sheet, không tách vùng miền"
          checked={isChain}
          onChange={(e) => setIsChain(e.target.checked)}
        />
      </div>
    </Dialog>
  );
}
