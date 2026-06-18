"use client";

import type { User } from "@supabase/supabase-js";
import type { ChatSession } from "@/types";
import { cn } from "@/lib/utils";
import { Plus, MessageSquare, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface ChatSidebarProps {
  open: boolean;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  user: User;
}

export default function ChatSidebar({
  open,
  sessions,
  currentSessionId,
  onNewSession,
  onSelectSession,
  user,
}: ChatSidebarProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <aside
      className={cn(
        "fixed md:relative inset-y-0 left-0 z-20 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-gundam-red rounded-full flex items-center justify-center font-bold text-xs">
            G
          </div>
          <span className="font-bold">건담 챗봇</span>
        </div>
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-2 bg-gundam-red hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          새 대화
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-4">대화 기록이 없습니다</p>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                currentSessionId === session.id
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <MessageSquare size={14} className="flex-shrink-0" />
              <span className="truncate">{session.title}</span>
            </button>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400 truncate flex-1">{user.email}</div>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-white transition-colors p-1 ml-2"
            title="로그아웃"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
