import Link from "next/link";
import { BedDouble, MapPin, Users, Waves, Music2, Flame, Home, Droplet, Dumbbell, Eye, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/product-image";
import { formatVND, formatVNDShort } from "@/lib/format";
import { formatDateVN, formatDiscount, TIER_LABEL_SHORT } from "@/lib/pricing";
import { calcGuestPricing } from "@/lib/capacity";
import { PRODUCT_TYPE_LABEL, type DatePricingContext, type Product } from "@/lib/types";

const AMENITY_ICONS = [
  { key: "pool" as const, label: "Hồ bơi", Icon: Waves },
  { key: "near_beach" as const, label: "Sát biển", Icon: Home },
  { key: "sea_view" as const, label: "View biển", Icon: Eye },
  { key: "near_lake" as const, label: "View hồ", Icon: Droplet },
  { key: "karaoke" as const, label: "Karaoke", Icon: Music2 },
  { key: "bbq" as const, label: "BBQ", Icon: Flame },
  { key: "pickleball" as const, label: "Pickleball", Icon: Dumbbell },
];

function PriceBlock({ product, requestedGuests }: { product: Product & { _pricing?: DatePricingContext }; requestedGuests?: number }) {
  if (product.type === "hotel") {
    return (
      <div>
        <p className="text-[14px] lg:text-[19px] font-bold leading-none tracking-tight text-teal-dark">
          {formatVND(product.price)}
        </p>
        <p className="mt-1 text-[10px] lg:text-[11px] text-ink-muted">giá thấp nhất/đêm</p>
      </div>
    );
  }

  const ctx = product._pricing;

  // Có ngày cụ thể — hiển thị đúng 1 giá của ngày đó, không hiện giá weekday
  if (ctx && ctx.basePrice != null) {
    const hasDiscount = ctx.discountValue > 0 && ctx.finalPrice != null;
    const dayPrice = hasDiscount ? ctx.finalPrice! : ctx.basePrice;
    const guestPricing = requestedGuests ? calcGuestPricing(product, requestedGuests, dayPrice) : null;

    return (
      <div>
        {hasDiscount && (
          <p className="text-[10px] lg:text-[11px] text-ink-muted line-through">{formatVND(ctx.basePrice)}</p>
        )}
        <p className="text-[14px] lg:text-[19px] font-bold leading-none tracking-tight text-teal-dark">
          {guestPricing?.totalPrice != null ? formatVND(guestPricing.totalPrice) : formatVND(dayPrice)}
        </p>
        <p className="mt-1 text-[10px] lg:text-[11px] text-ink-muted">
          {TIER_LABEL_SHORT[ctx.tier]} · {formatDateVN(ctx.date)}
          {hasDiscount && ` · CK ${formatDiscount(ctx.discountType, ctx.discountValue)}`}
        </p>
        {guestPricing?.isOverStandard && guestPricing.totalPrice != null && (
          <p className="mt-0.5 text-[9.5px] lg:text-[10.5px] text-ink-muted">
            Giá gốc {formatVND(dayPrice)} + {guestPricing.extraGuests} khách × {formatVND(guestPricing.extraFeePerGuest!)}
          </p>
        )}
        {guestPricing?.isOverStandard && guestPricing.totalPrice == null && (
          <p className="mt-0.5 flex items-center gap-1 text-[9.5px] lg:text-[10.5px] font-medium text-sand">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Cần xác nhận phụ thu khách vượt tiêu chuẩn
          </p>
        )}
      </div>
    );
  }

  // Không có ngày — không giả định weekday, hiện đủ 3 khung giá
  return (
    <div className="text-[10px] lg:text-[11.5px] leading-relaxed text-ink-muted">
      <p>
        <span className="font-semibold text-ink">{TIER_LABEL_SHORT.weekday}</span>{" "}
        {formatVNDShort(product.price_weekday)}
      </p>
      <p>
        <span className="font-semibold text-ink">{TIER_LABEL_SHORT.friday_sunday}</span>{" "}
        {formatVNDShort(product.price_friday_sunday)}
      </p>
      <p>
        <span className="font-semibold text-ink">{TIER_LABEL_SHORT.saturday_holiday}</span>{" "}
        {formatVNDShort(product.price_saturday_holiday)}
      </p>
      {requestedGuests && product.standard_guests != null && requestedGuests > product.standard_guests && (
        <p className="mt-0.5 flex items-center gap-1 font-medium text-sand">
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
}: {
  product: Product & { _pricing?: DatePricingContext; _reason?: string };
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
            <h3 className="font-semibold text-[12.5px] lg:text-[15px] leading-snug text-ink line-clamp-1">
              {product.product_name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] lg:text-[13px] text-ink-muted">
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
                  <span className="ml-0.5 rounded-full bg-sand-light px-1.5 py-0.5 text-[9px] font-semibold text-[#7A5F2B] lg:text-[10px]">
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
            <p className="text-[10.5px] lg:text-[12px] text-teal-dark line-clamp-1">{reason}</p>
          )}

          <div className="mt-auto flex items-end justify-between pt-1 lg:pt-1.5">
            <PriceBlock product={product} requestedGuests={requestedGuests} />
            <span className="hidden shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-muted group-hover:bg-paper-dim lg:block">
              Xem chi tiết
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
