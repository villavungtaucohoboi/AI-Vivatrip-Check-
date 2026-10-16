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
import type { Holiday, HotelRate, Product } from "@/lib/types";

/** Phần giá + gửi khách trên trang chi tiết resort / khách sạn. */
export function ResortDetailPanel({
  product,
  rates,
  holidays,
  images,
  initialCheckin,
  initialCheckout,
}: {
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
        <PhotoShareButtons images={images} name={product.product_name} />
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
