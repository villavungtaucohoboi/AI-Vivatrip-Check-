import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ChatAdminManager } from "@/components/admin/chat-admin-manager";
import type { ChatMessage, ChatSettings } from "@/lib/chat-types";

export default async function AdminChatPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: messages }] = await Promise.all([
    supabase.from("chat_settings").select("*").eq("id", 1).single(),
    supabase.from("team_chat_messages").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại quản lý sản phẩm
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Chat chung</h1>
      <p className="mb-5 text-sm text-ink-muted">
        Chat công khai, không kiểm duyệt — mọi người tự đặt biệt danh để chat. Tin nhắn tự ẩn khỏi bong
        bóng chat sau 24 giờ (không xóa), bạn tự xóa hẳn ở đây khi cần.
      </p>
      <ChatAdminManager
        initialSettings={(settings as ChatSettings) ?? null}
        initialMessages={(messages ?? []) as ChatMessage[]}
      />
    </main>
  );
}
