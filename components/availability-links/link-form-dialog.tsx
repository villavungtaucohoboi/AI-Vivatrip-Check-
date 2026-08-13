"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { AvailabilityLink, AvailabilityLinkRegion } from "@/lib/availability-link-types";

export function LinkFormDialog({
  open,
  onOpenChange,
  regions,
  defaultRegionId,
  editingLink,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regions: AvailabilityLinkRegion[];
  defaultRegionId?: string;
  editingLink?: AvailabilityLink | null;
  onSaved: () => void;
}) {
  const isEdit = !!editingLink;
  const [name, setName] = useState("");
  const [regionId, setRegionId] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [updatedBy, setUpdatedBy] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editingLink?.name ?? "");
    setRegionId(editingLink?.region_id ?? defaultRegionId ?? regions[0]?.id ?? "");
    setUrl(editingLink?.url ?? "");
    setNote(editingLink?.note ?? "");
    setIsActive(editingLink?.is_active ?? true);
    setUpdatedBy(editingLink?.updated_by ?? "");
  }, [open, editingLink, defaultRegionId, regions]);

  async function handleSubmit() {
    if (!name.trim() || !url.trim() || !regionId) {
      toast.error("Vui lòng nhập đủ Tên nguồn, Khu vực và Link.");
      return;
    }
    if (!/^https?:\/\/.+/i.test(url.trim())) {
      toast.error("Link không hợp lệ.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        region_id: regionId,
        name,
        url,
        note,
        is_active: isActive,
        updated_by: updatedBy,
      };
      const res = isEdit
        ? await fetch(`/api/admin/availability-links/${editingLink!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/availability-links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Có lỗi xảy ra");
      toast.success(isEdit ? "Đã cập nhật link" : "Đã thêm link");
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
      title={isEdit ? "Sửa link" : "Thêm link"}
      className="max-w-lg"
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
      <div className="max-h-[60vh] space-y-3.5 overflow-y-auto pr-1">
        <div>
          <Label htmlFor="link-name">Tên nguồn / đối tác *</Label>
          <Input id="link-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Tico Travel" />
        </div>
        <div>
          <Label htmlFor="link-region">Khu vực *</Label>
          <Select id="link-region" value={regionId} onChange={(e) => setRegionId(e.target.value)}>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="link-url">Link check *</Label>
          <Input
            id="link-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/..."
          />
        </div>
        <div>
          <Label htmlFor="link-note">Ghi chú</Label>
          <Textarea
            id="link-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Check lịch villa Sóc Sơn / Ba Vì"
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="link-updated-by">Tên bạn (hiện ở mục "Cập nhật bởi")</Label>
          <Input id="link-updated-by" value={updatedBy} onChange={(e) => setUpdatedBy(e.target.value)} placeholder="VD: Quân" />
        </div>
        <div>
          <Label htmlFor="link-status">Trạng thái</Label>
          <Select
            id="link-status"
            value={isActive ? "active" : "hidden"}
            onChange={(e) => setIsActive(e.target.value === "active")}
          >
            <option value="active">Hoạt động</option>
            <option value="hidden">Tạm ẩn</option>
          </Select>
        </div>
      </div>
    </Dialog>
  );
}
