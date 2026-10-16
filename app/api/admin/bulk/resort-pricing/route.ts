import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Lưu bảng giá resort / khách sạn: cài đặt mùa + phụ thu + tóm tắt hợp đồng
// của từng resort, và thêm / sửa / xoá hạng phòng (5 mức giá).
// Cần chạy SQL 0026_resort_pricing trước.

const PRICE_KEYS = ["price_low_weekday", "price_low_weekend", "price_high_weekday", "price_high_weekend", "price_holiday"] as const;

interface RoomIn {
  id?: string;
  room_type: string;
  area_m2?: number | null;
  bed?: string | null;
  capacity?: number | null;
  breakfast?: boolean;
  extra_bed_price?: number | null;
  discount_percent?: number | null;
  sort_order?: number;
  price_low_weekday?: number | null;
  price_low_weekend?: number | null;
  price_high_weekday?: number | null;
  price_high_weekend?: number | null;
  price_holiday?: number | null;
}
interface ResortIn {
  id: string;
  settings?: {
    high_seasons?: { from: string; to: string }[];
    weekend_nights?: number[];
    surcharge_note?: string | null;
    contract_summary?: string | null;
  };
  rooms?: RoomIn[];
  deleted?: string[];
}

const n = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) || Number(v) <= 0 ? null : Math.round(Number(v)));

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { resorts?: ResortIn[] };
  const resorts = body.resorts ?? [];
  if (!resorts.length) return NextResponse.json({ error: "Không có thay đổi nào để lưu." }, { status: 400 });

  const supabase = await createClient();
  const failed: { id: string; error: string }[] = [];
  let saved = 0;

  for (const r of resorts) {
    try {
      if (r.settings) {
        const s = r.settings;
        const { error } = await supabase
          .from("products")
          .update({
            high_seasons: (s.high_seasons ?? []).filter((x) => /^\d{2}-\d{2}$/.test(x.from) && /^\d{2}-\d{2}$/.test(x.to)),
            weekend_nights: (s.weekend_nights ?? [5, 6]).filter((d) => d >= 0 && d <= 6),
            surcharge_note: s.surcharge_note?.trim() || null,
            contract_summary: s.contract_summary?.trim() || null,
          })
          .eq("id", r.id);
        if (error) throw new Error(/column/.test(error.message) ? "Chưa chạy SQL 0026_resort_pricing trên Supabase." : error.message);
      }

      if (r.deleted?.length) {
        const { error } = await supabase.from("hotel_rates").delete().in("id", r.deleted).eq("product_id", r.id);
        if (error) throw new Error(error.message);
      }

      for (const [i, room] of (r.rooms ?? []).entries()) {
        if (!room.room_type?.trim()) continue;
        const prices = Object.fromEntries(PRICE_KEYS.map((k) => [k, n(room[k])]));
        const all = Object.values(prices).filter((x): x is number => x != null);
        if (!all.length) throw new Error(`"${room.room_type}" chưa có giá nào.`);
        const row = {
          product_id: r.id,
          room_type: room.room_type.trim(),
          area_m2: n(room.area_m2),
          bed: room.bed?.trim() || null,
          capacity: n(room.capacity),
          breakfast: !!room.breakfast,
          extra_bed_price: n(room.extra_bed_price),
          discount_percent: Math.min(100, Math.max(0, Number(room.discount_percent) || 0)),
          sort_order: room.sort_order ?? i,
          ...prices,
          price: prices.price_low_weekday ?? Math.min(...all),
        };
        const { error } = room.id
          ? await supabase.from("hotel_rates").update(row).eq("id", room.id).eq("product_id", r.id)
          : await supabase.from("hotel_rates").insert(row);
        if (error) throw new Error(/column/.test(error.message) ? "Chưa chạy SQL 0026_resort_pricing trên Supabase." : error.message);
      }

      // "Giá thấp nhất" của resort (dùng ở các danh sách cũ)
      const { data: left } = await supabase.from("hotel_rates").select("price").eq("product_id", r.id);
      const min = (left ?? []).map((x) => Number(x.price)).filter((x) => x > 0);
      if (min.length) await supabase.from("products").update({ price: Math.min(...min) }).eq("id", r.id).eq("type", "hotel");
      saved++;
    } catch (e) {
      failed.push({ id: r.id, error: e instanceof Error ? e.message : "Lỗi không rõ" });
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/search-resort");
  revalidateTag("products");
  return NextResponse.json({ saved, failed });
}
