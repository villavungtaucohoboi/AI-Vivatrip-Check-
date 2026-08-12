import { formatVND } from "@/lib/format";
import { formatDateVN, formatDiscount, getDiscountForTier, TIER_LABEL } from "@/lib/pricing";
import type { DatePricingContext, PriceTier, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const TIERS: PriceTier[] = ["weekday", "friday_sunday", "saturday_holiday"];

type PricingProduct = Pick<
  Product,
  | "price_weekday"
  | "price_friday_sunday"
  | "price_saturday_holiday"
  | "discount_scheme"
  | "discount_type"
  | "discount_value"
  | "discount_weekday_type"
  | "discount_weekday_value"
  | "discount_friday_sunday_type"
  | "discount_friday_sunday_value"
  | "discount_saturday_holiday_type"
  | "discount_saturday_holiday_value"
>;

export function VillaPricingTable({
  product,
  context,
}: {
  product: PricingProduct;
  context?: DatePricingContext;
}) {
  const priceByTier: Record<PriceTier, number | null> = {
    weekday: product.price_weekday,
    friday_sunday: product.price_friday_sunday,
    saturday_holiday: product.price_saturday_holiday,
  };

  const hasAnyDiscount =
    product.discount_scheme === "uniform"
      ? product.discount_value > 0
      : product.discount_weekday_value > 0 ||
        product.discount_friday_sunday_value > 0 ||
        product.discount_saturday_holiday_value > 0;

  return (
    <div className="space-y-3">
      {context && context.basePrice != null && (
        <div className="rounded-xl bg-teal-light p-3.5">
          <p className="text-sm text-teal-dark">
            Giá áp dụng ngày {formatDateVN(context.date)}:{" "}
            <span className="font-bold">{formatVND(context.basePrice)}</span>
          </p>
          {context.discountValue > 0 && (
            <p className="mt-1 text-sm text-teal-dark">
              Sau chiết khấu {formatDiscount(context.discountType, context.discountValue)}:{" "}
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

      {hasAnyDiscount && (
        <div className="text-sm text-ink-muted">
          {product.discount_scheme === "uniform" ? (
            <p>
              Chiết khấu (mọi ngày):{" "}
              <span className="font-semibold text-ink">
                {formatDiscount(product.discount_type, product.discount_value)}
              </span>
            </p>
          ) : (
            <div className="space-y-0.5">
              {TIERS.map((tier) => {
                const d = getDiscountForTier(product, tier);
                return (
                  <p key={tier}>
                    Chiết khấu {TIER_LABEL[tier]}:{" "}
                    <span className="font-semibold text-ink">{formatDiscount(d.type, d.value)}</span>
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
