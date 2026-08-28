import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/format";
import type { HotelRate } from "@/lib/types";

export function RoomTierCards({
  rates,
  requestedGuests,
}: {
  rates: HotelRate[];
  requestedGuests?: number;
}) {
  if (rates.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
        Chưa có hạng phòng nào cho sản phẩm này.
      </p>
    );
  }

  let recommendedId: string | null = null;
  if (requestedGuests) {
    const fitting = rates.filter((r) => r.capacity != null && r.capacity >= requestedGuests);
    const pool = fitting.length > 0 ? fitting : rates;
    recommendedId = pool.reduce((best, r) =>
      Math.abs((r.capacity ?? 0) - requestedGuests) < Math.abs((best.capacity ?? 0) - requestedGuests) ? r : best
    ).id;
  }

  return (
    <div className="space-y-3">
      {rates.map((rate) => {
        const isRecommended = rate.id === recommendedId;
        return (
          <div
            key={rate.id}
            className={`relative rounded-2xl border bg-white p-4 ${isRecommended ? "border-2 border-teal" : "border-border"}`}
          >
            {isRecommended && (
              <span className="absolute -top-2.5 left-4 rounded-full bg-teal px-2.5 py-0.5 text-[10px] font-bold text-white">
                Phù hợp nhất với {requestedGuests} khách
              </span>
            )}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold text-ink">{rate.room_type}</p>
                {rate.capacity != null && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-muted">
                    <Users className="h-3.5 w-3.5" />
                    Tối đa {rate.capacity} khách
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[16px] font-bold text-teal-dark">{formatVND(rate.price)}</p>
                <p className="text-[10px] text-ink-muted">/đêm</p>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {rate.breakfast ? (
                <Badge variant="default">Gồm ăn sáng</Badge>
              ) : (
                <Badge variant="neutral">Không gồm ăn sáng</Badge>
              )}
              {rate.extra_bed_price != null && (
                <Badge variant="neutral">Giường phụ: {formatVND(rate.extra_bed_price)}</Badge>
              )}
            </div>

            {rate.note && <p className="mt-2 text-[11.5px] text-ink-muted">{rate.note}</p>}
          </div>
        );
      })}
    </div>
  );
}
