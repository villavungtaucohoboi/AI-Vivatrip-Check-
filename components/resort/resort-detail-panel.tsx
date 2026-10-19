"use client";

import { useState } from "react";
import { Copy, ExternalLink, FileText, Gift, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { NoteView } from "@/components/note-view";
import { ResortRatesTable } from "@/components/resort/resort-rates-table";
import { PhotoShareButtons } from "@/components/resort/photo-share-buttons";
import { Collapsible } from "@/components/resort/resort-result-card";
import { resortPriceQuoteText, resortQuoteText } from "@/lib/resort-text";
import { quoteStay } from "@/lib/resort-pricing";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { minRatePrice } from "@/lib/resort-pricing";
import { sourceLabel } from "@/lib/hotel-group";
import type { Holiday, HotelRate, Product } from "@/lib/types";

/** Phần giá + gửi khách trên trang chi tiết resort / khách sạn. */
export function ResortDetailPanel({
  product,
  rates,
  holidays,
  images,
  initialCheckin,
  initialCheckout,
  partners = [],
}: {
  partners?: { product: Product; rates: HotelRate[] }[];
  product: Product;
  rates: HotelRate[];
  holidays: Holiday[];
  images: string[];
  initialCheckin?: string;
  initialCheckout?: string;
}) {
  const [checkin, setCheckin] = useState(initialCheckin ?? "");
  const [checkout, setCheckout] = useState(initialCheckout ?? "");

  return (
    <div className="space-y-3">
      <div className="rounded-card border border-border bg-white p-3 shadow-card sm:p-4">
        <h2 className="font-display text-[17px] font-bold text-ink">Bảng giá hạng phòng</h2>
        <div className="mb-3 mt-2 grid grid-cols-2 gap-2 sm:max-w-sm">
          <label className="text-[11px] font-semibold text-ink-muted">
            Nhận phòng
            <Input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} className="mt-0.5 h-9 w-full" />
          </label>
          <label className="text-[11px] font-semibold text-ink-muted">
            Trả phòng
            <Input type="date" value={checkout} min={checkin || undefined} onChange={(e) => setCheckout(e.target.value)} className="mt-0.5 h-9 w-full" />
          </label>
        </div>
        {rates.length ? (
          <ResortRatesTable
            product={product}
            rates={rates}
            holidays={holidays}
            checkin={checkin || undefined}
            checkout={checkout || undefined}
            defaultFull={!checkin}
          />
        ) : (
          <p className="text-[13px] text-ink-muted">Chưa nhập hạng phòng — Admin vào “Sửa giá hàng loạt” để nhập.</p>
        )}
      </div>

      {checkin && rates.length > 0 && (
        <button
          type="button"
          onClick={async () => {
            const rows = rates.map((room) => {
              const q = quoteStay(room, product, holidays, checkin, checkout || undefined);
              return { room, avg: q.avg, total: q.total, label: q.label };
            });
            const nights = quoteStay(rates[0], product, holidays, checkin, checkout || undefined).nights.length;
            await navigator.clipboard.writeText(resortPriceQuoteText(product, rows, checkin, checkout || undefined, nights)).catch(() => null);
            toast.success("Đã copy BÁO GIÁ theo ngày — dán vào Zalo gửi khách.");
          }}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal to-sand text-[13px] font-bold text-white shadow-sm"
        >
          <Receipt className="h-4 w-4" /> Copy báo giá theo ngày đã chọn
        </button>
      )}

      {partners.length > 0 && (
        <PartnerCompare product={product} rates={rates} holidays={holidays} partners={partners} checkin={checkin} checkout={checkout} />
      )}

      {product.perks && (
        <Collapsible icon={<Gift className="h-4 w-4 text-teal" />} title="Quyền lợi / tiện ích bao gồm" tone="fee">
          <NoteView text={product.perks} />
        </Collapsible>
      )}
      {product.surcharge_note && (
        <Collapsible icon={<Wallet className="h-4 w-4 text-sand-dark" />} title="Phụ thu" tone="fee">
          <NoteView text={product.surcharge_note} />
        </Collapsible>
      )}
      {product.price_source && (
        <p className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[9.5px] font-extrabold text-white">CHỈ SALE</span>
          Giá mua của: <b>{product.price_source}</b>
        </p>
      )}
      {product.contract_summary && (
        <Collapsible icon={<FileText className="h-4 w-4 text-amber-700" />} title="Tóm tắt hợp đồng" tone="sale" badge="CHỈ SALE XEM">
          <NoteView text={product.contract_summary} />
        </Collapsible>
      )}

      {product.image_link && (
        <a
          href={product.image_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2.5 text-[12.5px] font-semibold text-ink-muted"
        >
          <ExternalLink className="h-4 w-4" /> Album ảnh gốc của resort
        </a>
      )}

      <div className="space-y-2 rounded-card border border-border bg-white p-3 shadow-card">
        <p className="text-[12px] font-bold uppercase tracking-wide text-ink-muted">Gửi khách (không kèm giá)</p>
        <PhotoShareButtons images={images} name={product.product_name} description={() => resortQuoteText(product, rates)} />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(resortQuoteText(product, rates)).catch(() => null);
            toast.success("Đã copy mô tả — dán vào Zalo.");
          }}
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-white text-[12.5px] font-bold text-ink"
        >
          <Copy className="h-4 w-4" /> Copy mô tả resort
        </button>
      </div>
    </div>
  );
}

