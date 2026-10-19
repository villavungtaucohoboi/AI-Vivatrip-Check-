"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, Copy, FileSpreadsheet, Globe2, Pencil, Plane, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useClientRole } from "@/lib/use-client-role";
import {
  WD,
  copyTitle,
  dm,
  dmy,
  flagOf,
  fmt,
  isFull,
  kk,
  left,
  matchTour,
  minFrom,
  parseTourQuery,
  quoteCalc,
  routeKeyOf,
  titleCase,
  tourText,
  upcoming,
  weekday,
  type QuoteInput,
} from "@/lib/tour-utils";
import type { TourWithDeps } from "@/lib/tour-types";
import { cn } from "@/lib/utils";

async function copyToClipboard(s: string) {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = s;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function ToursExperience({ tours, today, loadError }: { tours: TourWithDeps[]; today: string; loadError?: string }) {
  const role = useClientRole();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [country, setCountry] = useState("");
  const [month, setMonth] = useState("");
  const [routeKey, setRouteKey] = useState<string | null>(null);
  const [tourId, setTourId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Gộp theo tuyến: cùng chương trình nhiều đối tác → hiện bên RẺ NHẤT (còn chỗ) trong tháng đang lọc
  const routes = useMemo(() => {
    const by = new Map<string, TourWithDeps[]>();
    for (const t of tours) {
      const k = routeKeyOf(t);
      by.set(k, [...(by.get(k) ?? []), t]);
    }
    return [...by.entries()].map(([key, list]) => {
      const sorted = [...list].sort((a, b) => (minFrom(a.departures, today, month) ?? 1e12) - (minFrom(b.departures, today, month) ?? 1e12));
      return { key, best: sorted[0], others: sorted.slice(1) };
    });
  }, [tours, today, month]);

  const pq = useMemo(() => parseTourQuery(q), [q]);
  const fromEff = from || pq.from;
  const list = useMemo(() => {
    let rs = routes
      .filter((r) => (!fromEff || r.best.from_city === fromEff) && (!country || r.best.country === country) && minFrom(r.best.departures, today, month) != null)
      .map((r) => {
        const m = matchTour(r.best, pq.terms);
        return { ...r, m, hits: m.filter((x) => x.ok).length };
      });
    if (pq.terms.length) rs = rs.filter((r) => r.hits > 0);
    rs.sort((a, b) => b.hits - a.hits || (minFrom(a.best.departures, today, month) ?? 0) - (minFrom(b.best.departures, today, month) ?? 0));
    return rs;
  }, [routes, fromEff, country, month, pq, today]);
  const fullCount = list.filter((r) => r.hits === pq.terms.length).length;

  const froms = useMemo(() => [...new Set(tours.map((t) => t.from_city))].sort(), [tours]);
  const countries = useMemo(() => [...new Set(tours.map((t) => t.country).filter(Boolean))].sort(), [tours]);
  const months = useMemo(
    () => [...new Set(tours.flatMap((t) => upcoming(t.departures, today).map((d) => d.depart_date.slice(0, 7))))].sort().slice(0, 8),
    [tours, today]
  );

  // Chọn sẵn tuyến đầu tiên (desktop)
  const route = routes.find((r) => r.key === routeKey) ?? null;
  const tour = (route && [route.best, ...route.others].find((t) => t.id === tourId)) ?? route?.best ?? null;
  useEffect(() => {
    if (!routeKey && list[0] && window.matchMedia("(min-width: 1024px)").matches) setRouteKey(list[0].key);
  }, [list, routeKey]);

  const openRoute = (k: string) => {
    setRouteKey(k);
    setTourId(null);
    if (!window.matchMedia("(min-width: 1024px)").matches) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const chip = (on: boolean) =>
    cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors", on ? "bg-teal text-white" : "border border-border bg-white text-ink-muted hover:text-ink");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink sm:text-3xl">
            <Globe2 className="h-7 w-7 text-teal" /> Tour nước ngoài
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">Gõ các điểm khách muốn đi — web tìm lịch trình đi qua đủ các điểm. Mọi phần đều có nút copy gửi Zalo.</p>
        </div>
        {role === "admin" && (
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/tours/new" className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal to-sand px-3.5 text-[13px] font-bold text-white">
              <Plus className="h-4 w-4" /> Thêm tour
            </Link>
            <Link href="/admin/tours/excel" className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 text-[13px] font-bold text-ink">
              <FileSpreadsheet className="h-4 w-4" /> Up Excel giá & chỗ
            </Link>
            <Link href="/admin/tours" className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 text-[13px] font-bold text-ink">
              <Pencil className="h-4 w-4" /> Quản lý tour
            </Link>
          </div>
        )}
      </div>

      {loadError && <p className="rounded-xl bg-amber-50 p-3 text-[13px] font-semibold text-amber-800">{loadError}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,370px)_minmax(0,1fr)] lg:items-start">
        {/* ===== Cột trái: tìm + danh sách ===== */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-20">
          <div className="space-y-2.5 rounded-2xl border border-border bg-white p-3 shadow-card">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="VD: Busan - Tokyo, Nami, Phú Sĩ từ HCM…"
                className="h-11 w-full rounded-xl border border-border bg-paper pl-9 pr-3 text-[14px] outline-none focus:border-teal"
              />
            </label>
            <Row label="Khởi hành từ">
              <button className={chip(!from)} onClick={() => setFrom("")}>Mọi nơi</button>
              {froms.map((f) => (
                <button key={f} className={chip(from === f)} onClick={() => setFrom(f)}>{f}</button>
              ))}
            </Row>
            {countries.length > 1 && (
              <Row label="Nước">
                <button className={chip(!country)} onClick={() => setCountry("")}>Tất cả</button>
                {countries.map((c) => (
                  <button key={c} className={chip(country === c)} onClick={() => setCountry(c)}>{c}</button>
                ))}
              </Row>
            )}
            {months.length > 0 && (
              <Row label="Tháng đi">
                <button className={chip(!month)} onClick={() => setMonth("")}>Mọi tháng</button>
                {months.map((m) => (
                  <button key={m} className={chip(month === m)} onClick={() => setMonth(m)}>
                    T{Number(m.slice(5))}
                    {m.slice(0, 4) !== today.slice(0, 4) ? `/${m.slice(2, 4)}` : ""}
                  </button>
                ))}
              </Row>
            )}
          </div>

          {pq.terms.length > 0 && (
            <p className="px-1 text-[12.5px] text-ink-muted">
              <b className="text-ink">{fullCount}</b> tour đi qua đủ {pq.terms.length} điểm
              {list.length > fullCount ? ` · ${list.length - fullCount} tour khớp một phần` : ""}
              {pq.from && !from ? ` · khởi hành ${pq.from}` : ""}
            </p>
          )}

          <div className="space-y-2 lg:max-h-[calc(100vh-330px)] lg:overflow-y-auto lg:pr-1">
            {list.map((r) => {
              const t = r.best;
              const fromP = minFrom(t.departures, today, month);
              const next = upcoming(t.departures, today).filter((d) => !isFull(d) && (!month || d.depart_date.slice(0, 7) === month));
              const on = route?.key === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => openRoute(r.key)}
                  className={cn(
                    "flex w-full gap-3 rounded-2xl border bg-white p-2.5 text-left transition-shadow hover:shadow-card",
                    on ? "border-teal ring-2 ring-teal/15" : "border-border"
                  )}
                >
                  <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-teal-light to-sand-light text-3xl">
                    {t.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      flagOf(t)
                    )}
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="line-clamp-2 block text-[14px] font-bold leading-snug text-ink">
                      {t.name} {t.days ? <span className="text-teal-dark">{t.days}N{t.nights ?? t.days - 1}Đ</span> : null}
                    </span>
                    <span className="line-clamp-1 block text-[11.5px] text-ink-muted">
                      <span className="mr-1 rounded bg-teal-light px-1 font-bold text-teal-dark">từ {t.from_city}</span>
                      {t.route_text}
                    </span>
                    {pq.terms.length > 0 && (
                      <span className="flex flex-wrap gap-1">
                        {r.m.map((x) => (
                          <span
                            key={x.term}
                            className={cn("rounded px-1.5 text-[10.5px] font-bold", x.ok ? "bg-emerald-50 text-emerald-700" : "bg-paper-dim text-ink-muted line-through")}
                          >
                            {x.ok ? "✓" : "✗"} {titleCase(x.term)}
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="block text-[11.5px] text-ink-muted tabular-nums">
                      {t.airline ? `✈ ${t.airline} · ` : ""}📅 {next.slice(0, 4).map((d) => dm(d.depart_date)).join(", ")}
                      {next.length > 4 ? "…" : ""}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[15px] font-extrabold text-hot tabular-nums">từ {kk(fromP)}</span>
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-800">
                        {t.partner || "—"}
                        {r.others.length ? ` · +${r.others.length} đối tác` : ""}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
            {!list.length && (
              <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-[13px] text-ink-muted">
                {tours.length ? "Chưa có tour khớp. Thử bớt điểm đến hoặc đổi nơi khởi hành." : "Chưa có tour nào. Admin bấm “Thêm tour” để AI đọc link lịch trình của đối tác."}
              </p>
            )}
          </div>
        </aside>

        {/* ===== Cột phải: chi tiết ===== */}
        <div ref={detailRef} className="min-w-0 scroll-mt-20">
          {tour && route ? (
            <TourDetail
              key={tour.id}
              tour={tour}
              partners={[route.best, ...route.others]}
              today={today}
              month={month}
              isAdmin={role === "admin"}
              onPickPartner={setTourId}
              onBack={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />
          ) : (
            <div className="hidden h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-white text-[13px] text-ink-muted lg:flex">
              Chọn 1 tour bên trái để xem lịch trình, giá và copy gửi khách.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function CopyBtn({ kind, label = "Copy", onCopy, active, small }: { kind: string; label?: string; onCopy: (k: string) => void; active: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onCopy(kind);
      }}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border font-bold transition-colors",
        small ? "h-7 px-2 text-[11px]" : "h-8 px-2.5 text-[12px]",
        active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-border bg-white text-ink hover:border-teal hover:text-teal-dark"
      )}
    >
      {active ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function Section({ title, action, children, tone }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; tone?: "ok" | "hot" | "sale" }) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border p-3.5 sm:p-4",
        tone === "sale" ? "border-amber-200 bg-amber-50/60" : "border-border bg-white"
      )}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <h3
          className={cn(
            "text-[12px] font-extrabold uppercase tracking-wider",
            tone === "ok" ? "text-emerald-700" : tone === "hot" ? "text-hot" : tone === "sale" ? "text-amber-800" : "text-ink-muted"
          )}
        >
          {title}
        </h3>
        {action && <div className="flex flex-wrap gap-1.5">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function TourDetail({
  tour: t,
  partners,
  today,
  month,
  isAdmin,
  onPickPartner,
  onBack,
}: {
  tour: TourWithDeps;
  partners: TourWithDeps[];
  today: string;
  month: string;
  isAdmin: boolean;
  onPickPartner: (id: string) => void;
  onBack: () => void;
}) {
  const ups = upcoming(t.departures, today);
  const firstOpen = ups.find((d) => !isFull(d) && (!month || d.depart_date.slice(0, 7) === month)) ?? ups[0];
  const [q, setQ] = useState<QuoteInput>({ date: firstOpen?.depart_date ?? "", adult: 2, child: 0, infant: 0, single: 0, visa: 0 });
  const [copied, setCopied] = useState<{ kind: string; text: string } | null>(null);
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([0]));
  const k = quoteCalc(t, q);
  const hasCom = ups.some((d) => d.com != null);

  async function onCopy(kind: string) {
    const s = tourText(kind, t, today, q);
    const ok = await copyToClipboard(s);
    setCopied({ kind, text: s });
    if (ok) toast.success(`Đã copy ${copyTitle(kind)} — dán vào Zalo`);
    else toast.error("Trình duyệt chặn copy — bôi đen nội dung ở cuối trang rồi Ctrl+C");
  }
  const cb = (kind: string, label?: string, small?: boolean) => <CopyBtn kind={kind} label={label} small={small} onCopy={onCopy} active={copied?.kind === kind} />;

  const num = (key: keyof QuoteInput, label: string) => (
    <label className="text-[11px] font-semibold text-ink-muted">
      {label}
      <input
        type="number"
        min={0}
        value={q[key] as number}
        onChange={(e) => setQ((s) => ({ ...s, [key]: Math.max(0, Number(e.target.value) || 0) }))}
        className="mt-0.5 h-10 w-full rounded-lg border border-border bg-white px-2.5 text-[14px] text-ink outline-none focus:border-teal"
      />
    </label>
  );

  const ds = [...new Set(partners.flatMap((p) => upcoming(p.departures, today).map((d) => d.depart_date)))].sort().slice(0, 7);

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1 text-[12.5px] font-semibold text-ink-muted lg:hidden">
        <ArrowLeft className="h-4 w-4" /> Danh sách tour
      </button>

      {/* Đầu tour */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        <div className="bg-gradient-to-r from-teal-light via-white to-sand-light p-4 sm:p-5">
          <p className="text-[12.5px] font-bold text-teal-dark">
            {flagOf(t)} {t.country} · {t.days ? `${t.days} ngày ${t.nights ?? t.days - 1} đêm` : ""} · khởi hành {t.from_city}
          </p>
          <h2 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink sm:text-[26px]">{t.name}</h2>
          {t.route_text && <p className="mt-1 text-[13px] text-ink-muted">{t.route_text}</p>}
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[12px]">
            {t.airline && (
              <span className="flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1"><Plane className="h-3.5 w-3.5" /> {t.airline}</span>
            )}
            {t.flights && <span className="rounded-lg bg-white/80 px-2 py-1">🕑 {t.flights}</span>}
            {t.group_label && (
              <span className="flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1"><Users className="h-3.5 w-3.5" /> {t.group_label}</span>
            )}
            {isAdmin && (
              <Link href={`/admin/tours/${t.id}`} className="flex items-center gap-1 rounded-lg bg-ink px-2 py-1 font-bold text-white">
                <Pencil className="h-3.5 w-3.5" /> Sửa tour
              </Link>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 border-t border-border p-3 sm:grid-cols-3">
          {[
            ["intro", "Tin chào tour", "Điểm nhấn + giá từ + ngày đi"],
            ["quote", "Báo giá theo ngày", "Đúng ngày & số khách bên dưới"],
            ["all", "Copy toàn bộ tour", "Chào + lịch trình + giá gồm + visa"],
          ].map(([kind, title, sub], i) => (
            <button
              key={kind}
              onClick={() => onCopy(kind)}
              className={cn(
                "rounded-xl px-3 py-2.5 text-left transition-shadow hover:shadow-card",
                i === 0 ? "bg-gradient-to-r from-teal to-sand text-white" : "border border-border bg-white text-ink",
                copied?.kind === kind && i !== 0 && "border-emerald-500 ring-2 ring-emerald-100"
              )}
            >
              <span className="flex items-center gap-1.5 text-[13.5px] font-bold">
                {copied?.kind === kind ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {title}
              </span>
              <span className={cn("block text-[11.5px]", i === 0 ? "text-white/85" : "text-ink-muted")}>{sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ngày khởi hành */}
      <Section
        title={<>Ngày khởi hành · giá NL{hasCom ? " · com · chỗ" : ""}</>}
        action={
          <>
            {cb("dates", "Copy lịch & giá")}
            {isAdmin && (
              <Link href={`/admin/tours/${t.id}#dates`} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-white px-2.5 text-[12px] font-bold text-ink">
                <Plus className="h-3.5 w-3.5" /> Mở thêm ngày
              </Link>
            )}
          </>
        }
      >
        {ups.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-1.5">
            {ups.map((d) => {
              const l = left(d);
              const full = isFull(d);
              const on = d.depart_date === q.date;
              return (
                <button
                  key={d.depart_date}
                  onClick={() => setQ((s) => ({ ...s, date: d.depart_date }))}
                  className={cn(
                    "rounded-xl border px-2 py-1.5 text-left tabular-nums transition-colors",
                    on ? "border-teal bg-teal-light" : full ? "border-border bg-paper-dim/60 opacity-60" : "border-border bg-white hover:border-teal/50"
                  )}
                >
                  <span className="flex items-center gap-1 text-[13.5px] font-bold text-ink">
                    {dm(d.depart_date)}
                    <span className="text-[10px] font-semibold text-ink-muted">{WD[weekday(d.depart_date)]}</span>
                    {d.tag && <span className="rounded bg-sand px-1 text-[9px] font-extrabold text-white">{d.tag}</span>}
                  </span>
                  {d.old_adult ? <span className="block text-[10px] text-ink-muted line-through">{kk(d.old_adult)}</span> : null}
                  <span className="block text-[12.5px] font-extrabold text-hot">{kk(d.adult)}</span>
                  {d.com != null && <span className="block text-[10px] font-bold text-amber-700">com {kk(d.com)}</span>}
                  {l != null && (
                    <span className={cn("block text-[10px] font-extrabold", full ? "text-ink-muted" : l <= 5 ? "text-amber-600" : "text-emerald-700")}>
                      {full ? "Hết chỗ" : `còn ${l}/${d.seats}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-ink-muted">Chưa có ngày khởi hành sắp tới.</p>
        )}
      </Section>

      {/* Tính giá */}
      <Section title="Tính giá theo số khách" action={cb("quote", "Copy báo giá")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {num("adult", "Người lớn")}
          {num("child", "Trẻ em")}
          {num("infant", "Em bé")}
          {num("single", "Phòng đơn")}
          {num("visa", t.visa_discount ? `Có visa (−${kk(t.visa_discount)})` : "Đã có visa")}
        </div>
        {k ? (
          <div className="mt-3 space-y-2 border-t border-dashed border-border pt-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 tabular-nums">
              <span className="text-[12.5px] text-ink-muted">
                {dmy(q.date)} · NL {fmt(k.d.adult)}
                {k.d.child != null ? ` · TE ${fmt(k.d.child)}` : " · TE: hỏi đối tác"}
                {k.d.infant != null ? ` · EB ${fmt(k.d.infant)}` : ""}
                {isFull(k.d) ? <b className="text-hot"> · HẾT CHỖ</b> : left(k.d) != null ? ` · còn ${left(k.d)} chỗ` : ""}
              </span>
              <span className="text-[24px] font-extrabold text-hot">{fmt(k.total)}đ</span>
            </div>
            {k.d.com != null && (
              <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12.5px] font-semibold text-amber-800 tabular-nums">
                💼 CHỈ SALE · Com {fmt(k.d.com)}đ × {q.adult + q.child} khách = <b className="text-[14px]">{fmt(k.com)}đ</b> · Net trả đối tác {fmt(k.total - k.com)}đ
              </p>
            )}
            {q.single > 0 && t.single_usd ? (
              <p className="text-[12px] text-ink-muted">+ Phòng đơn {q.single} × {t.single_usd} USD × {t.nights} đêm (thu thêm theo tỷ giá)</p>
            ) : null}
          </div>
        ) : null}
      </Section>

      {t.highlights.length > 0 && (
        <Section title="Điểm nhấn" action={cb("highlights")}>
          <ul className="grid gap-1 text-[13.5px] text-ink sm:grid-cols-2">
            {t.highlights.map((h) => (
              <li key={h}>✅ {h}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Lịch trình */}
      <Section title={`Lịch trình ${t.itinerary.length} ngày`} action={cb("itin", "Copy cả lịch trình")}>
        <div className="space-y-1.5">
          {t.itinerary.map((d, i) => {
            const open = openDays.has(i);
            return (
              <div key={i} className="rounded-xl border border-border">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenDays((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                  onKeyDown={(e) => e.key === "Enter" && setOpenDays((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                  className="flex cursor-pointer items-center gap-2 px-2.5 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-light text-[12px] font-extrabold text-teal-dark">N{i + 1}</span>
                  <span className="min-w-0 flex-1 text-[13.5px] font-bold text-ink">{d.t}</span>
                  {d.meals && <span className="hidden shrink-0 rounded-md bg-emerald-50 px-1.5 text-[11px] font-bold text-emerald-700 sm:inline">🍽 {d.meals}</span>}
                  {cb(`day${i}`, "", true)}
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-muted transition-transform", open && "rotate-180")} />
                </div>
                {open && (
                  <div className="space-y-1 px-3 pb-2.5 pl-[52px] text-[13px] text-ink">
                    {d.meals && <p className="text-[11.5px] font-semibold text-emerald-700 sm:hidden">🍽 {d.meals}</p>}
                    {d.items.filter(Boolean).map((x, j) => (
                      <p key={j}>• {x}</p>
                    ))}
                    {d.hotel && <p className="text-[12px] text-ink-muted">🏨 {d.hotel}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid gap-3 md:grid-cols-2 md:items-start">
        <Section title="Giá bao gồm" tone="ok" action={cb("incl")}>
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-ink">{t.includes.map((x) => <li key={x}>{x}</li>)}</ul>
        </Section>
        <Section title="Không bao gồm" tone="hot" action={<>{cb("excl")}{cb("inclexcl", "Cả 2")}</>}>
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-ink">{t.excludes.map((x) => <li key={x}>{x}</li>)}</ul>
        </Section>
      </div>

      {t.visa_notes.length > 0 && (
        <Section title="Visa & lưu ý cho khách" action={cb("visa")}>
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-ink">{t.visa_notes.map((x) => <li key={x}>{x}</li>)}</ul>
        </Section>
      )}

      {partners.length > 1 && (
        <Section tone="sale" title={<>So giá đối tác cùng tuyến <span className="ml-1 rounded bg-amber-600 px-1.5 py-0.5 text-[9.5px] text-white">CHỈ SALE</span></>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[12.5px] tabular-nums">
              <thead>
                <tr className="text-left text-[10.5px] uppercase text-ink-muted">
                  <th className="py-1 pr-2">Đối tác</th>
                  <th className="py-1 pr-2">Hãng bay</th>
                  {ds.map((d) => (
                    <th key={d} className="py-1 text-right">{dm(d)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="border-t border-amber-200/70">
                    <td className="py-1.5 pr-2">
                      <button
                        onClick={() => onPickPartner(p.id)}
                        className={cn("rounded-full px-2.5 py-1 text-[12px] font-bold", p.id === t.id ? "bg-teal text-white" : "border border-border bg-white text-ink")}
                      >
                        {p.partner || "—"}
                        {p.name !== t.name ? ` · ${p.name.replace(t.name, "").replace(/[()]/g, "").trim() || ""}` : ""}
                      </button>
                    </td>
                    <td className="py-1.5 pr-2">{p.airline}</td>
                    {ds.map((d) => {
                      const x = p.departures.find((y) => y.depart_date === d);
                      const min = Math.min(...partners.map((pp) => { const y = pp.departures.find((z) => z.depart_date === d); return y && !isFull(y) ? y.adult : 1e12; }));
                      return (
                        <td key={d} className={cn("py-1.5 text-right", x && !isFull(x) && x.adult === min && "font-extrabold text-emerald-700")}>
                          {x ? (isFull(x) ? <span className="text-ink-muted">hết</span> : kk(x.adult)) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-muted">Xanh = rẻ nhất còn chỗ ngày đó. Danh sách tự hiện đối tác rẻ nhất.</p>
        </Section>
      )}

      {(t.sale_terms.length > 0 || t.partner) && (
        <Section tone="sale" title={<>Điều khoản cho Sale <span className="ml-1 rounded bg-amber-600 px-1.5 py-0.5 text-[9.5px] text-white">CHỈ SALE</span></>}>
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-ink">
            {t.sale_terms.map((x) => <li key={x}>{x}</li>)}
            <li>
              Nguồn: <b>{t.partner || "—"}</b>
              {t.partner_file ? ` · ${t.partner_file}` : ""}
              {t.source_link && (
                <>
                  {" · "}
                  <a href={t.source_link} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-dark underline">mở file gốc</a>
                </>
              )}
            </li>
          </ul>
        </Section>
      )}

      {copied && (
        <Section title={`Vừa copy: ${copyTitle(copied.kind)}`}>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-paper p-3 font-sans text-[12.5px] text-ink">{copied.text}</pre>
        </Section>
      )}
    </div>
  );
}
