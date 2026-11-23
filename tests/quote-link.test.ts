import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteUrl, zaloMessage } from "@/lib/quote-link";

const program = { title: "Hà Nội 2N1Đ", date_from: "2026-12-05", date_to: "2026-12-06", pax_text: "", pax_count: null, itinerary_note: "" };
const customer = { name: "", company: "", phone: "", email: "" };

test("quoteUrl bỏ dấu / cuối base", () => {
  assert.equal(quoteUrl("ABC23456", "https://baogia.vivatrip.vn/"), "https://baogia.vivatrip.vn/bg/ABC23456");
  assert.equal(quoteUrl("ABC23456", "https://baogia.vivatrip.vn"), "https://baogia.vivatrip.vn/bg/ABC23456");
});

test("zaloMessage có chương trình, khoảng ngày và link ở cuối", () => {
  const url = "https://baogia.vivatrip.vn/bg/ABC23456";
  const m = zaloMessage({ program, customer }, url);
  assert.ok(m.includes("Hà Nội 2N1Đ (05/12–06/12)"), m);
  assert.ok(m.endsWith(url));
  assert.ok(m.startsWith("VivaTrip gửi anh/chị báo giá"));
  assert.ok(zaloMessage({ program, customer: { ...customer, name: "Lan" } }, url).startsWith("VivaTrip gửi anh/chị Lan báo giá"));
  const noDate = zaloMessage({ program: { ...program, date_from: null, date_to: null }, customer }, url);
  assert.ok(!noDate.includes("("), noDate);
});
