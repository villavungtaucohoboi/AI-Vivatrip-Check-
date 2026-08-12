"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import type { HolidayFundPost } from "@/lib/holiday-fund-types";

function fmtVND(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

function isoToDisplay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function timeAgo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.round(h / 24)} ngày trước`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Đã copy");
  } catch {
    toast.error("Không copy được — trình duyệt chặn Clipboard");
  }
}

export function SummaryView({
  posts,
  search,
  dateFilter,
}: {
  posts: HolidayFundPost[];
  search: string;
  dateFilter: string;
}) {
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());

  const byDate = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, { name: string | null; price: number | null; raw_line: string; author: string; updated_at: string }[]>();

    for (const post of posts) {
      for (const item of post.holiday_fund_items ?? []) {
        if (!item.fund_date) continue;
        if (dateFilter && item.fund_date !== dateFilter) continue;
        const hay = `${item.name ?? ""} ${item.raw_line} ${post.raw_content}`.toLowerCase();
        if (q && !hay.includes(q)) continue;

        if (!map.has(item.fund_date)) map.set(item.fund_date, []);
        map.get(item.fund_date)!.push({
          name: item.name,
          price: item.price,
          raw_line: item.raw_line,
          author: post.author_name,
          updated_at: post.updated_at,
        });
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [posts, search, dateFilter]);

  if (byDate.length === 0) {
    return (
      <EmptyState
        title="Không tìm thấy quỹ nào"
        description="Thử từ khóa khác hoặc bỏ bớt bộ lọc ngày."
      />
    );
  }

  function toggle(iso: string) {
    setOpenDays((prev) => {
      const next = new Set(prev);
      next.has(iso) ? next.delete(iso) : next.add(iso);
      return next;
    });
  }

  return (
    <div className="space-y-2.5">
      {byDate.map(([iso, items]) => {
        const isOpen = openDays.has(iso);
        const copyAllText =
          `QUỸ ${isoToDisplay(iso)}\n\n` + items.map((x) => `${x.name || x.raw_line} - ${fmtVND(x.price)}`).join("\n");

        return (
          <div key={iso} className="overflow-hidden rounded-2xl border border-border bg-white">
            <button
              onClick={() => toggle(iso)}
              className="flex w-full items-center justify-between px-4 py-3.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-bold text-ink">{isoToDisplay(iso)}</span>
                <span className="rounded-full bg-paper-dim px-2.5 py-0.5 text-xs text-ink-muted">
                  {items.length} quỹ
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyText(copyAllText);
                  }}
                  className="rounded-lg p-1.5 text-ink-muted hover:bg-paper-dim hover:text-ink"
                  title="Copy tất cả"
                >
                  <Copy className="h-3.5 w-3.5" />
                </span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-ink-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-ink-muted" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border">
                {items.map((item, i) => {
                  const single = `${item.name || item.raw_line} - ${isoToDisplay(iso)} - ${fmtVND(item.price)}`;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-ink">
                          {item.name || <span className="font-normal text-ink-muted">{item.raw_line}</span>}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          Đăng bởi {item.author} · Cập nhật {timeAgo(item.updated_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[13.5px] font-bold text-teal-dark">{fmtVND(item.price)}</span>
                        <button
                          onClick={() => copyText(single)}
                          className="rounded-lg p-1.5 text-ink-muted hover:bg-paper-dim hover:text-ink"
                          title="Copy"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
