import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveResort, type ResortIn } from "@/lib/resort-save";
import { groupKeyOf, sourceKey, sourceLabel } from "@/lib/hotel-group";

// NHẬP FILE EXCEL BẢNG GIÁ (mẫu chuẩn VivaTrip). Mỗi khách sạn:
//  - đã có CÙNG ĐỐI TÁC (trùng mã hoặc trùng tên + cùng "Giá mua của") → CẬP NHẬT, thay toàn bộ hạng phòng
//  - cùng khách sạn nhưng ĐỐI TÁC KHÁC → TẠO MỚI 1 bản riêng của đối tác đó (web tự gộp, hiện bên rẻ nhất)
//  - chưa có → TẠO MỚI
// Ảnh đã tải lên của khách sạn cũ được giữ nguyên.

export const maxDuration = 60;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "");

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    resorts?: ResortIn[];
    dryRun?: boolean;
    /** Dọn KS cũ của đối tác không còn trong file mới (gọi sau khi nhập xong) */
    prune?: { sources: string[]; keepIds: string[] };
  };
  const supabase = await createClient();

  if (body.prune) {
    const srcs = new Set(body.prune.sources.map(sourceKey).filter(Boolean));
    const keep = new Set(body.prune.keepIds);
    const { data: ex, error: e1 } = await supabase.from("products").select("id, price_source").in("type", ["resort", "hotel", "homestay"]);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
    const ids = (ex ?? []).filter((p) => srcs.has(sourceKey(p.price_source as string)) && !keep.has(p.id as string)).map((p) => p.id as string);
    for (let i = 0; i < ids.length; i += 100) {
      const { error: e2 } = await supabase.from("products").delete().in("id", ids.slice(i, i + 100));
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    }
    revalidatePath("/search-resort");
    revalidateTag("products");
    return NextResponse.json({ deleted: ids.length });
  }

  const resorts = body.resorts ?? [];
  if (!resorts.length) return NextResponse.json({ error: "File không có khách sạn nào." }, { status: 400 });

  const { data: existing, error } = await supabase
    .from("products")
    .select("*")
    .in("type", ["resort", "hotel", "homestay"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  type Ex = { id: string; product_code: string | null; product_name: string; price_source?: string | null; group_key?: string | null };
  const list = (existing ?? []) as Ex[];
  const codes = new Set(list.map((p) => String(p.product_code ?? "").toUpperCase()));
  const match = (r: ResortIn): { id?: string; partnerOf?: string; code?: string } => {
    const src = sourceKey(r.info.price_source);
    const code = r.info.product_code?.trim().toUpperCase() ?? "";
    const gk = groupKeyOf({ product_name: r.info.product_name });
    const sameSrc = list.filter((p) => sourceKey(p.price_source) === src);
    const same =
      (code && sameSrc.find((p) => String(p.product_code ?? "").toUpperCase() === code)) ||
      sameSrc.find((p) => groupKeyOf(p) === gk || (!!r.info.group_key && groupKeyOf(p) === groupKeyOf({ product_name: r.info.group_key })));
    if (same) return { id: same.id };
    const other = list.find((p) => groupKeyOf(p) === gk || (code && String(p.product_code ?? "").toUpperCase() === code));
    // Mã đã bị bên khác dùng → thêm hậu tố đối tác
    let newCode = code;
    if (code && codes.has(code)) {
      const suf = (src || "dt").toUpperCase().slice(0, 6);
      newCode = `${code}-${suf}`;
      for (let i = 2; codes.has(newCode); i++) newCode = `${code}-${suf}${i}`;
    }
    return { partnerOf: other ? `${other.product_name} (${sourceLabel(other.price_source)})` : undefined, code: newCode || undefined };
  };

  // Xem trước: chỉ báo khách sạn nào sẽ cập nhật / tạo mới
  if (body.dryRun) {
    const matches = resorts.map((r) => {
      const m = match(r);
      return { key: r.clientKey, id: m.id ?? null, partnerOf: m.partnerOf ?? null };
    });
    // KS cũ của (các) đối tác trong file mà file mới không còn → đề xuất xoá cho khỏi trùng
    const srcs = new Set(resorts.map((r) => sourceKey(r.info.price_source)).filter(Boolean));
    const used = new Set(matches.map((m) => m.id).filter(Boolean));
    const prune = list
      .filter((p) => srcs.has(sourceKey(p.price_source)) && !used.has(p.id))
      .map((p) => ({ id: p.id, name: p.product_name, source: sourceLabel(p.price_source) }));
    return NextResponse.json({ matches, prune });
  }

  const results: { key: string; id?: string; status: "created" | "updated" | "failed"; error?: string }[] = [];
  for (const r of resorts) {
    try {
      const m = match(r);
      const info = m.id ? r.info : { ...r.info, product_code: m.code ?? r.info.product_code };
      const res = await saveResort(supabase, { ...r, id: m.id, info }, { replaceRooms: true });
      if (res.created) {
        codes.add(String(info.product_code ?? "").toUpperCase());
        list.push({ id: res.id, product_code: info.product_code ?? null, product_name: info.product_name, price_source: info.price_source });
      }
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
