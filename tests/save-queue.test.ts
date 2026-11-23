import { test } from "node:test";
import assert from "node:assert/strict";
import { createSaveQueue } from "@/lib/save-queue";

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("không bao giờ lưu chồng; bản cuối cùng luôn được lưu", async () => {
  let running = 0, maxRunning = 0;
  const saved: number[] = [];
  const q = createSaveQueue<number>(async (v) => {
    running++; maxRunning = Math.max(maxRunning, running);
    await tick(20);
    saved.push(v); running--;
  });
  q.set(1); const a = q.flush();
  await tick(5); q.set(2); const b = q.flush();
  await tick(5); q.set(3); const c = q.flush();
  assert.deepEqual(await Promise.all([a, b, c]), [true, true, true]);
  assert.equal(maxRunning, 1);
  assert.equal(saved.at(-1), 3);
  assert.equal(q.isClean(), true);
});

test("lưu lỗi → flush trả false, vẫn còn thay đổi chưa lưu", async () => {
  let fail = true;
  const q = createSaveQueue<string>(async () => { if (fail) throw new Error("mạng"); });
  q.set("x");
  assert.equal(await q.flush(), false);
  assert.equal(q.isClean(), false);
  fail = false;
  assert.equal(await q.flush(), true);
  assert.equal(q.isClean(), true);
});
