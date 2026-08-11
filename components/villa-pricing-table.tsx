import { formatVND } from "@/lib/format";
import { formatDateVN, TIER_LABEL } from "@/lib/pricing";
import type { DatePricingContext, PriceTier, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const TIERS: PriceTier[] = ["weekday", "friday_sunday", "saturday_holiday"];

export function VillaPricingTable({
  product,
  context,
}: {
  product: Pick<Product, "price_weekday" | "price_friday_sunday" | "price_saturday_holiday" | "discount_percent">;
  context?: DatePricingContext;
}) {
  const priceByTier: Record<PriceTier, number | null> = {
    weekday: product.price_weekday,
    friday_sunday: product.price_friday_sunday,
    saturday_holiday: product.price_saturday_holiday,
  };

  return (
    <div className="space-y-3">
      {context && context.basePrice != null && (
        <div className="rounded-xl bg-teal-light p-3.5">
          <p className="text-sm text-teal-dark">
            Giá áp dụng ngày {formatDateVN(context.date)}:{" "}
            <span className="font-bold">{formatVND(context.basePrice)}</span>
          </p>
          {context.discountPercent > 0 && (
            <p className="mt-1 text-sm text-teal-dark">
              Sau chiết khấu {context.discountPercent}%:{" "}
              <span className="font-bold">{formatVND(context.finalPrice)}</span>
            </p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        {TIERS.map((tier) => {
          const isApplied = context?.tier === tier && context.basePrice != null;
          return (
            <div
              key={tier}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 text-sm",
                "border-b border-border last:border-0",
                isApplied && "bg-teal-light"
              )}
            >
              <span className={cn("text-ink-muted", isApplied && "font-semibold text-teal-dark")}>
                {TIER_LABEL[tier]}
              </span>
              <span className={cn("tabular-price font-semibold text-ink", isApplied && "text-teal-dark")}>
                {formatVND(priceByTier[tier])}
              </span>
            </div>
          );
        })}
      </div>

      {product.discount_percent > 0 && (
        <p className="text-sm text-ink-muted">
          Chiết khấu: <span className="font-semibold text-ink">{product.discount_percent}%</span>
        </p>
      )}
    </div>
  );
}
