"use client";

import Link from "next/link";
import { ChevronDown, Copy, FileText, MapPin, Wallet } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import { NoteView } from "@/components/note-view";
import { ResortRatesTable } from "@/components/resort/resort-rates-table";
import { PhotoShareButtons } from "@/components/resort/photo-share-buttons";
import { resortQuoteText } from "@/lib/resort-text";
import { PRODUCT_TYPE_LABEL, type Holiday, type HotelRate, type Product } from "@/lib/types";

const AMENITIES: { key: keyof Product; label: string }[] = [
  { key: "pool", label: "🏊 Hồ bơi" },
  { key: "near_beach", label: "🏖️ Sát biển" },
  { key: "sea_view", label: "🌊 View biển" },
  { key: "near_lake", label: "🏞️ View hồ" },
  { key: "karaoke", label: "🎤 Karaoke" },
  { key: "bbq", label: "🍖 BBQ" },
  { key: "pickleball", label: "🏓 Pickleball" },
];

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
  }
}

export function Collapsible({
  icon,
  title,
  tone,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "fee" | "sale";
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      className={
        tone === "sale"
          ? "group rounded-xl border border-dashed border-amber-300 bg-amber-50/70"
          : "group rounded-xl border border-border bg-white"
      }
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[13px] font-bold text-ink [&::-webkit-details-marker]:hidden">
        {icon}
        {title}
        {badge && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{badge}</span>}
        <ChevronDown className="ml-auto h-4 w-4 text-ink-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-3 pb-3 text-[13px]">{children}</div>
    </details>
  );
}

export function ResortResultCard({
  product,
  rates,
  images,
  holidays,
  checkin,
  checkout,
  bestRateId,
  label,
}: {
  product: Product;
  rates: HotelRate[];
  images: string[];
  holidays: Holiday[];
  checkin?: string;
  checkout?: string;
  bestRateId?: string | null;
  label?: string;
}) {
  const amen = AMENITIES.filter((a) => product[a.key]);
  const href = `/products/${product.id}${checkin ? `?date=${checkin}${checkout ? `&checkout=${checkout}` : ""}` : ""}`;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
      <Link href={href} className="relative block aspect-[16/8] w-full overflow-hidden bg-paper-dim">
        <ProductImage src={images[0] ?? product.thumbnail_url} alt={product.product_name} sizes="(max-width: 768px) 100vw, 50vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold uppercase text-teal-dark">
          {PRODUCT_TYPE_LABEL[product.type]}
        </span>
        {label && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-teal px-2.5 py-1 text-[11px] font-bold text-white shadow">{label}</span>
        )}
        <div className="absolute inset-x-3 bottom-2.5 text-white">
          <p className="font-display text-[19px] font-bold leading-tight drop-shadow">{product.product_name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[12px] opacity-95">
            <MapPin className="h-3.5 w-3.5" />
            {product.sub_region ? `${product.sub_region}, ${product.area}` : product.area}
          </p>
        </div>
      </Link>

      <div className="space-y-2.5 p-3">
        {amen.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amen.map((a) => (
              <span key={a.key} className="rounded-full bg-teal-light px-2.5 py-1 text-[11.5px] font-semibold text-teal-dark">
                {a.label}
              </span>
            ))}
          </div>
        )}

        <ResortRatesTable product={product} rates={rates} holidays={holidays} checkin={checkin} checkout={checkout} bestRateId={bestRateId} />

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

        <PhotoShareButtons images={images} name={product.product_name} description={() => resortQuoteText(product, rates)} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              await copyText(resortQuoteText(product, rates));
              toast.success("Đã copy mô tả (không có giá) — dán vào Zalo.");
            }}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-white text-[12.5px] font-bold text-ink"
          >
            <Copy className="h-4 w-4" /> Copy mô tả
          </button>
          <Link
            href={href}
            className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border bg-white text-[12.5px] font-bold text-ink-muted"
          >
            Xem chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}
