"use client";

const KEY = "vivatrip_recent_searches_v1";
const MAX_ITEMS = 5;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  if (typeof window === "undefined") return [];
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();

  const current = getRecentSearches().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...current].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage đầy/bị chặn -> bỏ qua, không ảnh hưởng tìm kiếm
  }
  return next;
}

export function removeRecentSearch(query: string): string[] {
  if (typeof window === "undefined") return [];
  const next = getRecentSearches().filter((q) => q !== query);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
