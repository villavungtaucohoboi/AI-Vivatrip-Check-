"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, CopyPlus, ExternalLink, FileDown, Link2, Loader2, MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { nightsBetween } from "@/lib/quote-calc";
import { quoteUrl, zaloMessage } from "@/lib/quote-link";
import { emptyOption, newId, type Quote, type QuoteInput, type QuoteOption } from "@/lib/quote-types";
import { applyPick, type ProductPick } from "@/lib/quote-edit";
import { createSaveQueue } from "@/lib/save-queue";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { QuoteDocument } from "@/components/quote/quote-document";
import { OptionEditor } from "@/components/quote/option-editor";
import { Field, NumIn, TextIn, fieldCls } from "@/components/quote/fields";
import { cn } from "@/lib/utils";

type Meta = Pick<Quote, "id" | "code" | "number" | "created_at" | "updated_at">;
type SaveState = "saved" | "dirty" | "saving" | "error";
const SALE_KEY = "vivatrip_quote_sale";

const toInput = (q: Quote): QuoteInput => {
  const { id: _i, code: _c, number: _n, created_at: _ca, updated_at: _ua, ...rest } = q;
  return rest;
};

async function copyText(text: string, ok: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(ok);
  } catch {
    toast.error("Trình duyệt chặn copy — hãy copy thủ công: " + text);
  }
}

