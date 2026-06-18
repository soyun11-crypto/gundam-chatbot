export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface GundamSeries {
  id: string;
  name: string;
  name_kr: string;
  year: number;
  description: string;
}

export interface GundamUnit {
  id: string;
  name: string;
  name_kr: string;
  series_id: string;
  pilot: string;
  description: string;
  specifications: Record<string, string>;
}
