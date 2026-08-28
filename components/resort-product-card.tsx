import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/product-image";
import { formatVND } from "@/lib/format";
import { PRODUCT_TYPE_LABEL, type Product } from "@/lib/types";

const AMENITY_LABELS: { key: keyof Product; label: string }[] = [
  { key: "pool", label: "Hồ bơi" },
  { key: "near_beach", label: "Sát biển" },
  { key: "sea_view", label: "View biển" },
  { key: "near_lake", label: "View hồ" },
  { key: "karaoke", label: "Karaoke" },
  { key: "bbq", label: "BBQ" },
  { key: "pickleball", label: "Pickleball" },
];

const VISIBLE_TIERS = 3;
const VISIBLE_AMENITIES = 4;

export function ResortProductCard({ product }: { product: Product }) {
  const rates = [...(product.hotel_rates ?? [])].sort((a, b) => a.price - b.price);
  const visibleRates = rates.slice(0, VISIBLE_TIERS);
  const remainingRates = rates.length - visibleRates.length;

  const activeAmenities = AMENITY_LABELS.filter((a) => product[a.key]);
  const visibleAmenities = activeAmenities.slice(0, VISIBLE_AMENITIES);
  const remainingAmenities = activeAmenities.length - visibleAmenities.length;

  return (
    <Link href={`/products/${product.id}`} className="block h-full">
      <Card className="group h-full flex flex-col overflow-hidden !rounded-card transition-shadow hover:shadow-float">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-dim">
          <ProductImage
            src={product.thumbnail_url}
            alt={product.product_name}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <Badge className="absolute left-1.5 top-1.5 bg-white/95 px-2 py-0.5 text-[10px] text-ink shadow-sm lg:left-2.5 lg:top-2.5 lg:px-2.5 lg:py-1 lg:text-xs" variant="neutral">
            {PRODUCT_TYPE_LABEL[product.type]}
          </Badge>
        </div>

        <div className="flex flex-1 flex-col p-2.5 lg:p-3.5">
          <p className="line-clamp-1 text-[12.5px] font-bold text-ink lg:text-[13.5px]">{product.product_name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted lg:text-[11.5px]">
            <MapPin className="h-3 w-3" />
            {product.area}
          </p>

          {visibleRates.length > 0 ? (
            <div className="mt-2.5 border-t border-border pt-2.5">
              {visibleRates.map((rate) => (
                <div key={rate.id} className="flex items-center justify-between py-0.5 text-[11.5px] lg:text-[12px]">
                  <span className="line-clamp-1 pr-2 text-ink-muted">{rate.room_type}</span>
                  <span className="shrink-0 font-bold text-teal-dark">{formatVND(rate.price)}</span>
                </div>
              ))}
              {remainingRates > 0 && (
                <p className="mt-0.5 text-[10.5px] text-ink-muted">+{remainingRates} hạng phòng khác</p>
              )}
            </div>
          ) : (
            <p className="mt-2.5 border-t border-border pt-2.5 text-[11.5px] text-ink-muted">
              Chưa cập nhật giá phòng
            </p>
          )}

          {activeAmenities.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {visibleAmenities.map((a) => (
                <span key={a.key} className="rounded-full bg-paper-dim px-2 py-1 text-[10px] text-ink lg:text-[10.5px]">
                  {a.label}
                </span>
              ))}
              {remainingAmenities > 0 && (
                <span className="rounded-full bg-teal-light px-2 py-1 text-[10px] font-semibold text-teal-dark lg:text-[10.5px]">
                  +{remainingAmenities} tiện ích khác
                </span>
              )}
            </div>
          )}

          <div className="mt-auto pt-3">
            <div className="w-full rounded-xl bg-teal py-2 text-center text-[11.5px] font-semibold text-white lg:py-2.5 lg:text-[12.5px]">
              Xem tất cả hạng phòng
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
