import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPick } from "@/lib/quote-edit";
import type { QuoteItem, QuoteOption } from "@/lib/quote-types";

const item = (id: string, unit_price: number): QuoteItem => ({ id, group: "Nơi nghỉ", name: id, note: "", qty: 1, qty_unit: "", times: 1, times_unit: "", unit_price, vat: false });
const base: QuoteOption = { id: "o1", name: "", place: "", image_url: "", highlights: [], product_id: null, items: [item("a", 1)] };
const pick = { option: { name: "Ivory", place: "Lương Sơn", image_url: "https://x/y.jpg", highlights: ["Bể bơi"], product_id: "p1" }, items: [item("n", 9)] };

test("applyPick áp lên bản mới nhất: giữ sửa đổi đang có, thêm dòng mới", () => {
  const latest = { ...base, items: [item("a", 5_000_000)] }; // sale vừa sửa giá trong lúc chờ
  const r = applyPick(latest, pick);
  assert.deepEqual(r.items.map((x) => [x.id, x.unit_price]), [["a", 5_000_000], ["n", 9]]);
  assert.equal(r.name, "Ivory");
  assert.deepEqual(r.highlights, ["Bể bơi"]);
});

test("applyPick không ghi đè tên/ảnh/điểm nổi bật sale đã nhập", () => {
  const r = applyPick({ ...base, name: "Tên của sale", highlights: ["", "Ý của sale"], image_url: "https://a/b.jpg" }, pick);
  assert.equal(r.name, "Tên của sale");
  assert.equal(r.image_url, "https://a/b.jpg");
  assert.deepEqual(r.highlights, ["", "Ý của sale"]);
  assert.equal(r.place, "Lương Sơn");
});
