"use client";

import {
  CRUISE_CATEGORY_LABEL,
  includedServices,
  itineraryItems,
  mealSummary,
  variantLabel,
  type Cruise,
} from "@/lib/cruise-types";

/**
 * ẢNH LỊCH TRÌNH du thuyền gửi khách (PNG) — theo nhận diện thương hiệu
 * VivaTrip (logo, đỏ san hô + cam đào, chữ tròn Quicksand).
 * KHÔNG in giá: giá chỉ để Sale xem trên app và báo khách riêng.
 */

const W = 1080;
const PAD = 60;
const INNER = W - PAD * 2;
const C = {
  bg: "#FBF8F5",
  card: "#FFFFFF",
  coral: "#FF5A5F",
  coralDeep: "#EF4F58",
  orange: "#EDA36B",
  peach: "#FDF1E6",
  blush: "#FFEDEE",
  ink: "#1F2328",
  muted: "#6B7078",
  line: "#EFE7DF",
};

function cssFont(varName: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (v) return `${v}, ${fallback}`;
  } catch {
    // bỏ qua
  }
  return fallback;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = word;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

async function loadImage(url: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

function brandGradient(ctx: CanvasRenderingContext2D, x0: number, x1: number) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, C.coral);
  g.addColorStop(1, C.orange);
  return g;
}

/** Dấu tích trong vòng tròn (vẽ tay, không dùng emoji cho sắc nét). */
function check(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.fillStyle = C.blush;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.coralDeep;
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.34);
  ctx.lineTo(cx + r * 0.46, cy - r * 0.32);
  ctx.stroke();
}

