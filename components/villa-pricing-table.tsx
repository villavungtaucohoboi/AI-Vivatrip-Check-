import { formatVND } from "@/lib/format";
import { formatDateVN, TIER_LABEL } from "@/lib/pricing";
import { villaTierPrices } from "@/lib/villa-text";
import type { DatePricingContext, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Bảng giá villa 3 khung: giá gốc gạch ngang, giá sau chiết khấu in đậm,
 * nhãn CK màu cam. Khung đúng ngày khách đi được tô đỏ.
 */
export function VillaPricingTable({ product, context }: { product: Product; context?: DatePricingContext }) {
  const rows = villaTierPrices(product);

  return (
    <div className="space-y-2">
      {rows.map(({ tier, base, final, hasDiscount, discountShort }) => {
        const hot = context?.tier === tier;
        return (
          <div
            key={tier}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3.5 py-3",
              hot ? "border-hot/40 bg-hot-light" : "border-border bg-white"
            )}
          >
            <div className="min-w-0 flex-1">
              <p className={cn("text-[13.5px] font-bold", hot ? "text-hot" : "text-ink")}>{TIER_LABEL[tier]}</p>
              {hot && context && <p className="text-[11.5px] font-medium text-hot">Ngày khách đi · {formatDateVN(context.date)}</p>}
            </div>
            <div className="text-right tabular-price">
              {hasDiscount && <p className="text-[12px] text-ink-muted line-through">{formatVND(base)}</p>}
              <p className={cn("text-[18px] font-extrabold leading-tight tracking-tight", hot ? "text-hot" : "text-ink")}>
                {formatVND(final)}
              </p>
            </div>
            {hasDiscount ? (
              <span className="shrink-0 whitespace-nowrap rounded-lg bg-coral px-2 py-1 text-[12px] font-extrabold text-white">
                -{discountShort}
              </span>
            ) : (
              <span className="w-[52px] shrink-0" />
            )}
          </div>
        );
      })}
      {product.extra_guest_fee ? (
        <p className="pt-1 text-[12.5px] text-ink-muted">
          Phụ thu khách vượt tiêu chuẩn: <b className="text-ink">{formatVND(product.extra_guest_fee)}</b>/khách
        </p>
      ) : null}
    </div>
  );
}
