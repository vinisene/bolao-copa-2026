-- ============================================================
-- BOLÃO COPA 2026 — Banco de DEV isolado (sandbox descartável)
-- Mesmo projeto Supabase, tabelas com prefixo dev_ no schema public.
-- Rodar em: Supabase Dashboard → SQL Editor → New query → Run.
-- O app usa estas tabelas só quando o hostname começa com "dev." (URL de preview).
-- Em produção/localhost o app continua nas tabelas sem prefixo (intocadas).
--
-- Políticas permissivas de propósito (sandbox): a anon key pode SELECT/INSERT/UPDATE/DELETE.
-- NUNCA use a service_role key no cliente.
-- ============================================================

-- 1. Fase de grupos (mesmas colunas da bolao_games de produção)
CREATE TABLE IF NOT EXISTS dev_bolao_games (
  game_id      TEXT PRIMARY KEY,
  finished     BOOLEAN DEFAULT FALSE,
  removed      BOOLEAN DEFAULT FALSE,
  real_a       INTEGER,
  real_b       INTEGER,
  jessica_a    INTEGER,
  jessica_b    INTEGER,
  vinicius_a   INTEGER,
  vinicius_b   INTEGER,
  tonius_a     INTEGER,
  tonius_b     INTEGER,
  claudio_a    INTEGER,
  claudio_b    INTEGER,
  leo_a        INTEGER,
  leo_b        INTEGER,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Mata-mata (espelho do supabase_mata_mata.sql, com prefixo dev_)
CREATE TABLE IF NOT EXISTS dev_mata_confrontos (
  id           TEXT PRIMARY KEY,
  phase        TEXT,
  team_a       TEXT,
  flag_a       TEXT,
  team_b       TEXT,
  flag_b       TEXT,
  real_a       INTEGER,                    -- placar FINAL (inclui prorrogação)
  real_b       INTEGER,
  classificado TEXT,                       -- 'A'/'B' = quem passou (só importa em empate → pênaltis)
  finished     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS dev_mata_palpites (
  confronto_id TEXT REFERENCES dev_mata_confrontos(id) ON DELETE CASCADE,
  pid          TEXT,                        -- jessica|tonius|leo|vinicius|chatgpt|claudio|chatgptleo|claude
  gols_a       INTEGER,
  gols_b       INTEGER,
  quem_passa   TEXT,                        -- 'A'/'B' (só usado quando o palpite é empate)
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (confronto_id, pid)
);

-- 3. RLS + política pública total (sandbox: anon lê e escreve tudo)
ALTER TABLE dev_bolao_games     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_mata_confrontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_mata_palpites   ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_public_all" ON dev_bolao_games;
DROP POLICY IF EXISTS "dev_public_all" ON dev_mata_confrontos;
DROP POLICY IF EXISTS "dev_public_all" ON dev_mata_palpites;
CREATE POLICY "dev_public_all" ON dev_bolao_games     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_public_all" ON dev_mata_confrontos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_public_all" ON dev_mata_palpites   FOR ALL USING (true) WITH CHECK (true);

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE dev_bolao_games;
ALTER PUBLICATION supabase_realtime ADD TABLE dev_mata_confrontos;
ALTER PUBLICATION supabase_realtime ADD TABLE dev_mata_palpites;

-- Depois de rodar: abra a URL de preview do dev (hostname dev.*) e clique em
-- "🪞 Espelhar prod→dev" pra copiar os dados atuais da produção pro dev.
