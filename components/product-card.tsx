import Link from "next/link";
import { BedDouble, MapPin, Users, Waves, Music2, Flame, Home, Droplet, Dumbbell, Eye, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/product-image";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import { calculateDiscount, formatDateVN, formatDiscount, getDiscountForTier, TIER_LABEL_SHORT } from "@/lib/pricing";
import { calcGuestPricing } from "@/lib/capacity";
import { PRODUCT_TYPE_LABEL, type DatePricingContext, type PriceTier, type Product } from "@/lib/types";

const AMENITY_ICONS = [
  { key: "pool" as const, label: "Hồ bơi", Icon: Waves },
  { key: "near_beach" as const, label: "Sát biển", Icon: Home },
  { key: "sea_view" as const, label: "View biển", Icon: Eye },
  { key: "near_lake" as const, label: "View hồ", Icon: Droplet },
  { key: "karaoke" as const, label: "Karaoke", Icon: Music2 },
  { key: "bbq" as const, label: "BBQ", Icon: Flame },
  { key: "pickleball" as const, label: "Pickleball", Icon: Dumbbell },
];

const TIERS: PriceTier[] = ["weekday", "friday_sunday", "saturday_holiday"];

const TIER_BASE_FIELD = {
  weekday: "price_weekday",
  friday_sunday: "price_friday_sunday",
  saturday_holiday: "price_saturday_holiday",
} as const;

/** "16 triệu" → "16tr", "9.5 triệu" → "9,5tr" — gọn cho thẻ trên điện thoại */
function shortMoney(amount: number | null | undefined): string {
  if (amount == null) return "Liên hệ";
  if (amount >= 1_000_000) {
    const tr = amount / 1_000_000;
    const txt = Number.isInteger(tr) ? String(tr) : (Math.round(tr * 100) / 100).toString().replace(".", ",");
    return `${txt}tr`;
  }
  if (amount >= 1000 && amount % 1000 === 0) return `${amount / 1000}k`;
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function PriceBlock({
  product,
  requestedGuests,
  highlightTiers,
}: {
  product: Product & { _pricing?: DatePricingContext };
  requestedGuests?: number;
  highlightTiers?: PriceTier[];
}) {
  if (product.type === "hotel") {
    return (
      <div>
        <p className="text-[15px] lg:text-[20px] font-extrabold leading-none tracking-tight text-teal-dark tabular-price">
          {formatVND(product.price)}
        </p>
        <p className="mt-1 text-[10.5px] lg:text-[12px] text-ink-muted">giá thấp nhất/đêm</p>
      </div>
    );
  }

  const ctx = product._pricing;
  // Dòng cần tô đỏ: có ngày cụ thể → đúng khung của ngày đó;
  // không có ngày nhưng khách nói "cuối tuần"/"ngày thường"... → các khung đó.
  const hot = new Set<PriceTier>(ctx ? [ctx.tier] : highlightTiers ?? []);

  const rows = TIERS.map((tier) => {
    const base = product[TIER_BASE_FIELD[tier]] ?? null;
    const discount = getDiscountForTier(product, tier);
    const hasDiscount = base != null && discount.value > 0;
    const final = base != null && hasDiscount ? calculateDiscount(base, discount.type, discount.value).finalPrice : base;
    return { tier, base, final, hasDiscount, discount };
  });

  // Phụ thu khách vượt chuẩn — tính cho khung đang được hỏi (nếu chỉ 1 khung)
  const hotRow = hot.size === 1 ? rows.find((r) => hot.has(r.tier)) : undefined;
  const isOver = requestedGuests != null && product.standard_guests != null && requestedGuests > product.standard_guests;
  const guestPricing = isOver && hotRow?.final != null ? calcGuestPricing(product, requestedGuests!, hotRow.final) : null;

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-xl border border-border bg-paper/60">
        {rows.map(({ tier, base, final, hasDiscount, discount }, i) => {
          const isHot = hot.has(tier);
          return (
            <div
              key={tier}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 lg:px-2.5 lg:py-1.5",
                i > 0 && "border-t border-border/70",
                isHot && "bg-hot-light"
              )}
            >
              <span
                className={cn(
                  "shrink-0 whitespace-nowrap text-[10.5px] lg:text-[12px] font-semibold",
                  isHot ? "text-hot" : "text-ink-muted"
                )}
              >
                {TIER_LABEL_SHORT[tier]}
              </span>
              <span className="flex min-w-0 flex-1 items-baseline justify-end gap-1 overflow-hidden whitespace-nowrap tabular-price">
                {hasDiscount && (
                  <span className="hidden sm:inline text-[10px] lg:text-[11px] text-ink-muted/80 line-through">
                    {shortMoney(base)}
                  </span>
                )}
                <span
                  className={cn(
                    "text-[12.5px] lg:text-[15px] font-bold tracking-tight",
                    isHot ? "text-hot" : "text-teal-dark"
                  )}
                >
                  {shortMoney(final)}
                </span>
              </span>
              {hasDiscount ? (
                <span className="shrink-0 whitespace-nowrap rounded-md bg-coral px-1 py-0.5 text-[9px] lg:text-[10.5px] font-bold leading-none text-white">
                  -{discount.type === "amount" ? shortMoney(discount.value) : formatDiscount(discount.type, discount.value)}
                </span>
              ) : (
                <span className="w-0 lg:w-0" />
              )}
            </div>
          );
        })}
      </div>

      {ctx && (
        <p className="mt-1 text-[10px] lg:text-[11.5px] font-medium text-hot">
          Ngày đi {formatDateVN(ctx.date)} · {TIER_LABEL_SHORT[ctx.tier]}
        </p>
      )}
      {guestPricing?.isOverStandard && guestPricing.totalPrice != null && (
        <p className="mt-0.5 text-[10px] lg:text-[11px] text-ink-muted">
          +{guestPricing.extraGuests} khách × {formatVND(guestPricing.extraFeePerGuest!)} ={" "}
          <b className="text-hot">{formatVND(guestPricing.totalPrice)}</b>
        </p>
      )}
      {isOver && !(guestPricing?.totalPrice != null) && (
        <p className="mt-1 flex items-center gap-1 text-[10px] lg:text-[11px] font-medium text-sand-dark">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Cần xác nhận phụ thu khách vượt tiêu chuẩn
        </p>
      )}
    </div>
  );
}

