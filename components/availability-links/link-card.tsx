"use client";

import { useState } from "react";
import { Copy, ExternalLink, FileSpreadsheet, FolderOpen, Link2, MoreHorizontal, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { AvailabilityLink } from "@/lib/availability-link-types";

function linkIcon(url: string) {
  if (url.includes("docs.google.com/spreadsheets")) return FileSpreadsheet;
  if (url.includes("drive.google.com")) return FolderOpen;
  return Link2;
}

function timeAgo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function LinkCard({
  link,
  regionName,
  showRegionBadge,
  isFavorite,
  isAdmin,
  onToggleFavorite,
  onOpen,
  onEdit,
  onDelete,
}: {
  link: AvailabilityLink;
  regionName?: string;
  showRegionBadge: boolean;
  isFavorite: boolean;
  isAdmin: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = linkIcon(link.url);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success("Đã copy link");
    } catch {
      toast.error("Không copy được — trình duyệt chặn Clipboard");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-light text-teal-dark">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-[14px] font-semibold text-ink">{link.name}</p>
              {!link.is_active && (
                <Badge variant="neutral" className="text-[10px]">
                  Tạm ẩn
                </Badge>
              )}
              {showRegionBadge && regionName && (
                <Badge variant="sand" className="text-[10px]">
                  {regionName}
                </Badge>
              )}
            </div>
            {link.note && <p className="mt-0.5 text-[12.5px] text-ink-muted">{link.note}</p>}
            <p className="mt-1 text-[11px] text-ink-muted">
              Cập nhật: {timeAgo(link.updated_at)}
              {link.updated_by && ` · Bởi: ${link.updated_by}`}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={onToggleFavorite}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-paper-dim"
            aria-label={isFavorite ? "Bỏ ghim" : "Ghim"}
          >
            <Star className={isFavorite ? "h-4 w-4 fill-sand text-sand" : "h-4 w-4"} />
          </button>
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-paper-dim"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-10 min-w-[100px] overflow-hidden rounded-xl border border-border bg-white shadow-float">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="block w-full px-3.5 py-2.5 text-left text-[13px] text-ink hover:bg-paper-dim"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
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
      </div>

      <div className="mt-3 flex gap-2">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpen}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal px-3.5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-teal-dark"
        >
          <ExternalLink className="h-4 w-4" />
          Mở lịch check
        </a>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center rounded-xl border border-border px-3.5 text-ink-muted hover:bg-paper-dim hover:text-ink"
          aria-label="Copy link"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
