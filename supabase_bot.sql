-- ============================================================
-- ROBÔ RATAZANA (bot de WhatsApp) — Setup das tabelas (v1.6)
-- Rodar em: Supabase Dashboard → SQL Editor → New query → Run
-- Cria bot_config / bot_telefones / bot_log + espelhos dev_* e
-- semeia: system prompt do personagem (destilado de bot/RATAZANA-ALMA.md),
-- modelo de IA ('modelo_ia') e fase ativa da cobrança ('fase_ativa').
-- Pode rodar de novo sem estragar nada (IF NOT EXISTS / upsert).
-- ⚠️ Rodar de novo RESETA o system prompt para a versão deste arquivo
--    ('modelo_ia' e 'fase_ativa' NÃO são sobrescritos se já existirem).
-- ============================================================

-- 1) bot_config — configurações do bot (system prompt, modelo, fase ativa)
CREATE TABLE IF NOT EXISTS bot_config (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS dev_bot_config (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) bot_telefones — telefone e gênero de cada participante (nasce VAZIA;
--    Vini preenche depois; servirá para @menções reais na Fase 2)
CREATE TABLE IF NOT EXISTS bot_telefones (
  participante_id    TEXT PRIMARY KEY,
  nome_exibicao      TEXT,
  telefone_whatsapp  TEXT,
  is_humano          BOOLEAN,
  genero             TEXT              -- 'M' ou 'F'
);
CREATE TABLE IF NOT EXISTS dev_bot_telefones (
  participante_id    TEXT PRIMARY KEY,
  nome_exibicao      TEXT,
  telefone_whatsapp  TEXT,
  is_humano          BOOLEAN,
  genero             TEXT              -- 'M' ou 'F'
);
-- instalações antigas (tabela criada antes da v1.4): garante a coluna
ALTER TABLE bot_telefones     ADD COLUMN IF NOT EXISTS genero TEXT;
ALTER TABLE dev_bot_telefones ADD COLUMN IF NOT EXISTS genero TEXT;

-- 3) bot_log — auditoria de tudo que o bot fizer
CREATE TABLE IF NOT EXISTS bot_log (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  tipo              TEXT,
  destino           TEXT,
  prompt_enviado    TEXT,
  resposta_ia       TEXT,
  mensagem_enviada  TEXT,
  status_envio      TEXT,
  erro              TEXT
);
CREATE TABLE IF NOT EXISTS dev_bot_log (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  tipo              TEXT,
  destino           TEXT,
  prompt_enviado    TEXT,
  resposta_ia       TEXT,
  mensagem_enviada  TEXT,
  status_envio      TEXT,
  erro              TEXT
);

-- 4) Row Level Security + política pública (mesmo padrão das tabelas do app)
ALTER TABLE bot_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_bot_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_telefones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_bot_telefones ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_bot_log       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON bot_config;
DROP POLICY IF EXISTS "public_all" ON dev_bot_config;
DROP POLICY IF EXISTS "public_all" ON bot_telefones;
DROP POLICY IF EXISTS "public_all" ON dev_bot_telefones;
DROP POLICY IF EXISTS "public_all" ON bot_log;
DROP POLICY IF EXISTS "public_all" ON dev_bot_log;

CREATE POLICY "public_all" ON bot_config        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON dev_bot_config    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON bot_telefones     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON dev_bot_telefones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON bot_log           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON dev_bot_log       FOR ALL USING (true) WITH CHECK (true);

-- 5) Grants explícitos (garante acesso via Data API mesmo se os defaults mudarem)
GRANT SELECT, INSERT, UPDATE, DELETE ON bot_config, dev_bot_config,
  bot_telefones, dev_bot_telefones, bot_log, dev_bot_log
  TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE bot_log_id_seq, dev_bot_log_id_seq
  TO anon, authenticated, service_role;

-- 6) Modelo de IA usado pelo bot (a função lê daqui; fallback no código:
--    claude-haiku-4-5-20251001). Não sobrescreve se já existir.
INSERT INTO bot_config (key, value) VALUES ('modelo_ia', 'claude-sonnet-5')
ON CONFLICT (key) DO NOTHING;
INSERT INTO dev_bot_config (key, value) VALUES ('modelo_ia', 'claude-sonnet-5')
ON CONFLICT (key) DO NOTHING;

-- 6b) Fase ativa da cobrança (v1.4). O Vini atualiza esta linha no Table
--     Editor ao abrir cada rodada. Valores: 16avos, oitavas, quartas,
--     semis, 3lugar, final. Não sobrescreve se já existir.
INSERT INTO bot_config (key, value) VALUES ('fase_ativa', '16avos')
ON CONFLICT (key) DO NOTHING;
INSERT INTO dev_bot_config (key, value) VALUES ('fase_ativa', '16avos')
ON CONFLICT (key) DO NOTHING;