export function ProductCard({
  product,
  matchLabel,
  rank,
  reason,
  requestedGuests,
  highlightTiers,
}: {
  product: Product & { _pricing?: DatePricingContext; _reason?: string };
  /** Khung giá khách hỏi (VD "cuối tuần") — tô đỏ dòng tương ứng */
  highlightTiers?: PriceTier[];
  /** VD: "Phù hợp nhất" — chỉ nên truyền cho kết quả #1 của một tìm kiếm có nội dung */
  matchLabel?: string;
  /** 1, 2, 3 — hiện huy chương 🥇🥈🥉 cho Top 3 "phù hợp nhất" */
  rank?: 1 | 2 | 3;
  reason?: string;
  /** Số khách Sale đang tìm — dùng để hiện badge "+N khách vượt chuẩn" và tính phụ thu nếu có */
  requestedGuests?: number;
}) {
  const amenities = AMENITY_ICONS.filter(({ key }) => product[key]).slice(0, 2);
  const detailHref = product._pricing?.date
    ? `/products/${product.id}?date=${product._pricing.date}`
    : `/products/${product.id}`;
  const rankMedal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <Link href={detailHref} className="block h-full">
      <Card className="group h-full flex flex-col overflow-hidden !rounded-card transition-shadow hover:shadow-float">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-dim">
          <ProductImage
            src={product.thumbnail_url}
            alt={product.product_name}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5 lg:p-2.5">
            <Badge className="bg-white/95 text-ink shadow-sm px-2 py-0.5 text-[10px] lg:px-2.5 lg:py-1 lg:text-xs" variant="neutral">
              {PRODUCT_TYPE_LABEL[product.type]}
            </Badge>
            {matchLabel && (
              <Badge className="bg-teal text-white shadow-sm px-2 py-0.5 text-[10px] lg:px-2.5 lg:py-1 lg:text-xs" variant="default">
                {rankMedal ? `${rankMedal} ` : ""}
                {matchLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 lg:gap-2 p-2 lg:p-3.5">
          <div>
            <h3 className="font-bold text-[13px] lg:text-[16px] leading-snug text-ink line-clamp-1">
              {product.product_name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] lg:text-[13px] font-medium text-teal">
              <MapPin className="h-3 w-3 lg:h-3.5 lg:w-3.5 shrink-0" />
              <span className="truncate">
                {product.sub_region ? `${product.sub_region}, ${product.area}` : product.area}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 lg:gap-x-3 gap-y-1 text-[10.5px] lg:text-[13px] text-ink-muted">
            {product.bedrooms != null && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                {product.bedrooms} PN
              </span>
            )}
            {product.standard_guests != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                {product.standard_guests} khách tiêu chuẩn
                {requestedGuests != null && requestedGuests > product.standard_guests && (
                  <span className="ml-0.5 rounded-full bg-sand-light px-1.5 py-0.5 text-[9px] font-semibold text-sand-dark lg:text-[10px]">
                    +{requestedGuests - product.standard_guests} khách
                  </span>
                )}
              </span>
            )}
            {amenities.map(({ key, label, Icon }) => (
              <span key={key} className="hidden lg:flex items-center gap-1">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </div>

          {reason && (
            <p className="rounded-md bg-teal-light px-1.5 py-0.5 text-[10.5px] lg:text-[12px] font-medium text-teal-dark line-clamp-1">{reason}</p>
          )}

          <div className="mt-auto pt-1 lg:pt-1.5">
            <PriceBlock product={product} requestedGuests={requestedGuests} highlightTiers={highlightTiers} />
          </div>
        </div>
      </Card>
    </Link>
  );
}
