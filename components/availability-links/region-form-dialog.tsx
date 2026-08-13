"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AvailabilityLinkRegion } from "@/lib/availability-link-types";

export function RegionFormDialog({
  open,
  onOpenChange,
  editingRegion,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRegion?: AvailabilityLinkRegion | null;
  onSaved: () => void;
}) {
  const isEdit = !!editingRegion;
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(editingRegion?.name ?? "");
  }, [open, editingRegion]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên khu vực.");
      return;
    }
    setSaving(true);
    try {
      const res = isEdit
        ? await fetch(`/api/admin/availability-regions/${editingRegion!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          })
        : await fetch("/api/admin/availability-regions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Có lỗi xảy ra");
      toast.success(isEdit ? "Đã lưu thay đổi" : "Đã tạo khu vực");
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
      title={isEdit ? "Đổi tên khu vực" : "Tạo khu vực"}
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
      <div>
        <Label htmlFor="region-name">Tên khu vực</Label>
        <Input
          id="region-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Quanh Hà Nội"
        />
      </div>
    </Dialog>
  );
}
