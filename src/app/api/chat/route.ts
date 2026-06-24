import { createClient } from "@/lib/supabase/server";
import { GUNDAM_SYSTEM_PROMPT } from "@/lib/gundam-system-prompt";
import { searchGundam, searchGunpla } from "@/lib/rag";

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

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
  const [ragContext, gunplaContext] = lastUserMessage
    ? await Promise.all([
        searchGundam(lastUserMessage.content),
        searchGunpla(lastUserMessage.content),
      ])
    : ["", ""];

  let systemPrompt = GUNDAM_SYSTEM_PROMPT;
  if (ragContext) systemPrompt += `\n\n## 관련 기체 데이터베이스 정보\n아래는 사용자 질문과 관련된 실제 기체 데이터입니다. 이 정보를 우선적으로 활용하여 답변하세요:\n\n${ragContext}`;
  if (gunplaContext) systemPrompt += `\n\n## 관련 건프라 상품 정보\n아래는 사용자 질문과 관련된 실제 건프라 상품 데이터입니다. 건프라 추천 시 이 정보를 우선 활용하세요:\n\n${gunplaContext}`;

  // Gemini는 assistant → model 로 role 변환 필요
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const geminiRes = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    }),
  });

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    console.error("[Gemini 오류]", geminiRes.status, err);
    return new Response("AI 오류가 발생했습니다.", { status: 500 });
  }

  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = geminiRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const data = JSON.parse(jsonStr);
              const chunk: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
              if (chunk) {
                fullText += chunk;
                controller.enqueue(new TextEncoder().encode(chunk));
              }
            } catch {}
          }
        }
      } finally {
        controller.close();
        if (sessionId && fullText) {
          await supabase.from("messages").insert({
            session_id: sessionId,
            role: "assistant",
            content: fullText,
          });
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