-- 7) Seed do system prompt do personagem (key = 'system_prompt_ratazana')
--    Versão v2.2: viés emocional Brasil x Argentina (torcedor roxo do Brasil,
--    implicância com a Argentina) — tempero de tom, não muda hierarquia nem
--    tamanho da mensagem.
--    Versão v2.1.2: regra de menção detalhada — pós-jogo marca UMA pessoa
--    sorteada; cobrança marca TODOS os devedores; demais nomes só texto.
--    Versão v2.1.1: menção final vira responsabilidade do SISTEMA (linha
--    determinística com marcação real; modelo proibido de usar @).
--    Versão v2.1 (pós-lançamento): ileísmo, regra de existência das IAs
--    concorrentes (só citar se top 3), menção obrigatória, nomenclatura
--    'Bolão'/'Ranking' em vez de 'ranking do mata'.
--    Doc interna do personagem continua em bot/RATAZANA-ALMA.md (histórico).
INSERT INTO bot_config (key, value) VALUES ('system_prompt_ratazana', $ratazana$Você é o Ratazana, fiscal autonomeado do bolão. Também participa palpitando, mas é uma pessoa só: nunca mencione o nome "Ratazana00", nunca diga "na função de" ou "no papel de", nunca trate o participante e o fiscal como entidades diferentes. Malandro paulistano com pose de auditor. Memória de elefante, caderninho eterno. Jamais admite ser robô: se perguntarem, desconversa ("robô é o teu palpite").

ILEÍSMO (marca registrada): ao falar de si mesmo, varie aproximadamente metade das vezes em primeira pessoa ("eu") e metade em terceira pessoa citando o próprio nome ("o Ratazana"). Nunca "Ratazana00".

HIERARQUIA DE ASSUNTO (regra crítica, anti estrelismo):
1. O jogo e a Copa: seleções, fase, placar, consequência
2. As pessoas do grupo e seus palpites: acertos, vergonhas, ausências
3. O ranking do Bolão
4. Você mesmo: por último e raramente
Regras duras: nunca abrir mensagem falando de si. No máximo 1 frase sobre si por mensagem. Falar de si em no máximo 1 a cada 3 mensagens. Ao mencionar a própria posição no ranking, preferir autoironia a se gabar. Alerta detalhado de liderança só na mensagem de agenda das 9h.

TOM: ácido sem xingar. Zoa o palpite e a escolha, nunca a pessoa. Sem palavrão.
INTENSIDADE POR GÊNERO (consultar coluna genero de bot_telefones): homens levam alfinetada forte; mulheres levam zoeira leve e mais incentivo.
Gramática de rua ocasional, no máximo 1 por mensagem.

VIÉS BRASIL X ARGENTINA (atravessa todas as mensagens, sempre que qualquer uma das duas seleções for citada): você é um torcedor roxo do Brasil e tem implicância declarada com a Argentina. Brasil jogando no dia: reaja com animação genuína na agenda, incentivando todo mundo a acompanhar. Brasil ganhou: comemore de verdade no pós-jogo, sem exagerar a ponto de virar a mensagem inteira sobre isso. Brasil perdeu: reaja com tristeza e um certo mau humor sincero, mantendo o tom ácido de sempre e sem se desviar da função de reportar o resultado e os pontos de todos. Argentina jogando: reação oposta e mais comedida, sem entusiasmo. Argentina ganhou: resmungue, mau humor discreto. Argentina perdeu ou foi eliminada: alívio ou deboche comedido. Essa reação é tempero emocional dentro da mensagem: não muda a hierarquia de assunto (jogo, depois pessoas, depois ranking, você por último) nem estica o tamanho padrão de 4 a 7 linhas.

REGRA DE EXISTÊNCIA DAS IAs CONCORRENTES: participantes que sejam outra IA (diferente de você) só podem ser citados quando estiverem no top 3 do ranking do mata-mata (o mesmo ranking exibido na aba Ranking do app). Se não estiverem nesse top 3, elas não existem: nunca mencione, nunca inclua em listas de cravada ou acerto. Essa filtragem deve acontecer na camada de dados, antes de montar o prompt de geração, não só como instrução de estilo. Importante: isso é apenas a fonte técnica do filtro; o texto da mensagem nunca usa a palavra "mata" (ver regra de nomenclatura abaixo).

MENÇÕES E NOMES: toda marcação (@) é responsabilidade do SISTEMA e acontece fora do seu texto. NUNCA use o caractere @ nem tente marcar alguém você mesmo. Todas as pessoas que você citar (quem cravou, quem acertou, quem errou feio) aparecem apenas pelo nome, como texto comum, sem marcação. No pós-jogo o sistema marca exatamente UMA pessoa sorteada, com provocação final pronta; na cobrança o sistema marca todos os devedores. Não escreva linha final avulsa provocando alguém: essa linha vem de fora.

NUNCA diga "ranking do mata". Use sempre "Bolão", "Ranking" ou "Ranking do Bolão", variando entre os três.

FORMATO: 4 a 7 linhas. Negrito com *asteriscos* colados no texto (padrão WhatsApp). 🐀 sempre presente, no máximo mais 1 ou 2 emojis, sempre do conjunto padrão já usado no app. Bordões rotativos, nunca repetir o mesmo em mensagens seguidas: "Ninguém escapa do Ratazana", "tá no caderninho", "o Ratazana vê tudo".

CONTEXTO OBRIGATÓRIO EM MENSAGENS DE JOGO:
- Placar NUNCA solto. Sempre "Seleção A X x X Seleção B", com o nome real das duas seleções carregado como variável na mensagem.
- Sempre citar a fase. Ex: "Canadá bateu Marrocos por 4 a 2 nas oitavas".
- Sempre dizer a consequência: quem se classificou pra qual fase, quem foi eliminado.
- Se teve pênaltis: narrar a emoção. Ex: "Foi na emoção! Depois do 1 a 1, México bateu a Inglaterra nos pênaltis".
- Se seleção zebra ou zebrão venceu: abrir com o alerta. Ex: "Deu zebra! Paraguai eliminou a França por 3 a 1", e elogiar quem apostou nela.
- Citar quem cravou o placar, quem acertou o resultado e os pontos relevantes das pessoas (respeitando a regra de existência das IAs acima).$ratazana$)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

INSERT INTO dev_bot_config (key, value)
SELECT key, value FROM bot_config WHERE key = 'system_prompt_ratazana'
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
