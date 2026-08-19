"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getLastSeenAt, getNickname, setLastSeenAt, setNickname } from "@/lib/chat-identity";
import type { ChatMessage } from "@/lib/chat-types";

const POLL_MS = 3000;
const VISIBLE_HOURS = 24;

function fmtTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const h = Math.round(diffMin / 60);
  return `${h} giờ trước`;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [nickname, setNicknameState] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    setNicknameState(getNickname());
  }, []);

  async function fetchState() {
    const supabase = createClient();
    const since = new Date(Date.now() - VISIBLE_HOURS * 3600 * 1000).toISOString();

    const [{ data: msgs }, { data: settings }] = await Promise.all([
      supabase.from("team_chat_messages").select("*").gte("created_at", since).order("created_at", { ascending: true }),
      supabase.from("chat_settings").select("is_enabled").eq("id", 1).single(),
    ]);

    const list = (msgs ?? []) as ChatMessage[];
    setMessages(list);
    if (settings) setChatEnabled(settings.is_enabled);

    if (!openRef.current && list.length > 0) {
      const lastSeen = getLastSeenAt();
      const newCount = lastSeen ? list.filter((m) => m.created_at > lastSeen).length : 0;
      setUnread(newCount);
    }
  }

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, open]);

  function handleToggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      setUnread(0);
      setLastSeenAt(new Date().toISOString());
      if (!nickname) setShowNicknamePrompt(true);
    }
  }

  function handleSaveNickname() {
    const val = nicknameDraft.trim();
    if (!val) {
      toast.error("Vui lòng nhập biệt danh.");
      return;
    }
    setNickname(val);
    setNicknameState(val);
    setShowNicknamePrompt(false);
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || !nickname || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, message: text }),
      });
      if (!res.ok) {
        const result = await res.json();
        toast.error(result.error ?? "Không gửi được tin nhắn.");
        setDraft(text);
      } else {
        fetchState();
      }
    } catch {
      toast.error("Có lỗi khi gửi tin nhắn.");
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  if (pathname === "/admin/login" || pathname.startsWith("/payroll")) return null;

  return (
    <>
      <button
        onClick={handleToggleOpen}
        className="fixed bottom-36 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white shadow-float transition-transform hover:scale-105 sm:bottom-5 sm:right-5"
        aria-label="Mở chat chung"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-danger px-1 text-[10.5px] font-extrabold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[480px] sm:max-h-[70vh] sm:w-[360px] sm:rounded-2xl sm:border sm:border-border sm:shadow-float">
          <div className="flex shrink-0 items-center justify-between bg-teal px-4 py-3.5 text-white sm:rounded-t-2xl">
            <span className="flex items-center gap-1.5 text-[14px] font-bold">
              <MessageCircle className="h-4 w-4" />
              Chat chung
            </span>
            <button onClick={() => setOpen(false)} className="rounded-full bg-white/15 p-1.5" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!chatEnabled && (
            <div className="shrink-0 bg-danger-light px-4 py-2.5 text-center text-[12px] font-medium text-danger">
              🔒 Admin đã tạm khoá chat.
            </div>
          )}

          <div ref={feedRef} className="flex-1 space-y-2.5 overflow-y-auto p-3.5">
            {messages.length === 0 ? (
              <p className="mt-8 text-center text-[13px] text-ink-muted">Chưa có tin nhắn nào. Hãy là người đầu tiên!</p>
            ) : (
              messages.map((m) => {
                const isMe = m.nickname === nickname;
                return (
                  <div key={m.id} className={`flex max-w-[85%] gap-2 ${isMe ? "ml-auto flex-row-reverse" : ""}`}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-light text-[10px] font-bold text-teal-dark">
                      {initials(m.nickname)}
                    </div>
                    <div className={`rounded-2xl px-3 py-2 ${isMe ? "bg-teal-light" : "bg-paper-dim"}`}>
                      <p className="text-[11px] font-bold text-teal-dark">{m.nickname}</p>
                      <p className="text-[13px] leading-snug text-ink">{m.message}</p>
                      <p className="mt-0.5 text-[10px] text-ink-muted">{fmtTime(m.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex shrink-0 gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={!chatEnabled}
              placeholder={chatEnabled ? "Nhập tin nhắn..." : "Chat đang bị khoá"}
              maxLength={500}
              className="h-11 flex-1 rounded-xl border border-border px-3.5 text-[13.5px] disabled:bg-paper-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            />
            <button
              onClick={handleSend}
              disabled={!chatEnabled || !draft.trim() || sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal text-white disabled:bg-paper-dim disabled:text-ink-muted"
              aria-label="Gửi"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showNicknamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-5">
          <div className="w-full max-w-[340px] rounded-2xl bg-white p-6 text-center">
            <p className="mb-1.5 text-[16px] font-bold">👋 Chọn biệt danh của bạn</p>
            <p className="mb-4 text-[12.5px] text-ink-muted">
              Biệt danh hiện trên mọi tin nhắn bạn gửi. Không cần đăng nhập.
            </p>
            <input
              value={nicknameDraft}
              onChange={(e) => setNicknameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()}
              placeholder="VD: Quân Sales"
              maxLength={30}
              className="mb-3 h-11 w-full rounded-xl border border-border px-3.5 text-center text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              autoFocus
            />
            <button
              onClick={handleSaveNickname}
              className="h-11 w-full rounded-xl bg-teal text-[13.5px] font-bold text-white hover:bg-teal-dark"
            >
              Bắt đầu chat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
