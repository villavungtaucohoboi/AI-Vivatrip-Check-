import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError, type ProductInput } from "@/lib/admin-types";
import { normalizeAreaName } from "@/lib/normalize-area";

export async function POST(req: NextRequest) {
  const body: { input: ProductInput; id?: string } = await req.json();
  const { input, id } = body;
  const supabase = await createClient();

  // Villa/resort: `price` là cột tham khảo/sort nhanh, luôn đồng bộ = price_weekday.
  // Hotel: giữ nguyên giá trị admin nhập tay (giá phòng thấp nhất).
  const payload: ProductInput = {
    ...(input.type === "hotel" ? input : { ...input, price: input.price_weekday ?? null }),
    area: normalizeAreaName(input.area),
    sub_region: input.sub_region?.trim() ? normalizeAreaName(input.sub_region) : null,
  };

  if (id) {
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) return NextResponse.json({ error: mapError(error.message) }, { status: 400 });
    revalidatePath("/admin/products");
    revalidatePath(`/products/${id}`);
    revalidatePath("/search");
    revalidateTag("products");
    return NextResponse.json({ id });
  }

  const { data, error } = await supabase.from("products").insert(payload).select("id").single();
  if (error) return NextResponse.json({ error: mapError(error.message) }, { status: 400 });
  revalidatePath("/admin/products");
  revalidatePath("/search");
  revalidateTag("products");
  return NextResponse.json({ id: data.id });
}
