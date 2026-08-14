"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useClientRole } from "@/lib/use-client-role";
import { EmptyState } from "@/components/empty-state";
import { LinkCard } from "@/components/availability-links/link-card";
import { LinkFormDialog } from "@/components/availability-links/link-form-dialog";
import { RegionFormDialog } from "@/components/availability-links/region-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  getFavoriteIds,
  getRecentlyOpenedIds,
  recordLinkOpened,
  toggleFavorite,
} from "@/lib/link-preferences";
import type { AvailabilityLink, AvailabilityLinkRegion } from "@/lib/availability-link-types";

const ALL_TAB = "__all__";
type PropertyCategory = "villa" | "khach_san_resort";

const STORAGE_KEY = "vivatrip_availability_links_state_v1";

interface SavedState {
  category: PropertyCategory;
  activeTab: string;
  search: string;
}

function loadSavedState(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedState) : null;
  } catch {
    return null;
  }
}

export function AvailabilityLinksApp({
  initialRegions,
  isAdmin: initialIsAdmin,
}: {
  initialRegions: AvailabilityLinkRegion[];
  isAdmin: boolean;
}) {
  const isAdmin = useClientRole(initialIsAdmin ? "admin" : "sale") === "admin";
  const router = useRouter();
  const supabase = createClient();

  // Nhớ lại đúng Sheet/khu vực/ô tìm kiếm đang xem — để rời trang rồi quay
  // lại (VD bấm sang Tìm sản phẩm rồi bấm lại Link check lịch) không bị về
  // trạng thái mặc định.
  const saved = useRef(loadSavedState()).current;

  const [regions, setRegions] = useState(initialRegions);
  const [category, setCategory] = useState<PropertyCategory>(saved?.category ?? "villa");
  const [activeTab, setActiveTab] = useState<string>(saved?.activeTab ?? ALL_TAB);
  const [links, setLinks] = useState<AvailabilityLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(saved?.search ?? "");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<AvailabilityLink | null>(null);
  const [regionFormOpen, setRegionFormOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<AvailabilityLinkRegion | null>(null);
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<AvailabilityLink | null>(null);
  const [deleteRegionTarget, setDeleteRegionTarget] = useState<AvailabilityLinkRegion | null>(null);

  useEffect(() => {
    setFavoriteIds(getFavoriteIds());
    setRecentIds(getRecentlyOpenedIds());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ category, activeTab, search }));
    } catch {
      // sessionStorage đầy/bị chặn -> bỏ qua, không ảnh hưởng chức năng
    }
  }, [category, activeTab, search]);

  const regionsInCategory = useMemo(
    () => regions.filter((r) => r.property_category === category).sort((a, b) => a.sort_order - b.sort_order),
    [regions, category]
  );

  function handleSetCategory(next: PropertyCategory) {
    setCategory(next);
    setActiveTab(ALL_TAB);
  }

  async function fetchLinks() {
    setLoading(true);
    const regionIds = regionsInCategory.map((r) => r.id);
    if (regionIds.length === 0) {
      setLinks([]);
      setLoading(false);
      return;
    }
    let query = supabase.from("availability_links").select("*").order("sort_order");
    query = activeTab === ALL_TAB ? query.in("region_id", regionIds) : query.eq("region_id", activeTab);
    if (!isAdmin) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) toast.error("Không tải được dữ liệu: " + error.message);
    setLinks((data ?? []) as AvailabilityLink[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin, category]);

  const regionNameById = useMemo(
    () => Object.fromEntries(regions.map((r) => [r.id, r.name])),
    [regions]
  );

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return links;
    return links.filter((l) => {
      const region = regionNameById[l.region_id] ?? "";
      return (
        l.name.toLowerCase().includes(q) ||
        (l.note ?? "").toLowerCase().includes(q) ||
        region.toLowerCase().includes(q)
      );
    });
  }, [links, search, regionNameById]);

  const pinnedLinks = useMemo(
    () => links.filter((l) => favoriteIds.includes(l.id)),
    [links, favoriteIds]
  );
  const recentLinks = useMemo(
    () =>
      recentIds
        .map((id) => links.find((l) => l.id === id))
        .filter((l): l is AvailabilityLink => !!l),
    [links, recentIds]
  );

  function handleToggleFavorite(id: string) {
    setFavoriteIds(toggleFavorite(id));
  }

  function handleOpen(id: string) {
    recordLinkOpened(id);
    setRecentIds(getRecentlyOpenedIds());
  }

  async function refreshRegions(selectNewestId?: string) {
    const { data } = await supabase
      .from("availability_link_regions")
      .select("*")
      .order("sort_order");
    const list = (data ?? []) as AvailabilityLinkRegion[];
    setRegions(list);
    if (selectNewestId) setActiveTab(selectNewestId);
    router.refresh();
  }

  async function handleDeleteLink() {
    if (!deleteLinkTarget) return;
    const res = await fetch(`/api/admin/availability-links/${deleteLinkTarget.id}`, {
      method: "DELETE",
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error("Không thể xóa: " + (result.error ?? "Lỗi không xác định"));
      return;
    }
    toast.success("Đã xóa link");
    setDeleteLinkTarget(null);
    fetchLinks();
  }

  async function handleDeleteRegion() {
    if (!deleteRegionTarget) return;
    const res = await fetch(`/api/admin/availability-regions/${deleteRegionTarget.id}`, {
      method: "DELETE",
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error("Không thể xóa: " + (result.error ?? "Lỗi không xác định"));
      return;
    }
    const remaining = regions.filter((r) => r.id !== deleteRegionTarget.id);
    setRegions(remaining);
    if (activeTab === deleteRegionTarget.id) setActiveTab(ALL_TAB);
    setDeleteRegionTarget(null);
    toast.success("Đã xóa khu vực");
    router.refresh();
  }

  const activeRegion = regions.find((r) => r.id === activeTab) ?? null;
  const showAllTabExtras = activeTab === ALL_TAB && !search.trim();

  return (
    <div>
      <div className="mb-3 flex rounded-xl border border-border bg-white p-1">
        <button
          onClick={() => handleSetCategory("villa")}
          className={`flex-1 rounded-lg py-2.5 text-[13.5px] font-semibold ${
            category === "villa" ? "bg-teal text-white" : "text-ink-muted hover:bg-paper-dim"
          }`}
        >
          🏡 Villa
        </button>
        <button
          onClick={() => handleSetCategory("khach_san_resort")}
          className={`flex-1 rounded-lg py-2.5 text-[13.5px] font-semibold ${
            category === "khach_san_resort" ? "bg-teal text-white" : "text-ink-muted hover:bg-paper-dim"
          }`}
        >
          🏨 Khách sạn / Resort
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setActiveTab(ALL_TAB)}
          className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13.5px] font-semibold ${
            activeTab === ALL_TAB ? "bg-teal text-white" : "border border-border bg-white text-ink-muted"
          }`}
        >
          Tất cả
        </button>
        {regionsInCategory.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveTab(r.id)}
            className={`shrink-0 flex items-center gap-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13.5px] font-semibold ${
              activeTab === r.id
                ? r.is_chain
                  ? "bg-sand text-white"
                  : "bg-teal text-white"
                : r.is_chain
                ? "border border-sand/50 bg-sand-light text-[#7A5F2B]"
                : "border border-border bg-white text-ink-muted"
            }`}
          >
            {r.is_chain && <Link2 className="h-3.5 w-3.5" />}
            {r.name}
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => {
              setEditingRegion(null);
              setRegionFormOpen(true);
            }}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border text-ink-muted"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {activeRegion?.is_chain && (
        <div className="mt-3 rounded-xl bg-sand-light p-3 text-[12px] text-[#7A5F2B]">
          🔗 Đây là 1 sheet riêng cho cả hệ thống <b>{activeRegion.name}</b> — không tách theo vùng miền vì
          là chuỗi. Gõ tên tỉnh/thành vào ô tìm kiếm bên dưới để lọc nhanh.
        </div>
      )}

      {isAdmin && activeRegion && (
        <div className="mt-3 flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-ink">{activeRegion.name}</h2>
          <button
            onClick={() => {
              setEditingRegion(activeRegion);
              setRegionFormOpen(true);
            }}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-paper-dim"
            title="Sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteRegionTarget(activeRegion)}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-danger-light hover:text-danger"
            title="Xóa khu vực"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mt-3 mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nguồn / đối tác..."
            className="h-10 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          />
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingLink(null);
              setLinkFormOpen(true);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-teal px-3.5 py-2 text-[13.5px] font-semibold text-white hover:bg-teal-dark"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Thêm link</span>
          </button>
        )}
      </div>

      {showAllTabExtras && pinnedLinks.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[12.5px] font-medium text-ink-muted">Link hay dùng</p>
          <div className="space-y-2.5">
            {pinnedLinks.map((l) => (
              <LinkCard
                key={l.id}
                link={l}
                regionName={regionNameById[l.region_id]}
                showRegionBadge
                isFavorite
                isAdmin={isAdmin}
                onToggleFavorite={() => handleToggleFavorite(l.id)}
                onOpen={() => handleOpen(l.id)}
                onEdit={() => {
                  setEditingLink(l);
                  setLinkFormOpen(true);
                }}
                onDelete={() => setDeleteLinkTarget(l)}
              />
            ))}
          </div>
        </div>
      )}

      {showAllTabExtras && recentLinks.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[12.5px] font-medium text-ink-muted">Vừa mở gần đây</p>
          <div className="space-y-2.5">
            {recentLinks.map((l) => (
              <LinkCard
                key={l.id}
                link={l}
                regionName={regionNameById[l.region_id]}
                showRegionBadge
                isFavorite={favoriteIds.includes(l.id)}
                isAdmin={isAdmin}
                onToggleFavorite={() => handleToggleFavorite(l.id)}
                onOpen={() => handleOpen(l.id)}
                onEdit={() => {
                  setEditingLink(l);
                  setLinkFormOpen(true);
                }}
                onDelete={() => setDeleteLinkTarget(l)}
              />
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-ink-muted">Đang tải...</div>
      ) : regionsInCategory.length === 0 ? (
        <EmptyState
          title={category === "villa" ? "Chưa có sheet Villa nào" : "Chưa có sheet Khách sạn/Resort nào"}
          description={isAdmin ? 'Bấm "+" cạnh tab để tạo sheet đầu tiên.' : "Liên hệ Admin để tạo sheet."}
        />
      ) : filteredLinks.length === 0 ? (
        <EmptyState
          title={search.trim() ? "Không tìm thấy nguồn nào" : "Chưa có link check lịch"}
          description={
            search.trim()
              ? "Thử từ khóa khác."
              : isAdmin
              ? 'Bấm "Thêm link" để bắt đầu.'
              : "Chưa có nguồn check lịch ở khu vực này."
          }
        >
          {isAdmin && !search.trim() && (
            <button
              onClick={() => {
                setEditingLink(null);
                setLinkFormOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark"
            >
              <Plus className="h-4 w-4" />
              Thêm link
            </button>
          )}
        </EmptyState>
      ) : (
        <div>
          {showAllTabExtras && (pinnedLinks.length > 0 || recentLinks.length > 0) && (
            <p className="mb-2 text-[12.5px] font-medium text-ink-muted">Tất cả</p>
          )}
          <div className="space-y-2.5">
            {filteredLinks.map((l) => (
              <LinkCard
                key={l.id}
                link={l}
                regionName={regionNameById[l.region_id]}
                showRegionBadge={activeTab === ALL_TAB}
                isFavorite={favoriteIds.includes(l.id)}
                isAdmin={isAdmin}
                onToggleFavorite={() => handleToggleFavorite(l.id)}
                onOpen={() => handleOpen(l.id)}
                onEdit={() => {
                  setEditingLink(l);
                  setLinkFormOpen(true);
                }}
                onDelete={() => setDeleteLinkTarget(l)}
              />
            ))}
          </div>
        </div>
      )}

      <LinkFormDialog
        open={linkFormOpen}
        onOpenChange={setLinkFormOpen}
        regions={regionsInCategory}
        defaultRegionId={activeTab !== ALL_TAB ? activeTab : regionsInCategory[0]?.id}
        editingLink={editingLink}
        onSaved={fetchLinks}
      />

      <RegionFormDialog
        open={regionFormOpen}
        onOpenChange={setRegionFormOpen}
        editingRegion={editingRegion}
        defaultCategory={category}
        onSaved={(newId) => refreshRegions(!editingRegion ? newId : undefined)}
      />

      <ConfirmDialog
        open={!!deleteLinkTarget}
        onOpenChange={(o) => !o && setDeleteLinkTarget(null)}
        title={`Xóa link "${deleteLinkTarget?.name}"?`}
        description="Link này sẽ biến mất ngay, không thể hoàn tác."
        confirmLabel="Xóa link"
        onConfirm={handleDeleteLink}
      />

      <ConfirmDialog
        open={!!deleteRegionTarget}
        onOpenChange={(o) => !o && setDeleteRegionTarget(null)}
        title={`Xóa khu vực "${deleteRegionTarget?.name}"?`}
        description="Toàn bộ link trong khu vực này cũng sẽ bị xóa."
        confirmLabel="Xóa khu vực"
        onConfirm={handleDeleteRegion}
      />
    </div>
  );
}
