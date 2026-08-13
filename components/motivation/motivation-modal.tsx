"use client";

import { useEffect, useState } from "react";
import { Copy, Heart, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORY_LABEL,
  type MotivationCard,
  type MotivationCategory,
  type MotivationMessage,
  type MotivationQuote,
} from "@/lib/motivation-types";
import { getRecentMessageIds, isFavorite, recordShown, toggleFavorite } from "@/lib/motivation-favorites";

const FALLBACK_CARD: MotivationCard = {
  messageId: "fallback",
  message: "Một ngày khó không quyết định cả hành trình. Hãy chọn một việc nhỏ và làm nó thật tốt trước.",
  actionText: "Xử lý một việc đang dang dở.",
  isFocusMode: false,
};

function pickCard(
  messages: MotivationMessage[],
  quotes: MotivationQuote[],
  category: MotivationCategory | null
): MotivationCard | null {
  const pool = category ? messages.filter((m) => m.category === category) : messages;
  if (pool.length === 0) return null;

  const recentIds = getRecentMessageIds();
  const available = pool.filter((m) => !recentIds.includes(m.id));
  const candidates = available.length > 0 ? available : pool;
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  const quotePool = quotes.filter((q) => q.category === chosen.category && q.is_verified);
  const quote = quotePool.length > 0 ? quotePool[Math.floor(Math.random() * quotePool.length)] : null;

  return {
    messageId: chosen.id,
    message: chosen.message,
    actionText: chosen.action_text,
    isFocusMode: chosen.action_text === "focus_mode",
    quote: quote ? { text: quote.quote_text_vi, author: quote.author } : undefined,
  };
}

