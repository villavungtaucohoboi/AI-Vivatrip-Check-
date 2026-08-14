"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { LeaderboardEntry } from "@/lib/leaderboard-types";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function LeaderboardManager({ initial }: { initial: LeaderboardEntry[] }) {
  const [rows, setRows] = useState(
    [1, 2, 3].map((rank) => {
      const found = initial.find((e) => e.rank === rank);
      return {
        rank: rank as 1 | 2 | 3,
        name: found?.name === "Chưa cập nhật" ? "" : found?.name ?? "",
        amount: found?.amount ?? 0,
      };
    })
  );
  const [updatedBy, setUpdatedBy] = useState("");
  const [saving, setSaving] = useState(false);

  function setRow(rank: 1 | 2 | 3, field: "name" | "amount", value: string) {
    setRows((prev) =>
      prev.map((r) => (r.rank === rank ? { ...r, [field]: field === "amount" ? Number(value) || 0 : value } : r))
    );
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/sales-leaderboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: rows, updated_by: updatedBy }),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error("Không thể lưu: " + (result.error ?? "Lỗi không xác định"));
      return;
    }
    toast.success("Đã cập nhật băng chữ chạy");
  }

  return (
    <Card className="space-y-4 p-4">
      <p className="text-[12.5px] text-ink-muted">
        Để trống tên (cả 3 dòng) hoặc để doanh số = 0 thì băng chữ sẽ tự ẩn trên toàn bộ app, không hiện
        dòng trống gây phản tác dụng.
      </p>
      {rows.map((row) => (
        <div key={row.rank} className="grid grid-cols-1 gap-3 rounded-xl border border-border p-3.5 sm:grid-cols-[auto_1fr_1fr]">
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink-muted sm:pt-6">
            {MEDAL[row.rank]} TOP {row.rank}
          </div>
          <div>
            <Label htmlFor={`name-${row.rank}`}>Tên Sale</Label>
            <Input
              id={`name-${row.rank}`}
              value={row.name}
              onChange={(e) => setRow(row.rank, "name", e.target.value)}
              placeholder="VD: Quân"
            />
          </div>
          <div>
            <Label htmlFor={`amount-${row.rank}`}>Doanh số (VNĐ)</Label>
            <Input
              id={`amount-${row.rank}`}
              type="number"
              value={row.amount || ""}
              onChange={(e) => setRow(row.rank, "amount", e.target.value)}
              placeholder="VD: 186000000"
            />
          </div>
        </div>
      ))}
      <div>
        <Label htmlFor="updated-by">Tên bạn (người cập nhật)</Label>
        <Input id="updated-by" value={updatedBy} onChange={(e) => setUpdatedBy(e.target.value)} placeholder="VD: Admin" />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Lưu & cập nhật băng chữ
      </Button>
    </Card>
  );
}