/** Giá rẻ nhất / đêm của 1 bên (theo ngày đã chọn, không chọn ngày → giá thấp nhất). */
function cheapestOf(p: Product, rates: HotelRate[], holidays: Holiday[], checkin: string, checkout: string) {
  let best: { avg: number; room: string } | null = null;
  for (const r of rates) {
    const v = checkin ? quoteStay(r, p, holidays, checkin, checkout || undefined).avg : minRatePrice(r, p);
    if (v != null && (!best || v < best.avg)) best = { avg: v, room: r.room_type };
  }
  return best;
}

function PartnerCompare({
  product,
  rates,
  holidays,
  partners,
  checkin,
  checkout,
}: {
  product: Product;
  rates: HotelRate[];
  holidays: Holiday[];
  partners: { product: Product; rates: HotelRate[] }[];
  checkin: string;
  checkout: string;
}) {
  const rows = [{ product, rates, me: true }, ...partners.map((x) => ({ ...x, me: false }))]
    .map((x) => ({ ...x, best: cheapestOf(x.product, x.rates, holidays, checkin, checkout) }))
    .sort((a, b) => (a.best?.avg ?? Infinity) - (b.best?.avg ?? Infinity));
  const min = rows[0]?.best?.avg ?? null;
  const k = (n: number) => `${new Intl.NumberFormat("vi-VN").format(Math.round(n / 1000))}k`;
  return (
    <div className="rounded-card border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-[12px] font-extrabold uppercase tracking-wide text-amber-800">
        🤝 So giá đối tác {checkin ? `· ${checkin.split("-").reverse().join("/").slice(0, 5)}` : "· giá thấp nhất"}
        <span className="ml-1.5 rounded bg-amber-600 px-1.5 py-0.5 text-[9.5px] text-white">CHỈ SALE</span>
      </p>
      <div className="mt-1.5 divide-y divide-amber-200/70">
        {rows.map((x, i) => (
          <Link
            key={x.product.id}
            href={`/products/${x.product.id}${checkin ? `?date=${checkin}${checkout ? `&checkout=${checkout}` : ""}` : ""}`}
            className={cn("flex items-center gap-2 py-1.5 text-[13px]", x.me ? "font-bold" : "hover:underline")}
          >
            <span className="w-5 text-center">{i === 0 ? "🏆" : i + 1}</span>
            <span className="min-w-0 flex-1 truncate">
              {sourceLabel(x.product.price_source)}
              {x.me && <span className="ml-1 rounded bg-teal px-1 text-[10px] text-white">đang xem</span>}
              {x.best && <span className="ml-1 text-[11px] font-normal text-ink-muted">· {x.best.room}</span>}
            </span>
            <span className="tabular-nums">
              {x.best ? k(x.best.avg) : "—"}
              {x.best && min != null && x.best.avg > min && <span className="ml-1 text-[11px] text-hot">+{k(x.best.avg - min)}</span>}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
