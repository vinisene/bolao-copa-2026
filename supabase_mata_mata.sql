-- ============================================================
-- BOLÃO COPA 2026 — Setup da FASE MATA-MATA (eliminatórias)
-- Rodar em: Supabase Dashboard → SQL Editor → New query
-- Tabelas NOVAS e separadas; NÃO tocam na fase de grupos (bolao_games).
--
-- ⚠️ PENDÊNCIA (auditoria de 2026-07-04): este arquivo foi ATUALIZADO pra
-- documentar as 4 tabelas (prod + dev_), mas AINDA NÃO foi rodado no banco —
-- o Claude Code bloqueou a execução automática (classificador de segurança
-- trava qualquer mudança de RLS/permissão em produção via automação, mesmo
-- sendo policy permissiva e seguro de aplicar). Auditoria via teste real de
-- escrita (INSERT/UPDATE/DELETE com a anon key, revertido logo em seguida)
-- confirmou que as 4 tabelas JÁ aceitam escrita normalmente hoje — ou seja,
-- não há bug ativo, isto é reforço/documentação. Pra deixar 100% explícito
-- e à prova de futuras mudanças: SQL Editor do Supabase → colar este arquivo
-- inteiro → Run (idempotente, seguro rodar mesmo com as tabelas já no ar).
--
-- Cobre PRODUÇÃO (mata_confrontos/mata_palpites) E os espelhos de DEV
-- (dev_mata_confrontos/dev_mata_palpites) — antes deste arquivo, os dev_
-- não estavam documentados aqui (foram criados à parte), o que deixava a
-- policy RLS deles fora da fonte de verdade. Todo o SQL abaixo é IDEMPOTENTE
-- (seguro rodar de novo quantas vezes precisar, em qualquer estado atual).
-- ============================================================

-- 1. Confrontos do mata-mata (produção + dev)
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
CREATE TABLE IF NOT EXISTS dev_mata_confrontos (LIKE mata_confrontos INCLUDING ALL);

-- 2. Palpites do mata-mata (1 linha por confronto + participante humano)
CREATE TABLE IF NOT EXISTS mata_palpites (
  confronto_id TEXT REFERENCES mata_confrontos(id) ON DELETE CASCADE,
  pid          TEXT,                       -- jessica | tonius | leo | vinicius | ...
  gols_a       INTEGER,
  gols_b       INTEGER,
  quem_passa   TEXT,                       -- 'A' | 'B' (só usado quando o palpite é empate)
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (confronto_id, pid)
);
CREATE TABLE IF NOT EXISTS dev_mata_palpites (
  confronto_id TEXT REFERENCES dev_mata_confrontos(id) ON DELETE CASCADE,
  pid          TEXT,
  gols_a       INTEGER,
  gols_b       INTEGER,
  quem_passa   TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (confronto_id, pid)
);
-- ⚠️ Auditoria de 2026-07-04: em PRODUÇÃO, mata_palpites.confronto_id existe mas o
-- ON DELETE CASCADE não está disparando de verdade (testado: apagar um confronto de
-- teste deixou o palpite órfão, precisou apagar à mão). Em DEV o cascade funciona
-- normalmente. Isso é uma FK/constraint drift, não é RLS — fora do escopo desta
-- leva; considerar revisar a constraint de mata_palpites em produção numa próxima
-- sessão (provável causa: a FK de produção foi criada antes de existir o ON DELETE
-- CASCADE no schema, e nunca foi migrada).

-- 3. Row Level Security + política pública (mesmo padrão da fase de grupos e do bot)
-- Idempotente: pode rodar de novo mesmo se a policy já existir com outro nome/definição.
ALTER TABLE mata_confrontos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mata_palpites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_mata_confrontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_mata_palpites   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON mata_confrontos;
DROP POLICY IF EXISTS "public_all" ON mata_palpites;
DROP POLICY IF EXISTS "public_all" ON dev_mata_confrontos;
DROP POLICY IF EXISTS "public_all" ON dev_mata_palpites;

CREATE POLICY "public_all" ON mata_confrontos     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON mata_palpites       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON dev_mata_confrontos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON dev_mata_palpites   FOR ALL USING (true) WITH CHECK (true);

-- 4. Realtime (atualização ao vivo entre os participantes) — idempotente via DO block
-- (ALTER PUBLICATION ... ADD TABLE dá erro se a tabela já estiver lá; isto evita o erro).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='mata_confrontos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mata_confrontos;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='mata_palpites') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mata_palpites;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='dev_mata_confrontos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dev_mata_confrontos;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='dev_mata_palpites') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dev_mata_palpites;
  END IF;
END $$;

-- ============================================================
-- Verificação depois de rodar (opcional, no SQL Editor):
--   select tablename, policyname, cmd, roles from pg_policies
--   where tablename in ('mata_confrontos','mata_palpites','dev_mata_confrontos','dev_mata_palpites');
-- Deve listar "public_all" (FOR ALL) nas 4 tabelas.
--
-- Depois de rodar este SQL: `npm run seed:teste` cria 2 confrontos [TESTE] de exemplo no dev.
-- ============================================================
