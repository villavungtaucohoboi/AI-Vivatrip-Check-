import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/format";
import type { HotelRate } from "@/lib/types";

export function HotelRateTable({ rates }: { rates: HotelRate[] }) {
  if (rates.length === 0) {
    return (
      <p className="text-sm text-ink-muted">Chưa có bảng giá cho sản phẩm này.</p>
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Loại phòng</TH>
          <TH>Giá / đêm</TH>
          <TH>Sức chứa</TH>
          <TH>Ăn sáng</TH>
          <TH>Extra bed</TH>
        </TR>
      </THead>
      <TBody>
        {rates.map((rate) => (
          <TR key={rate.id}>
            <TD className="font-medium">
              {rate.room_type}
              {rate.note && (
                <p className="mt-0.5 text-xs font-normal text-ink-muted">{rate.note}</p>
              )}
            </TD>
            <TD className="tabular-price font-display text-teal-dark">
              {formatVND(rate.price)}
            </TD>
            <TD>{rate.capacity ?? "—"} khách</TD>
            <TD>
              {rate.breakfast ? (
                <Badge variant="default">Có</Badge>
              ) : (
                <Badge variant="neutral">Không</Badge>
              )}
            </TD>
            <TD>{rate.extra_bed_price != null ? formatVND(rate.extra_bed_price) : "—"}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
