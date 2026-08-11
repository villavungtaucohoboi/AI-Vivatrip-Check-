import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { HotelRateInput } from "@/lib/admin-types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const { rates }: { rates: HotelRateInput[] } = await req.json();
  const supabase = await createClient();

  const { error: deleteError } = await supabase.from("hotel_rates").delete().eq("product_id", productId);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  if (rates.length > 0) {
    const { error: insertError } = await supabase
      .from("hotel_rates")
      .insert(rates.map((r) => ({ ...r, product_id: productId })));
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath(`/products/${productId}`);
  return NextResponse.json({ ok: true });
}
