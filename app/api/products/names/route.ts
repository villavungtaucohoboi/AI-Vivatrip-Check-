import { NextRequest, NextResponse } from "next/server";
import { getAllProducts } from "@/lib/catalog";
import { normalize } from "@/lib/ranking";

// Tìm nhanh theo TÊN căn (gõ tới đâu gợi ý tới đó). Dùng chung kho sản phẩm
// đang cache trong RAM với /api/search nên gần như tức thì.
export async function GET(req: NextRequest) {
  const q = normalize(req.nextUrl.searchParams.get("q") ?? "");
  const type = req.nextUrl.searchParams.get("type"); // "villa" | "resort" (resort = hotel+resort)
  if (q.length < 2) return NextResponse.json({ results: [] });

  const words = q.split(/\s+/).filter(Boolean);
  const all = await getAllProducts();
  const scored = all
    .filter((p) => (type === "villa" ? p.type === "villa" : type === "resort" ? p.type !== "villa" : true))
    .map((p) => {
      const name = normalize(p.product_name);
      const code = normalize(p.product_code ?? "");
      let score = 0;
      if (name.startsWith(q)) score = 3;
      else if (name.includes(q) || code === q) score = 2;
      else if (words.every((w) => name.includes(w))) score = 1;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.product_name.localeCompare(b.p.product_name, "vi"))
    .slice(0, 8)
    .map(({ p }) => ({
      id: p.id,
      product_name: p.product_name,
      type: p.type,
      area: p.area,
      sub_region: p.sub_region,
      thumbnail_url: p.thumbnail_url,
      price_weekday: p.price_weekday ?? p.price,
    }));

  return NextResponse.json({ results: scored });
}
