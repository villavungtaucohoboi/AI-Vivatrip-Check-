import { NextRequest, NextResponse } from "next/server";
import { getAllProducts, getAllRates } from "@/lib/catalog";
import { buildStayItems, optionFromProduct } from "@/lib/quote-fill";
import { createPublicClient } from "@/lib/supabase/public-client";
import type { Holiday } from "@/lib/types";

export const dynamic = "force-dynamic";

const date = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

// Điền phương án từ kho: ?product=<id>[&rate=<id>][&from=YYYY-MM-DD&to=YYYY-MM-DD]
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const productId = sp.get("product");
  const [products, rates, holidaysRes] = await Promise.all([getAllProducts(), getAllRates(), createPublicClient().from("holidays").select("*")]);
  const product = products.find((p) => p.id === productId);
  if (!product) return NextResponse.json({ error: "Không tìm thấy sản phẩm." }, { status: 404 });

  const own = rates
    .filter((r) => r.product_id === product.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const rateId = sp.get("rate");
  const rate = rateId ? own.find((r) => r.id === rateId) ?? null : null;
  const holidays = (holidaysRes.data ?? []) as Holiday[];

  return NextResponse.json({
    option: optionFromProduct(product),
    // Có hạng phòng mà chưa chọn → chưa thêm dòng nào, để sale chọn hạng phòng trước
    items: own.length && !rate ? [] : buildStayItems({ product, rate, holidays, from: date(sp.get("from")), to: date(sp.get("to")) }),
    rates: own.map((r) => ({ id: r.id, label: `${r.room_type}${r.rate_plan ? ` – ${r.rate_plan}` : ""}` })),
  });
}
