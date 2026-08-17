export interface ChatMessage {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
}

export interface ChatSettings {
  id: number;
  is_enabled: boolean;
  updated_by: string | null;
  updated_at: string;
}
