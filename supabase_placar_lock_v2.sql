-- ============================================================
-- TRAVA DE PLACAR FINAL (mata-mata) — v2, CONDICIONAL ao estado do jogo
-- Rodar em: Supabase Dashboard → SQL Editor → New query → Run
-- (mesma régua de sempre: mudança de permissão em produção, rodar manualmente)
--
-- Substitui supabase_placar_lock_v2 (o antigo _lock.sql, agora renomeado pra
-- _DEPRECATED_nao_usar.sql) — aquele bloqueava as 4 colunas incondicionalmente
-- e quebrava a "Prévia Placar" de jogos ainda abertos. Este aqui só trava
-- quando o jogo JÁ está finalizado; enquanto aberto, continua 100% livre
-- pra qualquer participante (mesmo comportamento de sempre).
--
-- Como funciona: troca a policy única "public_all" (FOR ALL, cobre tudo)
-- por 4 policies separadas. SELECT/INSERT/DELETE continuam exatamente tão
-- abertos quanto antes. Só o UPDATE muda: a nova policy só permite escrever
-- numa linha cujo estado ATUAL (antes do update) tem finished = false. Uma
-- vez finished = true, nenhuma escrita via anon/authenticated passa mais —
-- nem no placar, nem em qualquer outra coluna dessa linha.
--
-- A Edge Function `ratazana-cobranca` (?tipo=fechar_placar) roda com a
-- SERVICE ROLE KEY, que ignora RLS por completo (bypassrls) — continua
-- gravando em qualquer estado, aberto ou fechado. É a única via que
-- consegue fechar OU reabrir um jogo, exatamente como deve ser.
-- ============================================================

-- ── mata_confrontos (produção) ────────────────────────────────────────────
DROP POLICY IF EXISTS "public_all" ON mata_confrontos;

CREATE POLICY "select_all" ON mata_confrontos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "insert_all" ON mata_confrontos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "delete_all" ON mata_confrontos
  FOR DELETE TO anon, authenticated USING (true);

-- A trava de verdade: só atualiza se a linha AINDA NÃO estava finalizada.
CREATE POLICY "update_so_se_aberto" ON mata_confrontos
  FOR UPDATE TO anon, authenticated
  USING (finished = false)
  WITH CHECK (true);

-- ── dev_mata_confrontos (mesmo padrão) ─────────────────────────────────────
DROP POLICY IF EXISTS "public_all" ON dev_mata_confrontos;

CREATE POLICY "select_all" ON dev_mata_confrontos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "insert_all" ON dev_mata_confrontos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "delete_all" ON dev_mata_confrontos
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "update_so_se_aberto" ON dev_mata_confrontos
  FOR UPDATE TO anon, authenticated
  USING (finished = false)
  WITH CHECK (true);

-- ============================================================
-- Verificação depois de rodar (opcional, no SQL Editor):
--   select policyname, cmd, roles from pg_policies where tablename='mata_confrontos';
-- Deve listar select_all/insert_all/delete_all/update_so_se_aberto — sem
-- "public_all" mais. Teste real: tentar mudar o placar de um jogo já
-- finalizado direto pela REST API com a anon key deve dar 0 linhas
-- afetadas (RLS silenciosamente não aplica, sem erro — é o comportamento
-- padrão de update bloqueado por USING); um jogo aberto continua gravando
-- normalmente.
-- ============================================================
