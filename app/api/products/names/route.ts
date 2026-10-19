import { NextRequest, NextResponse } from "next/server";
import { getAllProducts } from "@/lib/catalog";
import { normalize } from "@/lib/ranking";
import { groupKeyOf, sourceLabel } from "@/lib/hotel-group";

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
    .filter((x) => x.score > 0);

  // Resort/khách sạn: CÙNG 1 khách sạn ở nhiều đối tác → gộp 1 dòng, mở bên RẺ NHẤT
  const price = (p: (typeof all)[number]) => (p.price_weekday ?? p.price ?? null) as number | null;
  const groups = new Map<string, typeof scored>();
  for (const x of scored) {
    const k = x.p.type === "villa" ? x.p.id : groupKeyOf(x.p);
    groups.set(k, [...(groups.get(k) ?? []), x]);
  }
  const results = [...groups.values()]
    .map((list) => {
      const sorted = [...list].sort((a, b) => (price(a.p) ?? 1e12) - (price(b.p) ?? 1e12));
      const best = sorted[0].p;
      return {
        score: Math.max(...list.map((x) => x.score)),
        hit: {
          id: best.id,
          product_name: best.product_name,
          type: best.type,
          area: best.area,
          sub_region: best.sub_region,
          thumbnail_url: best.thumbnail_url ?? list.find((x) => x.p.thumbnail_url)?.p.thumbnail_url ?? null,
          price_weekday: price(best),
          partners: list.length > 1 ? sorted.map((x) => sourceLabel(x.p.price_source)) : [],
        },
      };
    })
    .sort((a, b) => b.score - a.score || a.hit.product_name.localeCompare(b.hit.product_name, "vi"))
    .slice(0, 10)
    .map((x) => x.hit);

  return NextResponse.json({ results });
}
