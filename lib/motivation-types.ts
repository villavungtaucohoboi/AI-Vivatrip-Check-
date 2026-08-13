export type MotivationCategory =
  | "pressure"
  | "determination"
  | "rejection"
  | "unlucky_day"
  | "overwhelmed"
  | "grit"
  | "focus";

export const CATEGORY_LABEL: Record<MotivationCategory, { emoji: string; label: string }> = {
  pressure: { emoji: "😮‍💨", label: "Tôi đang áp lực" },
  determination: { emoji: "💪", label: "Tôi muốn lấy lại động lực" },
  rejection: { emoji: "😞", label: "Khách vừa từ chối" },
  unlucky_day: { emoji: "🌧️", label: "Hôm nay chưa thuận lợi" },
  overwhelmed: { emoji: "🧠", label: "Tôi đang rối" },
  grit: { emoji: "🔥", label: "Tôi muốn quyết tâm hơn" },
  focus: { emoji: "🎯", label: "Tôi cần tập trung" },
};

export interface MotivationQuote {
  id: string;
  quote_text_original: string | null;
  quote_text_vi: string;
  author: string | null;
  source_reference: string | null;
  category: string;
  is_verified: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MotivationMessage {
  id: string;
  category: string;
  message: string;
  action_text: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** 1 "card" hiển thị = 1 thông điệp (+ quote nếu có) + 1 hành động nhỏ */
export interface MotivationCard {
  messageId: string;
  message: string;
  actionText: string;
  isFocusMode: boolean;
  quote?: {
    text: string;
    author: string | null; // chỉ có giá trị khi is_verified = true
  };
}
