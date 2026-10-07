import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Lưu / xoá du thuyền (cùng hạng cabin + file lịch trình) cho bảng hàng loạt.
// Nằm dưới /api/admin/* nên middleware đã chặn người chưa đăng nhập Admin.

interface CruisePayload {
  id?: string;
  category: "day" | "night";
  name: string;
  duration_label: string | null;
  star: number | null;
  price_adult: number;
  price_child: number;
  discount_percent: number;
  meals: { label: string; included: boolean }[];
  services: string[];
  itinerary: string;
  note: string | null;
  sort_order?: number;
  capacity: number | null;
  cabin_count: number | null;
  itinerary_url: string | null;
  child_prices: { age_label: string; price: number }[];
  images: { url: string }[];
  cabins: { name: string; price: number }[];
  files: { file_name: string; file_url: string; file_size: number }[];
}

function validate(c: CruisePayload): string | null {
  if (c.category !== "day" && c.category !== "night") return "Loại du thuyền không hợp lệ.";
  if (!c.name || !c.name.trim()) return "Thiếu tên du thuyền.";
  for (const k of ["price_adult", "price_child"] as const) {
    if (typeof c[k] !== "number" || !Number.isFinite(c[k]) || c[k] < 0) return "Giá không hợp lệ.";
  }
  if (typeof c.discount_percent !== "number" || c.discount_percent < 0 || c.discount_percent > 100) {
    return "Chiết khấu phải từ 0 đến 100%.";
  }
  if (c.star !== null && (!Number.isInteger(c.star) || c.star < 1 || c.star > 6)) return "Hạng sao không hợp lệ (3–6 sao).";
  if (!Array.isArray(c.meals) || c.meals.some((m) => typeof m.label !== "string" || typeof m.included !== "boolean")) {
    return "Danh sách bữa ăn không hợp lệ.";
  }
  if (!Array.isArray(c.services) || c.services.some((s) => typeof s !== "string")) return "Danh sách dịch vụ không hợp lệ.";
  if (!Array.isArray(c.cabins) || c.cabins.some((x) => !x.name?.trim() || typeof x.price !== "number" || x.price < 0)) {
    return "Hạng cabin không hợp lệ.";
  }
  for (const k of ["capacity", "cabin_count"] as const) {
    if (c[k] !== null && c[k] !== undefined && (!Number.isInteger(c[k]) || (c[k] as number) < 0)) return "Số chỗ / số cabin không hợp lệ.";
  }
  if (!Array.isArray(c.child_prices) || c.child_prices.some((x) => typeof x.age_label !== "string" || typeof x.price !== "number" || x.price < 0)) {
    return "Giá trẻ em theo độ tuổi không hợp lệ.";
  }
  if (!Array.isArray(c.images) || c.images.some((x) => !x.url)) return "Ảnh không hợp lệ.";
  if (!Array.isArray(c.files) || c.files.some((f) => !f.file_url || !f.file_name)) return "File đính kèm không hợp lệ.";
  return null;
}

export async function POST(req: NextRequest) {
  const body: { cruise?: CruisePayload } = await req.json();
  const c = body.cruise;
  if (!c) return NextResponse.json({ error: "Thiếu dữ liệu." }, { status: 400 });
  const invalid = validate(c);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const supabase = await createClient();
  const row = {
    category: c.category,
    name: c.name.trim(),
    duration_label: c.duration_label?.trim() || null,
    star: c.star,
    price_adult: Math.round(c.price_adult),
    price_child: Math.round(c.child_prices.find((x) => x.age_label.trim())?.price ?? c.price_child ?? 0),
    capacity: c.capacity ?? null,
    cabin_count: c.cabin_count ?? null,
    itinerary_url: c.itinerary_url?.trim() || null,
    discount_percent: c.discount_percent,
    meals: c.meals.filter((m) => m.label.trim()).map((m) => ({ label: m.label.trim(), included: m.included })),
    services: c.services,
    itinerary: c.itinerary ?? "",
    note: c.note?.trim() || null,
  };

  let id = c.id;
  if (id) {
    const { error } = await supabase.from("cruises").update(row).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { data, error } = await supabase
      .from("cruises")
      .insert({ ...row, sort_order: c.sort_order ?? 0 })
      .select("id")
      .single();
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Không tạo được du thuyền." }, { status: 400 });
    id = data.id as string;
  }

  // Cabin + file: ghi lại toàn bộ theo danh sách mới nhất (đơn giản, không lệch dữ liệu).
  const { error: delCabin } = await supabase.from("cruise_cabins").delete().eq("cruise_id", id);
  if (delCabin) return NextResponse.json({ error: delCabin.message }, { status: 400 });
  if (c.category === "night" && c.cabins.length) {
    const { error } = await supabase
      .from("cruise_cabins")
      .insert(c.cabins.map((x, i) => ({ cruise_id: id, name: x.name.trim(), price: Math.round(x.price), sort_order: i })));
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: delChild } = await supabase.from("cruise_child_prices").delete().eq("cruise_id", id);
  if (delChild) return NextResponse.json({ error: delChild.message }, { status: 400 });
  const tiers = c.child_prices.filter((x) => x.age_label.trim());
  if (tiers.length) {
    const { error } = await supabase
      .from("cruise_child_prices")
      .insert(tiers.map((x, i) => ({ cruise_id: id, age_label: x.age_label.trim(), price: Math.round(x.price), sort_order: i })));
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: delImg } = await supabase.from("cruise_images").delete().eq("cruise_id", id);
  if (delImg) return NextResponse.json({ error: delImg.message }, { status: 400 });
  if (c.images.length) {
    const { error } = await supabase.from("cruise_images").insert(c.images.map((x, i) => ({ cruise_id: id, url: x.url, sort_order: i })));
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: delFile } = await supabase.from("cruise_files").delete().eq("cruise_id", id);
  if (delFile) return NextResponse.json({ error: delFile.message }, { status: 400 });
  if (c.files.length) {
    const { error } = await supabase
      .from("cruise_files")
      .insert(c.files.map((f) => ({ cruise_id: id, file_name: f.file_name, file_url: f.file_url, file_size: f.file_size })));
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/cruises");
  revalidatePath(`/cruises/${id}`);
  revalidatePath("/admin/bulk/cruise/edit");
  return NextResponse.json({ id });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("cruises").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidatePath("/cruises");
  revalidatePath("/admin/bulk/cruise/edit");
  return NextResponse.json({ ok: true });
}
