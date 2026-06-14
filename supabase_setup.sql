-- ============================================================
-- BOLÃO COPA 2026 — Supabase Setup
-- Rodar em: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Criar tabela principal
CREATE TABLE IF NOT EXISTS bolao_games (
  game_id      TEXT PRIMARY KEY,
  finished     BOOLEAN DEFAULT FALSE,
  removed      BOOLEAN DEFAULT FALSE,
  real_a       INTEGER,
  real_b       INTEGER,
  jessica_a    INTEGER,
  jessica_b    INTEGER,
  vinicius_a   INTEGER,
  vinicius_b   INTEGER,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Row Level Security
ALTER TABLE bolao_games ENABLE ROW LEVEL SECURITY;

-- 3. Política pública (leitura e escrita sem login)
CREATE POLICY "public_all" ON bolao_games
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Habilitar Realtime (para atualizações ao vivo entre participantes)
ALTER PUBLICATION supabase_realtime ADD TABLE bolao_games;
