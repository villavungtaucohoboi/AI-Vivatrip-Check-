"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty-state";
import { CATEGORY_LABEL, type MotivationCategory, type MotivationMessage, type MotivationQuote } from "@/lib/motivation-types";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as MotivationCategory[];

export function MotivationManager({
  initialMessages,
  initialQuotes,
}: {
  initialMessages: MotivationMessage[];
  initialQuotes: MotivationQuote[];
}) {
  const [tab, setTab] = useState<"messages" | "quotes">("messages");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-paper-dim p-1">
        <button
          onClick={() => setTab("messages")}
          className={`flex-1 rounded-lg py-2 text-[13.5px] font-semibold ${
            tab === "messages" ? "bg-white text-ink shadow-sm" : "text-ink-muted"
          }`}
        >
          Thông điệp VivaTrip
        </button>
        <button
          onClick={() => setTab("quotes")}
          className={`flex-1 rounded-lg py-2 text-[13.5px] font-semibold ${
            tab === "quotes" ? "bg-white text-ink shadow-sm" : "text-ink-muted"
          }`}
        >
          Quote
        </button>
      </div>

      {tab === "messages" ? <MessagesTab initial={initialMessages} /> : <QuotesTab initial={initialQuotes} />}
    </div>
  );
}

function MessagesTab({ initial }: { initial: MotivationMessage[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [category, setCategory] = useState<MotivationCategory>("pressure");
  const [message, setMessage] = useState("");
  const [actionText, setActionText] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !actionText.trim()) {
      toast.error("Vui lòng nhập đủ thông điệp và việc nhỏ tiếp theo.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/motivation-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, message, action_text: actionText, is_active: true }),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error("Không thể thêm: " + (result.error ?? "Lỗi không xác định"));
      return;
    }
    toast.success("Đã thêm thông điệp");
    setItems((prev) => [
      ...prev,
      {
        id: result.id ?? crypto.randomUUID(),
        category,
        message,
        action_text: actionText,
        is_active: true,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    setMessage("");
    setActionText("");
    router.refresh();
  }

  async function handleToggleActive(item: MotivationMessage) {
    const res = await fetch(`/api/admin/motivation-messages/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    if (!res.ok) {
      toast.error("Không thể cập nhật");
      return;
    }
    setItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, is_active: !m.is_active } : m)));
  }

  async function handleDelete(id: string) {
    setRemovingId(id);
    const res = await fetch(`/api/admin/motivation-messages/${id}`, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) {
      toast.error("Không thể xóa");
      return;
    }
    setItems((prev) => prev.filter((m) => m.id !== id));
    toast.success("Đã xóa");
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <Label htmlFor="m-category">Trạng thái (category)</Label>
            <Select id="m-category" value={category} onChange={(e) => setCategory(e.target.value as MotivationCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c].emoji} {CATEGORY_LABEL[c].label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="m-message">Thông điệp "Dành cho bạn"</Label>
            <textarea
              id="m-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="VD: Không cần giải quyết cả ngày trong vài phút..."
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            />
          </div>
          <div>
            <Label htmlFor="m-action">Việc nhỏ tiếp theo</Label>
            <Input
              id="m-action"
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              placeholder='VD: Ghi lại 1 lý do khách vừa từ chối. (Gõ đúng "focus_mode" nếu category là Tập trung)'
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Plus className="h-4 w-4" />
            Thêm thông điệp
          </Button>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState title="Chưa có thông điệp nào" />
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-white">
          {items.map((m) => (
            <div key={m.id} className="flex items-start gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-teal-dark">
                  {CATEGORY_LABEL[m.category as MotivationCategory]?.emoji ?? ""}{" "}
                  {CATEGORY_LABEL[m.category as MotivationCategory]?.label ?? m.category}
                </p>
                <p className="mt-0.5 text-[13px] text-ink">{m.message}</p>
                <p className="mt-1 text-[12px] text-ink-muted">🎯 {m.action_text}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Checkbox id={`active-${m.id}`} label="Hoạt động" checked={m.is_active} onChange={() => handleToggleActive(m)} />
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={removingId === m.id}
                  className="rounded-lg p-2 text-ink-muted hover:bg-danger-light hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuotesTab({ initial }: { initial: MotivationQuote[] }) {
  const [items, setItems] = useState(initial);
  const [category, setCategory] = useState<MotivationCategory>("pressure");
  const [quoteViText, setQuoteViText] = useState("");
  const [quoteOriginal, setQuoteOriginal] = useState("");
  const [author, setAuthor] = useState("");
  const [source, setSource] = useState("");
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quoteViText.trim()) {
      toast.error("Vui lòng nhập bản tiếng Việt của câu quote.");
      return;
    }
    if (author.trim() && !verified) {
      toast.error('Có tên tác giả thì bắt buộc phải tick "Đã xác minh" mới lưu được — tránh gán nhầm quote cho người khác.');
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/motivation-quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        quote_text_vi: quoteViText,
        quote_text_original: quoteOriginal,
        author,
        source_reference: source,
        is_verified: verified,
        is_active: true,
      }),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error("Không thể thêm: " + (result.error ?? "Lỗi không xác định"));
      return;
    }
    toast.success("Đã thêm quote");
    setItems((prev) => [
      ...prev,
      {
        id: result.id ?? crypto.randomUUID(),
        category,
        quote_text_vi: quoteViText,
        quote_text_original: quoteOriginal || null,
        author: author || null,
        source_reference: source || null,
        is_verified: verified,
        is_active: true,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    setQuoteViText("");
    setQuoteOriginal("");
    setAuthor("");
    setSource("");
    setVerified(false);
  }

  async function handleToggleActive(item: MotivationQuote) {
    await fetch(`/api/admin/motivation-quotes/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    setItems((prev) => prev.map((q) => (q.id === item.id ? { ...q, is_active: !q.is_active } : q)));
  }

  async function handleDelete(id: string) {
    setRemovingId(id);
    const res = await fetch(`/api/admin/motivation-quotes/${id}`, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) {
      toast.error("Không thể xóa");
      return;
    }
    setItems((prev) => prev.filter((q) => q.id !== id));
    toast.success("Đã xóa");
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3 rounded-xl bg-sand-light p-3 text-[12.5px] text-sand-dark">
          Chỉ quote đã tick "Đã xác minh" mới hiện tên tác giả cho Sale — quote chưa xác minh sẽ không hiển
          thị cho tới khi được duyệt, để tránh gán nhầm câu nói cho người khác.
        </div>
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <Label htmlFor="q-category">Trạng thái (category)</Label>
            <Select id="q-category" value={category} onChange={(e) => setCategory(e.target.value as MotivationCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c].emoji} {CATEGORY_LABEL[c].label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="q-vi">Bản tiếng Việt *</Label>
            <textarea
              id="q-vi"
              value={quoteViText}
              onChange={(e) => setQuoteViText(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            />
          </div>
          <div>
            <Label htmlFor="q-original">Câu gốc (nếu có)</Label>
            <Input id="q-original" value={quoteOriginal} onChange={(e) => setQuoteOriginal(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="q-author">Tác giả</Label>
              <Input id="q-author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Để trống nếu chưa chắc" />
            </div>
            <div>
              <Label htmlFor="q-source">Nguồn xác minh</Label>
              <Input id="q-source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Link/sách nguồn" />
            </div>
          </div>
          <Checkbox id="q-verified" label="Đã xác minh (bắt buộc nếu có tên tác giả)" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Plus className="h-4 w-4" />
            Thêm quote
          </Button>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState title="Chưa có quote nào" description='Bình thường — hệ thống vẫn hoạt động tốt chỉ với "Thông điệp VivaTrip".' />
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-white">
          {items.map((q) => (
            <div key={q.id} className="flex items-start gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-teal-dark">
                  {CATEGORY_LABEL[q.category as MotivationCategory]?.emoji ?? ""}{" "}
                  {CATEGORY_LABEL[q.category as MotivationCategory]?.label ?? q.category}
                  {!q.is_verified && (
                    <span className="ml-2 rounded-full bg-paper-dim px-2 py-0.5 text-[10px] text-ink-muted">Chưa xác minh</span>
                  )}
                </p>
                <p className="mt-0.5 text-[13px] text-ink">{q.quote_text_vi}</p>
                {q.author && <p className="mt-1 text-[12px] text-ink-muted">— {q.author}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Checkbox id={`qactive-${q.id}`} label="Hoạt động" checked={q.is_active} onChange={() => handleToggleActive(q)} />
                <button
                  onClick={() => handleDelete(q.id)}
                  disabled={removingId === q.id}
                  className="rounded-lg p-2 text-ink-muted hover:bg-danger-light hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
