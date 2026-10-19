import type { SupabaseClient } from "@supabase/supabase-js";

// Lưu 1 resort / khách sạn / homestay (thông tin + giai đoạn + hạng phòng).
// Dùng chung cho trang Bảng giá (sửa tay / AI) và Nhập file Excel.

export interface RoomIn {
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
export interface ResortIn {
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
    price_source?: string | null;
    group_key?: string | null;
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

export const n = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) || Number(v) <= 0 ? null : Math.round(Number(v)));
const AMENITY_KEYS = ["pool", "near_beach", "sea_view", "near_lake", "karaoke", "bbq", "pickleball"];
export const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^a-zA-Z0-9]+/g, "").toUpperCase().slice(0, 10) || "RS";
const colErr = (m: string) => (/column|schema cache|check constraint/i.test(m) ? "Chưa chạy SQL 0026 → 0029 trên Supabase." : m);


/** Trả về id resort (tạo mới nếu chưa có id). Lỗi → throw Error tiếng Việt. */
export async function saveResort(supabase: SupabaseClient, r: ResortIn, opts: { replaceRooms?: boolean } = {}): Promise<{ id: string; created: boolean }> {
  let created = false;
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
    ...(info.price_source !== undefined ? { price_source: info.price_source?.trim() || null } : {}),
    ...(info.group_key !== undefined ? { group_key: info.group_key?.trim() || null } : {}),
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
    created = true;
  } else {
    if (info.product_code?.trim()) fields.product_code = info.product_code.trim();
    const { error } = await supabase.from("products").update(fields).eq("id", id);
    if (error) throw new Error(colErr(error.message));
  }

  // Kiểm tra / dựng toàn bộ hạng phòng TRƯỚC khi xoá phòng cũ → lỗi thì không mất dữ liệu
  const rows = (r.rooms ?? [])
    .filter((room) => room.room_type?.trim())
    .map((room, i) => {
      const pp: Record<string, { wd: number | null; we: number | null }> = {};
      for (const [k, v] of Object.entries(room.period_prices ?? {})) pp[k] = { wd: n(v?.wd), we: n(v?.we) };
      const all = Object.values(pp).flatMap((v) => [v.wd, v.we]).filter((x): x is number => x != null);
      if (!all.length) throw new Error(`"${room.room_type}" chưa có giá nào.`);
      return {
        id: room.id,
        row: {
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
        },
      };
    });

  if (opts.replaceRooms) {
    const { error } = await supabase.from("hotel_rates").delete().eq("product_id", id);
    if (error) throw new Error(error.message);
  } else if (r.deleted?.length) {
    const { error } = await supabase.from("hotel_rates").delete().in("id", r.deleted).eq("product_id", id);
    if (error) throw new Error(error.message);
  }

  const inserts = rows.filter((x) => !x.id || opts.replaceRooms).map((x) => x.row);
  if (inserts.length) {
    const { error } = await supabase.from("hotel_rates").insert(inserts);
    if (error) throw new Error(colErr(error.message));
  }
  for (const x of rows) {
    if (!x.id || opts.replaceRooms) continue;
    const { error } = await supabase.from("hotel_rates").update(x.row).eq("id", x.id).eq("product_id", id);
    if (error) throw new Error(colErr(error.message));
  }

  // Giá thấp nhất của resort (dùng cho sắp xếp / danh sách cũ)
  const { data: left } = await supabase.from("hotel_rates").select("price").eq("product_id", id);
  const min = (left ?? []).map((x) => Number(x.price)).filter((x) => x > 0);
  if (min.length) await supabase.from("products").update({ price: Math.min(...min) }).eq("id", id);
  return { id: id as string, created };
}