export function MotivationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MotivationMessage[]>([]);
  const [quotes, setQuotes] = useState<MotivationQuote[]>([]);
  const [view, setView] = useState<"card" | "statePicker" | "goodbye">("card");
  const [category, setCategory] = useState<MotivationCategory | null>(null);
  const [card, setCard] = useState<MotivationCard | null>(null);
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setView("card");
    setCategory(null);

    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    Promise.all([
      supabase.from("motivation_messages").select("*").eq("is_active", true),
      supabase.from("motivation_quotes").select("*").eq("is_active", true).eq("is_verified", true),
    ]).then(([msgRes, quoteRes]) => {
      if (cancelled) return;
      const msgs = (msgRes.data ?? []) as MotivationMessage[];
      const qs = (quoteRes.data ?? []) as MotivationQuote[];
      setMessages(msgs);
      setQuotes(qs);
      const first = pickCard(msgs, qs, null) ?? FALLBACK_CARD;
      setCard(first);
      recordShown(first.messageId);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  function handleReroll() {
    const next = pickCard(messages, quotes, category) ?? FALLBACK_CARD;
    setCard(next);
    recordShown(next.messageId);
  }

  function handleSelectState(key: MotivationCategory) {
    setCategory(key);
    const next = pickCard(messages, quotes, key) ?? FALLBACK_CARD;
    setCard(next);
    recordShown(next.messageId);
    setView("card");
  }

  function handleToggleFavorite() {
    if (!card) return;
    toggleFavorite(card);
    forceRerender((n) => n + 1);
  }

  async function handleCopy() {
    if (!card) return;
    try {
      await navigator.clipboard.writeText(card.message);
      toast.success("Đã copy");
    } catch {
      toast.error("Không copy được");
    }
  }

  function handleImOkay() {
    setView("goodbye");
    setTimeout(onClose, 1100);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-t-[20px] bg-paper pb-5 shadow-float sm:rounded-[20px]">
        {view === "goodbye" ? (
          <div className="px-6 py-14 text-center">
            <div className="mb-2.5 text-3xl">❤️</div>
            <p className="text-[15px] font-semibold text-ink">
              Tiếp tục nhé. Chỉ cần làm tốt việc tiếp theo.
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
          </div>
        ) : view === "statePicker" ? (
          <>
            <div className="flex items-center justify-between px-4 pb-1 pt-4">
              <span className="text-[13px] font-bold text-ink-muted">HÔM NAY BẠN ĐANG CẦN ĐIỀU GÌ?</span>
              <button onClick={onClose} className="rounded-full p-1.5 text-ink-muted hover:bg-paper-dim">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 px-5 pb-5 pt-2">
              {(Object.keys(CATEGORY_LABEL) as MotivationCategory[]).map((key) => (
                <button
                  key={key}
                  onClick={() => handleSelectState(key)}
                  className="rounded-[13px] border border-border bg-white px-2.5 py-3.5 text-center text-[12.5px] font-semibold text-ink hover:border-teal hover:bg-teal-light"
                >
                  <span className="mb-1 block text-xl">{CATEGORY_LABEL[key].emoji}</span>
                  {CATEGORY_LABEL[key].label}
                </button>
              ))}
            </div>
          </>
        ) : (
          card && (
            <>
              <div className="flex items-center justify-between px-4 pb-1 pt-4">
                <span className="text-[13px] font-bold text-ink-muted">MỘT CHÚT CHO HÔM NAY</span>
                <button onClick={onClose} className="rounded-full p-1.5 text-ink-muted hover:bg-paper-dim">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5">
                <div className="px-1.5 py-5 text-center">
                  <div className="mb-1 font-serif text-4xl leading-none text-sand">&ldquo;</div>
                  <p className="text-[17px] font-semibold leading-relaxed text-ink">
                    {card.quote?.text ?? card.message}
                  </p>
                  <p className="mt-2.5 text-[11.5px] font-semibold text-ink-muted">
                    {card.quote ? card.quote.author ?? "VivaTrip" : "Thông điệp VivaTrip"}
                  </p>
                </div>

                <div className="-mt-1.5 mb-2.5 flex justify-end gap-1">
                  <button
                    onClick={handleToggleFavorite}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs ${
                      isFavorite(card.messageId) ? "text-danger" : "text-ink-muted hover:bg-paper-dim hover:text-ink"
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFavorite(card.messageId) ? "fill-danger" : ""}`} />
                    {isFavorite(card.messageId) ? "Đã lưu" : "Lưu câu này"}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-ink-muted hover:bg-paper-dim hover:text-ink"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>

                {card.quote && (
                  <div className="mb-4 rounded-[14px] border border-border bg-white p-3.5">
                    <p className="mb-1 text-[11.5px] font-bold tracking-wide text-teal-dark">DÀNH CHO BẠN</p>
                    <p className="text-[13.5px] leading-relaxed text-ink">{card.message}</p>
                  </div>
                )}

                {card.isFocusMode ? (
                  <div className="mb-4 text-center">
                    <p className="mb-3.5 text-[13px] text-ink-muted">Trong 5 phút tới: chỉ xử lý một việc.</p>
                    <button
                      onClick={() => toast("Bấm để bắt đầu — bản đầy đủ sẽ có đồng hồ đếm ngược.")}
                      className="w-full rounded-xl bg-teal py-3 text-[13.5px] font-semibold text-white hover:bg-teal-dark"
                    >
                      🎯 Bắt đầu 5 phút tập trung
                    </button>
                  </div>
                ) : (
                  <div className="mb-4 rounded-[14px] bg-sand-light p-3.5">
                    <p className="mb-1 text-[11.5px] font-bold tracking-wide text-teal-dark">🎯 VIỆC NHỎ TIẾP THEO</p>
                    <p className="text-[13.5px] font-semibold leading-relaxed text-[#5B4A26]">{card.actionText}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 px-5">
                <button
                  onClick={() => setView("statePicker")}
                  className="w-full rounded-xl border border-border bg-white py-3 text-[13.5px] font-semibold text-ink hover:bg-paper-dim"
                >
                  Tôi cần thêm động lực
                </button>
                <button
                  onClick={handleReroll}
                  className="w-full rounded-xl border border-border bg-white py-3 text-[13.5px] font-semibold text-ink hover:bg-paper-dim"
                >
                  ↻ Cho tôi một câu khác
                </button>
                <button
                  onClick={handleImOkay}
                  className="w-full rounded-xl bg-teal py-3 text-[13.5px] font-semibold text-white hover:bg-teal-dark"
                >
                  ✓ Tôi ổn rồi
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
