"use client";

import { useState, useRef, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { ChatSession } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/utils";
import MessageBubble from "./MessageBubble";
import ChatSidebar from "./ChatSidebar";
import { Send, Menu, X } from "lucide-react";

interface ChatInterfaceProps {
  user: User;
  initialSessions: ChatSession[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "RX-78-2 건담의 스펙을 알려줘",
  "샤아 아즈나블은 어떤 캐릭터야?",
  "뉴건담과 사자비의 차이점은?",
  "건담SEED 시리즈 추천 순서는?",
  "MG 건프라 입문작 추천해줘",
];

export default function ChatInterface({ user, initialSessions }: ChatInterfaceProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function getOrCreateSession(): Promise<string> {
    if (currentSessionId) return currentSessionId;
    const sessionId = generateId();
    const { data } = await supabase
      .from("chat_sessions")
      .insert({ id: sessionId, user_id: user.id, title: "새 대화" })
      .select()
      .single();
    if (data) {
      setSessions((prev) => [data, ...prev]);
      setCurrentSessionId(data.id);
    }
    return sessionId;
  }

  async function loadSession(sessionId: string) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    setCurrentSessionId(sessionId);
    setMessages(
      (data ?? []).map((m) => ({ id: m.id, role: m.role, content: m.content }))
    );
    setSidebarOpen(false);
  }

  async function startNewSession() {
    const sessionId = generateId();
    const { data } = await supabase
      .from("chat_sessions")
      .insert({ id: sessionId, user_id: user.id, title: "새 대화" })
      .select()
      .single();
    if (data) {
      setSessions((prev) => [data, ...prev]);
      setCurrentSessionId(data.id);
      setMessages([]);
      setSidebarOpen(false);
    }
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading) return;

    const sessionId = await getOrCreateSession();

    const userMsg: Message = { id: generateId(), role: "user", content };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // 첫 메시지면 세션 제목 업데이트
    if (messages.length === 0) {
      const title = content.slice(0, 30) + (content.length > 30 ? "..." : "");
      supabase.from("chat_sessions").update({ title }).eq("id", sessionId).then(() => {
        setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, title } : s));
      });
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(({ role, content }) => ({ role, content })),
          sessionId,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const text = await res.text();

      const assistantMsg: Message = { id: generateId(), role: "assistant", content: text };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSuggestedQuestion(question: string) {
    sendMessage(question);
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <ChatSidebar
        open={sidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewSession={startNewSession}
        onSelectSession={loadSession}
        user={user}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gundam-red rounded-full flex items-center justify-center text-xs font-bold">
              G
            </div>
            <span className="font-semibold text-sm">건담 챗봇</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-16 h-16 bg-gundam-red/20 border border-gundam-red/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-gundam-red">G</span>
              </div>
              <h2 className="text-xl font-bold mb-2">건담 전문 AI 어시스턴트</h2>
              <p className="text-gray-400 text-sm mb-8">
                건담 시리즈에 대해 무엇이든 물어보세요!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestedQuestion(q)}
                    className="text-left bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-lg px-4 py-3 text-sm text-gray-300 hover:text-white transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>건담 AI가 답변을 생성 중...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 bg-gray-900 px-4 py-4">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="max-w-2xl mx-auto flex gap-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="건담에 대해 물어보세요..."
              disabled={isLoading}
              className="flex-1 bg-gray-800 border border-gray-700 focus:border-gundam-red/50 focus:outline-none rounded-xl px-4 py-3 text-sm placeholder-gray-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gundam-red hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-center text-gray-600 text-xs mt-2">
            건담 챗봇은 AI로 구동되며 정보가 부정확할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
