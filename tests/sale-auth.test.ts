import { test } from "node:test";
import assert from "node:assert/strict";
import { isSaleTokenValid, saleToken } from "@/lib/sale-auth";

test("token sale hợp lệ chỉ với đúng mật khẩu", async () => {
  const t = await saleToken("abc");
  assert.match(t, /^[0-9a-f]{64}$/);
  assert.notEqual(t, "abc");
  assert.equal(await isSaleTokenValid(t, "abc"), true);
  assert.equal(await isSaleTokenValid(t, "abd"), false);
  assert.equal(await isSaleTokenValid(undefined, "abc"), false);
  assert.equal(await isSaleTokenValid(t, undefined), false);
  assert.equal(await isSaleTokenValid(t, ""), false);
});
