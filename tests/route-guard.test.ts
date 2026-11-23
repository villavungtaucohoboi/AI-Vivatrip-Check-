import { test } from "node:test";
import assert from "node:assert/strict";
import { decideRoute } from "@/lib/route-guard";

const QH = "baogia.vivatrip.vn";
const at = (host: string, pathname: string, o: { sale?: boolean; admin?: boolean; search?: string } = {}) =>
  decideRoute({ host, pathname, search: o.search ?? "", sale: !!o.sale, admin: !!o.admin }, QH);

test("tên miền báo giá chỉ mở /bg và tài nguyên tĩnh", () => {
  assert.deepEqual(at(QH, "/bg/ABC23456"), { action: "next" });
  assert.deepEqual(at(QH, "/_next/static/chunks/a.js"), { action: "next" });
  assert.deepEqual(at(QH, "/brand/vivatrip-logo.png"), { action: "next" });
  for (const p of ["/search", "/api/search", "/admin/products", "/bao-gia", "/api/quotes", "/tours", "/bgx"]) {
    assert.deepEqual(at(QH, p, { sale: true, admin: true }), { action: "notfound" }, p);
  }
  assert.deepEqual(at(QH, "/"), { action: "redirect", to: "https://vivatrip.vn" });
});

test("so tên miền không phân biệt hoa thường, bỏ cổng", () => {
  assert.deepEqual(at("BaoGia.vivatrip.vn:443", "/search"), { action: "notfound" });
  assert.deepEqual(at("BaoGia.vivatrip.vn:443", "/bg/X"), { action: "next" });
});

test("tên miền nội bộ: khu báo giá cần mật khẩu sale hoặc Admin", () => {
  const H = "vivatripcheck.vercel.app";
  assert.deepEqual(at(H, "/bao-gia"), { action: "redirect", to: "/bao-gia/login?next=%2Fbao-gia" });
  assert.deepEqual(at(H, "/bao-gia/abc", { search: "?x=1" }), { action: "redirect", to: "/bao-gia/login?next=%2Fbao-gia%2Fabc%3Fx%3D1" });
  assert.deepEqual(at(H, "/bao-gia", { sale: true }), { action: "next" });
  assert.deepEqual(at(H, "/bao-gia", { admin: true }), { action: "next" });
  assert.deepEqual(at(H, "/bao-gia/login"), { action: "next" });
  assert.deepEqual(at(H, "/api/quotes"), { action: "unauthorized" });
  assert.deepEqual(at(H, "/api/quotes/abc/duplicate"), { action: "unauthorized" });
  assert.deepEqual(at(H, "/api/quotes/login"), { action: "next" });
  assert.deepEqual(at(H, "/api/quotes", { sale: true }), { action: "next" });
  assert.deepEqual(at(H, "/bg/X"), { action: "next" });
  assert.deepEqual(at(H, "/search"), { action: "next" });
  assert.deepEqual(at(H, "/bao-giax"), { action: "next" });
});

test("tên miền báo giá có dấu chấm cuối (baogia.vivatrip.vn.) vẫn bị chặn", () => {
  assert.deepEqual(at("baogia.vivatrip.vn.", "/search"), { action: "notfound" });
  assert.deepEqual(at("BAOGIA.vivatrip.vn.:443", "/admin/products"), { action: "notfound" });
  assert.deepEqual(at("baogia.vivatrip.vn.", "/bg/X"), { action: "next" });
});

test("safeNext chỉ nhận đường dẫn nội bộ", async () => {
  const { safeNext } = await import("@/lib/route-guard");
  assert.equal(safeNext("/bao-gia/abc?x=1"), "/bao-gia/abc?x=1");
  for (const bad of ["//evil.com", "/\\evil.com", "/\\/evil.com", "https://evil.com", "javascript:alert(1)", "", null]) {
    assert.equal(safeNext(bad as string | null), "/bao-gia", String(bad));
  }
});
