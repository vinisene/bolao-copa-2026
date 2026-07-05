-- ═══════════════════════════════════════════════════════════════════════════
-- pg_cron do Robô Ratazana — Fase 4 (agenda do dia + última chamada)
-- ═══════════════════════════════════════════════════════════════════════════
-- Auditoria (jul/2026): pg_cron e pg_net NÃO estavam instalados neste projeto
-- (nenhuma linha em pg_extension, "relation cron.job does not exist"). Ou
-- seja, HOJE não existe NENHUM disparo automático — a cobrança só roda se
-- alguém acessa a URL manualmente (ou clica em "Acordar o Ratazana" no admin).
--
-- Este arquivo cria a automação mínima:
--   1) job diário às 9h (horário de Brasília) → ?tipo=agenda
--   2) job a cada 10min → ?tipo=ultima_chamada (a própria função decide se
--      algum jogo está entrando na janela de 15-30min antes do kickoff;
--      na maioria das execuções não faz nada)
--
-- ⚠️ Rode isto no SQL Editor do Supabase (Table Editor/automação não fazem
-- DDL de extensão). Precisa de privilégio de owner do projeto — normal no
-- SQL Editor do dashboard.
--
-- ⚠️ SUBSTITUA "SEU_TOKEN_AQUI" pelo valor real do secret BOT_TRIGGER_TOKEN
-- (mesmo valor da senha do admin) ANTES de rodar. NUNCA commite o valor real
-- neste arquivo — o repo é público (armadilha 9 do CLAUDE.md).
--
-- ⚠️ Destino inicial = "teste" nos dois jobs, de propósito (pedido do Vini):
-- pra trocar pro grupo oficial depois de validar o texto, edite o `command`
-- do job (cron.alter_job) trocando "&destino=teste" por "&destino=oficial",
-- ou rode os `cron.unschedule` + `cron.schedule` de novo com a URL nova.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Habilita as extensions (pg_cron agenda; pg_net faz o HTTP de dentro do Postgres)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Job diário às 9h de Brasília = 12h UTC (Brasil não tem mais horário de
-- verão, o offset -03:00 é fixo o ano todo — ver CLAUDE.md §13/mmGameDate).
select cron.schedule(
  'ratazana-agenda-diaria',
  '0 12 * * *',
  $$
  select net.http_get(
    url := 'https://jgnmenwtxybaqshvxyer.supabase.co/functions/v1/ratazana-cobranca?token=SEU_TOKEN_AQUI&tipo=agenda&destino=teste'
  );
  $$
);

-- 3) Job a cada 10 minutos: a função só age (e só gasta chamada de IA) se
-- algum jogo aberto estiver entrando na janela de 15-30min antes do kickoff.
select cron.schedule(
  'ratazana-ultima-chamada',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://jgnmenwtxybaqshvxyer.supabase.co/functions/v1/ratazana-cobranca?token=SEU_TOKEN_AQUI&tipo=ultima_chamada&destino=teste'
  );
  $$
);

-- ─── Utilidades (rodar avulso quando precisar) ───────────────────────────────

-- Listar os jobs agendados (nome, schedule, comando, se está ativo):
-- select jobid, jobname, schedule, command, active from cron.job order by jobid;

-- Histórico de execuções de um job (sucesso/erro, timestamps):
-- select * from cron.job_run_details where jobname = 'ratazana-agenda-diaria' order by start_time desc limit 20;

-- Pausar um job sem apagar (active = false):
-- select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'ratazana-ultima-chamada'), active := false);

-- Trocar o destino de "teste" pra "oficial" (depois de validar com o Vini):
-- select cron.alter_job(
--   job_id := (select jobid from cron.job where jobname = 'ratazana-agenda-diaria'),
--   command := $$select net.http_get(url := 'https://jgnmenwtxybaqshvxyer.supabase.co/functions/v1/ratazana-cobranca?token=SEU_TOKEN_AQUI&tipo=agenda&destino=oficial');$$
-- );

-- Apagar um job:
-- select cron.unschedule('ratazana-ultima-chamada');
