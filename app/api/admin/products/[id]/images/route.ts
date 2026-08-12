import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const { imageUrls }: { imageUrls: string[] } = await req.json();
  const supabase = await createClient();

  const { error: deleteError } = await supabase.from("product_images").delete().eq("product_id", productId);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  if (imageUrls.length > 0) {
    const { error: insertError } = await supabase.from("product_images").insert(
      imageUrls.map((image_url, sort_order) => ({ product_id: productId, image_url, sort_order }))
    );
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ thumbnail_url: imageUrls[0] ?? null })
    .eq("id", productId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath(`/products/${productId}`);
  revalidatePath("/search");
  revalidateTag("products");
  return NextResponse.json({ ok: true });
}
