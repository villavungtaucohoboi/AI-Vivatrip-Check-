import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ImportRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { rows }: { rows: ImportRow[] } = await req.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Không có dòng dữ liệu hợp lệ để import" }, { status: 400 });
  }

  const supabase = await createClient();

  const payload = rows.map((r) => ({
    product_code: r.product_code,
    product_name: r.product_name,
    type: r.type,
    area: r.area,
    address: r.address ?? null,
    bedrooms: r.bedrooms ?? null,
    beds: r.beds ?? null,
    standard_guests: r.standard_guests ?? null,
    max_guests: r.max_guests ?? null,
    price: r.type === "hotel" ? r.price ?? null : r.price_weekday ?? null,
    price_weekday: r.type === "hotel" ? null : r.price_weekday ?? null,
    price_friday_sunday: r.type === "hotel" ? null : r.price_friday_sunday ?? null,
    price_saturday_holiday: r.type === "hotel" ? null : r.price_saturday_holiday ?? null,
    discount_percent: r.type === "hotel" ? 0 : r.discount_percent ?? 0,
    pool: !!r.pool,
    near_beach: !!r.near_beach,
    karaoke: !!r.karaoke,
    bbq: !!r.bbq,
    note: r.note ?? null,
  }));

  const { error } = await supabase.from("products").upsert(payload, { onConflict: "product_code" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, processed: payload.length });
}
