"use client";

import type { MotivationCard } from "./motivation-types";

const FAVORITES_KEY = "vivatrip_motivation_favorites_v1";
const HISTORY_KEY = "vivatrip_motivation_history_v1";
const MAX_HISTORY = 15;

export function getFavorites(): MotivationCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as MotivationCard[]) : [];
  } catch {
    return [];
  }
}

export function isFavorite(messageId: string): boolean {
  return getFavorites().some((c) => c.messageId === messageId);
}

export function toggleFavorite(card: MotivationCard): MotivationCard[] {
  const current = getFavorites();
  const next = isFavorite(card.messageId)
    ? current.filter((c) => c.messageId !== card.messageId)
    : [...current, card];
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function getRecentMessageIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function recordShown(messageId: string) {
  if (typeof window === "undefined") return;
  const current = getRecentMessageIds().filter((id) => id !== messageId);
  const next = [messageId, ...current].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
