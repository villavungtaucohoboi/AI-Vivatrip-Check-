import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Lưu giá / sức chứa / extra bed / ăn sáng của NHIỀU hạng phòng Resort-Hotel
// trong 1 lần bấm. Sau khi lưu tự cập nhật "giá thấp nhất" (cột products.price)
// của từng resort bị ảnh hưởng — đúng ý nghĩa ô "Giá hiện tại — giá phòng
// thấp nhất" ở form sửa từng sản phẩm.

interface RateUpdate {
  id: string;
  price?: number;
  capacity?: number | null;
  extra_bed_price?: number | null;
  breakfast?: boolean;
}

export async function POST(req: NextRequest) {
  const body: { updates?: RateUpdate[] } = await req.json();
  const updates = body.updates ?? [];
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "Không có thay đổi nào để lưu." }, { status: 400 });
  }
  if (updates.length > 1000) {
    return NextResponse.json({ error: "Tối đa 1000 hạng phòng mỗi lần lưu." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: existing, error: lookupError } = await supabase
    .from("hotel_rates")
    .select("id, product_id")
    .in(
      "id",
      updates.map((u) => u.id)
    );
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
  const productByRate = new Map((existing ?? []).map((r) => [r.id as string, r.product_id as string]));

  const failed: { id: string; error: string }[] = [];
  const touchedProducts = new Set<string>();
  let saved = 0;

  for (let i = 0; i < updates.length; i += 10) {
    const chunk = updates.slice(i, i + 10);
    await Promise.all(
      chunk.map(async (u) => {
        const productId = productByRate.get(u.id);
        if (!productId) return void failed.push({ id: u.id, error: "Không tìm thấy hạng phòng." });

        const clean: Record<string, unknown> = {};
        if ("price" in u) {
          if (typeof u.price !== "number" || !Number.isFinite(u.price) || u.price <= 0) {
            return void failed.push({ id: u.id, error: "Giá phòng phải lớn hơn 0." });
          }
          clean.price = Math.round(u.price);
        }
        for (const key of ["capacity", "extra_bed_price"] as const) {
          if (key in u) {
            const v = u[key];
            if (v === null) clean[key] = null;
            else if (typeof v === "number" && Number.isFinite(v) && v >= 0) clean[key] = Math.round(v);
            else return void failed.push({ id: u.id, error: `Giá trị "${key}" không hợp lệ.` });
          }
        }
        if ("breakfast" in u) {
          if (typeof u.breakfast !== "boolean") return void failed.push({ id: u.id, error: "Ăn sáng không hợp lệ." });
          clean.breakfast = u.breakfast;
        }
        if (Object.keys(clean).length === 0) return;

        const { error } = await supabase.from("hotel_rates").update(clean).eq("id", u.id);
        if (error) failed.push({ id: u.id, error: error.message });
        else {
          saved++;
          touchedProducts.add(productId);
        }
      })
    );
  }

  // Đồng bộ giá thấp nhất cho từng resort/hotel có hạng phòng vừa đổi.
  for (const productId of touchedProducts) {
    const { data: rates } = await supabase.from("hotel_rates").select("price").eq("product_id", productId);
    const prices = (rates ?? []).map((r) => r.price as number).filter((p) => p > 0);
    if (prices.length) {
      await supabase.from("products").update({ price: Math.min(...prices) }).eq("id", productId);
    }
    revalidatePath(`/products/${productId}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/search-resort");
  revalidateTag("products");
  return NextResponse.json({ saved, failed });
}
