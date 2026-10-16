import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Lưu bảng giá resort / khách sạn / homestay: thông tin + tiện ích, GIAI ĐOẠN
// giá, phụ thu, tóm tắt hợp đồng, và thêm / sửa / xoá hạng phòng.
// Resort chưa có id → tạo mới. Cần chạy SQL 0026 + 0027 trước.

interface RoomIn {
  id?: string;
  room_type: string;
  area_m2?: number | null;
  bed?: string | null;
  capacity?: number | null;
  max_children?: number | null;
  breakfast?: boolean;
  extra_bed_price?: number | null;
  discount_percent?: number | null;
  period_prices?: Record<string, { wd: number | null; we: number | null }>;
}
interface ResortIn {
  id?: string;
  clientKey: string;
  info: {
    product_code?: string;
    product_name: string;
    type: string;
    area: string;
    address?: string | null;
    star?: number | null;
    image_link?: string | null;
    perks?: string | null;
    amenities?: Record<string, boolean>;
  };
  periods: { key: string; name: string; ranges: { from: string; to: string }[]; holiday?: boolean }[];
  weekend_nights: number[];
  surcharge_note?: string | null;
  contract_summary?: string | null;
  rooms: RoomIn[];
  deleted?: string[];
}

const n = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) || Number(v) <= 0 ? null : Math.round(Number(v)));
const AMENITY_KEYS = ["pool", "near_beach", "sea_view", "near_lake", "karaoke", "bbq", "pickleball"];
const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^a-zA-Z0-9]+/g, "").toUpperCase().slice(0, 10) || "RS";
const colErr = (m: string) => (/column|schema cache|check constraint/i.test(m) ? "Chưa chạy SQL 0026 + 0027 trên Supabase." : m);

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { resorts?: ResortIn[] };
  const resorts = body.resorts ?? [];
  if (!resorts.length) return NextResponse.json({ error: "Không có thay đổi nào để lưu." }, { status: 400 });

  const supabase = await createClient();
  const failed: { key: string; error: string }[] = [];
  const created: { key: string; id: string }[] = [];
  let saved = 0;

  for (const r of resorts) {
    try {
      const info = r.info;
      if (!info.product_name?.trim() || !info.area?.trim()) throw new Error("Thiếu tên hoặc khu vực.");
      if (!["resort", "hotel", "homestay"].includes(info.type)) throw new Error("Loại không hợp lệ.");

      const fields: Record<string, unknown> = {
        product_name: info.product_name.trim(),
        type: info.type,
        area: info.area.trim(),
        address: info.address?.trim() || null,
        star: n(info.star),
        image_link: info.image_link?.trim() || null,
        perks: info.perks?.trim() || null,
        rate_periods: r.periods.map((p) => ({
          key: p.key,
          name: p.name.trim() || "Giai đoạn",
          ranges: p.ranges.filter((x) => /^(\d{4}-)?\d{2}-\d{2}$/.test(x.from) && /^(\d{4}-)?\d{2}-\d{2}$/.test(x.to)),
          ...(p.holiday ? { holiday: true } : {}),
        })),
        weekend_nights: (r.weekend_nights ?? [5, 6]).filter((d) => d >= 0 && d <= 6),
        surcharge_note: r.surcharge_note?.trim() || null,
        contract_summary: r.contract_summary?.trim() || null,
      };
      for (const k of AMENITY_KEYS) if (info.amenities && k in info.amenities) fields[k] = !!info.amenities[k];

      let id = r.id;
      if (!id) {
        const code = info.product_code?.trim() || `${slug(info.product_name)}${Math.floor(Math.random() * 900 + 100)}`;
        const { data, error } = await supabase.from("products").insert({ ...fields, product_code: code }).select("id").single();
        if (error) throw new Error(/duplicate|unique/i.test(error.message) ? `Mã "${code}" đã tồn tại.` : colErr(error.message));
        id = data.id as string;
        created.push({ key: r.clientKey, id });
      } else {
        if (info.product_code?.trim()) fields.product_code = info.product_code.trim();
        const { error } = await supabase.from("products").update(fields).eq("id", id);
        if (error) throw new Error(colErr(error.message));
      }

      if (r.deleted?.length) {
        const { error } = await supabase.from("hotel_rates").delete().in("id", r.deleted).eq("product_id", id);
        if (error) throw new Error(error.message);
      }

      for (const [i, room] of (r.rooms ?? []).entries()) {
        if (!room.room_type?.trim()) continue;
        const pp: Record<string, { wd: number | null; we: number | null }> = {};
        for (const [k, v] of Object.entries(room.period_prices ?? {})) pp[k] = { wd: n(v?.wd), we: n(v?.we) };
        const all = Object.values(pp).flatMap((v) => [v.wd, v.we]).filter((x): x is number => x != null);
        if (!all.length) throw new Error(`"${room.room_type}" chưa có giá nào.`);
        const row = {
          product_id: id,
          room_type: room.room_type.trim(),
          area_m2: n(room.area_m2),
          bed: room.bed?.trim() || null,
          capacity: n(room.capacity),
          max_children: n(room.max_children),
          breakfast: !!room.breakfast,
          extra_bed_price: n(room.extra_bed_price),
          discount_percent: Math.min(100, Math.max(0, Number(room.discount_percent) || 0)),
          sort_order: i,
          period_prices: pp,
          price: Math.min(...all),
        };
        const { error } = room.id
          ? await supabase.from("hotel_rates").update(row).eq("id", room.id).eq("product_id", id)
          : await supabase.from("hotel_rates").insert(row);
        if (error) throw new Error(colErr(error.message));
      }

      // Giá thấp nhất của resort (dùng cho sắp xếp / danh sách cũ)
      const { data: left } = await supabase.from("hotel_rates").select("price").eq("product_id", id);
      const min = (left ?? []).map((x) => Number(x.price)).filter((x) => x > 0);
      if (min.length) await supabase.from("products").update({ price: Math.min(...min) }).eq("id", id);
      saved++;
    } catch (e) {
      failed.push({ key: r.clientKey, error: e instanceof Error ? e.message : "Lỗi không rõ" });
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/search-resort");
  revalidateTag("products");
  return NextResponse.json({ saved, failed, created });
}
