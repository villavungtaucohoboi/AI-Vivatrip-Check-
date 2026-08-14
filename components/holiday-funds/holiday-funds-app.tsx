"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getPosterToken } from "@/lib/holiday-fund-identity";
import { useClientRole } from "@/lib/use-client-role";
import { EmptyState } from "@/components/empty-state";
import { PostComposerSheet } from "@/components/holiday-funds/post-composer-sheet";
import { SummaryView } from "@/components/holiday-funds/summary-view";
import { FeedView } from "@/components/holiday-funds/feed-view";
import { SheetFormDialog } from "@/components/holiday-funds/sheet-form-dialog";
import { ConfirmDialog } from "@/components/holiday-funds/confirm-dialog";
import type { HolidayFundPost, HolidayFundSheet } from "@/lib/holiday-fund-types";

const STORAGE_KEY = "vivatrip_holiday_funds_state_v1";

function loadSavedState(): { activeSheetId: string; subTab: "summary" | "feed" } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function HolidayFundsApp({
  initialSheets,
  isAdmin: initialIsAdmin,
}: {
  initialSheets: HolidayFundSheet[];
  isAdmin: boolean;
}) {
  const isAdmin = useClientRole(initialIsAdmin ? "admin" : "sale") === "admin";
  const router = useRouter();
  const supabase = createClient();

  // Nhớ lại đúng Sheet/tab đang xem — rời trang rồi quay lại không bị về mặc định.
  const saved = useRef(loadSavedState()).current;
  const savedSheetStillExists = saved && initialSheets.some((s) => s.id === saved.activeSheetId);

  const [sheets, setSheets] = useState(initialSheets);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(
    savedSheetStillExists ? saved!.activeSheetId : initialSheets[0]?.id ?? null
  );
  const [subTab, setSubTab] = useState<"summary" | "feed">(savedSheetStillExists ? saved!.subTab : "summary");
  const [posts, setPosts] = useState<HolidayFundPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<HolidayFundPost | null>(null);
  const [sheetFormOpen, setSheetFormOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<HolidayFundSheet | null>(null);
  const [deletePostTarget, setDeletePostTarget] = useState<HolidayFundPost | null>(null);
  const [deleteSheetTarget, setDeleteSheetTarget] = useState<HolidayFundSheet | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !activeSheetId) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ activeSheetId, subTab }));
    } catch {
      // sessionStorage đầy/bị chặn -> bỏ qua
    }
  }, [activeSheetId, subTab]);

  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? null;

  const fetchPosts = useCallback(async () => {
    if (!activeSheetId) {
      setPosts([]);
      return;
    }
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from("holiday_fund_posts")
      .select("*, holiday_fund_items(*), holiday_fund_images(*)")
      .eq("sheet_id", activeSheetId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Không tải được dữ liệu: " + error.message);
    } else {
      setPosts((data ?? []) as HolidayFundPost[]);
    }
    setLoadingPosts(false);
  }, [activeSheetId, supabase]);

  useEffect(() => {
    fetchPosts();
    setSearch("");
    setDateFilter("");
  }, [fetchPosts]);

  const dateOptions = useMemo(() => {
    const dates = new Set<string>();
    posts.forEach((p) => (p.holiday_fund_items ?? []).forEach((i) => i.fund_date && dates.add(i.fund_date)));
    return [...dates].sort();
  }, [posts]);

  function canModify(post: HolidayFundPost) {
    return isAdmin || post.poster_token === getPosterToken();
  }

  async function handleDeletePost() {
    if (!deletePostTarget) return;
    const res = await fetch(
      `/api/holiday-funds/posts/${deletePostTarget.id}?poster_token=${encodeURIComponent(getPosterToken())}`,
      { method: "DELETE" }
    );
    const result = await res.json();
    if (!res.ok) {
      toast.error("Không thể xóa: " + (result.error ?? "Lỗi không xác định"));
      return;
    }
    toast.success("Đã xóa bài đăng");
    setDeletePostTarget(null);
    fetchPosts();
  }

  async function handleDeleteSheet() {
    if (!deleteSheetTarget) return;
    const res = await fetch(`/api/admin/holiday-sheets/${deleteSheetTarget.id}`, { method: "DELETE" });
    const result = await res.json();
    if (!res.ok) {
      toast.error("Không thể xóa: " + (result.error ?? "Lỗi không xác định"));
      return;
    }
    const remaining = sheets.filter((s) => s.id !== deleteSheetTarget.id);
    setSheets(remaining);
    setActiveSheetId(remaining[0]?.id ?? null);
    setDeleteSheetTarget(null);
    toast.success("Đã xóa Sheet");
    router.refresh();
  }

  async function refreshSheets(selectNewestId = false) {
    const { data } = await supabase.from("holiday_fund_sheets").select("*").order("sort_order");
    const list = (data ?? []) as HolidayFundSheet[];
    setSheets(list);
    if (selectNewestId && list.length > 0) {
      setActiveSheetId(list[list.length - 1].id);
    }
    router.refresh();
  }

  if (sheets.length === 0) {
    return (
      <div>
        <EmptyState title="Chưa có Sheet nào" description={isAdmin ? 'Bấm "Tạo Sheet" để bắt đầu.' : "Liên hệ Admin để tạo Sheet đầu tiên."}>
          {isAdmin && (
            <button
              onClick={() => {
                setEditingSheet(null);
                setSheetFormOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark"
            >
              <Plus className="h-4 w-4" />
              Tạo Sheet
            </button>
          )}
        </EmptyState>
        <SheetFormDialog
          open={sheetFormOpen}
          onOpenChange={setSheetFormOpen}
          editingSheet={editingSheet}
          onSaved={() => refreshSheets(true)}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Tabs Sheet */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sheets.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSheetId(s.id)}
            className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13.5px] font-semibold ${
              s.id === activeSheetId ? "bg-teal text-white" : "border border-border bg-white text-ink-muted"
            }`}
          >
            {s.name}
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => {
              setEditingSheet(null);
              setSheetFormOpen(true);
            }}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border text-ink-muted"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {activeSheet && (
        <>
          <div className="mt-3 mb-2.5 flex items-center gap-2">
            <h1 className="text-[17px] font-bold text-ink">{activeSheet.name}</h1>
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setEditingSheet(activeSheet);
                    setSheetFormOpen(true);
                  }}
                  className="rounded-lg p-1.5 text-ink-muted hover:bg-paper-dim"
                  title="Đổi tên"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteSheetTarget(activeSheet)}
                  className="rounded-lg p-1.5 text-ink-muted hover:bg-danger-light hover:text-danger"
                  title="Xóa Sheet"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="mb-3 flex gap-1 rounded-xl bg-paper-dim p-1">
            <button
              onClick={() => setSubTab("summary")}
              className={`flex-1 rounded-lg py-2 text-[13.5px] font-semibold ${
                subTab === "summary" ? "bg-white text-ink shadow-sm" : "text-ink-muted"
              }`}
            >
              Tổng hợp
            </button>
            <button
              onClick={() => setSubTab("feed")}
              className={`flex-1 rounded-lg py-2 text-[13.5px] font-semibold ${
                subTab === "feed" ? "bg-white text-ink shadow-sm" : "text-ink-muted"
              }`}
            >
              Bài đăng
            </button>
          </div>

          <div className="mb-3.5 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm villa / khách sạn..."
                className="h-10 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 rounded-xl border border-border bg-white px-2.5 text-[13px] text-ink"
            >
              <option value="">Tất cả ngày</option>
              {dateOptions.map((d) => {
                const [, m, day] = d.split("-");
                return (
                  <option key={d} value={d}>
                    {day}/{m}
                  </option>
                );
              })}
            </select>
          </div>

          {loadingPosts ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              title="Chưa có quỹ nào"
              description="Dán thông tin quỹ đầu tiên để cả team cùng xem."
            >
              <button
                onClick={() => {
                  setEditingPost(null);
                  setComposerOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark"
              >
                <Plus className="h-4 w-4" />
                Đăng quỹ
              </button>
            </EmptyState>
          ) : subTab === "summary" ? (
            <SummaryView posts={posts} search={search} dateFilter={dateFilter} />
          ) : (
            <FeedView
              posts={posts}
              search={search}
              canModify={canModify}
              onEdit={(p) => {
                setEditingPost(p);
                setComposerOpen(true);
              }}
              onDelete={(p) => setDeletePostTarget(p)}
            />
          )}
        </>
      )}

      {/* Nút nổi Đăng quỹ */}
      {activeSheet && (
        <button
          onClick={() => {
            setEditingPost(null);
            setComposerOpen(true);
          }}
          className="fixed bottom-20 right-4 z-30 flex h-13 w-13 items-center justify-center rounded-full bg-teal text-white shadow-float sm:bottom-6"
          style={{ height: "3.25rem", width: "3.25rem" }}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {activeSheetId && (
        <PostComposerSheet
          open={composerOpen}
          onOpenChange={setComposerOpen}
          sheetId={activeSheetId}
          editingPost={editingPost}
          onSaved={fetchPosts}
        />
      )}

      <SheetFormDialog
        open={sheetFormOpen}
        onOpenChange={setSheetFormOpen}
        editingSheet={editingSheet}
        onSaved={() => refreshSheets(!editingSheet)}
      />

      <ConfirmDialog
        open={!!deletePostTarget}
        onOpenChange={(o) => !o && setDeletePostTarget(null)}
        title="Xóa bài đăng?"
        description="Toàn bộ quỹ được tách từ bài này cũng sẽ biến mất khỏi Tổng hợp."
        confirmLabel="Xóa bài đăng"
        onConfirm={handleDeletePost}
      />

      <ConfirmDialog
        open={!!deleteSheetTarget}
        onOpenChange={(o) => !o && setDeleteSheetTarget(null)}
        title={`Xóa Sheet "${deleteSheetTarget?.name}"?`}
        description="Toàn bộ nội dung trong Sheet cũng sẽ bị xóa."
        confirmLabel="Xóa Sheet"
        onConfirm={handleDeleteSheet}
      />
    </div>
  );
}
