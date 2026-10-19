import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveDepartures } from "@/lib/tour-save";
import type { TourDeparture } from "@/lib/tour-types";

// Cập nhật NGÀY KHỞI HÀNH (từ file Excel số chỗ / mở thêm ngày) cho nhiều tour 1 lần.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { items?: { tourId: string; departures: Partial<TourDeparture>[]; mode?: "replace" | "merge" }[] };
  const supabase = await createClient();
  const results: { tourId: string; saved?: number; error?: string }[] = [];
  for (const it of body.items ?? []) {
    try {
      results.push({ tourId: it.tourId, saved: await saveDepartures(supabase, it.tourId, it.departures, it.mode ?? "merge") });
    } catch (e) {
      results.push({ tourId: it.tourId, error: e instanceof Error ? e.message : "Lỗi" });
    }
  }
  revalidatePath("/tours");
  revalidatePath("/admin/tours");
  return NextResponse.json({ results });
}
