"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyPlus, Eye, FileText, Link2, Loader2, LogOut, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { quoteUrl } from "@/lib/quote-link";
import type { QuoteSummary } from "@/lib/quote-types";
import { vnd } from "@/lib/tour-utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { fieldCls } from "@/components/quote/fields";
import { cn } from "@/lib/utils";

const dmy = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

export function QuoteList() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<QuoteSummary[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<QuoteSummary | null>(null);

  const load = (term: string) =>
    fetch(`/api/quotes?q=${encodeURIComponent(term)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Không tải được danh sách");
        setRows(d.quotes);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));

  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function create() {
    setBusy(true);
    const r = await fetch("/api/quotes", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toast.error(d.error ?? "Không tạo được báo giá");
    router.push(`/bao-gia/${d.quote.id}`);
  }

  async function duplicate(id: string) {
    const r = await fetch(`/api/quotes/${id}/duplicate`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(d.error ?? "Không nhân bản được");
    router.push(`/bao-gia/${d.quote.id}`);
  }

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(quoteUrl(code));
      toast.success("Đã copy link báo giá");
    } catch {
      toast.error(quoteUrl(code));
    }
  }

  const act = "flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-ink-muted hover:border-teal hover:text-teal-dark";

  return (
    <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="flex items-center gap-2 font-display text-[24px] font-bold text-ink">
          <FileText className="h-6 w-6 text-teal" /> Báo giá
        </h1>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/bao-gia/xem-mau" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-white px-3 text-[13px] font-bold text-ink">
            <Eye className="h-4 w-4" /> Xem mẫu
          </Link>
          <button onClick={create} disabled={busy} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal px-4 text-[13.5px] font-bold text-white disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Báo giá mới
          </button>
          <button
            onClick={async () => {
              await fetch("/api/quotes/login", { method: "DELETE" });
              router.replace("/bao-gia/login");
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold text-ink-muted"
          >
            <LogOut className="h-4 w-4" /> Đăng xuất
          </button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo số BG, khách, công ty, chương trình…" className={cn(fieldCls, "h-10 pl-9")} />
      </div>

      {error && <p className="rounded-xl bg-danger-light p-3 text-[13.5px] text-danger">{error}</p>}
      {!rows && !error && (
        <div className="flex justify-center p-10 text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {rows && rows.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-ink-muted">{q ? "Không có báo giá khớp." : "Chưa có báo giá nào. Bấm “Báo giá mới” để bắt đầu."}</p>}

      <div className="space-y-2">
        {rows?.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white p-3 hover:shadow-card">
            <Link href={`/bao-gia/${r.id}`} className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-ink">
                {r.number}
                <span className={cn("rounded-full px-2 py-0.5 text-[10.5px]", r.status === "sent" ? "bg-teal-light text-teal-dark" : "bg-paper-dim text-ink-muted")}>{r.status === "sent" ? "Đã gửi" : "Nháp"}</span>
              </p>
              <p className="truncate text-[13px] text-ink">
                {[r.customer.company || r.customer.name, r.program.title].filter(Boolean).join(" · ") || <span className="text-ink-muted">(chưa nhập khách / chương trình)</span>}
              </p>
              <p className="text-[12px] text-ink-muted">
                {[r.program.date_from && `${dmy(r.program.date_from)}${r.program.date_to ? ` – ${dmy(r.program.date_to)}` : ""}`, `${r.optionCount} phương án`, r.minTotal != null && `từ ${vnd(r.minTotal)}`, `sửa ${dmy(r.updated_at)}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </Link>
            <div className="flex gap-1.5">
              <button className={act} title="Copy link" aria-label="Copy link" onClick={() => copyLink(r.code)}>
                <Link2 className="h-4 w-4" />
              </button>
              <button className={act} title="Nhân bản" aria-label="Nhân bản" onClick={() => duplicate(r.id)}>
                <CopyPlus className="h-4 w-4" />
              </button>
              <button className={cn(act, "text-danger")} title="Xoá" aria-label="Xoá" onClick={() => setDel(r)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Xoá báo giá?"
        description={`Xoá ${del?.number ?? ""}. Link đã gửi khách sẽ không mở được nữa.`}
        onConfirm={async () => {
          if (!del) return;
          const r = await fetch(`/api/quotes/${del.id}`, { method: "DELETE" });
          if (!r.ok) toast.error("Không xoá được");
          setDel(null);
          load(q.trim());
        }}
      />
    </main>
  );
}
