-- 건프라 상품 테이블
CREATE TABLE IF NOT EXISTS gunpla_products (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER REFERENCES gundam_units(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  grade TEXT,
  scale TEXT,
  release_date TEXT,
  description TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 건프라 임베딩 테이블
CREATE TABLE IF NOT EXISTS gunpla_embeddings (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES gunpla_products(id) ON DELETE CASCADE,
  embedding_text TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 건프라 벡터 유사도 검색 함수
CREATE OR REPLACE FUNCTION match_gunpla(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  product_id INTEGER,
  unit_id INTEGER,
  name TEXT,
  grade TEXT,
  scale TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    gp.id AS product_id,
    gp.unit_id,
    gp.name,
    gp.grade,
    gp.scale,
    ge.content,
    1 - (ge.embedding <=> query_embedding) AS similarity
  FROM gunpla_embeddings ge
  JOIN gunpla_products gp ON gp.id = ge.product_id
  WHERE 1 - (ge.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ge.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_gunpla_embeddings_vector
  ON gunpla_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_gunpla_products_unit_id
  ON gunpla_products (unit_id);

CREATE INDEX IF NOT EXISTS idx_gunpla_products_grade
  ON gunpla_products (grade);

-- RLS
ALTER TABLE gunpla_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE gunpla_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gunpla_products" ON gunpla_products FOR SELECT USING (true);
CREATE POLICY "Anyone can read gunpla_embeddings" ON gunpla_embeddings FOR SELECT USING (true);
CREATE POLICY "Service role can manage gunpla_products" ON gunpla_products USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage gunpla_embeddings" ON gunpla_embeddings USING (auth.role() = 'service_role');