export async function buildCruiseCardImage(c: Cruise): Promise<Blob> {
  const BODY = cssFont("--font-body", "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif");
  const DISPLAY = cssFont("--font-display", BODY);
  const f = (w: number, s: number, fam = BODY) => `${w} ${s}px ${fam}`;
  try {
    await Promise.all([document.fonts.load(f(700, 40, DISPLAY)), document.fonts.load(f(500, 30)), document.fonts.load(f(700, 30))]);
  } catch {
    // font chưa tải được → dùng font hệ thống
  }

  const [cover, logo, logoWhite] = await Promise.all([
    c.images[0]?.url ? loadImage(c.images[0].url) : Promise.resolve(null),
    loadImage("/brand/vivatrip-logo.png"),
    loadImage("/brand/vivatrip-logo-white.png"),
  ]);

  const meal = mealSummary(c.meals);
  const services = includedServices(c.services);
  const steps = itineraryItems(c.itinerary);
  const category = (variantLabel(c.variant) || CRUISE_CATEGORY_LABEL[c.category]).toUpperCase();

  const stats = [
    c.duration_label ? { k: "THỜI GIAN", v: c.duration_label } : null,
    c.capacity ? { k: "SỨC CHỨA", v: `${c.capacity} khách` } : c.cabin_count ? { k: "SỐ CABIN", v: `${c.cabin_count} cabin` } : null,
    c.star ? { k: "TIÊU CHUẨN", v: `${c.star} sao` } : null,
  ].filter(Boolean) as { k: string; v: string }[];

  const incItems = [
    meal.full ? `Ăn trọn gói ${c.meals.length > 1 ? `${c.meals.length} bữa ` : ""}theo lịch trình` : meal.on.length ? meal.on.join(", ") : "",
    ...services,
  ].filter(Boolean);

  // Mọi khối vẽ đều chạy 2 lượt: draw=false chỉ đo chiều cao, draw=true vẽ thật.
  function render(ctx: CanvasRenderingContext2D, draw: boolean): number {
    let y = 0;

    // ── 1. Thanh đầu: logo + nhãn
    const headH = 150;
    if (draw) {
      ctx.fillStyle = C.card;
      ctx.fillRect(0, 0, W, headH);
      if (logo) {
        const lh = 70;
        ctx.drawImage(logo, PAD, (headH - lh) / 2, (logo.width / logo.height) * lh, lh);
      }
      ctx.textAlign = "right";
      ctx.font = f(700, 24);
      ctx.fillStyle = C.orange;
      ctx.fillText("LỊCH TRÌNH DU THUYỀN", W - PAD, 68);
      ctx.font = f(700, 30, DISPLAY);
      ctx.fillStyle = C.ink;
      ctx.fillText(c.variant === "lan_ha" ? "Vịnh Lan Hạ" : "Vịnh Hạ Long", W - PAD, 106);
      ctx.textAlign = "left";
    }
    y = headH;

    // ── 2. Ảnh bìa bo góc + tên tàu
    const heroY = y + 8;
    const heroH = cover ? 560 : 340;
    if (draw) {
      ctx.save();
      rr(ctx, PAD, heroY, INNER, heroH, 36);
      ctx.clip();
      if (cover) {
        const sc = Math.max(INNER / cover.width, heroH / cover.height);
        const dw = cover.width * sc;
        const dh = cover.height * sc;
        ctx.drawImage(cover, PAD + (INNER - dw) / 2, heroY + (heroH - dh) / 2, dw, dh);
      } else {
        ctx.fillStyle = brandGradient(ctx, PAD, PAD + INNER);
        ctx.fillRect(PAD, heroY, INNER, heroH);
      }
      if (cover) {
        const g = ctx.createLinearGradient(0, heroY + heroH * 0.35, 0, heroY + heroH);
        g.addColorStop(0, "rgba(20,10,10,0)");
        g.addColorStop(1, "rgba(20,10,10,0.72)");
        ctx.fillStyle = g;
        ctx.fillRect(PAD, heroY, INNER, heroH);
      }
      ctx.restore();

      // nhãn loại tour
      ctx.font = f(700, 24);
      const tw = ctx.measureText(category).width + 40;
      rr(ctx, PAD + 28, heroY + 28, tw, 52, 26);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fill();
      ctx.fillStyle = C.coralDeep;
      ctx.fillText(category, PAD + 48, heroY + 63);

      // tên tàu
      ctx.font = f(700, 60, DISPLAY);
      const nameLines = wrap(ctx, c.name, INNER - 64);
      let ny = heroY + heroH - 44 - (nameLines.length - 1) * 70;
      ctx.fillStyle = "#fff";
      for (const l of nameLines) {
        ctx.fillText(l, PAD + 32, ny);
        ny += 70;
      }
    }
    y = heroY + heroH + 28;

    // ── 3. Hàng thông số
    if (stats.length) {
      const gap = 18;
      const bw = (INNER - gap * (stats.length - 1)) / stats.length;
      const bh = 124;
      if (draw) {
        stats.forEach((s, i) => {
          const x = PAD + i * (bw + gap);
          rr(ctx, x, y, bw, bh, 24);
          ctx.fillStyle = C.card;
          ctx.fill();
          ctx.strokeStyle = C.line;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.font = f(700, 21);
          ctx.fillStyle = C.orange;
          ctx.fillText(s.k, x + 26, y + 46);
          ctx.font = f(700, 34, DISPLAY);
          ctx.fillStyle = C.ink;
          const v = wrap(ctx, s.v, bw - 40)[0];
          ctx.fillText(v, x + 26, y + 94);
        });
      }
      y += bh + 36;
    }

    // tiêu đề mục: thanh màu + chữ
    const heading = (title: string, at: number) => {
      if (!draw) return;
      rr(ctx, PAD, at - 30, 10, 38, 5);
      ctx.fillStyle = brandGradient(ctx, PAD, PAD + 10);
      ctx.fill();
      ctx.font = f(700, 36, DISPLAY);
      ctx.fillStyle = C.ink;
      ctx.fillText(title, PAD + 26, at);
    };

    // ── 4. Dịch vụ bao gồm (2 cột)
    if (incItems.length) {
      heading("Dịch vụ bao gồm", y + 30);
      y += 64;
      const colW = (INNER - 40) / 2;
      ctx.font = f(500, 29);
      const cells = incItems.map((t) => wrap(ctx, t, colW - 70));
      const rows: number[] = [];
      for (let i = 0; i < cells.length; i += 2) rows.push(Math.max(cells[i].length, cells[i + 1]?.length ?? 0));
      const boxH = rows.reduce((a, n) => a + n * 40 + 22, 0) + 40;
      if (draw) {
        rr(ctx, PAD, y, INNER, boxH, 28);
        ctx.fillStyle = C.card;
        ctx.fill();
        let ry = y + 28;
        rows.forEach((n, r) => {
          for (let col = 0; col < 2; col++) {
            const lines = cells[r * 2 + col];
            if (!lines) continue;
            const x = PAD + 28 + col * (colW + 12);
            check(ctx, x + 18, ry + 20, 18);
            ctx.font = f(500, 29);
            ctx.fillStyle = C.ink;
            lines.forEach((l, i) => ctx.fillText(l, x + 52, ry + 30 + i * 40));
          }
          ry += n * 40 + 22;
        });
      }
      y += boxH + 40;
    }

    // ── 5. Lịch trình (timeline)
    if (steps.length) {
      heading("Lịch trình chi tiết", y + 30);
      y += 64;
      ctx.font = f(700, 26);
      const pillW = Math.min(250, Math.max(140, ...steps.map((s) => (s.time ? ctx.measureText(s.time).width + 40 : 0))));
      const textX = PAD + 32 + pillW + 28;
      const textW = W - PAD - 32 - textX;
      // đo trước
      ctx.font = f(500, 29);
      const blocks = steps.map((s) => {
        const isDay = /^NGÀY\s*\d+/i.test(s.time) || /^NGÀY\s*\d+$/i.test(s.text);
        if (isDay) return { s, isDay, lines: [] as string[], h: 78 };
        const lines = wrap(ctx, s.text, textW);
        return { s, isDay, lines, h: Math.max(56, lines.length * 40 + 8) + 26 };
      });
      const boxH = blocks.reduce((a, b) => a + b.h, 0) + 44;
      if (draw) {
        rr(ctx, PAD, y, INNER, boxH, 28);
        ctx.fillStyle = C.card;
        ctx.fill();
        // đường nối các mốc
        const lineX = PAD + 32 + pillW / 2;
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 4;
        ctx.setLineDash([2, 10]);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(lineX, y + 50);
        ctx.lineTo(lineX, y + boxH - 50);
        ctx.stroke();
        ctx.setLineDash([]);

        let by = y + 30;
        for (const b of blocks) {
          if (b.isDay) {
            const label = (b.s.time && /^NGÀY/i.test(b.s.time) ? `${b.s.time}${b.s.text ? ` · ${b.s.text}` : ""}` : b.s.text).toUpperCase();
            rr(ctx, PAD + 24, by, INNER - 48, 56, 16);
            ctx.fillStyle = C.peach;
            ctx.fill();
            ctx.font = f(700, 28, DISPLAY);
            ctx.fillStyle = "#9C5820";
            ctx.fillText(label, PAD + 48, by + 38);
          } else {
            if (b.s.time) {
              ctx.font = f(700, 26);
              const pw = Math.min(pillW, ctx.measureText(b.s.time).width + 40);
              const px = PAD + 32 + (pillW - pw) / 2;
              rr(ctx, px, by, pw, 50, 25);
              ctx.fillStyle = brandGradient(ctx, px, px + pw);
              ctx.fill();
              ctx.fillStyle = "#fff";
              ctx.textAlign = "center";
              ctx.fillText(b.s.time, px + pw / 2, by + 34);
              ctx.textAlign = "left";
            } else {
              ctx.fillStyle = C.coral;
              ctx.beginPath();
              ctx.arc(PAD + 32 + pillW / 2, by + 25, 9, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.font = f(500, 29);
            ctx.fillStyle = C.ink;
            b.lines.forEach((l, i) => ctx.fillText(l, textX, by + 35 + i * 40));
          }
          by += b.h;
        }
      }
      y += boxH + 40;
    }

    // ── 6. Lưu ý
    const note = c.note && !/^https?:\/\//i.test(c.note.trim()) ? c.note.trim() : "";
    if (note) {
      ctx.font = f(500, 28);
      const lines = note.split("\n").flatMap((l) => wrap(ctx, l, INNER - 80));
      const h = 76 + lines.length * 40 + 20;
      if (draw) {
        rr(ctx, PAD, y, INNER, h, 24);
        ctx.fillStyle = C.peach;
        ctx.fill();
        rr(ctx, PAD, y, 10, h, 5);
        ctx.fillStyle = C.orange;
        ctx.fill();
        ctx.font = f(700, 28, DISPLAY);
        ctx.fillStyle = "#9C5820";
        ctx.fillText("Lưu ý", PAD + 40, y + 50);
        ctx.font = f(500, 28);
        ctx.fillStyle = C.ink;
        lines.forEach((l, i) => ctx.fillText(l, PAD + 40, y + 96 + i * 40));
      }
      y += h + 40;
    }

    // ── 7. Chân trang thương hiệu
    const footH = 170;
    if (draw) {
      ctx.fillStyle = brandGradient(ctx, 0, W);
      ctx.fillRect(0, y, W, footH);
      if (logoWhite) {
        const lh = 60;
        ctx.drawImage(logoWhite, PAD, y + (footH - lh) / 2, (logoWhite.width / logoWhite.height) * lh, lh);
      }
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = f(600, 24);
      ctx.fillText("Tư vấn & đặt chỗ · Hotline/Zalo", W - PAD, y + 70);
      ctx.fillStyle = "#fff";
      ctx.font = f(700, 46, DISPLAY);
      ctx.fillText("0942.988.699", W - PAD, y + 124);
      ctx.textAlign = "left";
    }
    return y + footH;
  }

  const probe = document.createElement("canvas").getContext("2d")!;
  const height = Math.ceil(render(probe, false));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, height);
  render(ctx, true);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không tạo được ảnh."))), "image/png")
  );
}

/** Dán thẳng vào Zalo (máy tính: Ctrl+V). */
export async function copyCruiseCardImage(c: Cruise): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("NO_CLIPBOARD");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": buildCruiseCardImage(c) })]);
}

/** Điện thoại: mở bảng chia sẻ (chọn Zalo). Không hỗ trợ thì tải ảnh về máy. */
export async function shareOrDownloadCruiseCard(c: Cruise, fileBase: string): Promise<"shared" | "downloaded"> {
  const blob = await buildCruiseCardImage(c);
  const file = new File([blob], `${fileBase}.png`, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: c.name });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
}
