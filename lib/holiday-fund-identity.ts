"use client";

const TOKEN_KEY = "vivatrip_hf_poster_token";
const NAME_KEY = "vivatrip_hf_author_name";

export function getPosterToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function getSavedAuthorName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function saveAuthorName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAME_KEY, name.trim());
}
