-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 건담 기체 테이블
CREATE TABLE IF NOT EXISTS gundam_units (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  pilot TEXT,
  series TEXT,
  unit_type TEXT,
  manufacturer TEXT,
  height TEXT,
  weight TEXT,
  power_plant TEXT,
  armament TEXT,
  description TEXT,
  raw_specs JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RAG 임베딩 테이블 (Google text-embedding-004 = 768차원)
CREATE TABLE IF NOT EXISTS gundam_embeddings (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER REFERENCES gundam_units(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 벡터 유사도 검색 함수
CREATE OR REPLACE FUNCTION match_gundam(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  unit_id INTEGER,
  name TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    gu.id AS unit_id,
    gu.name,
    ge.content,
    1 - (ge.embedding <=> query_embedding) AS similarity
  FROM gundam_embeddings ge
  JOIN gundam_units gu ON gu.id = ge.unit_id
  WHERE 1 - (ge.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ge.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 인덱스 (HNSW - 빠른 근사 검색)
CREATE INDEX IF NOT EXISTS idx_gundam_embeddings_vector
  ON gundam_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_gundam_units_name
  ON gundam_units (name);