export function QuoteEditor({ id }: { id: string }) {
  const router = useRouter();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [q, setQ] = useState<QuoteInput | null>(null);
  const [loadError, setLoadError] = useState("");
  const [save, setSave] = useState<SaveState>("saved");
  const [tab, setTab] = useState(0);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hàng đợi lưu: không gửi 2 lần lưu chồng nhau, luôn lưu bản mới nhất
  const queue = useRef<ReturnType<typeof createSaveQueue<QuoteInput>> | null>(null);
  if (!queue.current) {
    queue.current = createSaveQueue<QuoteInput>(async (body) => {
      const r = await fetch(`/api/quotes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Lỗi lưu");
      setMeta((m) => (m ? { ...m, updated_at: d.quote.updated_at } : m));
    });
  }

  // Tải báo giá
  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Không tải được báo giá");
        const quote = d.quote as Quote;
        const input = toInput(quote);
        // Báo giá mới: tự điền người phụ trách lần trước
        if (!input.sale_name && !input.sale_phone) {
          try {
            const s = JSON.parse(localStorage.getItem(SALE_KEY) ?? "null");
            if (s?.name || s?.phone) {
              input.sale_name = s.name ?? "";
              input.sale_phone = s.phone ?? "";
            }
          } catch {}
        }
        setMeta(quote);
        setQ(input);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Lỗi"));
  }, [id]);

  /** Lưu ngay mọi thay đổi; lỗi → báo và tự thử lại sau 5 giây. Trả true khi đã lưu hết. */
  async function flush(): Promise<boolean> {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const qq = queue.current!;
    if (qq.isClean()) return true;
    setSave("saving");
    const ok = await qq.flush();
    if (ok) {
      setSave(qq.isClean() ? "saved" : "dirty");
      return qq.isClean() || flush();
    }
    setSave("error");
    toast.error("Chưa lưu được — đang thử lại…");
    timer.current = setTimeout(flush, 5000);
    return false;
  }

  // Sửa → tự lưu sau 1,5 giây không gõ. Dạng hàm để luôn áp lên state mới nhất.
  const update = (p: Partial<QuoteInput> | ((cur: QuoteInput) => Partial<QuoteInput>)) => {
    setQ((cur) => {
      if (!cur) return cur;
      const next = { ...cur, ...(typeof p === "function" ? p(cur) : p) };
      queue.current!.set(next);
      return next;
    });
    setSave("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1500);
  };

  // Cảnh báo khi rời trang mà chưa lưu
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (save !== "saved") e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [save]);

  // Nhớ người phụ trách cho lần sau
  useEffect(() => {
    if (!q || (!q.sale_name && !q.sale_phone)) return;
    try {
      localStorage.setItem(SALE_KEY, JSON.stringify({ name: q.sale_name, phone: q.sale_phone }));
    } catch {}
  }, [q?.sale_name, q?.sale_phone]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError)
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <p className="rounded-xl bg-danger-light p-4 text-danger">{loadError}</p>
        <Link href="/bao-gia" className="mt-3 inline-block font-bold text-teal-dark underline">
          Về danh sách báo giá
        </Link>
      </div>
    );
  if (!q || !meta)
    return (
      <div className="flex justify-center p-10 text-ink-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  const url = quoteUrl(meta.code);
  const localUrl = `/bg/${meta.code}`;
  const opts = q.options;
  const cur = opts[Math.min(tab, opts.length - 1)];
  const setOption = (o: QuoteOption) => update((c) => ({ options: c.options.map((x) => (x.id === o.id ? o : x)) }));
  const pickInto = (optionId: string, pick: ProductPick) => update((c) => ({ options: c.options.map((x) => (x.id === optionId ? applyPick(x, pick) : x)) }));
  const nights = nightsBetween(q.program.date_from, q.program.date_to);
  const setProgram = (p: Partial<QuoteInput["program"]>) => update({ program: { ...q.program, ...p } });
  const setCustomer = (c: Partial<QuoteInput["customer"]>) => update({ customer: { ...q.customer, ...c } });

  async function duplicate() {
    if (!(await flush())) return toast.error("Chưa lưu được thay đổi — thử lại sau");
    const r = await fetch(`/api/quotes/${id}/duplicate`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return toast.error(d.error ?? "Không nhân bản được");
    toast.success(`Đã nhân bản thành ${d.quote.number}`);
    router.push(`/bao-gia/${d.quote.id}`);
  }

  const tb = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-[12.5px] font-bold text-ink hover:border-teal";

  return (
    <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5">
      {/* Thanh trên */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href="/bao-gia" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-muted">
          <ArrowLeft className="h-4 w-4" /> Danh sách
        </Link>
        <h1 className="font-display text-[20px] font-bold text-ink">{meta.number}</h1>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-bold",
            save === "saved" ? "bg-emerald-50 text-emerald-700" : save === "error" ? "bg-danger-light text-danger" : "bg-paper-dim text-ink-muted"
          )}
        >
          {save === "saved" ? "Đã lưu" : save === "saving" ? "Đang lưu…" : save === "error" ? "Lỗi lưu" : "Chưa lưu"}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", q.status === "sent" ? "bg-teal-light text-teal-dark" : "bg-paper-dim text-ink-muted")}>
          {q.status === "sent" ? "Đã gửi" : "Nháp"}
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button className={tb} onClick={() => copyText(url, "Đã copy link báo giá")}>
            <Link2 className="h-4 w-4" /> Copy link
          </button>
          <button className={tb} onClick={() => copyText(zaloMessage(q, url), "Đã copy tin nhắn — dán vào Zalo")}>
            <MessageCircle className="h-4 w-4" /> Copy tin Zalo
          </button>
          <a className={tb} href={localUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" /> Bản khách xem
          </a>
          <a className={tb} href={localUrl} target="_blank" rel="noopener noreferrer" title="Mở bản khách xem rồi bấm Tải PDF">
            <FileDown className="h-4 w-4" /> Tải PDF
          </a>
          <button className={tb} onClick={() => update({ status: q.status === "sent" ? "draft" : "sent" })}>
            <Send className="h-4 w-4" /> {q.status === "sent" ? "Chuyển về nháp" : "Đánh dấu đã gửi"}
          </button>
          <button className={tb} onClick={duplicate}>
            <CopyPlus className="h-4 w-4" /> Nhân bản
          </button>
        </div>
      </div>

      {/* Điện thoại / máy nhỏ: chuyển Soạn ↔ Xem trước */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-paper-dim p-1 xl:hidden">
        {(["edit", "preview"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cn("h-9 rounded-lg text-[13px] font-bold", view === v ? "bg-white text-ink shadow-card" : "text-ink-muted")}>
            {v === "edit" ? "Soạn" : "Xem trước"}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Form */}
        <div className={cn("min-w-0 space-y-4", view === "preview" && "hidden xl:block")}>
          <Box title="Khách hàng">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Tên khách">
                <TextIn value={q.customer.name} onChange={(v) => setCustomer({ name: v })} placeholder="VD: Chị Lan" />
              </Field>
              <Field label="Công ty / đoàn">
                <TextIn value={q.customer.company} onChange={(v) => setCustomer({ company: v })} placeholder="VD: Công ty Iris" />
              </Field>
              <Field label="Số điện thoại">
                <TextIn value={q.customer.phone} onChange={(v) => setCustomer({ phone: v })} />
              </Field>
              <Field label="Email">
                <TextIn value={q.customer.email} onChange={(v) => setCustomer({ email: v })} />
              </Field>
            </div>
          </Box>

          <Box title="Chương trình">
            <div className="grid gap-2 sm:grid-cols-4">
              <Field label="Tên chương trình" className="sm:col-span-4">
                <TextIn value={q.program.title} onChange={(v) => setProgram({ title: v })} placeholder="VD: Hà Nội 2N1Đ" />
              </Field>
              <Field label="Ngày đi">
                <TextIn type="date" value={q.program.date_from ?? ""} onChange={(v) => setProgram({ date_from: v || null })} />
              </Field>
              <Field label={`Ngày về${nights ? ` · ${nights} đêm` : ""}`}>
                <TextIn type="date" value={q.program.date_to ?? ""} onChange={(v) => setProgram({ date_to: v || null })} />
              </Field>
              <Field label="Số khách (chữ)">
                <TextIn value={q.program.pax_text} onChange={(v) => setProgram({ pax_text: v })} placeholder="VD: 20 người lớn" />
              </Field>
              <Field label="Số khách (để tính giá/khách)">
                <NumIn value={q.program.pax_count} onChange={(v) => setProgram({ pax_count: v })} placeholder="VD: 20" />
              </Field>
              <Field label="Lịch trình tóm tắt (tuỳ chọn)" className="sm:col-span-4">
                <textarea
                  value={q.program.itinerary_note}
                  onChange={(e) => setProgram({ itinerary_note: e.target.value })}
                  rows={2}
                  className={cn(fieldCls, "h-auto py-2")}
                />
              </Field>
            </div>
          </Box>

          <Box title="Phương án">
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {opts.map((o, i) => (
                <button
                  key={o.id}
                  onClick={() => setTab(i)}
                  className={cn("h-9 rounded-lg px-3 text-[13px] font-bold", i === tab ? "bg-teal text-white" : "border border-border bg-white text-ink")}
                >
                  {o.name || `Phương án ${i + 1}`}
                </button>
              ))}
              <select
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const copy = e.target.value === "copy" && cur;
                  const o: QuoteOption = copy
                    ? { ...structuredClone(cur), id: newId(), name: `${cur.name || "Phương án"} (bản sao)`, items: cur.items.map((it) => ({ ...it, id: newId() })) }
                    : emptyOption();
                  update({ options: [...opts, o] });
                  setTab(opts.length);
                }}
                className="h-9 rounded-lg border border-dashed border-teal bg-white px-2 text-[13px] font-bold text-teal-dark"
                aria-label="Thêm phương án"
              >
                <option value="">+ Phương án</option>
                <option value="new">Phương án trống</option>
                {cur && <option value="copy">Chép từ “{cur.name || `Phương án ${tab + 1}`}”</option>}
              </select>
              {cur && opts.length > 1 && (
                <span className="ml-auto flex gap-1">
                  <IconBtn label="Đưa lên" onClick={() => moveOpt(-1)} icon={<ArrowUp className="h-4 w-4" />} />
                  <IconBtn label="Đưa xuống" onClick={() => moveOpt(1)} icon={<ArrowDown className="h-4 w-4" />} />
                  <IconBtn label="Xoá phương án" danger onClick={() => setConfirmDel(tab)} icon={<Trash2 className="h-4 w-4" />} />
                </span>
              )}
            </div>
            {cur ? (
              <OptionEditor option={cur} onChange={setOption} onPick={(pick) => pickInto(cur.id, pick)} from={q.program.date_from} to={q.program.date_to} vatRate={q.vat_rate} paxCount={q.program.pax_count} />
            ) : (
              <button onClick={() => update({ options: [emptyOption()] })} className={tb}>
                <Plus className="h-4 w-4" /> Thêm phương án
              </button>
            )}
          </Box>

          <Box title="Người phụ trách, hiệu lực, VAT">
            <div className="grid gap-2 sm:grid-cols-4">
              <Field label="Người phụ trách">
                <TextIn value={q.sale_name} onChange={(v) => update({ sale_name: v })} />
              </Field>
              <Field label="SĐT / Zalo">
                <TextIn value={q.sale_phone} onChange={(v) => update({ sale_phone: v })} />
              </Field>
              <Field label="Hiệu lực đến">
                <TextIn type="date" value={q.valid_until ?? ""} onChange={(v) => update({ valid_until: v || null })} />
              </Field>
              <Field label="VAT (%)">
                <NumIn value={q.vat_rate} onChange={(v) => update({ vat_rate: v ?? 0 })} />
              </Field>
            </div>
          </Box>

          <Box title="Ghi chú cuối báo giá">
            <div className="space-y-1.5">
              {q.notes.map((n, i) => (
                <div key={i} className="flex gap-1.5">
                  <TextIn value={n} onChange={(v) => update({ notes: q.notes.map((x, k) => (k === i ? v : x)) })} />
                  <IconBtn label="Xoá ghi chú" danger onClick={() => update({ notes: q.notes.filter((_, k) => k !== i) })} icon={<Trash2 className="h-4 w-4" />} />
                </div>
              ))}
              <button onClick={() => update({ notes: [...q.notes, ""] })} className={tb}>
                <Plus className="h-4 w-4" /> Thêm ghi chú
              </button>
            </div>
          </Box>
        </div>

        {/* Xem trước */}
        <div className={cn("min-w-0", view === "edit" && "hidden xl:block")}>
          <div className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-auto xl:rounded-2xl xl:bg-paper-dim xl:p-3">
            <p className="mb-2 hidden items-center gap-1 text-[12px] font-bold text-ink-muted xl:flex">
              <Copy className="h-3.5 w-3.5" /> Xem trước — đúng như khách thấy
            </p>
            <QuoteDocument quote={{ ...q, number: meta.number, created_at: meta.created_at, updated_at: meta.updated_at }} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel !== null}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá phương án?"
        description={`Xoá “${confirmDel !== null ? opts[confirmDel]?.name || `Phương án ${confirmDel + 1}` : ""}” khỏi báo giá.`}
        onConfirm={async () => {
          if (confirmDel === null) return;
          update({ options: opts.filter((_, k) => k !== confirmDel) });
          setTab(0);
          setConfirmDel(null);
        }}
      />
    </div>
  );

  function moveOpt(d: -1 | 1) {
    const j = tab + d;
    if (!q || j < 0 || j >= q.options.length) return;
    const n = [...q.options];
    [n[tab], n[j]] = [n[j], n[tab]];
    update({ options: n });
    setTab(j);
  }
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-3.5 sm:p-4">
      <h2 className="mb-2.5 text-[12px] font-extrabold uppercase tracking-wider text-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

function IconBtn({ label, onClick, icon, danger }: { label: string; onClick: () => void; icon: React.ReactNode; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white", danger ? "text-danger" : "text-ink-muted")}>
      {icon}
    </button>
  );
}
