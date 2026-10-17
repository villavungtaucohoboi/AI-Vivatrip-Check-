import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveResort, type ResortIn } from "@/lib/resort-save";

// Lưu bảng giá resort / khách sạn / homestay: thông tin + tiện ích, GIAI ĐOẠN
// giá, phụ thu, tóm tắt hợp đồng, và thêm / sửa / xoá hạng phòng.
// Resort chưa có id → tạo mới. Cần chạy SQL 0026 + 0027 (+ 0028) trước.

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
      const res = await saveResort(supabase, r);
      if (res.created) created.push({ key: r.clientKey, id: res.id });
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
