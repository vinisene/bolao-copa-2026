-- ═══════════════════════════════════════════════════════════════════════════
-- pg_cron do Robô Ratazana — Fase 4 (agenda + cobrança do dia + última chamada)
-- ═══════════════════════════════════════════════════════════════════════════
-- Auditoria original (jul/2026): pg_cron e pg_net NÃO estavam instalados neste
-- projeto (nenhuma linha em pg_extension, "relation cron.job does not exist").
-- Ou seja, até então não existia NENHUM disparo automático — a cobrança só
-- rodava se alguém acessasse a URL manualmente (ou clicasse em "Acordar o
-- Ratazana" no admin).
--
-- v1.13 separou agenda e cobrança (a agenda não fala mais de quem falta
-- palpitar) e mudou a janela da última chamada de T-30min pra T-60min. Este
-- arquivo cria os 3 jobs:
--   1) 09:00 Brasília (12:00 UTC) → ?tipo=agenda
--        painel do dia: jogos de hoje, turbo/zebra, alerta de liderança.
--   2) 09:01 Brasília (12:01 UTC) → ?tipo=cobranca_dia
--        1 minuto depois da agenda; só envia se faltar alguém palpitar (a
--        mesma trava da cobrança manual) — se todos já palpitaram, não envia
--        nada, só loga.
--   3) a cada 5 minutos → ?tipo=ultima_chamada
--        a própria função decide se algum jogo aberto está entrando na janela
--        de ~1h antes do kickoff (55-65min) E se falta alguém palpitar
--        NAQUELE jogo; na maioria das execuções não faz nada. 5 em 5 min dá
--        folga de sobra pra cobrir a janela de 10min mesmo se uma execução
--        falhar.
--
-- ⚠️ Rode isto no SQL Editor do Supabase (Table Editor/automação não fazem
-- DDL de extensão). Precisa de privilégio de owner do projeto — normal no
-- SQL Editor do dashboard.
--
-- ⚠️ SUBSTITUA "SEU_TOKEN_AQUI" pelo valor real do secret BOT_TRIGGER_TOKEN
-- (mesmo valor da senha do admin) ANTES de rodar, nos 3 jobs. NUNCA commite
-- o valor real neste arquivo — o repo é público (armadilha 9 do CLAUDE.md).
--
-- ⚠️⚠️ DESTINO = "oficial" NOS 3 JOBS (pedido explícito do Vini nesta leva —
-- antes era "teste" de propósito, como trava de segurança). A partir do
-- momento em que você rodar este arquivo, os 3 jobs passam a mandar mensagem
-- de VERDADE pro grupo da família, sozinhos, todo santo dia (agenda 9h,
-- cobrança 9h01, última chamada perto de cada jogo). Se quiser validar mais
-- um pouco no grupo de teste antes, troque "&destino=oficial" por
-- "&destino=teste" nos 3 comandos abaixo antes de rodar.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Habilita as extensions (pg_cron agenda; pg_net faz o HTTP de dentro do Postgres)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Agenda do dia — 09:00 Brasília = 12:00 UTC (Brasil não tem mais horário
-- de verão, o offset -03:00 é fixo o ano todo — ver CLAUDE.md §13/mmGameDate).
select cron.schedule(
  'ratazana-agenda-diaria',
  '0 12 * * *',
  $$
  select net.http_get(
    url := 'https://jgnmenwtxybaqshvxyer.supabase.co/functions/v1/ratazana-cobranca?token=SEU_TOKEN_AQUI&tipo=agenda&destino=oficial'
  );
  $$
);

-- 3) Cobrança do dia — 09:01 Brasília = 12:01 UTC, 1 minuto depois da agenda.
-- Só envia mensagem se faltar alguém palpitar na fase ativa; se todos já
-- palpitaram, a função não manda nada (só loga "todos palpitaram").
select cron.schedule(
  'ratazana-cobranca-diaria',
  '1 12 * * *',
  $$
  select net.http_get(
    url := 'https://jgnmenwtxybaqshvxyer.supabase.co/functions/v1/ratazana-cobranca?token=SEU_TOKEN_AQUI&tipo=cobranca_dia&destino=oficial'
  );
  $$
);

-- 4) Última chamada — a cada 5 minutos. A função só age (e só gasta chamada
-- de IA) se algum jogo aberto estiver entrando na janela de ~1h antes do
-- kickoff (55-65min) E ainda faltar alguém palpitar NAQUELE jogo específico.
select cron.schedule(
  'ratazana-ultima-chamada',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://jgnmenwtxybaqshvxyer.supabase.co/functions/v1/ratazana-cobranca?token=SEU_TOKEN_AQUI&tipo=ultima_chamada&destino=oficial'
  );
  $$
);

-- ─── Utilidades (rodar avulso quando precisar) ───────────────────────────────

-- Listar os jobs agendados (nome, schedule, comando, se está ativo):
-- select jobid, jobname, schedule, command, active from cron.job order by jobid;

-- Histórico de execuções de um job (sucesso/erro, timestamps):
-- select * from cron.job_run_details where jobname = 'ratazana-agenda-diaria' order by start_time desc limit 20;

-- Pausar um job sem apagar (active = false) — útil se quiser suspender por um dia:
-- select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'ratazana-ultima-chamada'), active := false);

-- Voltar um job pausado a ativo:
-- select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'ratazana-ultima-chamada'), active := true);

-- Trocar o destino de volta pra "teste" (ex.: se quiser suspender o envio real
-- sem desligar o job inteiro):
-- select cron.alter_job(
--   job_id := (select jobid from cron.job where jobname = 'ratazana-agenda-diaria'),
--   command := $$select net.http_get(url := 'https://jgnmenwtxybaqshvxyer.supabase.co/functions/v1/ratazana-cobranca?token=SEU_TOKEN_AQUI&tipo=agenda&destino=teste');$$
-- );

-- Apagar um job:
-- select cron.unschedule('ratazana-ultima-chamada');
