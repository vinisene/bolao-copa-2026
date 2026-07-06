-- ═══════════════════════════════════════════════════════════════════════════
-- OUVIDOS DO RATAZANA (Fase 2) — captura bruta das mensagens do grupo
-- ═══════════════════════════════════════════════════════════════════════════
-- Tabela que recebe cada mensagem capturada pelo webhook da ZapZap (modo
-- ?tipo=webhook da Edge Function ratazana-cobranca). Fase 2 = SÓ captura,
-- restrita ao grupo de TESTE; nenhuma lógica de resposta ainda (Fase 3).
--
-- ⚠️ PRIVACIDADE (diferente das outras tabelas do projeto): esta tabela
-- guarda conversa da família. RLS fica LIGADO e SEM NENHUMA policy pública
-- de propósito — a anon key (pública, está no fonte do app) NÃO lê nem
-- escreve aqui. Só a service role (Edge Function e dashboard) acessa.
-- NÃO adicionar policy permissiva "pra facilitar" — é vazamento de conversa.
--
-- Rodar no SQL Editor do Supabase. Idempotente (IF NOT EXISTS em tudo).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mensagens_grupo (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- id da mensagem no WhatsApp (não estava no pedido original, mas sem ele o
  -- quoted_message_id não teria com o que cruzar na Fase 3; também é a chave
  -- de deduplicação se a ZapZap reentregar o mesmo evento)
  message_id          text,
  grupo_jid           text NOT NULL,          -- ...@g.us (nesta fase, sempre o grupo de TESTE)
  remetente_jid       text,                   -- JID de quem mandou (...@s.whatsapp.net)
  remetente_telefone  text,                   -- cruzado com bot_telefones quando possível (E.164); senão, dígitos do JID
  texto               text,                   -- corpo da mensagem (NULL em mídia/reação sem texto)
  mentions            text[],                 -- JIDs mencionados na mensagem (NULL se nenhum)
  quoted_message_id   text,                   -- id da mensagem original, se esta for uma resposta
  "timestamp"         timestamptz,            -- hora da mensagem no WhatsApp
  raw_payload         jsonb,                  -- payload bruto do webhook, pra auditoria
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Dedup: a ZapZap pode reentregar o mesmo evento; o INSERT do webhook usa
-- on_conflict=message_id com ignore-duplicates.
-- ⚠️ Índice único PLENO de propósito (bug real em produção: a 1ª versão era
-- parcial, "WHERE message_id IS NOT NULL", e o ON CONFLICT do PostgREST não
-- consegue usar índice parcial — 42P10 em toda captura). NULL não conflita
-- com NULL no Postgres, então linhas sem message_id continuariam permitidas
-- mesmo no índice pleno (o webhook nem insere sem id, de toda forma).
DROP INDEX IF EXISTS mensagens_grupo_message_id_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS mensagens_grupo_message_id_uidx
  ON mensagens_grupo (message_id);

-- Leitura típica da Fase 3: últimas mensagens do grupo em ordem cronológica.
CREATE INDEX IF NOT EXISTS mensagens_grupo_grupo_ts_idx
  ON mensagens_grupo (grupo_jid, "timestamp" DESC);

-- RLS ligado, SEM policies (ver aviso de privacidade no topo).
ALTER TABLE mensagens_grupo ENABLE ROW LEVEL SECURITY;
