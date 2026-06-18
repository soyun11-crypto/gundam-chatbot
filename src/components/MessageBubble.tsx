"use client";

import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: {
    id: string;
    role: string;
    content: string;
  };
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 bg-gundam-red/20 border border-gundam-red/40 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-xs font-bold text-gundam-red">G</span>
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-gundam-blue text-white rounded-tr-sm"
            : "bg-gray-800 text-gray-100 rounded-tl-sm"
        )}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="w-8 h-8 bg-gundam-blue/30 border border-gundam-blue/50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-xs font-bold text-blue-300">나</span>
        </div>
      )}
    </div>
  );
}
