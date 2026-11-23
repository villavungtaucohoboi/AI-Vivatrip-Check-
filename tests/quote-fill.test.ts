import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStayItems, optionFromProduct } from "@/lib/quote-fill";
import { quoteStay } from "@/lib/resort-pricing";
import type { HotelRate, Product } from "@/lib/types";

const villa = {
  id: "v1", product_name: "Villa Ivory 4PN", type: "villa", area: "Lương Sơn", sub_region: "Hòa Bình",
  price: 5_000_000, price_weekday: 5_000_000, price_friday_sunday: 6_000_000, price_saturday_holiday: 8_000_000,
  discount_scheme: "uniform", discount_type: "percent", discount_value: 10,
  thumbnail_url: "https://anh.vivatrip.vn/ivory.jpg",
  perks: "- Bể bơi riêng\n- BBQ\n\n- Karaoke\n- Xe điện",
  price_source: "Đối tác X", contract_summary: "net 4tr", surcharge_note: "phụ thu nội bộ", note: "ghi chú nội bộ",
} as unknown as Product;

test("villa: mỗi mức giá 1 dòng, giá gốc, không VAT", () => {
  const items = buildStayItems({ product: villa, rate: null, holidays: [], from: "2026-12-04", to: "2026-12-06" });
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => [i.unit_price, i.times]), [[6_000_000, 1], [8_000_000, 1]]);
  assert.match(items[0].name, /04\/12/);
  assert.match(items[1].name, /05\/12/);
  for (const i of items) {
    assert.equal(i.vat, false);
    assert.equal(i.group, "Nơi nghỉ");
    assert.equal(i.qty_unit, "villa");
    assert.equal(i.times_unit, "đêm");
  }
});

test("villa: các đêm cùng giá gộp 1 dòng, tên không kèm ngày", () => {
  const items = buildStayItems({ product: villa, rate: null, holidays: [], from: "2026-12-01", to: "2026-12-03" });
  assert.equal(items.length, 1);
  assert.equal(items[0].unit_price, 5_000_000);
  assert.equal(items[0].times, 2);
  assert.doesNotMatch(items[0].name, /đêm/);
});

test("villa: chưa chọn ngày → 1 đêm giá ngày thường", () => {
  const items = buildStayItems({ product: villa, rate: null, holidays: [], from: null, to: null });
  assert.equal(items.length, 1);
  assert.equal(items[0].unit_price, 5_000_000);
  assert.equal(items[0].times, 1);
  assert.match(items[0].note, /chưa chọn ngày/);
});

test("optionFromProduct không mang thông tin nội bộ", () => {
  const o = optionFromProduct(villa);
  assert.equal(o.name, "Villa Ivory 4PN");
  assert.equal(o.place, "Lương Sơn · Hòa Bình");
  assert.equal(o.image_url, "https://anh.vivatrip.vn/ivory.jpg");
  assert.deepEqual(o.highlights, ["Bể bơi riêng", "BBQ", "Karaoke"]);
  assert.equal(o.product_id, "v1");
  const s = JSON.stringify(o);
  for (const secret of ["Đối tác X", "net 4tr", "phụ thu nội bộ", "ghi chú nội bộ"]) assert.ok(!s.includes(secret), secret);
});

test("resort: giá theo hạng phòng = giá gốc trung bình/đêm", () => {
  const resort = { id: "r1", product_name: "Wyndham", type: "resort", area: "Chương Mỹ", rate_periods: [], high_seasons: [], weekend_nights: [5, 6] } as unknown as Product;
  const rate = { id: "rt1", product_id: "r1", room_type: "Junior Suite", rate_plan: "Ăn sáng", price: 2_000_000, price_low_weekday: 2_000_000, breakfast: true, discount_percent: 20 } as unknown as HotelRate;
  const items = buildStayItems({ product: resort, rate, holidays: [], from: "2026-12-07", to: "2026-12-09" });
  const q = quoteStay(rate, resort, [], "2026-12-07", "2026-12-09");
  assert.equal(items.length, 1);
  assert.equal(items[0].unit_price, q.avgBase);
  assert.equal(items[0].unit_price, 2_000_000);
  assert.equal(items[0].times, 2);
  assert.equal(items[0].qty_unit, "phòng");
  assert.match(items[0].name, /Junior Suite/);
  assert.match(items[0].note, /ăn sáng/i);
});
