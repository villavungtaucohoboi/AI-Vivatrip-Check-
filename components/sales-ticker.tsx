"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatVND } from "@/lib/format";
import type { LeaderboardEntry } from "@/lib/leaderboard-types";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function SalesTicker() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("sales_leaderboard")
      .select("*")
      .order("rank")
      .then(({ data }) => {
        if (!cancelled) setEntries((data ?? []) as LeaderboardEntry[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Chưa có dữ liệu hoặc cả 3 đều chưa được Admin cập nhật -> không hiện gì,
  // tránh chạy chữ "Chưa cập nhật" trống trơn gây phản tác dụng.
  if (!entries || entries.every((e) => e.amount === 0)) return null;

  const items = entries.filter((e) => e.amount > 0);
  if (items.length === 0) return null;

  const track = [...items, ...items];

  return (
    <div className="overflow-hidden bg-gradient-to-r from-teal-dark to-teal py-2">
      <div className="flex w-max animate-[ticker-scroll_28s_linear_infinite] whitespace-nowrap hover:[animation-play-state:paused] motion-reduce:animate-none">
        {track.map((e, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-7 text-[13px] font-semibold text-white">
            <span className="text-base">{MEDAL[e.rank]}</span>
            {e.rank === 3 ? "TOP 3 HIỆN TẠI ĐANG LÀ BẠN" : `CHÚC MỪNG TOP ${e.rank} HIỆN TẠI ĐANG LÀ`}
            <b>{e.name}</b>
            VỚI DOANH SỐ
            <span className="font-extrabold text-sand-light">{formatVND(e.amount)}</span>
            <span className="opacity-30">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
