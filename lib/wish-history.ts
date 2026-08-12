"use client";

import type { Wish } from "./daily-wishes";

const HISTORY_KEY = "vivatrip_wish_history_v1";
const MAX_TRACKED = 20;
const MAX_SHOWN = 5;

interface HistoryEntry extends Wish {
  usedAt: number;
}

function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_TRACKED)));
  } catch {
    // ignore
  }
}

export function getRecentWishIds(): string[] {
  return readHistory().map((h) => h.id);
}

export function getRecentWishes(): HistoryEntry[] {
  return readHistory().slice(0, MAX_SHOWN);
}

export function recordWishUsed(wish: Wish) {
  const current = readHistory().filter((h) => h.id !== wish.id);
  writeHistory([{ ...wish, usedAt: Date.now() }, ...current]);
}
