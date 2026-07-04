-- ============================================================
-- ⚠️ DEPRECATED — NÃO RODAR ESTE ARQUIVO. NUNCA FOI APLICADO.
-- ============================================================
-- Por quê: este REVOKE é um bloqueio GERAL e incondicional das 4 colunas
-- (real_a/real_b/classificado/finished), em QUALQUER estado do jogo. Isso
-- quebra a "Prévia Placar" — a sandbox livre que qualquer participante usa
-- em jogos ainda ABERTOS pra simular placar e ver pontos, sem precisar de
-- admin. Um bug real de uma sessão anterior deixou a trava ampla demais.
--
-- Use no lugar: supabase_placar_lock_v2.sql — trava CONDICIONAL (só bloqueia
-- quando finished=true; jogo aberto continua 100% livre pra qualquer um).
-- ============================================================

-- ============================================================
-- (conteúdo original abaixo, mantido só de referência histórica)
-- TRAVA DE PLACAR FINAL (mata-mata) — reforço de segurança real (não só front-end)
-- Rodar em: Supabase Dashboard → SQL Editor → New query → Run
--
-- Problema: a policy de mata_confrontos é `FOR ALL USING(true) WITH CHECK(true)`
-- (mesma anon key pública usada pelo site E pela página admin). Esconder o campo
-- no front (index.html) não impede alguém de escrever real_a/real_b/classificado/
-- finished direto via REST com a anon key (que é pública, está no código-fonte).
--
-- Fix: REVOKE em nível de COLUNA. Ninguém que usa a anon key (nem a home, nem a
-- página admin) consegue mais dar UPDATE nessas 4 colunas — nem em SQL manual,
-- nem via REST, nem pelo console do navegador. A ÚNICA via que continua
-- funcionando é a Edge Function `ratazana-cobranca` (modo ?tipo=fechar_placar),
-- que roda com a SERVICE ROLE KEY (não afetada por este REVOKE) e exige o
-- ?token= (BOT_TRIGGER_TOKEN) — essa é a senha da página admin.
-- Outras colunas (team_a, flag_a, team_b, flag_b, phase) continuam com UPDATE
-- liberado pra anon: são usadas pelas funções administrativas antigas do
-- console (mmSaveEdit/mmAddConfronto), que não mexem nessas 4 colunas.
-- ============================================================

REVOKE UPDATE (real_a, real_b, classificado, finished) ON mata_confrontos     FROM anon, authenticated;
REVOKE UPDATE (real_a, real_b, classificado, finished) ON dev_mata_confrontos FROM anon, authenticated;

-- Reforça explicitamente (já é o padrão do Supabase, mas documentado aqui):
-- só o service_role (usado pela Edge Function) pode gravar essas colunas.
GRANT UPDATE (real_a, real_b, classificado, finished) ON mata_confrontos     TO service_role;
GRANT UPDATE (real_a, real_b, classificado, finished) ON dev_mata_confrontos TO service_role;

-- Verificação rápida (rode depois): deve dar erro "permission denied for column"
-- se tentar via anon. Isto aqui usa a service_role importada do SQL Editor
-- (sempre roda como superusuário/postgres no editor, então NÃO testa o revoke
-- por si só — o teste real é tentar um UPDATE dessas colunas pela REST API com
-- a anon key, ou simplesmente confiar no fluxo: a função `fechar_placar` grava
-- com sucesso, e o antigo caminho direto do admin.html pela anon key não.
