import Link from "next/link";
import { BedDouble, MapPin, Users, Waves, Music2, Flame, Home } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/product-image";
import { formatVND, formatVNDShort } from "@/lib/format";
import { formatDateVN, TIER_LABEL_SHORT } from "@/lib/pricing";
import { PRODUCT_TYPE_LABEL, type DatePricingContext, type Product } from "@/lib/types";

const AMENITY_ICONS = [
  { key: "pool" as const, label: "Hồ bơi", Icon: Waves },
  { key: "near_beach" as const, label: "Gần biển", Icon: Home },
  { key: "karaoke" as const, label: "Karaoke", Icon: Music2 },
  { key: "bbq" as const, label: "BBQ", Icon: Flame },
];

function PriceBlock({ product }: { product: Product & { _pricing?: DatePricingContext } }) {
  if (product.type === "hotel") {
    return (
      <div>
        <p className="text-[19px] font-bold leading-none tracking-tight text-teal-dark">
          {formatVND(product.price)}
        </p>
        <p className="mt-1 text-[11px] text-ink-muted">giá phòng thấp nhất/đêm</p>
      </div>
    );
  }

  const ctx = product._pricing;

  // Có ngày cụ thể — hiển thị đúng 1 giá của ngày đó, không hiện giá weekday
  if (ctx && ctx.basePrice != null) {
    const hasDiscount = ctx.discountPercent > 0 && ctx.finalPrice != null;
    return (
      <div>
        {hasDiscount && (
          <p className="text-[11px] text-ink-muted line-through">{formatVND(ctx.basePrice)}</p>
        )}
        <p className="text-[19px] font-bold leading-none tracking-tight text-teal-dark">
          {formatVND(hasDiscount ? ctx.finalPrice : ctx.basePrice)}
        </p>
        <p className="mt-1 text-[11px] text-ink-muted">
          {TIER_LABEL_SHORT[ctx.tier]} · {formatDateVN(ctx.date)}
          {hasDiscount && ` · CK ${ctx.discountPercent}%`}
        </p>
      </div>
    );
  }

  // Không có ngày — không giả định weekday, hiện đủ 3 khung giá
  return (
    <div className="text-[11.5px] leading-relaxed text-ink-muted">
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
    </div>
  );
}

export function ProductCard({
  product,
  matchLabel,
}: {
  product: Product & { _pricing?: DatePricingContext };
  /** VD: "Phù hợp nhất" — chỉ nên truyền cho kết quả #1 của một tìm kiếm có nội dung */
  matchLabel?: string;
}) {
  const amenities = AMENITY_ICONS.filter(({ key }) => product[key]).slice(0, 3);
  const detailHref = product._pricing?.date
    ? `/products/${product.id}?date=${product._pricing.date}`
    : `/products/${product.id}`;

  return (
    <Link href={detailHref} className="block h-full">
      <Card className="group h-full flex flex-col overflow-hidden !rounded-card transition-shadow hover:shadow-float">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-dim">
          <ProductImage
            src={product.thumbnail_url}
            alt={product.product_name}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
            <Badge className="bg-white/95 text-ink shadow-sm" variant="neutral">
              {PRODUCT_TYPE_LABEL[product.type]}
            </Badge>
            {matchLabel && (
              <Badge className="bg-teal text-white shadow-sm" variant="default">
                {matchLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3.5">
          <div>
            <h3 className="font-semibold text-[15px] leading-snug text-ink line-clamp-1">
              {product.product_name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {product.area}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
            {product.bedrooms != null && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" />
                {product.bedrooms} PN
              </span>
            )}
            {product.max_guests != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {product.max_guests} khách
              </span>
            )}
            {amenities.map(({ key, label, Icon }) => (
              <span key={key} className="flex items-center gap-1">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-end justify-between pt-1.5">
            <PriceBlock product={product} />
            <span className="hidden shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-muted group-hover:bg-paper-dim sm:block">
              Xem chi tiết
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
