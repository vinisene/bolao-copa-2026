-- ============================================================
-- BOLÃO COPA 2026 — Setup da FASE MATA-MATA (eliminatórias)
-- Rodar em: Supabase Dashboard → SQL Editor → New query
-- Tabelas NOVAS e separadas; NÃO tocam na fase de grupos (bolao_games).
-- ============================================================

-- 1. Confrontos do mata-mata
CREATE TABLE IF NOT EXISTS mata_confrontos (
  id           TEXT PRIMARY KEY,
  phase        TEXT,                       -- ex: "32 avos", "16 avos"
  team_a       TEXT,                       -- time A (mandante)
  flag_a       TEXT,                       -- emoji da bandeira A (ex: 🇧🇷)
  team_b       TEXT,                       -- time B (visitante)
  flag_b       TEXT,
  real_a       INTEGER,                    -- placar FINAL do time A (inclui prorrogação)
  real_b       INTEGER,                    -- placar FINAL do time B (inclui prorrogação)
  classificado TEXT,                       -- 'A' ou 'B' = quem passou (só importa se empatar → pênaltis)
  finished     BOOLEAN DEFAULT FALSE,      -- quando true, conta no ranking
  created_at   TIMESTAMPTZ DEFAULT NOW(),  -- ordem de exibição
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Palpites do mata-mata (1 linha por confronto + participante humano)
CREATE TABLE IF NOT EXISTS mata_palpites (
  confronto_id TEXT REFERENCES mata_confrontos(id) ON DELETE CASCADE,
  pid          TEXT,                       -- jessica | tonius | leo | vinicius
  gols_a       INTEGER,
  gols_b       INTEGER,
  quem_passa   TEXT,                       -- 'A' | 'B' (só usado quando o palpite é empate)
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (confronto_id, pid)
);

-- 3. Row Level Security + política pública (mesmo padrão da fase de grupos)
ALTER TABLE mata_confrontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mata_palpites   ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON mata_confrontos;
DROP POLICY IF EXISTS "public_all" ON mata_palpites;
CREATE POLICY "public_all" ON mata_confrontos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON mata_palpites   FOR ALL USING (true) WITH CHECK (true);

-- 4. Realtime (atualização ao vivo entre os participantes)
ALTER PUBLICATION supabase_realtime ADD TABLE mata_confrontos;
ALTER PUBLICATION supabase_realtime ADD TABLE mata_palpites;

-- Depois de rodar este SQL: `npm run seed:teste` cria 2 confrontos [TESTE] de exemplo.
