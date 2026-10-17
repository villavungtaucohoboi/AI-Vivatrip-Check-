import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveResort, type ResortIn } from "@/lib/resort-save";

// NHẬP FILE EXCEL BẢNG GIÁ (mẫu chuẩn VivaTrip). Mỗi khách sạn:
//  - đã có trong web (trùng MÃ, hoặc trùng TÊN) → CẬP NHẬT, thay toàn bộ hạng phòng
//  - chưa có → TẠO MỚI
// Ảnh đã tải lên của khách sạn cũ được giữ nguyên.

export const maxDuration = 60;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "");

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { resorts?: ResortIn[]; dryRun?: boolean };
  const resorts = body.resorts ?? [];
  if (!resorts.length) return NextResponse.json({ error: "File không có khách sạn nào." }, { status: 400 });

  const supabase = await createClient();
  const { data: existing, error } = await supabase
    .from("products")
    .select("id, product_code, product_name")
    .in("type", ["resort", "hotel", "homestay"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const byCode = new Map((existing ?? []).filter((p) => p.product_code).map((p) => [String(p.product_code).toUpperCase(), p.id as string]));
  const byName = new Map((existing ?? []).map((p) => [norm(String(p.product_name)), p.id as string]));
  const match = (r: ResortIn) =>
    (r.info.product_code && byCode.get(r.info.product_code.trim().toUpperCase())) || byName.get(norm(r.info.product_name)) || undefined;

  // Xem trước: chỉ báo khách sạn nào sẽ cập nhật / tạo mới
  if (body.dryRun) {
    return NextResponse.json({ matches: resorts.map((r) => ({ key: r.clientKey, id: match(r) ?? null })) });
  }

  const results: { key: string; id?: string; status: "created" | "updated" | "failed"; error?: string }[] = [];
  for (const r of resorts) {
    try {
      const id = match(r);
      const res = await saveResort(supabase, { ...r, id }, { replaceRooms: true });
      results.push({ key: r.clientKey, id: res.id, status: res.created ? "created" : "updated" });
    } catch (e) {
      results.push({ key: r.clientKey, status: "failed", error: e instanceof Error ? e.message : "Lỗi không rõ" });
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/search-resort");
  revalidateTag("products");
  return NextResponse.json({ results });
}
