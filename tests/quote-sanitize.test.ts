import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeQuoteInput } from "@/lib/quote-sanitize";

const item = (o: Record<string, unknown> = {}) => ({ id: "i1", group: "Vận chuyển", name: "Xe", note: "", qty: 1, qty_unit: "xe", times: 1, times_unit: "", unit_price: 3500000, vat: true, ...o });
const quote = (o: Record<string, unknown> = {}) => ({
  status: "draft",
  customer: { name: "A", company: "", phone: "", email: "" },
  program: { title: "Hà Nội 2N1Đ", date_from: "2026-12-05", date_to: "2026-12-06", pax_text: "20 người lớn", pax_count: 20, itinerary_note: "" },
  options: [{ id: "o1", name: "Ivory", place: "", image_url: "", highlights: [], product_id: null, items: [item()] }],
  notes: [],
  vat_rate: 8,
  valid_until: "2026-11-30",
  sale_name: "",
  sale_phone: "",
  ...o,
});
const ok = (raw: unknown) => {
  const r = sanitizeQuoteInput(raw);
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as Extract<typeof r, { ok: true }>).value;
};
const firstItem = (v: ReturnType<typeof ok>) => v.options[0].items[0];

test("không phải object → lỗi", () => {
  for (const raw of [null, "x", 5, [1, 2]]) assert.equal(sanitizeQuoteInput(raw).ok, false);
});

test("options thiếu hoặc sai kiểu → mảng rỗng", () => {
  assert.deepEqual(ok(quote({ options: undefined })).options, []);
  assert.deepEqual(ok(quote({ options: "x" })).options, []);
});

test("ô số không hợp lệ → null, chuỗi số → số", () => {
  for (const bad of ["abc", -5, NaN, Infinity, null, ""]) assert.equal(firstItem(ok(quote({ options: [{ items: [item({ unit_price: bad })] }] }))).unit_price, null, String(bad));
  assert.equal(firstItem(ok(quote({ options: [{ items: [item({ unit_price: "7000000" })] }] }))).unit_price, 7_000_000);
  assert.equal(firstItem(ok(quote({ options: [{ items: [item({ qty: "abc" })] }] }))).qty, null);
});

test("nhóm lạ → Khác; thiếu id → có id mới", () => {
  const v = ok(quote({ options: [{ items: [item({ group: "Lạ", id: undefined })] }] }));
  assert.equal(firstItem(v).group, "Khác");
  assert.ok(firstItem(v).id.length > 0);
  assert.ok(v.options[0].id.length > 0);
});

test("cắt độ dài chữ", () => {
  const long = "x".repeat(5000);
  const v = ok(quote({
    program: { title: long },
    notes: Array.from({ length: 30 }, () => long),
    options: [{ name: long, highlights: ["a", "b", "c", "d", "e"], items: [item({ name: long, note: long })] }],
  }));
  assert.equal(firstItem(v).name.length, 200);
  assert.equal(firstItem(v).note.length, 1000);
  assert.equal(v.program.title.length, 200);
  assert.equal(v.notes.length, 20);
  assert.equal(v.notes[0].length, 500);
  assert.equal(v.options[0].highlights.length, 3);
});

test("giới hạn số phương án và số dòng", () => {
  const r1 = sanitizeQuoteInput(quote({ options: Array.from({ length: 21 }, () => ({ items: [] })) }));
  assert.equal(r1.ok, false);
  assert.match((r1 as { error: string }).error, /20/);
  const r2 = sanitizeQuoteInput(quote({ options: [{ items: Array.from({ length: 101 }, () => item()) }] }));
  assert.equal(r2.ok, false);
  assert.match((r2 as { error: string }).error, /100/);
});

test("vat_rate, status, ngày không hợp lệ → mặc định", () => {
  const v = ok(quote({ vat_rate: 150, status: "lạ", valid_until: "30/11/2026", program: { date_from: "abc", date_to: "2026-12-06" } }));
  assert.equal(v.vat_rate, 8);
  assert.equal(v.status, "draft");
  assert.equal(v.valid_until, null);
  assert.equal(v.program.date_from, null);
  assert.equal(v.program.date_to, "2026-12-06");
  assert.equal(ok(quote({ vat_rate: "abc" })).vat_rate, 8);
  assert.equal(ok(quote({ vat_rate: 10, status: "sent" })).vat_rate, 10);
});
