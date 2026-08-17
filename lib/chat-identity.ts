"use client";

const NICKNAME_KEY = "vivatrip_chat_nickname_v1";
const LAST_SEEN_KEY = "vivatrip_chat_last_seen_v1";

export function getNickname(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setNickname(name: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NICKNAME_KEY, name);
  } catch {
    // ignore
  }
}

export function getLastSeenAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

export function setLastSeenAt(iso: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_SEEN_KEY, iso);
  } catch {
    // ignore
  }
}
