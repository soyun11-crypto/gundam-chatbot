import { createClient } from "@/lib/supabase/server";
import { GUNDAM_SYSTEM_PROMPT } from "@/lib/gundam-system-prompt";
import { searchGundam } from "@/lib/rag";

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, sessionId } = await req.json();

  const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  const ragContext = lastUserMessage ? await searchGundam(lastUserMessage.content) : "";

  const systemPrompt = ragContext
    ? `${GUNDAM_SYSTEM_PROMPT}\n\n## 관련 기체 데이터베이스 정보\n아래는 사용자 질문과 관련된 실제 기체 데이터입니다. 이 정보를 우선적으로 활용하여 답변하세요:\n\n${ragContext}`
    : GUNDAM_SYSTEM_PROMPT;

  // Gemini는 assistant → model 로 role 변환 필요
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const geminiRes = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
    }),
  });

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    console.error("[Gemini 오류]", geminiRes.status, err);
    return new Response("AI 오류가 발생했습니다.", { status: 500 });
  }

  const data = await geminiRes.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (sessionId && text) {
    await supabase.from("messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: text,
    });
  }

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
