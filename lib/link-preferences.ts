"use client";

const FAVORITES_KEY = "vivatrip_link_favorites_v1";
const HISTORY_KEY = "vivatrip_link_history_v1";
const MAX_HISTORY = 5;

export function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(id: string): string[] {
  const current = getFavoriteIds();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

interface HistoryEntry {
  id: string;
  openedAt: number;
}

export function getRecentlyOpenedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const entries = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return entries.slice(0, MAX_HISTORY).map((e) => e.id);
  } catch {
    return [];
  }
}

export function recordLinkOpened(id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const entries: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    const next = [{ id, openedAt: Date.now() }, ...entries.filter((e) => e.id !== id)].slice(
      0,
      MAX_HISTORY
    );
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
