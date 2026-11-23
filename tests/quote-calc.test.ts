import { test } from "node:test";
import assert from "node:assert/strict";
import { cheapestOptionId, lineAmount, nightsBetween, optionTotals, perPax, qtyLabel } from "@/lib/quote-calc";
import type { QuoteGroup, QuoteItem, QuoteOption } from "@/lib/quote-types";

let n = 0;
const base: QuoteItem = { id: "b", group: "Khác", name: "x", note: "", qty: null, qty_unit: "", times: null, times_unit: "", unit_price: null, vat: false };
const it = (group: QuoteGroup, name: string, qty: number | null, times: number | null, unit_price: number | null, vat: boolean): QuoteItem => ({
  ...base, id: `i${++n}`, group, name, qty, times, unit_price, vat,
});
const opt = (items: QuoteItem[], id = "o1"): QuoteOption => ({ id, name: id, place: "", image_url: "", highlights: [], product_id: null, items });

// Phương án Ivory theo file Excel "Báo giá Iris" (giá xe điền 3.500.000đ)
const ivory = opt([
  it("Vận chuyển", "Xe 29 chỗ đưa đón", 1, 1, 3_500_000, true),
  it("Vận chuyển", "Dừng đợi ăn trưa trên đường", 1, null, 300_000, true),
  it("Nơi nghỉ", "Villa 4 phòng ngủ", 1, 1, 7_000_000, false),
  it("Nơi nghỉ", "Villa 4PN hướng vườn, bể bơi riêng", 3, 1, 8_000_000, false),
  it("Ăn uống & vui chơi", "Bữa tối", 20, 1, 400_000, true),
  it("Ăn uống & vui chơi", "Bữa trưa", 20, 2, 300_000, true),
  it("Ăn uống & vui chơi", "Sân pick", null, null, null, true),
  it("Ăn uống & vui chơi", "Hướng dẫn viên", 1, 2, 800_000, false),
]);

test("optionTotals khớp file Excel Ivory", () => {
  const t = optionTotals(ivory, 8);
  assert.equal(t.subtotal, 56_400_000);
  assert.equal(t.vatBase, 23_800_000);
  assert.equal(t.vat, 1_904_000);
  assert.equal(t.total, 58_304_000);
  assert.equal(t.byGroup["Nơi nghỉ"], 31_000_000);
  assert.equal(t.byGroup["Vận chuyển"], 3_800_000);
  assert.equal(t.byGroup["Khác"], 0);
  assert.equal(t.hasTbd, true);
});

test("perPax làm tròn nghìn", () => {
  assert.equal(perPax(58_304_000, 20), 2_915_000);
  assert.equal(perPax(1, null), null);
  assert.equal(perPax(1, 0), null);
});

test("lineAmount: ô trống tính là 1, đơn giá trống là null", () => {
  assert.equal(lineAmount({ ...base, qty: null, times: null, unit_price: 300_000 }), 300_000);
  assert.equal(lineAmount({ ...base, qty: 20, times: 2, unit_price: 300_000 }), 12_000_000);
  assert.equal(lineAmount({ ...base, qty: 5, times: 1, unit_price: null }), null);
});

test("qtyLabel ghép số lượng và số lần", () => {
  assert.equal(qtyLabel({ ...base, qty: 20, qty_unit: "khách", times: 2, times_unit: "bữa" }), "20 khách × 2 bữa");
  assert.equal(qtyLabel({ ...base, qty: 4, qty_unit: "villa", times: 1, times_unit: "đêm" }), "4 villa × 1 đêm");
  assert.equal(qtyLabel({ ...base, qty: 1, qty_unit: "xe", times: null, times_unit: "" }), "1 xe");
  assert.equal(qtyLabel({ ...base, qty: null, qty_unit: "", times: null, times_unit: "" }), "1");
});

test("cheapestOptionId chỉ có khi từ 2 phương án", () => {
  assert.equal(cheapestOptionId([ivory], 8), null);
  const pricey = opt([it("Nơi nghỉ", "Villa", 5, 1, 13_000_000, false)], "o2");
  assert.equal(cheapestOptionId([pricey, ivory], 8), "o1");
});

test("nightsBetween", () => {
  assert.equal(nightsBetween("2026-12-05", "2026-12-06"), 1);
  assert.equal(nightsBetween("2026-12-05", "2026-12-08"), 3);
  assert.equal(nightsBetween("2026-12-06", "2026-12-05"), null);
  assert.equal(nightsBetween(null, "2026-12-06"), null);
});
