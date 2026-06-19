import { createClient } from "@/lib/supabase/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBED_MODEL = "gemini-embedding-001";

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 768,
      }),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data.embedding?.values ?? null;
}

export async function searchGunpla(query: string, matchCount = 5): Promise<string> {
  const embedding = await generateEmbedding(query);
  if (!embedding) return "";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_gunpla", {
    query_embedding: embedding,
    match_count: matchCount,
    similarity_threshold: 0.4,
  });

  if (error || !data?.length) return "";

  return data
    .map(
      (row: { name: string; grade: string; scale: string; content: string; similarity: number }) =>
        `[${row.name}] 등급: ${row.grade ?? "미상"} / 스케일: ${row.scale ?? "미상"} (유사도: ${(row.similarity * 100).toFixed(0)}%)\n${row.content}`
    )
    .join("\n\n---\n\n");
}

export async function searchGundam(query: string, matchCount = 5): Promise<string> {
  const embedding = await generateEmbedding(query);
  if (!embedding) return "";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_gundam", {
    query_embedding: embedding,
    match_count: matchCount,
    similarity_threshold: 0.4,
  });

  if (error || !data?.length) return "";

  return data
    .map(
      (row: { name: string; content: string; similarity: number }) =>
        `[${row.name}] (유사도: ${(row.similarity * 100).toFixed(0)}%)\n${row.content}`
    )
    .join("\n\n---\n\n");
}
