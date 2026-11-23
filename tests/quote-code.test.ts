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
