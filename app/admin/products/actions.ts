"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import type { ProductType } from "@/lib/types";

export interface ProductInput {
  product_code: string;
  product_name: string;
  type: ProductType;
  area: string;
  address?: string | null;
  bedrooms?: number | null;
  beds?: number | null;
  standard_guests?: number | null;
  max_guests?: number | null;
  /** Hotel: giá phòng thấp nhất (nhập tay). Villa/resort: = price_weekday, set tự động khi lưu. */
  price?: number | null;
  price_weekday?: number | null;
  price_friday_sunday?: number | null;
  price_saturday_holiday?: number | null;
  discount_percent: number;
  pool: boolean;
  near_beach: boolean;
  karaoke: boolean;
  bbq: boolean;
  note?: string | null;
  google_maps_url?: string | null;
}

export interface HotelRateInput {
  room_type: string;
  price: number;
  capacity?: number | null;
  breakfast: boolean;
  extra_bed_price?: number | null;
  note?: string | null;
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
  return profile;
}

export async function saveProduct(
  input: ProductInput,
  id?: string
): Promise<{ id: string } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  // Villa/resort: `price` là cột tham khảo/sort nhanh, luôn đồng bộ = price_weekday.
  // Hotel: giữ nguyên giá trị admin nhập tay (giá phòng thấp nhất).
  const payload: ProductInput =
    input.type === "hotel" ? input : { ...input, price: input.price_weekday ?? null };

  if (id) {
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) return { error: mapError(error.message) };
    revalidatePath("/admin/products");
    revalidatePath(`/products/${id}`);
    return { id };
  }

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { error: mapError(error.message) };
  revalidatePath("/admin/products");
  return { id: data.id };
}

export async function deleteProduct(id: string): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  return { ok: true };
}

// Thay toàn bộ bảng giá của 1 sản phẩm bằng danh sách mới (đơn giản, dễ hiểu
// hơn so với việc diff từng dòng thêm/sửa/xoá).
export async function saveHotelRates(
  productId: string,
  rates: HotelRateInput[]
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("hotel_rates")
    .delete()
    .eq("product_id", productId);
  if (deleteError) return { error: deleteError.message };

  if (rates.length > 0) {
    const { error: insertError } = await supabase
      .from("hotel_rates")
      .insert(rates.map((r) => ({ ...r, product_id: productId })));
    if (insertError) return { error: insertError.message };
  }

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath(`/products/${productId}`);
  return { ok: true };
}

// Thay toàn bộ ảnh của 1 sản phẩm bằng danh sách URL mới (đã upload lên
// Supabase Storage từ phía client trước đó), đồng thời cập nhật thumbnail_url.
export async function saveProductImages(
  productId: string,
  imageUrls: string[]
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);
  if (deleteError) return { error: deleteError.message };

  if (imageUrls.length > 0) {
    const { error: insertError } = await supabase.from("product_images").insert(
      imageUrls.map((image_url, sort_order) => ({ product_id: productId, image_url, sort_order }))
    );
    if (insertError) return { error: insertError.message };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ thumbnail_url: imageUrls[0] ?? null })
    .eq("id", productId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath(`/products/${productId}`);
  revalidatePath("/search");
  return { ok: true };
}

function mapError(message: string): string {
  if (message.includes("products_product_code_key")) {
    return "Mã sản phẩm này đã tồn tại. Vui lòng dùng mã khác.";
  }
  return message;
}
