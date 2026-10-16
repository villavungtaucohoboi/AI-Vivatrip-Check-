import Link from "next/link";
import { BedDouble, Check, MapPin, Star, Users } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { minRatePrice } from "@/lib/resort-pricing";
import { PRODUCT_TYPE_LABEL, type Product } from "@/lib/types";
import type { ResortResult } from "@/app/api/search-resort/route";
import { cn } from "@/lib/utils";

const AMENITY = [
  { key: "pool" as const, label: "Hồ bơi" },
  { key: "near_beach" as const, label: "Sát biển" },
  { key: "sea_view" as const, label: "View biển" },
  { key: "near_lake" as const, label: "View hồ" },
];
const k = (n: number | null | undefined) => (n == null ? "Liên hệ" : `${new Intl.NumberFormat("vi-VN").format(Math.round(n / 1000))}k`);

/** Thẻ resort/khách sạn dạng lưới (giống thẻ villa): ảnh bìa, tên, hạng phòng hợp nhất, giá. */
export function ResortGridCard({
  result,
  nights,
  checkin,
  checkout,
  label,
}: {
  result: ResortResult;
  nights: number;
  checkin?: string;
  checkout?: string;
  label?: string;
}) {
  const p: Product = result.product;
  const best = result.rates.find((r) => r.id === result.bestRateId) ?? result.rates[0];
  const others = result.rates.length - 1;
  const q = best?.quote ?? null;
  const shown = q ? q.avg : best ? minRatePrice(best, p) : null;
  const base = q ? q.avgBase : null;
  const disc = (Number(best?.discount_percent) || 0) > 0 && base != null && shown != null && base > shown;
  const tierText = q ? q.label ?? "nhiều mức giá" : null;
  const amen = AMENITY.filter((a) => p[a.key]).slice(0, 2);
  const href = `/products/${p.id}${checkin ? `?date=${checkin}${checkout ? `&checkout=${checkout}` : ""}` : ""}`;

  return (
    <Link href={href} className="group block h-full">
      <div className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-white shadow-card transition-shadow hover:shadow-float">
        <div className="relative aspect-[16/11] w-full overflow-hidden bg-paper-dim">
          <ProductImage
            src={result.images[0] ?? p.thumbnail_url}
            alt={p.product_name}
            sizes="(max-width: 640px) 50vw, 33vw"
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-ink shadow-sm lg:left-2.5 lg:top-2.5 lg:text-[11px]">
            {PRODUCT_TYPE_LABEL[p.type]}
          </span>
          {label && (
            <span
              className={cn(
                "absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm lg:right-2.5 lg:top-2.5 lg:text-[11px]",
                label === "Cao hơn" ? "bg-ink/70" : "bg-teal"
              )}
            >
              {label}
            </span>
          )}
          {result.images.length > 1 && (
            <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {result.images.length} ảnh
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-2 lg:gap-1.5 lg:p-3">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-ink lg:text-[15px]">
            {p.product_name}
            {p.star ? <span className="ml-1 whitespace-nowrap text-[11px] font-bold text-amber-500 lg:text-[12px]">{"★".repeat(p.star)}</span> : null}
          </h3>
          <p className="flex items-center gap-1 text-[11px] font-medium text-teal lg:text-[12.5px]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.sub_region ? `${p.sub_region}, ${p.area}` : p.area}</span>
          </p>
          {amen.length > 0 && (
            <p className="hidden gap-2 text-[11.5px] text-ink-muted lg:flex">
              {amen.map((a) => (
                <span key={a.key}>· {a.label}</span>
              ))}
            </p>
          )}

          {best && (
            <div className="mt-auto rounded-xl border border-border bg-paper/60 p-1.5 lg:p-2">
              <p className="flex items-center gap-1 text-[11px] font-bold text-ink lg:text-[12.5px]">
                <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                <span className="truncate">{best.room_type}</span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-ink-muted lg:text-[11px]">
                {best.capacity != null && (
                  <span className="flex items-center gap-0.5">
                    <Users className="h-2.5 w-2.5" />
                    {best.capacity}
                  </span>
                )}
                {best.bed && (
                  <span className="hidden items-center gap-0.5 sm:flex">
                    <BedDouble className="h-2.5 w-2.5" />
                    {best.bed}
                  </span>
                )}
                {best.breakfast && (
                  <span className="flex items-center gap-0.5 font-semibold text-emerald-700">
                    <Check className="h-2.5 w-2.5" />
                    Ăn sáng
                  </span>
                )}
              </p>
              <div className="mt-1 flex items-end justify-between gap-1">
                <div className="min-w-0 tabular-price">
                  {disc && <p className="text-[10px] leading-none text-ink-muted/80 line-through lg:text-[11px]">{k(base)}</p>}
                  <p className={cn("text-[15px] font-extrabold leading-tight lg:text-[18px]", q ? "text-hot" : "text-ink")}>
                    {!q && <span className="mr-0.5 text-[10px] font-semibold text-ink-muted">từ</span>}
                    {k(shown)}
                    <span className="text-[10px] font-medium text-ink-muted">/đêm</span>
                  </p>
                </div>
                {disc && (
                  <span className="shrink-0 rounded-md bg-coral px-1 py-0.5 text-[9.5px] font-extrabold text-white lg:text-[10.5px]">
                    -{best.discount_percent}%
                  </span>
                )}
              </div>
              {q?.outOfContract && <p className="text-[10px] font-semibold text-hot">⚠ Ngoài giai đoạn hợp đồng</p>}
              {q && (
                <p className="line-clamp-1 text-[10px] text-ink-muted lg:text-[11px]">
                  {tierText}
                  {nights > 1 && q.total != null && (
                    <>
                      {" "}
                      · {nights} đêm <b className="text-ink">{k(q.total)}</b>
                    </>
                  )}
                </p>
              )}
            </div>
          )}
          {others > 0 && <p className="text-[10.5px] font-semibold text-teal-dark lg:text-[11.5px]">+{others} hạng phòng khác ›</p>}
        </div>
      </div>
    </Link>
  );
}
