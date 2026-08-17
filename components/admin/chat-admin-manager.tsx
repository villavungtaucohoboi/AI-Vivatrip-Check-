"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import type { ChatMessage, ChatSettings } from "@/lib/chat-types";

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function ChatAdminManager({
  initialSettings,
  initialMessages,
}: {
  initialSettings: ChatSettings | null;
  initialMessages: ChatMessage[];
}) {
  const [enabled, setEnabled] = useState(initialSettings?.is_enabled ?? true);
  const [toggling, setToggling] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleToggle() {
    const next = !enabled;
    setToggling(true);
    const res = await fetch("/api/admin/chat-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: next }),
    });
    setToggling(false);
    if (!res.ok) {
      toast.error("Không thể cập nhật.");
      return;
    }
    setEnabled(next);
    toast.success(next ? "Đã bật lại chat cho mọi người" : "Đã khoá chat — không ai gửi được tin mới");
  }

  async function handleDelete(id: string) {
    setRemovingId(id);
    const res = await fetch(`/api/admin/chat-messages/${id}`, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) {
      toast.error("Không thể xóa.");
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
    toast.success("Đã xóa tin nhắn");
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-[13.5px] font-bold">Cho phép chat</p>
          <p className="text-[12px] text-ink-muted">Tắt để khoá toàn bộ chat, không ai gửi được tin mới.</p>
        </div>
        <Button variant={enabled ? "outline" : "default"} onClick={handleToggle} disabled={toggling}>
          {toggling && <Loader2 className="h-4 w-4 animate-spin" />}
          {enabled ? "Khoá chat" : "Bật lại chat"}
        </Button>
      </Card>

      <div>
        <p className="mb-2 text-[13px] font-bold text-ink-muted">
          TOÀN BỘ LỊCH SỬ ({messages.length} tin — kể cả tin đã tự ẩn với Sale sau 24h)
        </p>
        {messages.length === 0 ? (
          <EmptyState title="Chưa có tin nhắn nào" />
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-white">
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-teal-dark">
                    {m.nickname} <span className="font-normal text-ink-muted">· {fmtDateTime(m.created_at)}</span>
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink">{m.message}</p>
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={removingId === m.id}
                  className="shrink-0 rounded-lg p-2 text-ink-muted hover:bg-danger-light hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
