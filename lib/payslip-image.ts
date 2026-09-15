"use client";

import { formatVND } from "@/lib/format";

export interface PayslipImageData {
  employeeName: string;
  employeePosition?: string | null;
  month: number;
  year: number;
  netPay: number;
  totalIncome: number;
  totalDeduction: number;
  incomeItems: { name: string; value: number }[];
  deductionItems: { name: string; value: number }[];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function downloadPayslipImage(data: PayslipImageData) {
  const W = 900, H = 1300;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#F7F6F2";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#0E6B5A";
  roundRect(ctx, 40, 36, 44, 44, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText("V", 62, 65);
  ctx.textAlign = "left";
  ctx.fillStyle = "#1B211F";
  ctx.font = "bold 22px Arial";
  ctx.fillText("VivaTrip", 96, 64);

  ctx.fillStyle = "#1B211F";
  ctx.font = "bold 34px Arial";
  ctx.fillText("PHIẾU LƯƠNG", 40, 130);
  ctx.fillStyle = "#5B655F";
  ctx.font = "20px Arial";
  ctx.fillText(`Tháng ${String(data.month).padStart(2, "0")}/${data.year}`, 40, 160);

  ctx.fillStyle = "#1B211F";
  ctx.font = "bold 24px Arial";
  ctx.fillText(data.employeeName, 40, 200);
  if (data.employeePosition) {
    ctx.fillStyle = "#5B655F";
    ctx.font = "18px Arial";
    ctx.fillText(data.employeePosition, 40, 226);
  }

  const netY = 250;
  const netH = 130;
  const grad = ctx.createLinearGradient(0, netY, W, netY + netH);
  grad.addColorStop(0, "#0A5347");
  grad.addColorStop(1, "#0E6B5A");
  ctx.fillStyle = grad;
  roundRect(ctx, 40, netY, W - 80, netH, 18);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "18px Arial";
  ctx.fillText("THỰC LĨNH", 66, netY + 40);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px Arial";
  ctx.fillText(formatVND(data.netPay), 66, netY + 90);

  let y = netY + netH + 60;
  ctx.fillStyle = "#5B655F";
  ctx.font = "bold 18px Arial";
  ctx.fillText("THU NHẬP", 40, y);
  y += 14;
  ctx.font = "18px Arial";
  data.incomeItems.forEach((item) => {
    y += 34;
    ctx.fillStyle = "#1B211F";
    ctx.fillText(item.name, 40, y);
    ctx.fillStyle = "#0A5347";
    ctx.font = "bold 18px Arial";
    const val = formatVND(item.value);
    ctx.fillText(val, W - 40 - ctx.measureText(val).width, y);
    ctx.font = "18px Arial";
  });

  y += 46;
  ctx.fillStyle = "#5B655F";
  ctx.font = "bold 18px Arial";
  ctx.fillText("KHẤU TRỪ", 40, y);
  y += 14;
  ctx.font = "18px Arial";
  data.deductionItems.forEach((item) => {
    y += 34;
    ctx.fillStyle = "#1B211F";
    ctx.fillText(item.name, 40, y);
    ctx.fillStyle = "#B3402A";
    ctx.font = "bold 18px Arial";
    const val = "-" + formatVND(Math.abs(item.value));
    ctx.fillText(val, W - 40 - ctx.measureText(val).width, y);
    ctx.font = "18px Arial";
  });

  y += 40;
  ctx.strokeStyle = "#E2DFD5";
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(W - 40, y);
  ctx.stroke();

  y += 40;
  ctx.font = "18px Arial";
  ctx.fillStyle = "#1B211F";
  ctx.fillText("Tổng thu nhập", 40, y);
  const incomeStr = formatVND(data.totalIncome);
  ctx.fillText(incomeStr, W - 40 - ctx.measureText(incomeStr).width, y);

  y += 34;
  ctx.fillText("Tổng khấu trừ", 40, y);
  const deductStr = "-" + formatVND(data.totalDeduction);
  ctx.fillText(deductStr, W - 40 - ctx.measureText(deductStr).width, y);

  y += 44;
  ctx.font = "bold 26px Arial";
  ctx.fillText("THỰC LĨNH", 40, y);
  const netStr = formatVND(data.netPay);
  ctx.fillText(netStr, W - 40 - ctx.measureText(netStr).width, y);

  ctx.fillStyle = "#5B655F";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Phiếu lương được tạo tự động từ hệ thống VivaTrip", W / 2, H - 30);
  ctx.textAlign = "left";

  const link = document.createElement("a");
  link.download = `phieu-luong-${data.employeeName.replace(/\s+/g, "-")}-T${data.month}-${data.year}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
