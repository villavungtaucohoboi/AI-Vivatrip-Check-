import { ProductCard } from "@/components/product-card";
import type { DatePricingContext, PriceTier, Product } from "@/lib/types";

export function ProductGrid({
  products,
  showBestMatch = false,
  requestedGuests,
  highlightTiers,
}: {
  products: (Product & { _pricing?: DatePricingContext })[];
  /** Gắn badge "Phù hợp nhất" cho kết quả đầu tiên — chỉ bật khi có tìm kiếm thật sự */
  showBestMatch?: boolean;
  requestedGuests?: number;
  highlightTiers?: PriceTier[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3">
      {products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          matchLabel={showBestMatch && i === 0 ? "Phù hợp nhất" : undefined}
          requestedGuests={requestedGuests}
          highlightTiers={highlightTiers}
        />
      ))}
    </div>
  );
}
