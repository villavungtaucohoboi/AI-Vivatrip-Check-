"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { HolidayFundPost } from "@/lib/holiday-fund-types";

function timeAgo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.round(h / 24)} ngày trước`;
}

export function FeedView({
  posts,
  search,
  canModify,
  onEdit,
  onDelete,
}: {
  posts: HolidayFundPost[];
  search: string;
  canModify: (post: HolidayFundPost) => boolean;
  onEdit: (post: HolidayFundPost) => void;
  onDelete: (post: HolidayFundPost) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = posts
    .filter((p) => !q || p.raw_content.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (filtered.length === 0) {
    return <EmptyState title="Không tìm thấy bài đăng nào" />;
  }

  return (
    <div className="space-y-2.5" onClick={() => setOpenMenuId(null)}>
      {filtered.map((post) => {
        const updated = post.updated_at !== post.created_at;
        return (
          <div key={post.id} className="rounded-2xl border border-border bg-white p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-light text-[11px] font-bold text-teal-dark">
                  {post.author_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-ink">{post.author_name}</p>
                  <p className="text-[11px] text-ink-muted">{timeAgo(post.created_at)}</p>
                </div>
              </div>

              {canModify(post) && (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-paper-dim"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {openMenuId === post.id && (
                    <div className="absolute right-0 top-8 z-10 min-w-[100px] overflow-hidden rounded-xl border border-border bg-white shadow-float">
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          onEdit(post);
                        }}
                        className="block w-full px-3.5 py-2.5 text-left text-[13px] text-ink hover:bg-paper-dim"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          onDelete(post);
                        }}
                        className="block w-full px-3.5 py-2.5 text-left text-[13px] text-danger hover:bg-danger-light"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink">{post.raw_content}</p>

            {(post.holiday_fund_images?.length ?? 0) > 0 && (
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {post.holiday_fund_images!.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.image_url}
                    alt=""
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            )}

            {updated && (
              <span className="mt-2 inline-block rounded-full bg-sand-light px-2.5 py-0.5 text-[10.5px] font-bold text-[#7A5F2B]">
                Mới cập nhật · {timeAgo(post.updated_at)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
