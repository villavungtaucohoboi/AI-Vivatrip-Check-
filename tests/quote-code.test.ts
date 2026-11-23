import { test } from "node:test";
import assert from "node:assert/strict";
import { CODE_ALPHABET, quoteNumber, randomCode } from "@/lib/quote-code";

test("randomCode: 8 ký tự, không có ký tự dễ nhầm", () => {
  for (let i = 0; i < 200; i++) {
    const c = randomCode();
    assert.equal(c.length, 8);
    for (const ch of c) assert.ok(CODE_ALPHABET.includes(ch), ch);
    assert.doesNotMatch(c, /[0O1IL]/);
  }
  assert.equal(randomCode(8, () => 0), "22222222");
});

test("quoteNumber dạng BG-YYMM-NNN", () => {
  assert.equal(quoteNumber(new Date(2026, 10, 23), 18), "BG-2611-018");
  assert.equal(quoteNumber(new Date(2027, 0, 2), 1), "BG-2701-001");
});

test("nextQuoteNumber lấy số lớn nhất + 1 (không trùng sau khi xoá)", async () => {
  const { nextQuoteNumber } = await import("@/lib/quote-code");
  const d = new Date(2026, 10, 23);
  assert.equal(nextQuoteNumber(["BG-2611-001", "BG-2611-002", "BG-2611-004", "BG-2611-005"], d), "BG-2611-006");
  assert.equal(nextQuoteNumber([], d), "BG-2611-001");
  assert.equal(nextQuoteNumber(["BG-2611-009", "BG-2611-010", "rác"], d), "BG-2611-011");
});
