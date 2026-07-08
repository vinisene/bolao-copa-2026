// ═══════════════════════════════════════════════════════════════════════════
// ROBÔ RATAZANA — Edge Function "ratazana-cobranca"
// (v1.21.2 — RODADA ATIVA NO CONTEXTO DA CONVERSA (bug real, bot_log 200):
//  perguntado "qual rodada está ativa agora?", o bot respondeu "vácuo entre
//  oitavas e quartas" — ERRADO, fase_ativa já era 'quartas'. Causa raiz: o
//  prompt da conversa NUNCA recebia fase_ativa; só os resultados fechados +
//  "jogos de hoje: nenhum", e o modelo INFERIA a rodada (e inferiu errado num
//  dia sem jogo). Fix: a chamada carrega bot_config.fase_ativa junto, e o
//  contexto ganha a linha explícita "RODADA ATIVA AGORA: <fase por extenso>"
//  (separada dos jogos do dia), + item 10 da TAREFA proibindo responder "entre
//  fases"/"no vácuo"/"sem rodada" — "sem jogo hoje" é agenda, não muda a
//  rodada. Só a conversa muda (agenda/cobrança já liam fase_ativa direto).
// (v1.21.1 — MENÇÃO AO BOT: O TOKEN CRU CONFUNDIA O MODELO (caso real "Vsf
//  @61032206725341", bot_log 183, payload conferido em mensagens_grupo): a
//  menção veio ÚNICA e com o LID JÁ CADASTRADO — o resolvedor da v1.21
//  funcionou (nenhum aviso de contato desconhecido entrou no prompt) — mas o
//  texto mostrado ao modelo mantinha o token cru "@61032206725341" e o modelo
//  não tem como saber que esse número é ele mesmo (a persona não conhece o
//  próprio LID, de propósito). Sem contexto na frase, tratou o token como
//  terceiro e respondeu "esse contato eu não tenho no cadastro" por conta
//  própria (o irmão id 182, mesmo token com frase contextual, saiu certo).
//  Fix: os tokens de menção são REESCRITOS antes de entrar no prompt — bot →
//  "@Ratazana", pessoa conhecida (tel/lid em bot_telefones) → "@<nome>",
//  desconhecido de verdade fica cru (casa com o aviso já existente) — e a
//  linha "Você foi marcado" agora diz explicitamente que a marcação
//  "@Ratazana" é o próprio bot. Diagnóstico permanente: gatilho de menção
//  loga [men:<dígitos recebidos>] [idbot:<identidades conhecidas>] no
//  destino do bot_log — a próxima falha de resolução se lê direto do log.)
// (v1.21 — 4 FIXES DOS BUGS REAIS DO 1º DIA DE CONVERSA NO OFICIAL:
//  A) MENÇÃO AO PRÓPRIO BOT ≠ CONTATO DESCONHECIDO (bot_log 166): a marcação
//     do bot pode vir duplicada no payload (forma conhecida + alias de LID por
//     grupo) e o alias caía no loop de "pessoas citadas" como desconhecido —
//     agora entrada de mentions sem token "@<digitos>" visível no texto é
//     tratada como alias (nunca terceiro), o único token visível vira alias do
//     bot quando ele foi marcado por forma invisível, o cache de botIdentidades
//     só guarda conjunto COMPLETO vindo de bot_config (fallback telefone-só da
//     API não é mais cacheado) e o bot APRENDE o próprio LID por grupo nos
//     eventos fromMe (guarda anti-poisoning: sender_pn tem que bater com
//     telefone já cadastrado).
//  B) BUSCA NA WEB AUDITÁVEL E OBRIGATÓRIA PRA FATO EXTERNO (bot_log 164 —
//     artilheiro errado cravado com confiança): chamaIA agora devolve `buscas`
//     (usage.server_tool_use.web_search_requests somado) e a conversa loga
//     [busca:N] no destino; chamaIA também continua o turno em stop_reason
//     "pause_turn" (loop de tool de servidor) em vez de falhar; TAREFA item 6
//     endurecida — fato externo sem busca = proibido cravar; pedido explícito
//     de "pesquisa aí" = busca obrigatória.
//  C) FILTRO DE SANIDADE NÃO SILENCIA MAIS A CONVERSA (bot_log 168/169 — um
//     '覆' glitchado bloqueou a resposta e o grupo ficou no vácuo): modo
//     `sanitiza` em enviaEmPartes (só conversa) remove glitch pontual (≤5
//     ocorrências) e envia; corrupção maior regenera UMA vez via chamaIA com
//     aviso do glitch antes de desistir. Mensagens programadas seguem estritas.
//  D) TETO DIÁRIO SÓ PRA MENSAGENS PROGRAMADAS (bot_log 175/176 — 4 conversas
//     de manhã esgotaram o teto e agenda 9h + cobrança 9h01 foram puladas):
//     contaEnviadasHoje deixa de contar tipo `conversa` — resposta a quem
//     chamou o bot tem governança própria (teto/hora + cooldown por grupo) e
//     não compete mais com o orçamento das programadas.)
// (v1.20 — OUVIDOS + CONVERSA NO GRUPO OFICIAL: o modo webhook reconhecia só
//  GRUPO_TESTE_ID; agora reconhece os DOIS grupos, com captura (Ouvidos) e
//  conversa (Fase 3) como CONTROLES INDEPENDENTES por grupo — antes viviam
//  atrás do mesmo filtro. Teste: os dois nascem ligados, incondicional, como
//  sempre foi. Oficial: cada um exige opt-in explícito em bot_config
//  (`captura_ativa_oficial`/`conversa_ativa_oficial` = '1'; ausente/qualquer
//  outro valor = desligado, fail-closed) — dá pra ligar só a captura primeiro
//  (observar sem responder) antes de ligar a conversa. Fix junto: dentro de
//  `conversaTalvezResponder`, o `destino` gravado em bot_log tinha "teste"
//  LITERAL hardcoded (não o `destinoLabel` recebido por parâmetro) — chamar
//  a função pro oficial gravaria log dizendo "teste", quebrando em silêncio
//  a contagem de teto/cooldown por grupo (que já lê por `destinoLabel`
//  corretamente). Parâmetro renomeado `grupoTeste`→`grupoJid` pra deixar
//  claro que a função é genérica. O aviso único "o Ratazana vê tudo"
//  continua SÓ pro teste (checado explicitamente, além do claim global já
//  existente) — a estreia do oficial é um Comunicado fixo, manual.
// (v1.19 — AVANÇO AUTOMÁTICO DE FASE (fechar_placar): a cada jogo de
//  PRODUÇÃO fechado (nunca reabertura, nunca &env=dev), verificaEAvancaFaseAtiva
//  confere se isso completou a fase de bot_config.fase_ativa; se sim E a
//  próxima fase da sequência (MM_COLS) já tem TODOS os confrontos cadastrados
//  em mata_confrontos, avança fase_ativa sozinho — um passo por vez, nunca
//  "pulando" fase. Se não conseguir decidir com segurança (fase_ativa não
//  reconhecida, ou próxima fase ainda sem confrontos cadastrados), NÃO troca
//  nada: só grava um aviso pedindo confirmação manual. Todo resultado (trocou
//  OU precisa de confirmação) vira um aviso em bot_config.admin_aviso_fase,
//  que o admin-860c200f.html lê e CONSOME (apaga) no boot — banner visível na
//  próxima vez que a tela abrir, não só log que ninguém lê. FASE_CANON virou
//  constante de módulo (faseCanonica()) — compartilhada com a cobrança, que
//  antes tinha sua própria cópia local.
// (v1.18.2 — FIX DA MENÇÃO NÃO RESOLVIDA + BUSCA NA WEB (SÓ CONVERSA):
//  achado real de teste — marcaram @Jeca de verdade (mentionedJID real)
//  antes do LID dela estar aprendido em bot_telefones; sem nenhum sinal
//  disso no prompt, o bot respondeu como se a marcação fosse a pessoa da
//  mensagem citada (Claude Tonius). Agora toda menção real sem match em
//  bot_telefones vira `mencaoNaoResolvida`; se, mesmo com o fallback por
//  nome escrito, nenhuma pessoa real sobra (`contatoDesconhecido`), o
//  prompt avisa o modelo explicitamente pra nunca adivinhar/reaproveitar
//  identidade — só admitir que ainda não conhece o contato. BUSCA NA WEB:
//  tool nativa `web_search_20250305` (versão básica — compatível com o
//  fallback Haiku 4.5, que não tem a variante `_20260209`) ligada SÓ na
//  chamada do modo conversa; o modelo decide sozinho quando buscar (fato
//  de futebol/Copa fora dos dados do Bolão) via instrução na TAREFA;
//  perguntas sobre dado do Bolão continuam sem tool nenhuma envolvida.
//  Join dos blocos de texto da resposta virou "" (era "\n") — blocos
//  fatiados por citação da busca são pra colar direto, não quebrar linha.
//  Persona v2.6: humildade factual fora do bolão ganhou exceção pra fato
//  pesquisado agora (pode afirmar com confiança, não é mais "de cabeça").
//  v1.18.1 — RANKING SEM BURACOS + REGRA DAS IAs VIRA COMPORTAMENTO: achado
//  real de teste — perguntado "quem é o lanterna", o bot respondeu o 11º em
//  vez do 14º real, porque o ranking da conversa FILTRAVA as IAs fora do
//  top 3 antes de montar a lista (tirava linhas do meio, distorcendo posição
//  relativa mesmo entre humanos). Agora o ranking da conversa é SEMPRE
//  completo (14 posições reais, sem buraco) e a "regra de existência das
//  IAs concorrentes" deixou de filtrar dado — virou regra de comportamento
//  na persona: só fala de IA fora do top 3 se for perguntado direto sobre
//  ela. `pessoasCitadasBloco` também passou a varrer todo MATA_PARTS_BOT
//  (antes só varria os citáveis, então uma IA fora do top 3 citada por nome
//  nem entrava na busca). Mensagens programadas (agenda/cobrança/pós-jogo)
//  não mudaram — lá o filtro de dado permanece (nunca há "pergunta direta"
//  numa transmissão).
//  v1.18 — CALIBRAGEM DA CONVERSA (3ª rodada de testes reais, SÓ grupo de
//  TESTE): 1) RECONHECIMENTO DE PESSOAS — coluna `lid` em bot_telefones faz
//  a ponte LID→participante (remetente em grupo chega como ...@lid); match
//  do remetente por telefone OU lid; auto-aprendizado grava o lid sozinho
//  quando o payload traz sender_pn + lid juntos; senderName do payload é o
//  fallback de nome. 2) DADOS COMPLETOS — contexto da conversa ganhou o
//  ranking COMPLETO (posições reais dos citáveis; IA fora do top 3 segue
//  inexistente) e bloco de dados das PESSOAS CITADAS na mensagem (menção
//  real resolvida por telefone/lid + nome escrito com match caso/acento-
//  insensitivo e borda de palavra), com instrução "nunca mande consultar o
//  app". 3) Instrução de humildade factual fora do bolão no prompt (persona
//  v2.4 tem a regra completa). Cooldown do teste: key = 5s (reply real de
//  9s foi engolido — bot_log 121).
//  v1.17.1 — LIMITES DE CONVERSA POR GRUPO: sessão de calibragem real morreu
//  no teto fixo de 6 respostas/hora (bot_log 105-106, "teto atingido"). Teto
//  e cooldown agora são resolvidos por grupo via keys opcionais de bot_config
//  — conversa_max_hora_<destino> / conversa_cooldown_seg_<destino> — com os
//  defaults conservadores (6/h, 10s) valendo pra qualquer grupo sem key
//  (o OFICIAL nasce conservador). Grupo de teste: key = 30/hora. A contagem
//  do teto/cooldown também virou por grupo.
//  v1.17 — CONVERSA COM CONTEXTO FACTUAL + MODO PAPO (achados do 2º teste
//  real): 1) o "reply mudo" era o COOLDOWN de 30s, mais longo que o ritmo
//  natural de conversa (replies reais em 13s/22s engolidos sem log) — caiu
//  pra 10s e todo skip com gatilho disparado agora é logado em bot_log
//  (status nao_enviado); o match de citação estava certo. 2) contexto da
//  conversa ganhou data/hora de Brasília, resultados fechados dos últimos 3
//  dias (com consequência) e situação atual de Brasil/Argentina calculada da
//  chave — com instrução dura de nunca negar fato listado (o bot tinha
//  NEGADO o jogo do Brasil por não ter o resultado no contexto). 3) TAREFA
//  do modo conversa: responder primeiro o que a pessoa disse, dados do bolão
//  só se relevantes, 1-3 linhas, humor coerente com o viés Brasil×Argentina.
//  Persona v2.3: bordões com parcimônia (máx. 1/mensagem; "caderninho" raro).
//  v1.16.1 — FIX DO GATILHO DE MENÇÃO (achados do 1º teste real da Fase 3):
//  1) o campo de menções no envelope da ZapZap é "mentionedJID" (JID todo
//  maiúsculo, em content.contextInfo) — adicionado ao parser (match de chave
//  é case-sensitive; mentions vinha NULL em toda captura); 2) menção em grupo
//  chega como LID de privacidade (...@lid), NÃO como telefone — o gatilho
//  agora compara contra o CONJUNTO de identidades da instância (telefone e
//  LID, bot_config 'bot_numero_whatsapp' com vírgula — ver botIdentidades).
//  v1.16 — CONVERSA (Fase 3, versão inicial, SÓ GRUPO DE TESTE): o webhook
//  passa a responder quando (a) o bot é MENCIONADO (@) ou (b) alguém RESPONDE/
//  cita uma mensagem que o bot mandou. Todo envio do bot registra o message_id
//  devolvido pela ZapZap em bot_mensagens_enviadas (base do gatilho b).
//  Resposta gerada pela persona com contexto (quem falou, gênero, posição no
//  ranking, jogos do dia). Anti-cascata: teto de 6 respostas/hora + cooldown
//  de 30s por pessoa + anti-eco (fromMe, remetente==instância), fail-closed.
//  SEM busca na web e SEM ficha relacional ainda. Sem gatilho → só arquiva.
//  v1.15 — BLINDAGEM DA ÚLTIMA CHAMADA: idempotência vira claim-then-act —
//  reserva atômica (key uc_<dd-mm>_<jogo>_<destino> em bot_config, INSERT
//  ignore-duplicates) ANTES de chamar a IA; quem não cria a key desiste na
//  hora, e falha de envio devolve a key pro próximo tick. Elimina a corrida
//  cron×manual e o fail-open do check em bot_log. Aviso dos Ouvidos
//  refatorado pros mesmos helpers (claimUmaVez/liberaClaim).
//  v1.14 — OUVIDOS (Fase 2): captura bruta das mensagens do grupo de TESTE.
//  Novo modo "webhook" recebe os eventos da ZapZap e grava cada mensagem de
//  terceiros (nunca as do próprio bot) na tabela mensagens_grupo — texto,
//  mentions, mensagem citada, timestamp e payload bruto. EXCLUSIVO do grupo
//  de teste nesta fase; o oficial é ignorado. Na primeira captura da história
//  sai um aviso único in character ("o Ratazana vê tudo") com trava atômica
//  em bot_config. Novo utilitário "configurar_webhook" auto-registra a URL
//  de captura na instância ZapZap. NENHUMA resposta a menção/citação ainda —
//  isso é a Fase 3.
//  v1.13: agenda e cobrança separadas de vez — a agenda das 9h NÃO fala mais
//  de quem falta palpitar (só jogos/turbo/zebra/liderança); quem falta
//  palpitar virou trabalho exclusivo de "cobranca_dia" (novo tipo, mesmo
//  pipeline da cobrança manual, pensado pra rodar 1min depois da agenda via
//  pg_cron, com a MESMA trava "só cobra se faltar alguém" que a cobrança
//  manual já tinha). "ultima_chamada" mudou a janela de T-30min pra T-60min
//  (55-65min antes do kickoff) e passou a só enviar se faltar alguém NAQUELE
//  jogo (antes mandava uma mensagem de "todo mundo pronto" mesmo sem
//  pendência). Persona ganhou o viés emocional Brasil×Argentina.
//  v1.12: dois modos novos pensados pra pg_cron — "agenda" (painel do dia às
//  9h + único alerta de liderança detalhado) e "ultima_chamada" (T-30min por
//  jogo, checagem a cada ~10min); teto diário de mensagens automáticas
//  (4 com jogo / 2 sem jogo) e idempotência por dia+destino[+jogo] pra nenhum
//  dos dois jobs duplicar envio ou estourar o teto — NÃO se aplica a
//  cobrança/fim_de_jogo/enviar_texto, que continuam gatilho manual do admin.
//  v1.11: cobrança marca TODOS os devedores com menção real; stop_reason
//  max_tokens vira falha bloqueante (teto 4000/8000 — thinking do sonnet-5
//  divide o mesmo teto); filtro de sanidade invertido pra reprovação por
//  script (emojis comuns passam). v1.10: menção obrigatória determinística
//  (@<numero> + campo mentions). v1.9: filtro de sanidade + parser JID/Name;
//  v1.8: destino explícito + preview/direção + enviar_texto; v1.7:
//  fechar_placar via service role)
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ TODO envio exige &destino=teste|oficial (sem default). Grupo oficial =
// secret GRUPO_OFICIAL_ID; nesta fase NENHUM envio automático vai pro oficial:
// tudo passa por ação do admin.
//
// Uso (navegador ou curl):
//   GET https://<projeto>.supabase.co/functions/v1/ratazana-cobranca?token=XXX&destino=teste
//     → gera a cobrança de quem falta palpitar e envia ao grupo escolhido
//   ...&force=1         → se ninguém falta, envia "todo mundo em dia" (teste)
//   ...&listar_grupos=1 → NÃO envia nada; lista os grupos do WhatsApp da
//                         instância com nome + ID ...@g.us (normalizado em
//                         "grupos" + resposta crua), pra preencher os secrets
//   ...&tipo=fim_de_jogo&jogo=<id>[&env=dev][&preview=1][&pessoa=<pid>][&direcao=<txt>]
//                       → comentário de fim de jogo. preview=1 GERA E DEVOLVE
//                         sem enviar (fluxo do admin: "Acordar o Ratazana");
//                         sem preview, exige &destino=. pessoa/direcao são
//                         direção de cena (nunca copiadas literalmente).
//   POST ...&tipo=enviar_texto&destino=teste|oficial  body JSON {texto}
//                       → envia texto PRONTO (preview aprovado / msg inaugural)
//   ...&tipo=fechar_placar&jogo=<id>&finished=1&real_a=N&real_b=N
//       [&classificado=A|B][&env=dev] → GRAVA o placar final (única via de
//       escrita; roda com service role). finished=0 reabre (só destrava).
//       Fechar NUNCA envia mensagem (o comentário é ação separada do admin).
//   ...&tipo=agenda&destino=teste|oficial[&env=dev][&force=1]
//       → AGENDA DO DIA (pg_cron 1x/dia, ~9h): jogos de hoje + turbo/zebra +
//       alerta de liderança detalhado. NÃO fala de quem falta palpitar (isso
//       é só da cobrança, abaixo). Sem jogo hoje: não envia nada. Idempotente
//       (1x/dia por destino, força com &force=1) e sujeito ao teto diário.
//   ...&tipo=cobranca_dia&destino=teste|oficial[&env=dev][&force=1]
//       → COBRANÇA DO DIA (pg_cron 1x/dia, ~1min depois da agenda): MESMO
//       pipeline da cobrança manual (mesmos dados, mesma trava "só cobra se
//       faltar alguém" — sem force, ninguém devendo = não envia nada, só
//       loga). Diferença: governança extra (idempotente 1x/dia por destino +
//       teto diário), igual aos outros modos automáticos.
//   ...&tipo=ultima_chamada&destino=teste|oficial[&env=dev][&force=1]
//       → ÚLTIMA CHAMADA (pg_cron a cada ~5-10min): dispara só pros jogos que
//       estão entrando na janela de ~1h antes do kickoff (55-65min) E que
//       ainda tenham alguém sem palpitar naquele jogo específico (se todos já
//       palpitaram, não envia nada); idempotente por jogo (não repete o mesmo
//       jogo no mesmo dia) e sujeito ao teto.
//   POST ...&tipo=webhook   → OUVIDOS (Fase 2): endpoint que a ZapZap chama a
//       cada evento da instância. Grava mensagens de terceiros do grupo de
//       TESTE em mensagens_grupo (schema: supabase_ouvidos.sql); tudo que não
//       for do grupo de teste (ou for do próprio bot) é ignorado. Não é
//       chamado por humano: a URL (com token) é registrada na ZapZap pelo
//       modo abaixo. CONVERSA (Fase 3, v1.16): depois de arquivar, responde
//       se o bot foi mencionado ou se a mensagem cita um envio do bot —
//       ver seção "Conversa" (gatilhos, contexto, teto/cooldown anti-cascata).
//   ...&tipo=configurar_webhook → registra na instância ZapZap a URL de
//       captura acima (a função monta a própria URL com o próprio token).
//       Chamar UMA vez; devolve a config anterior e a resposta da ZapZap.
//
// Dados: SEMPRE tabelas de PRODUÇÃO (mata_confrontos / mata_palpites / bot_config).
// Modelo de IA: lido de bot_config key 'modelo_ia' (fallback Haiku 4.5).
// Fase ativa: bot_config key 'fase_ativa' (ex.: '16avos'). A cobrança NUNCA
// inclui jogo de outra fase; a próxima fase entra no máximo como PRÉVIA
// explicitamente não-cobrável. Resposta longa da IA (blocos "---") vira até
// 3 mensagens sequenciais no WhatsApp.
// A função PRÉ-CALCULA tudo (multiplicador final, zebra, palpites públicos,
// último jogo encerrado, ranking) e entrega pronto no prompt: a IA nunca calcula.
// Lógica portada do app (index.html): mmNextGamesHTML, mmHasFullPred, mmScore,
// mataStats, MM_PHASE_MULT/MM_TURBO/MM_ZEBRA/MM_BRACKET/MM_COLS/MM_AGENDA.
// ⚠️ Quando o Vini definir novos turbos/zebras no index.html, replicar AQUI.
// Jogos de grupos (g01–g72, incluindo g01–g03) nunca entram: só mata_*.
// WhatsApp: ZapZap API (docs oficiais: https://api.zapzapapi.com/docs)
//   POST {ZAPZAP_ENDPOINT_BASE}/send/text  body {number, text}
//   headers x-api-key / x-api-secret. number aceita ID de grupo (@g.us).
// Auditoria: toda execução do pipeline grava linha em bot_log.
// KAYFABE: o pid 'claude' é o perfil "Ratazana00" = o PRÓPRIO personagem.
// Ele nunca entra em "faltam palpitar" (é máquina) e o palpite pendente dele
// nunca é mencionado nos dados.
// ⚠️ Deploy com "Verify JWT" DESLIGADO — a proteção é o ?token= (BOT_TRIGGER_TOKEN).
// ═══════════════════════════════════════════════════════════════════════════

const MODELO_FALLBACK = "claude-haiku-4-5-20251001";

// ─── Participantes do mata (ids = coluna pid de mata_palpites) ───────────────
// 'claude' era exibido como "Claude Vini"; agora é "Ratazana00", o próprio
// personagem (a renomeação visual no app será feita em outra sessão).
// Máquinas NUNCA são cobradas. Pares que nunca se confundem: pepe ≠ pepe_ia,
// vinicius ≠ claude (Ratazana00), tonius ≠ claudio, jessica ≠ chatgpt, leo ≠ chatgptleo.
const MATA_PARTS_BOT = [
  { id: "jessica", nome: "Jeca", tipo: "humano" },
  { id: "tonius", nome: "Tonius", tipo: "humano" },
  { id: "leo", nome: "Leo", tipo: "humano" },
  { id: "pepe", nome: "Pepe", tipo: "humano" },
  { id: "du", nome: "Du", tipo: "humano" },
  { id: "mano", nome: "Mano", tipo: "humano" },
  { id: "yuri", nome: "Yuri", tipo: "humano" },
  { id: "vinicius", nome: "Vini", tipo: "humano" },
  { id: "gi", nome: "Gi", tipo: "humano" },
  { id: "chatgpt", nome: "ChatGPT Jeca", tipo: "maquina" },
  { id: "claudio", nome: "Claude Tonius", tipo: "maquina" },
  { id: "chatgptleo", nome: "ChatGPT Leo", tipo: "maquina" },
  { id: "claude", nome: "Ratazana00", tipo: "maquina" },
  { id: "pepe_ia", nome: "Pepe IA", tipo: "maquina" },
];
const HUMANOS = MATA_PARTS_BOT.filter((p) => p.tipo === "humano");
const RATAZANA_ID = "claude";

// ─── Agenda dos 32 jogos (cópia fiel de MM_AGENDA do index.html; hora de Brasília)
const MM_AGENDA: Record<string, { dt: string; tm: string; ven: string }> = {
  r32_1: { dt: "28/06", tm: "16h", ven: "Los Angeles" },
  r32_2: { dt: "29/06", tm: "14h", ven: "Houston" },
  r32_3: { dt: "29/06", tm: "17h30", ven: "Boston" },
  r32_4: { dt: "29/06", tm: "22h", ven: "Monterrey" },
  r32_5: { dt: "30/06", tm: "14h", ven: "Dallas" },
  r32_6: { dt: "30/06", tm: "18h", ven: "Nova Jérsei" },
  r32_7: { dt: "30/06", tm: "22h", ven: "Cidade do México" },
  r32_8: { dt: "01/07", tm: "13h", ven: "Atlanta" },
  r32_9: { dt: "01/07", tm: "17h", ven: "Seattle" },
  r32_10: { dt: "01/07", tm: "21h", ven: "San Francisco" },
  r32_11: { dt: "02/07", tm: "16h", ven: "Los Angeles" },
  r32_12: { dt: "02/07", tm: "20h", ven: "Toronto" },
  r32_13: { dt: "03/07", tm: "00h", ven: "Vancouver" },
  r32_14: { dt: "03/07", tm: "15h", ven: "Dallas" },
  r32_15: { dt: "03/07", tm: "19h", ven: "Miami" },
  r32_16: { dt: "03/07", tm: "22h30", ven: "Kansas City" },
  r16_1: { dt: "04/07", tm: "14h", ven: "Houston" },
  r16_2: { dt: "04/07", tm: "18h", ven: "Philadelphia" },
  r16_3: { dt: "05/07", tm: "17h", ven: "Nova Jérsei" },
  r16_4: { dt: "05/07", tm: "21h", ven: "Cidade do México" },
  r16_5: { dt: "06/07", tm: "16h", ven: "Dallas" },
  r16_6: { dt: "06/07", tm: "21h", ven: "Seattle" },
  r16_7: { dt: "07/07", tm: "13h", ven: "Atlanta" },
  r16_8: { dt: "07/07", tm: "17h", ven: "Vancouver" },
  qf_1: { dt: "09/07", tm: "17h", ven: "Boston" },
  qf_2: { dt: "10/07", tm: "16h", ven: "Los Angeles" },
  qf_3: { dt: "11/07", tm: "18h", ven: "Miami" },
  qf_4: { dt: "11/07", tm: "22h", ven: "Kansas City" },
  sf_1: { dt: "14/07", tm: "16h", ven: "Dallas" },
  sf_2: { dt: "15/07", tm: "16h", ven: "Atlanta" },
  tp_1: { dt: "18/07", tm: "18h", ven: "Miami" },
  fin_1: { dt: "19/07", tm: "16h", ven: "Nova Jérsei" },
};

// ─── Turbos ×2 (cópia de MM_TURBO do index.html) ─────────────────────────────
const MM_TURBO = new Set([
  "r32_3", "r32_7", "r32_8", "r32_12", "r32_14",
  "r16_2", "r16_5", "r16_8", "qf_1", "qf_3", "sf_2",
]);

// ─── Multiplicador por fase + colunas (cópias de MM_PHASE_MULT/MM_COLS) ──────
const MM_PHASE_MULT: Record<string, number> = {
  "32avos": 1, oitavas: 1.25, quartas: 1.5, semis: 1.75, "3lugar": 1.75, final: 4,
};
const MM_COLS: { key: string; ids: string[] }[] = [
  { key: "32avos", ids: ["r32_3", "r32_6", "r32_1", "r32_4", "r32_12", "r32_11", "r32_10", "r32_9", "r32_2", "r32_5", "r32_7", "r32_8", "r32_15", "r32_14", "r32_13", "r32_16"] },
  { key: "oitavas", ids: ["r16_2", "r16_1", "r16_5", "r16_6", "r16_3", "r16_4", "r16_7", "r16_8"] },
  { key: "quartas", ids: ["qf_1", "qf_2", "qf_3", "qf_4"] },
  { key: "semis", ids: ["sf_1", "sf_2"] },
  { key: "3lugar", ids: ["tp_1"] },
  { key: "final", ids: ["fin_1"] },
];
const PH_LABEL: Record<string, string> = {
  "32avos": "16 avos", oitavas: "Oitavas", quartas: "Quartas",
  semis: "Semis", "3lugar": "3º lugar", final: "Final",
};
function mmPhaseKeyOf(id: string) {
  const col = MM_COLS.find((c) => c.ids.includes(id));
  return col ? col.key : "32avos";
}
// Normalização de variantes do valor cru de bot_config.fase_ativa pra uma
// chave de MM_COLS (v1.4; hoisted em v1.19 pra ser compartilhado com o
// avanço automático de fase, além da cobrança).
const FASE_CANON: Record<string, string> = {
  "16avos": "32avos", "32avos": "32avos",
  oitavas: "oitavas", "8as": "oitavas",
  quartas: "quartas", "4as": "quartas",
  semis: "semis", semifinal: "semis", semifinais: "semis",
  "3lugar": "3lugar", terceirolugar: "3lugar",
  final: "final",
};
function faseCanonica(raw: string): string | null {
  return FASE_CANON[String(raw || "").trim().toLowerCase().replace(/\s+/g, "").replace(/º/g, "")] || null;
}

// ─── Zebras (cópia de MM_ZEBRA do index.html; azarao = lado A ou B) ──────────
// Novas fases entram aqui quando o Vini definir (sempre espelhando o index.html).
const MM_ZEBRA: Record<string, { tipo: "zebra" | "zebrao"; azarao: "A" | "B" }> = {
  r32_3: { tipo: "zebra", azarao: "B" },   // Alemanha × Paraguai      → azarão: Paraguai
  r32_6: { tipo: "zebra", azarao: "B" },   // França × Suécia          → azarão: Suécia
  r32_8: { tipo: "zebrao", azarao: "B" },  // Inglaterra × RD Congo    → azarão: RD Congo
  r32_11: { tipo: "zebra", azarao: "B" },  // Espanha × Áustria        → azarão: Áustria
  r32_15: { tipo: "zebrao", azarao: "B" }, // Argentina × Cabo Verde   → azarão: Cabo Verde
  // OITAVAS
  r16_2: { tipo: "zebrao", azarao: "A" },  // Paraguai × França        → azarão: Paraguai (lado A)
  r16_7: { tipo: "zebra", azarao: "B" },   // Argentina × Egito        → azarão: Egito (lado B)
  // QUARTAS (odds Estrelabet 07/07/2026; todas ZEBRA, nenhum zebrão)
  qf_1: { tipo: "zebra", azarao: "A" },    // Marrocos × França        → azarão: Marrocos (odd 6.70, ~14,7%)
  qf_2: { tipo: "zebra", azarao: "B" },    // Espanha × Bélgica        → azarão: Bélgica (odd 5.98, ~16,5%)
  qf_3: { tipo: "zebra", azarao: "A" },    // Noruega × Inglaterra     → azarão: Noruega (odd 4.28, ~23,0%)
  qf_4: { tipo: "zebra", azarao: "B" },    // Argentina × Suíça        → azarão: Suíça (odd 5.46, ~18,1%)
};
// deno-lint-ignore no-explicit-any
type Conf = any;
function mmZebra(c: Conf) {
  return MM_ZEBRA[c && c.id] || null;
}

// ─── Chave (cópia de MM_BRACKET do index.html): quem alimenta cada vaga ──────
type Feeder = { g: string; take: "win" | "lose" };
const MM_BRACKET: Record<string, { phase: string; feeders?: { A: Feeder; B: Feeder } }> = (() => {
  const b: Record<string, { phase: string; feeders?: { A: Feeder; B: Feeder } }> = {};
  const W = (g: string): Feeder => ({ g, take: "win" });
  const L = (g: string): Feeder => ({ g, take: "lose" });
  for (let i = 1; i <= 16; i++) b["r32_" + i] = { phase: "32 avos" };
  b["r16_1"] = { phase: "Oitavas", feeders: { A: W("r32_1"), B: W("r32_4") } };
  b["r16_2"] = { phase: "Oitavas", feeders: { A: W("r32_3"), B: W("r32_6") } };
  b["r16_3"] = { phase: "Oitavas", feeders: { A: W("r32_2"), B: W("r32_5") } };
  b["r16_4"] = { phase: "Oitavas", feeders: { A: W("r32_7"), B: W("r32_8") } };
  b["r16_5"] = { phase: "Oitavas", feeders: { A: W("r32_12"), B: W("r32_11") } };
  b["r16_6"] = { phase: "Oitavas", feeders: { A: W("r32_10"), B: W("r32_9") } };
  b["r16_7"] = { phase: "Oitavas", feeders: { A: W("r32_15"), B: W("r32_14") } };
  b["r16_8"] = { phase: "Oitavas", feeders: { A: W("r32_13"), B: W("r32_16") } };
  b["qf_1"] = { phase: "Quartas", feeders: { A: W("r16_1"), B: W("r16_2") } };
  b["qf_2"] = { phase: "Quartas", feeders: { A: W("r16_5"), B: W("r16_6") } };
  b["qf_3"] = { phase: "Quartas", feeders: { A: W("r16_3"), B: W("r16_4") } };
  b["qf_4"] = { phase: "Quartas", feeders: { A: W("r16_7"), B: W("r16_8") } };
  b["sf_1"] = { phase: "Semis", feeders: { A: W("qf_1"), B: W("qf_2") } };
  b["sf_2"] = { phase: "Semis", feeders: { A: W("qf_3"), B: W("qf_4") } };
  b["tp_1"] = { phase: "3º lugar", feeders: { A: L("sf_1"), B: L("sf_2") } };
  b["fin_1"] = { phase: "Final", feeders: { A: W("sf_1"), B: W("sf_2") } };
  return b;
})();

// ─── Helpers portados do index.html (mesma lógica, mesmo comportamento) ──────
function mmIsTest(c: Conf) {
  return /\[TESTE\]/i.test((c.team_a || "") + " " + (c.team_b || "") + " " + (c.phase || ""));
}
// palpite completo: dois gols preenchidos e, se for empate, quem passa marcado
function mmHasFullPred(pal: Conf) {
  return !!(pal && pal.gols_a != null && pal.gols_b != null && (pal.gols_a !== pal.gols_b || pal.quem_passa));
}
function mmInfo(c: Conf) {
  const a = MM_AGENDA[c.id] || { dt: "", tm: "", ven: "" };
  return { dt: c.dt || a.dt || "", tm: c.tm || a.tm || "", ven: c.venue || a.ven || "" };
}
// No app o Date nasce no fuso do navegador (Brasília). Aqui o runtime é UTC,
// então o offset -03:00 vai explícito (Brasil não tem mais horário de verão).
function mmGameDate(c: Conf): Date | null {
  const i = mmInfo(c);
  if (!i.dt) return null;
  const [dd, mm] = i.dt.split("/").map(Number);
  const h = i.tm ? parseInt(i.tm) || 0 : 0;
  const mi = (i.tm && i.tm.split("h")[1]) ? parseInt(i.tm.split("h")[1]) : 0;
  const p = (n: number) => String(n).padStart(2, "0");
  return new Date(`2026-${p(mm)}-${p(dd)}T${p(h)}:${p(mi)}:00-03:00`);
}
// Quem AVANÇOU de verdade: placar real (empate → pênaltis via classificado)
function mmRealWinner(c: Conf): "A" | "B" | null {
  if (!c || c.real_a == null || c.real_b == null) return null;
  if (c.real_a > c.real_b) return "A";
  if (c.real_b > c.real_a) return "B";
  return (c.classificado === "A" || c.classificado === "B") ? c.classificado : null;
}
// Resolve o nome dos times de uma vaga pela chave + vencedores reais
function makeResolver(confrontos: Conf[]) {
  const confMap = new Map<string, Conf>(confrontos.map((c: Conf) => [c.id, c]));
  const resolveSide = (slotId: string, side: "A" | "B"): { name: string } | null => {
    const slot = MM_BRACKET[slotId];
    if (slot && slot.feeders) {
      const f = slot.feeders[side];
      return outcome(f.g, f.take);
    }
    const c = confMap.get(slotId);
    if (!c) return null;
    const nm = side === "A" ? c.team_a : c.team_b;
    return nm ? { name: nm } : null;
  };
  const outcome = (gameId: string, take: "win" | "lose"): { name: string } | null => {
    const w = mmRealWinner(confMap.get(gameId));
    if (w == null) return null;
    const side = take === "win" ? w : (w === "A" ? "B" : "A");
    return resolveSide(gameId, side);
  };
  return (c: Conf) => ({ a: resolveSide(c.id, "A"), b: resolveSide(c.id, "B") });
}
// Consequência de um jogo, derivada da chave: pra onde vai o vencedor (take:'win')
// e, se existir vaga de perdedor (semis → 3º lugar), pra onde vai o perdedor.
function mmConsequencia(gameId: string): { winPhase: string | null; losePhase: string | null } {
  let winPhase: string | null = null, losePhase: string | null = null;
  for (const slot of Object.values(MM_BRACKET)) {
    if (!slot.feeders) continue;
    for (const side of ["A", "B"] as const) {
      const f = slot.feeders[side];
      if (f.g !== gameId) continue;
      if (f.take === "win") winPhase = slot.phase;
      else losePhase = slot.phase;
    }
  }
  return { winPhase, losePhase };
}

// ─── Pontuação do mata (porta fiel de mmScore/calcMataPts/mataStats) ─────────
// Base que MULTIPLICA (fase × turbo): 5 resultado · 1 gol A · 1 gol B ·
// 2 saldo (só com vencedor) · 3 placar exato · 4 pênaltis (empate + quem passa).
// Zebra é FIXO (+3/+5), somado no fim, não multiplica.
function mmScore(pal: Conf, c: Conf) {
  if (!pal || pal.gols_a == null || pal.gols_b == null) return null;
  if (c.real_a == null || c.real_b == null) return null;
  const pa = +pal.gols_a, pb = +pal.gols_b, ra = +c.real_a, rb = +c.real_b;
  const realDraw = ra === rb;
  let base = 0;
  const pres = pa > pb ? "A" : pa < pb ? "B" : "E";
  const rres = ra > rb ? "A" : ra < rb ? "B" : "E";
  if (pres === rres) base += 5;
  if (pa === ra) base += 1;
  if (pb === rb) base += 1;
  if (!realDraw && (pa - pb) === (ra - rb)) base += 2;
  const exato = pa === ra && pb === rb;
  if (exato) base += 3;
  if (realDraw && pa === pb && pal.quem_passa && c.classificado && pal.quem_passa === c.classificado) base += 4;
  const phaseKey = mmPhaseKeyOf(c.id);
  const phaseMult = MM_PHASE_MULT[phaseKey] || 1;
  const turbo = MM_TURBO.has(c.id);
  const partida = Math.round(base * phaseMult * (turbo ? 2 : 1) * 100) / 100;
  let zebra = 0;
  let zebraTipo: string | null = null;
  const z = mmZebra(c);
  if (z) {
    const rw = mmRealWinner(c);
    const palAdv = pa > pb ? "A" : pa < pb ? "B" : (pal.quem_passa || null);
    if (rw && rw === z.azarao && palAdv === z.azarao) {
      zebra = z.tipo === "zebrao" ? 5 : 3;
      zebraTipo = z.tipo;
    }
  }
  return { total: Math.round((partida + zebra) * 100) / 100, exato, base, phaseKey, phaseMult, turbo, partida, zebra, zebraTipo };
}
function calcMataPts(pal: Conf, c: Conf) {
  const s = mmScore(pal, c);
  return s ? s.total : null;
}
// ─── Regra de existência das IAs concorrentes (persona v2.1) ─────────────────
// Uma IA que não seja você (RATAZANA_ID) só é citável no texto quando estiver
// no TOP 3 do ranking geral do mata-mata (o mesmo ranking da aba Ranking do
// app, misturando humanos e máquinas). Fora do top 3, ela "não existe": nunca
// aparece em Pontuaram/Cravaram/Acertaram/zebra/palpites públicos. Isso é
// filtro de DADOS (antes do prompt), não só instrução de estilo pra IA —
// participantesCitaveis() devolve o subconjunto visível de MATA_PARTS_BOT;
// usar esse array (nunca o MATA_PARTS_BOT cru) em toda lista nome-a-nome.
function participantesCitaveis(rank: { p: Conf }[]) {
  const top3 = new Set(rank.slice(0, 3).map((r) => r.p.id));
  return MATA_PARTS_BOT.filter((p) => p.tipo !== "maquina" || p.id === RATAZANA_ID || top3.has(p.id));
}
// Estatísticas do mata por participante (ignora TESTE e não finalizados)
function mataStats(pid: string, confrontos: Conf[], PAL: Record<string, Record<string, Conf>>) {
  let total = 0, rHits = 0, eHits = 0, played = 0;
  for (const c of confrontos) {
    if (mmIsTest(c) || !c.finished || c.real_a == null || c.real_b == null) continue;
    const pal = PAL[c.id]?.[pid];
    const pts = calcMataPts(pal, c);
    if (pts == null) continue;
    total += pts;
    played++;
    const ra = +c.real_a, rb = +c.real_b, pa = +pal.gols_a, pb = +pal.gols_b;
    if ((pa > pb ? "A" : pa < pb ? "B" : "E") === (ra > rb ? "A" : ra < rb ? "B" : "E")) rHits++;
    if (pa === ra && pb === rb) eHits++;
  }
  return { total: Math.round(total * 100) / 100, rHits, eHits, played };
}

// ─── Utilidades de texto/data (pt-BR, horário de Brasília) ───────────────────
function fmtPts(n: number) {
  return ("" + (Math.round(n * 100) / 100)).replace(".", ",");
}
function diaSemana(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" })
    .format(d).replace(".", "");
}
function agoraBrasilia() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(new Date());
}
// Única função que monta listas de nomes pro prompt — usar sempre esta, nunca
// concatenar manualmente (evita nome colado sem separador). Filtra vazios (uma
// string "" na lista quebraria o "X, , Y" ou o " e " sem nome antes).
function listaNomes(nomes: string[]) {
  const validos = nomes.map((n) => n.trim()).filter(Boolean);
  if (validos.length <= 1) return validos[0] || "";
  return validos.slice(0, -1).join(", ") + " e " + validos[validos.length - 1];
}
// Rede de segurança de tamanho: parte acima de ~1100 caracteres é quebrada em
// pedaços de até ~900, cortando só em quebra de parágrafo (nunca no meio da
// frase). Evita o "Ler mais" do WhatsApp mesmo se a IA não usar blocos "---".
function quebraLonga(texto: string, alvo = 900): string[] {
  if (texto.length <= alvo * 1.25) return [texto];
  const paras = texto.split(/\n\n+/);
  const out: string[] = [];
  let atual = "";
  for (const p of paras) {
    if (atual && (atual.length + 2 + p.length) > alvo) {
      out.push(atual);
      atual = p;
    } else {
      atual = atual ? atual + "\n\n" + p : p;
    }
  }
  if (atual) out.push(atual);
  return out;
}

// ─── Supabase via REST (service role; só produção) ───────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function sbHeaders(): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}
async function sbGet(pathQS: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathQS}`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`Supabase GET ${pathQS} → HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
// Grava auditoria em bot_log; NUNCA lança erro (pra não derrubar a função)
async function botLog(row: Record<string, unknown>) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bot_log`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (!r.ok) console.error("bot_log falhou:", r.status, (await r.text()).slice(0, 300));
  } catch (e) {
    console.error("bot_log falhou:", e);
  }
}
// Upsert genérico em bot_config (cria a key se não existir, sobrescreve se
// existir) — usado pelo avanço automático de fase pra gravar tanto o novo
// valor de fase_ativa quanto o aviso que o admin lê. Nunca lança erro.
async function upsertBotConfig(key: string, value: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/bot_config?on_conflict=key`, {
    method: "POST",
    headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ key, value }]),
  }).catch(() => {});
}

// ─── Avanço automático de fase (v1.19) ───────────────────────────────────────
// Chamado depois de FECHAR um jogo de produção (nunca em reabertura, nunca em
// &env=dev). Verifica se isso completou a fase hoje configurada em
// bot_config.fase_ativa; se sim E a próxima fase da sequência (MM_COLS) já
// tem TODOS os confrontos cadastrados em mata_confrontos, avança fase_ativa
// sozinho — um passo por vez, nunca "pulando" fase. Se não conseguir decidir
// com segurança (fase_ativa atual não reconhecida, ou próxima fase ainda sem
// confrontos cadastrados), NÃO troca nada: só grava um aviso pedindo
// confirmação manual. O aviso (de qualquer tipo) fica em bot_config.
// admin_aviso_fase pro admin mostrar e consumir na próxima vez que abrir a
// tela (§ "Boot" do admin-860c200f.html). Nunca lança erro — uma falha aqui
// não pode derrubar o fechar_placar, que já gravou o placar com sucesso.
async function verificaEAvancaFaseAtiva() {
  try {
    const [cfgRows, confrontos] = await Promise.all([
      sbGet("bot_config?key=eq.fase_ativa&select=value"),
      sbGet("mata_confrontos?select=id,finished"),
    ]);
    const faseRaw = (Array.isArray(cfgRows) && cfgRows[0]?.value) || "";
    const faseAtual = faseCanonica(faseRaw);
    if (!faseAtual) {
      await upsertBotConfig("admin_aviso_fase", JSON.stringify({
        tipo: "ambiguo",
        motivo: `bot_config 'fase_ativa' está com um valor não reconhecido ("${faseRaw}") — confira e corrija manualmente.`,
        em: new Date().toISOString(),
      }));
      return;
    }
    const idxAtual = MM_COLS.findIndex((c) => c.key === faseAtual);
    const colAtual = MM_COLS[idxAtual];
    if (!colAtual) return; // não deveria acontecer: faseCanonica só devolve chaves que existem em MM_COLS

    const finishedById = new Map<string, boolean>(
      (confrontos as Conf[]).map((c: Conf) => [c.id, c.finished === true]),
    );
    const faseCompleta = colAtual.ids.every((id) => finishedById.get(id) === true);
    if (!faseCompleta) return; // ainda tem jogo aberto na fase atual — caso normal, nada a fazer

    const proxima = MM_COLS[idxAtual + 1];
    if (!proxima) return; // já é a última fase (final) — fim do torneio, sem próxima fase pra avançar

    const proximaCadastrada = proxima.ids.every((id) => finishedById.has(id));
    if (!proximaCadastrada) {
      await upsertBotConfig("admin_aviso_fase", JSON.stringify({
        tipo: "ambiguo",
        motivo: `Todos os jogos de ${PH_LABEL[faseAtual]} terminaram, mas ${PH_LABEL[proxima.key]} ainda não está com todos os confrontos cadastrados no banco — confira e troque fase_ativa manualmente quando estiver pronto.`,
        em: new Date().toISOString(),
      }));
      return;
    }

    await upsertBotConfig("fase_ativa", proxima.key);
    await upsertBotConfig("admin_aviso_fase", JSON.stringify({
      tipo: "trocou", de: faseAtual, para: proxima.key, em: new Date().toISOString(),
    }));
    await botLog({
      tipo: "fase_ativa_auto",
      destino: `${faseAtual} -> ${proxima.key}`,
      status_envio: "ok",
      mensagem_enviada: `Todos os jogos de ${PH_LABEL[faseAtual]} fechados; fase_ativa avançou automaticamente pra ${PH_LABEL[proxima.key]}.`,
    });
  } catch (e) {
    await botLog({
      tipo: "fase_ativa_auto", destino: "(erro)", status_envio: "erro",
      erro: String((e as Error)?.message || e),
    });
  }
}

// ─── Governança de volume diário (Fase 4 — agenda 9h / última chamada) ──────
// Teto de mensagens automáticas por dia: protege o grupo de ser inundado
// pelos novos jobs (agenda + última chamada). NÃO se aplica a cobrança/
// fim_de_jogo/enviar_texto (ação explícita do admin ou evento real de jogo,
// naturalmente espaçados). Faixas pedidas pelo Vini: 3-4 com jogo, 1-2 sem —
// uso o teto (limite superior) de cada faixa.
const TETO_MSGS_DIA_COM_JOGO = 4;
const TETO_MSGS_DIA_SEM_JOGO = 2;
// Início/fim do "hoje" em Brasília, em ISO (pra filtrar bot_log.created_at,
// que é UTC) + o dia no formato "dd/mm" usado por MM_AGENDA.
function limitesBrasiliaHojeISO(): { ini: string; fim: string; ddmm: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).reduce((o: Record<string, string>, p) => { o[p.type] = p.value; return o; }, {});
  const ini = `${partes.year}-${partes.month}-${partes.day}T00:00:00-03:00`;
  const fim = new Date(new Date(ini).getTime() + 24 * 3600 * 1000).toISOString();
  return { ini, fim, ddmm: `${partes.day}/${partes.month}` };
}
// Todas as linhas de bot_log de "hoje" (Brasília) — uma consulta só, reaproveitada
// pelos checks de teto e de idempotência (evita ida a banco por jogo/checagem).
async function botLogHoje(): Promise<Conf[]> {
  const { ini, fim } = limitesBrasiliaHojeISO();
  const rows = await sbGet(
    `bot_log?select=id,tipo,destino,status_envio,created_at&created_at=gte.${encodeURIComponent(ini)}&created_at=lt.${encodeURIComponent(fim)}`
  ).catch(() => []);
  return Array.isArray(rows) ? rows : [];
}
// Mensagens de fato ENVIADAS hoje pro destino (qualquer tipo que manda WhatsApp;
// fechar_placar/reabrir_placar não contam — não enviam mensagem nenhuma).
// v1.21: `conversa` também NÃO conta — ela é RESPOSTA a quem chamou o bot (não
// transmissão não solicitada) e já tem governança própria (teto/hora + cooldown
// por grupo, ver limitesConversa). Incidente real de 07/07: 4 respostas de
// conversa antes das 9h esgotaram o teto diário do oficial e a agenda (9h) e a
// cobrança (9h01) foram PULADAS com pulado_teto (bot_log 175/176) — o teto
// diário volta a valer só pras mensagens programadas, que é do que ele protege.
function contaEnviadasHoje(logs: Conf[], destino: "teste" | "oficial"): number {
  return logs.filter((r: Conf) =>
    r.status_envio === "ok" &&
    String(r.destino || "").startsWith(destino + " (") &&
    r.tipo !== "fechar_placar" && r.tipo !== "reabrir_placar" &&
    r.tipo !== "conversa"
  ).length;
}
// Idempotência: este "tipo" (com esta "chave" opcional, ex.: "[jogo:r16_3]")
// já foi enviado com sucesso hoje pra este destino? Evita duplicidade se o
// pg_cron disparar 2x na mesma janela ou o Vini rodar manual de novo.
function jaRodouHoje(logs: Conf[], tipo: string, destino: "teste" | "oficial", chave = ""): boolean {
  return logs.some((r: Conf) =>
    r.tipo === tipo && r.status_envio === "ok" &&
    String(r.destino || "").startsWith(destino + " (") &&
    (!chave || String(r.destino || "").includes(chave))
  );
}

// ─── IA (Anthropic Messages API); modelo vem de bot_config 'modelo_ia' ───────
// ⚠️ max_tokens no claude-sonnet-5 (modelo_ia atual): o thinking adaptativo vem
// LIGADO por default quando o campo `thinking` é omitido, e os tokens de
// thinking consomem O MESMO teto de max_tokens do texto final — NÃO existe
// orçamento separado (o budget_tokens antigo retorna 400 nesse modelo). Com
// teto apertado e prompt grande (9+ participantes no contexto), o thinking
// engolia o orçamento inteiro: resposta vazia (stop_reason max_tokens, ids
// 75-77 do bot_log) ou texto CORTADO no meio da frase enviado pro grupo
// (ids 69/72-74). Por isso: teto generoso (4000; pior caso realista de
// mensagem de 4-7 linhas + thinking cabe com folga) e checagem EXPLÍCITA de
// stop_reason — max_tokens = falha bloqueante, nunca envia texto parcial.
// Busca na web (v1.18.2, SÓ modo conversa) — tool nativa da Anthropic. Versão
// "básica" (não a `_20260209` com filtragem dinâmica) de propósito: o modelo
// configurável em bot_config pode cair pro fallback Haiku 4.5, que não tem a
// variante dinâmica — a básica funciona em qualquer modelo atual. `max_uses`
// evita loop de busca numa pergunta de papo (bem generoso pro caso comum de
// 1 busca só).
const WEB_SEARCH_TOOLS = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }];

async function chamaIA(modelo: string, systemPrompt: string, userPrompt: string, maxTokens = 4000, tools?: Conf[]) {
  // v1.21: com tool de servidor (busca na web) a API roda um loop interno e
  // pode devolver stop_reason "pause_turn" no meio dele — a resposta ainda
  // não acabou. O jeito documentado de continuar é reenviar a conversa com o
  // content parcial como turno assistant (SEM mensagem nova) — o servidor
  // retoma de onde parou. Antes isso viraria "não retornou texto" e, na
  // conversa, SILÊNCIO no grupo. Também soma usage.server_tool_use.
  // web_search_requests de todas as voltas: `buscas` diz se a busca RODOU de
  // verdade (auditoria do caso "cravou artilheiro errado sem pesquisar").
  const messages: Conf[] = [{ role: "user", content: userPrompt }];
  let data: Conf = null;
  let buscas = 0;
  for (let volta = 0; volta < 4; volta++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
        ...(tools && tools.length ? { tools } : {}),
      }),
    });
    if (!r.ok) throw new Error(`Anthropic (${modelo}) → HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
    data = await r.json();
    buscas += Number(data?.usage?.server_tool_use?.web_search_requests || 0);
    if (data.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: data.content });
  }
  // Blocos de texto com citação (achado da busca web) chegam fatiados no
  // limite exato de cada citação — são pra colar direto, sem separador, ou
  // uma frase contínua vira quebrada no meio ("O artilheiro\n é fulano").
  const texto = (data.content || [])
    .filter((b: Conf) => b.type === "text")
    .map((b: Conf) => b.text)
    .join("").trim();
  // Resposta parcial NÃO VAZIA também é falha: texto cortado no meio da frase
  // não pode ir pro WhatsApp. Detalhe técnico completo só no log do servidor.
  if (data.stop_reason === "max_tokens") {
    console.error("[chamaIA] resposta cortada por max_tokens — NÃO enviada", {
      modelo, maxTokens, usage: data.usage || null, texto_parcial: texto.slice(0, 400),
    });
    throw new Error("Não consegui gerar a mensagem completa (estourou o limite de tokens). Clique em 🐀 Acordar o Ratazana de novo.");
  }
  if (!texto) throw new Error(`Anthropic não retornou texto (stop_reason: ${data.stop_reason})`);
  return { texto, usage: data.usage || null, buscas };
}

// ─── ZapZap API (docs oficiais: https://api.zapzapapi.com/docs) ──────────────
function zapHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": Deno.env.get("ZAPZAP_API_KEY") || "",
    "x-api-secret": Deno.env.get("ZAPZAP_API_SECRET") || "",
  };
}
function zapBase() {
  return (Deno.env.get("ZAPZAP_ENDPOINT_BASE") || "").replace(/\/+$/, "");
}
// Destino explícito de TODO envio (?destino=teste|oficial). NUNCA há default:
// mandar mensagem pro grupo oficial é sempre decisão explícita de quem chama,
// e nesta fase nenhum envio automático vai pro oficial (tudo passa pelo admin).
function grupoDestino(url: URL): { grupo: string; destino: "teste" | "oficial" } {
  const destino = (url.searchParams.get("destino") || "").toLowerCase();
  if (destino !== "teste" && destino !== "oficial") {
    throw new Error("parâmetro ?destino=teste ou ?destino=oficial é obrigatório em qualquer envio");
  }
  const secret = destino === "oficial" ? "GRUPO_OFICIAL_ID" : "GRUPO_TESTE_ID";
  const grupo = Deno.env.get(secret) || "";
  if (!grupo) {
    throw new Error(`Secret ${secret} não configurado no Supabase (descubra o ID do grupo com &listar_grupos=1 e preencha o secret)`);
  }
  return { grupo, destino };
}
async function zapEnviaTexto(numero: string, texto: string, mentions: string[] = []) {
  // Marcação real de WhatsApp: o texto carrega o token @<numero> e o campo
  // "mentions" (CSV de números, formato da ZapZap) transforma o token em
  // menção clicável com notificação — o cliente renderiza como @Nome.
  // deno-lint-ignore no-explicit-any
  const body: Record<string, any> = { number: numero, text: texto };
  if (mentions.length) body.mentions = mentions.join(",");
  const r = await fetch(`${zapBase()}/send/text`, {
    method: "POST",
    headers: zapHeaders(),
    body: JSON.stringify(body),
  });
  const corpoCompleto = await r.text();
  // v1.16 (Conversa): o id da mensagem enviada é a chave pro gatilho de
  // "responderam uma mensagem do bot" — extraído da resposta da ZapZap
  // (parse ANTES do slice do detalhe; achaProfundo é hoisted, definido abaixo).
  let messageId: string | null = null;
  try {
    const j = JSON.parse(corpoCompleto);
    messageId = achaProfundo(j, ["id", "Id", "messageid", "messageId", "MessageID"],
      (v) => typeof v === "string" && v.length >= 8 && !v.includes("@")) || null;
  } catch { /* corpo não-JSON: segue sem id */ }
  return { ok: r.ok, detalhe: `HTTP ${r.status}: ${corpoCompleto.slice(0, 600)}`, messageId };
}
// Divide um texto em até 3 partes (blocos "---" + rede de segurança de tamanho).
// Compartilhado entre o envio real e o modo preview (que mostra sem enviar).
function divideEmPartes(texto: string): string[] {
  const blocosIA = texto.split(/\n\s*-{3,}\s*\n/).map((b: string) => b.trim()).filter(Boolean);
  const pedacos = blocosIA.flatMap((b: string) => quebraLonga(b));
  return pedacos.length <= 3 ? pedacos : [...pedacos.slice(0, 2), pedacos.slice(2).join("\n\n")];
}

// ─── Filtro de sanidade (v1.11 — reprovação por script) ──────────────────────
// Achado real em produção: um caractere CJK solto no meio de uma frase coerente
// em português ("...os 30 pontos肥: *Du, Yuri...") — glitch de amostragem do
// modelo, não truncamento. A v1.9 usava lista de APROVAÇÃO com meia dúzia de
// emojis e bloqueou 😬 (emoji Unicode comum, falso positivo real — bot_log 78).
// Agora a lógica é invertida: REPROVA só scripts incompatíveis com português
// (CJK, kana, hangul, cirílico, árabe, devanagari e demais índicos, tailandês,
// hebraico e afins). ASCII, latim estendido, pontuação e QUALQUER emoji das
// faixas Unicode padrão (emoticons, pictogramas, transporte, suplementares,
// setas, ZWJ, seletores de variação, tons de pele, bandeiras) passam direto —
// nenhuma dessas faixas está na lista de bloqueio.
const SCRIPTS_BLOQUEADOS: [number, number, string][] = [
  [0x0370, 0x03FF, "grego"],
  [0x0400, 0x052F, "cirílico"],
  [0x0530, 0x058F, "armênio"],
  [0x0590, 0x05FF, "hebraico"],
  [0x0600, 0x077F, "árabe"],
  [0x0780, 0x08FF, "árabe estendido e afins"],
  [0x0900, 0x0DFF, "devanagari e demais índicos"],
  [0x0E00, 0x0E7F, "tailandês"],
  [0x0E80, 0x0EFF, "lao"],
  [0x0F00, 0x0FFF, "tibetano"],
  [0x1000, 0x109F, "birmanês"],
  [0x1100, 0x11FF, "hangul jamo"],
  [0x1780, 0x17FF, "khmer"],
  [0x3040, 0x30FF, "hiragana/katakana"],
  [0x3100, 0x312F, "bopomofo"],
  [0x3130, 0x318F, "hangul compatibilidade"],
  [0x31F0, 0x31FF, "katakana ext."],
  [0x3400, 0x4DBF, "CJK ext. A"],
  [0x4E00, 0x9FFF, "CJK unificado"],
  [0xA960, 0xA97F, "hangul jamo ext."],
  [0xAC00, 0xD7FF, "hangul sílabas"],
  [0xF900, 0xFAFF, "CJK compatibilidade"],
  [0xFE30, 0xFE4F, "CJK formas de compatibilidade"],
  [0xFF65, 0xFFDC, "katakana/hangul meia-largura"],
  [0x20000, 0x2FA1F, "CJK ext. B+"],
];
function sanidadeTexto(texto: string): { ch: string; script: string }[] {
  const suspeitos = new Map<string, string>();
  for (const ch of texto) {
    const cp = ch.codePointAt(0) ?? 0;
    for (const [ini, fim, script] of SCRIPTS_BLOQUEADOS) {
      if (cp >= ini && cp <= fim) {
        suspeitos.set(ch, script);
        break;
      }
    }
  }
  return [...suspeitos].map(([ch, script]) => ({ ch, script }));
}
// ─── Menção obrigatória (v1.10) ──────────────────────────────────────────────
// A provocação final de TODA mensagem programada é DETERMINÍSTICA: a aplicação
// sorteia alguém de bot_telefones e monta a linha com o token @<numero> (que o
// WhatsApp renderiza como @Nome clicável, via campo "mentions" do envio). O
// modelo NUNCA escreve "@" — no teste real ele produzia "@Vini" como texto
// solto, sem notificação nem link; por isso a marcação saiu do prompt e veio
// pro código. Intensidade por gênero: forte com homens, leve com mulheres.
// Placeholder {@} = token de menção. Frases só com caracteres do conjunto
// aprovado (sanidadeTexto roda depois). Sem repetir sempre a mesma: sorteio.
const PROVOC_M = [
  "E tu, {@}, achou que passava batido? Tá no caderninho.",
  "Aproveita e me explica teus últimos palpites, {@}. A auditoria não fecha.",
  "{@}, tu anda quieto demais pro tamanho da tua ficha no caderninho.",
  "Fiscalização surpresa: {@}, teus palpites entram em auditoria completa hoje.",
  "O Ratazana viu teu histórico, {@}. Coragem é postar aquilo e dormir tranquilo.",
];
const PROVOC_F = [
  "E a {@}, hein? Segue firme que o caderninho anota os acertos também.",
  "{@}, o Ratazana tá torcendo discretamente por você. Não espalha.",
  "Fica esperta, {@}: uma rodada boa e você apronta na tabela.",
  "{@}, teu faro anda afiado. Não vacila agora.",
];
// Sorteia uma pessoa citável de bot_telefones (humana, com telefone, fora da
// lista de exclusão) e devolve a linha pronta + o número pro campo mentions.
// Tabela vazia ou sem candidato → null (mensagem sai sem a linha, sem quebrar).
function linhaProvocacao(telefones: Conf[], excluirIds: Set<string>) {
  const cands = (telefones || []).filter((t: Conf) =>
    t.is_humano !== false && t.telefone_whatsapp && !excluirIds.has(t.participante_id));
  if (!cands.length) return null;
  const alvo = cands[Math.floor(Math.random() * cands.length)];
  const banco = (alvo.genero || "").toUpperCase() === "F" ? PROVOC_F : PROVOC_M;
  const frase = banco[Math.floor(Math.random() * banco.length)];
  const tel = String(alvo.telefone_whatsapp).replace(/\D/g, "");
  if (!tel) return null;
  return { linha: frase.split("{@}").join("@" + tel), mention: tel, alvo: alvo.participante_id };
}

// Registro dos envios do bot (v1.16 — Conversa): cada mensagem que o Ratazana
// manda (qualquer tipo: agenda, cobrança, pós-jogo, aviso, conversa) fica em
// bot_mensagens_enviadas com o message_id devolvido pela ZapZap — é isso que
// permite ao webhook detectar "responderam uma mensagem do bot" cruzando com
// o quoted_message_id de uma resposta capturada. Best-effort: falha aqui NUNCA
// derruba o envio (só perde o gatilho de citação daquela mensagem específica).
async function registraEnvioBot(grupo: string, pares: { id: string; texto: string }[]) {
  if (!pares.length) return;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bot_mensagens_enviadas?on_conflict=message_id`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(pares.map((p) => ({ message_id: p.id, grupo_jid: grupo, texto: p.texto.slice(0, 2000) }))),
    });
    if (!r.ok) console.error("[conversa] registro de envio falhou:", r.status, (await r.text()).slice(0, 200));
  } catch (e) {
    console.error("[conversa] registro de envio falhou:", e);
  }
}

// Envia como até 3 mensagens sequenciais no WhatsApp. Usado pela cobrança,
// pelo fim de jogo e pelo enviar_texto. O padrão continua sendo mensagem única.
// mentions: números com marcação real — cada parte só recebe os que aparecem
// nela como token @<numero> (a linha da provocação normalmente é a última).
// `sanitiza` (v1.21, usado pela CONVERSA): glitch PONTUAL de caractere (caso
// real: um '覆' solto no meio de frase coerente, bot_log 168/169) não pode
// virar silêncio total no grupo — poucos caracteres bloqueados são REMOVIDOS
// e o envio segue (com log no console); corrupção de verdade (muitas
// ocorrências, ou texto que praticamente some depois da limpeza) continua
// bloqueando como sempre — aí o chamador decide regenerar. Mensagens
// programadas seguem no modo estrito (admin tem botão de retry; conversa não).
async function enviaEmPartes(grupo: string, texto: string, mentions: string[] = [], sanitiza = false) {
  let suspeitos = sanidadeTexto(texto);
  if (suspeitos.length && sanitiza) {
    const bloqueados = new Set(suspeitos.map((s) => s.ch));
    let ocorrencias = 0;
    let limpo = "";
    for (const ch of texto) {
      if (bloqueados.has(ch)) { ocorrencias++; continue; }
      limpo += ch;
    }
    limpo = limpo.replace(/[ \t]{2,}/g, " ");
    if (ocorrencias <= 5 && limpo.trim().length >= 20) {
      console.error("[filtro de sanidade] glitch pontual REMOVIDO (modo conversa):",
        [...bloqueados].join(" "), `(${ocorrencias} ocorrência(s))`);
      texto = limpo;
      suspeitos = [];
    }
  }
  if (suspeitos.length) {
    const detalhe = suspeitos
      .map((s) => `'${s.ch}' (U+${(s.ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}, ${s.script})`)
      .join(", ");
    console.error("[filtro de sanidade] script incompatível com português — envio BLOQUEADO:", detalhe, "| texto:", texto.slice(0, 300));
    throw new Error(`Filtro de sanidade bloqueou o envio: caractere de escrita incompatível com português (${detalhe}) — provável glitch do modelo. Clique em 🐀 Acordar o Ratazana de novo.`);
  }
  const partes = divideEmPartes(texto);
  if (!partes.length) throw new Error("texto ficou vazio após a divisão em blocos");
  const envios: { ok: boolean; detalhe: string; messageId?: string | null }[] = [];
  for (const parte of partes) {
    envios.push(await zapEnviaTexto(grupo, parte, mentions.filter((n) => parte.includes("@" + n))));
    if (partes.length > 1) await new Promise((res) => setTimeout(res, 900));
  }
  // registra os ids das partes que saíram (gatilho de citação da Conversa)
  await registraEnvioBot(grupo, envios
    .map((e, ix) => ({ id: e.messageId || "", texto: partes[ix] }))
    .filter((p) => p.id));
  return {
    partes,
    ok: envios.every((e) => e.ok),
    detalhe: envios.map((e, ix) => `msg ${ix + 1}/${partes.length} ${e.detalhe}`).join(" | "),
  };
}

// ─── Ouvidos do Ratazana (Fase 2, v1.14): captura bruta de mensagens ─────────
// A ZapZap entrega cada evento da instância via POST na URL registrada pelo
// modo configurar_webhook. O formato exato do envelope não é documentado
// publicamente (a API é Baileys por baixo: JIDs @g.us/@s.whatsapp.net,
// key.id, contextInfo com mentionedJid/stanzaId), então o parser é
// DEFENSIVO: busca em profundidade pelos nomes de campo conhecidos — mesmo
// padrão do achaLista do listar_grupos — e o raw_payload guarda o evento
// inteiro pra auditoria/reprocessamento. Fase 2 = SÓ captura; nenhuma
// lógica de resposta a menção/citação ainda (Fase 3).

// Busca em LARGURA (BFS) o primeiro valor cujo nome de campo esteja em
// `chaves` e passe no predicado — largura, e não profundidade, pra um campo
// do envelope raso (ex.: o id da mensagem) ganhar de um homônimo enterrado
// (ex.: o id da mensagem CITADA dentro de contextInfo.quotedMessage).
// deno-lint-ignore no-explicit-any
function achaProfundo(o: Conf, chaves: string[], pred?: (v: any) => boolean): Conf {
  const fila: Conf[] = [o];
  const vistos = new Set<Conf>();
  while (fila.length) {
    const cur = fila.shift();
    if (!cur || typeof cur !== "object" || vistos.has(cur)) continue;
    vistos.add(cur);
    for (const [k, v] of Object.entries(cur)) {
      if (chaves.includes(k) && v != null && (!pred || pred(v))) return v;
    }
    for (const v of Object.values(cur)) {
      if (v && typeof v === "object") fila.push(v);
    }
  }
  return null;
}
// Extrai os campos que a tabela mensagens_grupo precisa, tolerando variações
// de nome/aninhamento do envelope da ZapZap.
function extraiMensagemWebhook(payload: Conf) {
  const ehJid = (v: Conf) => typeof v === "string" && v.includes("@");
  const chatJid = achaProfundo(payload, ["remoteJid", "RemoteJid", "chatid", "chatId", "ChatID", "chat", "Chat"],
    (v) => typeof v === "string" && v.endsWith("@g.us"));
  const fromMe = achaProfundo(payload, ["fromMe", "FromMe", "wasSentByAPI"], (v) => typeof v === "boolean") === true;
  const remetenteJid = achaProfundo(payload, ["participant", "Participant", "sender", "Sender", "SenderJid", "author"], ehJid);
  // id da mensagem: o formato "achatado" da ZapZap (OWNER:MSGID) tem prioridade;
  // depois o key.id do Baileys; por último um "id" solto que não seja JID/UUID
  // de instância (UUIDs têm hífen, ids de mensagem não).
  const key = achaProfundo(payload, ["key", "Key"], (v) => v && typeof v === "object" && typeof (v as Conf).id === "string");
  const messageId =
    achaProfundo(payload, ["messageid", "messageId", "MessageID"], (v) => typeof v === "string" && v.length >= 8) ||
    (key ? key.id : null) ||
    achaProfundo(payload, ["id", "Id", "ID"], (v) => typeof v === "string" && v.length >= 8 && !v.includes("@") && !v.includes("-"));
  const texto = achaProfundo(payload, ["conversation", "Conversation", "text", "Text", "caption", "Caption"],
    (v) => typeof v === "string" && v.trim() !== "");
  // "mentionedJID" (JID maiúsculo) é o nome REAL no envelope da ZapZap
  // (content.contextInfo.mentionedJID — achado no payload capturado; o match
  // de chaves é case-sensitive e a 1ª versão só tinha mentionedJid/JIDs)
  const mentions = achaProfundo(payload, ["mentionedJID", "mentionedJid", "MentionedJid", "mentionedJIDs", "mentionedJids", "mentionedjid", "mentions", "Mentions"],
    (v) => Array.isArray(v) && v.every((x: Conf) => typeof x === "string"));
  const quotedId = achaProfundo(payload, ["stanzaId", "StanzaId", "stanzaID", "quotedMessageId", "quotedMsgId", "QuotedID"],
    (v) => typeof v === "string" && v.length >= 8);
  const tsRaw = achaProfundo(payload, ["messageTimestamp", "MessageTimestamp", "timestamp", "Timestamp"],
    (v) => typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v)));
  let timestamp: string | null = null;
  if (tsRaw != null) {
    const n = +tsRaw;
    // segundos vs milissegundos: epoch em segundos só passa de 1e12 no ano 33658
    timestamp = new Date(n > 1e12 ? n : n * 1000).toISOString();
  }
  // v1.18 (reconhecimento de pessoas): o envelope da ZapZap traz o nome de
  // exibição do remetente (senderName) e, quando o WhatsApp expõe, o telefone
  // (sender_pn) e o lid (sender_lid) — base do mapeamento LID→participante.
  const senderName = achaProfundo(payload, ["senderName", "SenderName", "pushName", "PushName"],
    (v) => typeof v === "string" && v.trim() !== "");
  const senderPn = achaProfundo(payload, ["sender_pn", "senderPn", "SenderPn"],
    (v) => typeof v === "string" && /\d{8,}/.test(v));
  const senderLid = achaProfundo(payload, ["sender_lid", "senderLid", "SenderLid"],
    (v) => typeof v === "string" && /\d{8,}/.test(v));
  return {
    chatJid, fromMe, remetenteJid, messageId, texto,
    mentions: mentions && mentions.length ? mentions : null,
    quotedId, timestamp, senderName, senderPn, senderLid,
  };
}
// ─── Claim atômico (v1.15) ───────────────────────────────────────────────────
// Trava "claim-then-act": INSERT com ignore-duplicates numa key de bot_config
// ANTES da ação. O UNIQUE da PK garante no Postgres que só UMA execução cria
// a key — todas as outras (inclusive concorrentes no mesmo segundo) recebem
// lista vazia e desistem. Diferente do check em bot_log (que era só
// consultivo e fail-open), o claim é a autoridade e é fail-CLOSED: se a
// própria criação do claim falhar (erro transitório do REST), NÃO envia —
// duplicar mensagem é pior que atrasar um aviso; o tick seguinte tenta de
// novo. Usado pela última chamada e pelo aviso dos Ouvidos.
async function claimUmaVez(chave: string): Promise<boolean> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/bot_config?on_conflict=key`, {
    method: "POST",
    headers: { ...sbHeaders(), Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify([{ key: chave, value: new Date().toISOString() }]),
  });
  const corpo = await r.text();
  if (!r.ok) {
    console.error("[claim] criação falhou (fail-closed, não envia):", chave, r.status, corpo.slice(0, 300));
    return false;
  }
  try { return JSON.parse(corpo).length > 0; } catch { return false; }
}
// Devolve a vez (ex.: envio falhou depois de ganhar o claim) — best-effort.
async function liberaClaim(chave: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/bot_config?key=eq.${encodeURIComponent(chave)}`, {
    method: "DELETE", headers: sbHeaders(),
  }).catch(() => {});
}

// Aviso único de ativação (in character, texto FIXO, sem IA), disparado na
// primeira mensagem gravada com sucesso. Trava = claim atômico permanente;
// se o ENVIO falhar depois de ganhar o claim, a key é apagada pra próxima
// mensagem capturada tentar de novo.
const AVISO_OUVIDOS =
  "🐀 *Comunicado do fiscal: o Ratazana vê tudo.*\n" +
  "A partir de agora, cada mensagem deste grupo entra no caderninho. Elogio, choro, desculpa esfarrapada de palpite atrasado: tudo vira registro.\n" +
  "Podem continuar. Ninguém escapa do Ratazana.";
async function avisoOuvidosUmaVez(grupoTeste: string): Promise<boolean> {
  if (!(await claimUmaVez("ouvidos_aviso_enviado"))) {
    return false; // aviso já foi (ou está sendo) enviado por outra execução
  }
  try {
    const envio = await enviaEmPartes(grupoTeste, AVISO_OUVIDOS);
    await botLog({
      tipo: "ouvidos_aviso", destino: `teste (${grupoTeste})`,
      mensagem_enviada: envio.partes.join("\n\n"),
      status_envio: envio.ok ? "ok" : "erro", erro: envio.ok ? null : envio.detalhe,
    });
    if (!envio.ok) throw new Error(envio.detalhe);
    return true;
  } catch (e) {
    // devolve a trava pra próxima mensagem capturada tentar o aviso de novo
    await liberaClaim("ouvidos_aviso_enviado");
    await botLog({ tipo: "ouvidos_aviso", destino: `teste (${grupoTeste})`, status_envio: "erro", erro: String((e as Error)?.message || e) });
    return false;
  }
}

// ─── Conversa (Fase 3, v1.16) — responde menção ou resposta a mensagem do bot ─
// v1.20: chamada pros DOIS grupos (teste sempre; oficial só com o opt-in
// bot_config.conversa_ativa_oficial='1' — checado no modo webhook, ANTES de
// chamar esta função). `grupoJid`/`destinoLabel` identificam qual grupo
// gerou a mensagem — nunca hardcode "teste" dentro desta função (já foi bug:
// o botLog usava o literal "teste" mesmo quando chamada pro oficial, o que
// quebrava silenciosamente a contagem de teto/cooldown POR GRUPO). Dois
// gatilhos, qualquer um dispara:
//   a) o bot foi MENCIONADO (@) na mensagem — detectado comparando os JIDs de
//      `mentions` com o número da própria instância;
//   b) a mensagem é RESPOSTA (citação) a algo que o próprio bot mandou —
//      quoted_message_id cruzado com bot_mensagens_enviadas.
// Sem gatilho → só arquiva (comportamento da Fase 2, intacto). SEM busca na
// web e SEM ficha relacional nesta leva (próximas etapas da Fase 3).
// Limites anti-cascata — os DEFAULTS abaixo são o piso conservador e valem
// pra qualquer grupo sem override (ou seja: o OFICIAL, quando a conversa
// chegar lá, nasce no modo conservador). Por grupo, keys opcionais em
// bot_config sobrescrevem: `conversa_max_hora_<destino>` e
// `conversa_cooldown_seg_<destino>` (destino = "teste" | "oficial").
// Motivo (v1.17.1): sessão de calibragem real no grupo de teste morreu no
// teto de 6/hora (bot_log 105-106) — teste precisa de folga (key = 30/hora),
// o oficial não.
const CONVERSA_MAX_POR_HORA = 6;    // default conservador
// Cooldown por pessoa: 30s era MAIS LONGO que o ritmo natural de conversa —
// no teste real os replies vieram 13s e 22s depois da resposta do bot e
// foram engolidos em silêncio (parecia bug no match de citação; era isto).
// 10s ainda barra spam/cascata (anti-eco + teto/hora seguram o resto) sem
// matar o vai-e-vem normal de um papo (0 skips de cooldown nos logs desde então).
const CONVERSA_COOLDOWN_SEG = 10;   // default
async function limitesConversa(destinoLabel: string): Promise<{ maxHora: number; cooldownSeg: number }> {
  let maxHora = CONVERSA_MAX_POR_HORA;
  let cooldownSeg = CONVERSA_COOLDOWN_SEG;
  try {
    const rows = await sbGet(
      `bot_config?key=in.(conversa_max_hora_${destinoLabel},conversa_cooldown_seg_${destinoLabel})&select=key,value`
    );
    for (const r of (rows as Conf[])) {
      const n = parseInt(String(r.value), 10);
      if (!Number.isFinite(n) || n < 0) continue;
      if (r.key === `conversa_max_hora_${destinoLabel}`) maxHora = n;
      if (r.key === `conversa_cooldown_seg_${destinoLabel}`) cooldownSeg = n;
    }
  } catch { /* keys ilegíveis → fica no default conservador */ }
  return { maxHora, cooldownSeg };
}

// Identidades do WhatsApp da própria instância (base do gatilho de menção e
// do anti-eco). Achado real do teste: o WhatsApp moderno usa DOIS
// identificadores pro mesmo perfil — o telefone (5511...@s.whatsapp.net) e o
// LID de privacidade (...@lid) — e MENÇÃO EM GRUPO CHEGA COMO LID (no nosso
// caso "61032206725341@lid", enquanto o telefone da instância é outro
// número). Comparar menção só contra o telefone nunca bate. Por isso
// bot_config 'bot_numero_whatsapp' aceita VÁRIOS ids separados por vírgula
// (telefone,LID); fallback: só o telefone via API de gestão da ZapZap (não
// cobre o LID — preencher a key é o caminho de verdade). Cache no isolate.
// Sem nenhum id resolvido, o gatilho de menção fica mudo (o de citação
// continua funcionando) — nunca derruba a captura.
let BOT_IDS_CACHE: string[] | null = null;
async function botIdentidades(): Promise<Set<string>> {
  if (BOT_IDS_CACHE) return new Set(BOT_IDS_CACHE);
  const ids = new Set<string>();
  let deConfig = false;
  try {
    const cfg = await sbGet("bot_config?key=eq.bot_numero_whatsapp&select=value");
    if (Array.isArray(cfg) && cfg.length && cfg[0].value) {
      for (const parte of String(cfg[0].value).split(",")) {
        const d = parte.replace(/\D/g, "");
        if (d) ids.add(d);
      }
      deConfig = ids.size > 0;
    }
  } catch { /* segue pro fallback via API */ }
  if (!ids.size) {
    try {
      const instId = zapBase().split("/").filter(Boolean).pop() || "";
      const urlInst = zapBase().replace(/\/[^/]+\/?$/, `/instances/${instId}`);
      const r = await fetch(urlInst, { headers: zapHeaders() });
      if (r.ok) {
        const j = await r.json();
        const num = achaProfundo(j, ["phone_number", "phoneNumber", "phone", "number"],
          (v) => typeof v === "string" && /\d{8,}/.test(v));
        if (num) ids.add(String(num).replace(/\D/g, ""));
      }
    } catch (e) {
      console.error("[conversa] identidades da instância indisponíveis (gatilho de menção mudo):", e);
    }
  }
  // v1.21: só o conjunto vindo de bot_config (telefone + LIDs, completo) pode
  // ser CACHEADO. O fallback da API só conhece o telefone — cachear ele
  // deixava o isolate inteiro cego pra menção por LID até reciclar (uma falha
  // transitória do REST virava horas de "@Ratazana00 = contato desconhecido").
  if (deConfig) BOT_IDS_CACHE = [...ids];
  return ids;
}

// v1.21 (bug real do oficial — bot tratando a PRÓPRIA menção como "contato
// desconhecido"): o LID do bot pode variar por grupo/contexto (mesma classe
// de problema já vista com bot_telefones.lid), então um id fixo em bot_config
// não cobre todas as formas que a menção a ele pode assumir. O jeito CONFIÁVEL
// de aprender o LID que um grupo usa é o mesmo dos humanos: um evento do
// PRÓPRIO bot (fromMe) traz sender_pn + lid juntos. Guarda anti-poisoning: só
// aprende quando o sender_pn do evento bate com um telefone JÁ cadastrado do
// bot — nunca a partir de campo solto do payload (uma identidade errada em
// idsBot silenciaria a pessoa pra sempre como "eco"). Best-effort: falha aqui
// nunca derruba o webhook.
async function aprendeIdentidadeBotDeFromMe(m: Conf) {
  const dig = (s: string) => String(s || "").split("@")[0].split(":")[0].replace(/\D/g, "");
  const pn = dig(m.senderPn || "");
  const lid = (m.remetenteJid && String(m.remetenteJid).includes("@lid"))
    ? dig(m.remetenteJid)
    : dig(m.senderLid || "");
  if (!pn || !lid || pn === lid) return;
  try {
    const cfg = await sbGet("bot_config?key=eq.bot_numero_whatsapp&select=value");
    const valor = (Array.isArray(cfg) && cfg.length && cfg[0].value) ? String(cfg[0].value) : "";
    if (!valor) return;
    const atuais = valor.split(",").map((p) => p.replace(/\D/g, "")).filter(Boolean);
    if (!atuais.includes(pn)) return;   // guarda: o telefone do evento tem que ser o do bot
    if (atuais.includes(lid)) return;   // já conhecido
    if (atuais.length >= 8) return;     // teto de segurança contra crescimento sem fim
    await fetch(`${SUPABASE_URL}/rest/v1/bot_config?key=eq.bot_numero_whatsapp`, {
      method: "PATCH",
      headers: { ...sbHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({ value: `${valor},${lid}` }),
    });
    BOT_IDS_CACHE = null;   // próximo botIdentidades() relê já com o id novo
    console.log("[conversa] LID próprio novo aprendido de evento fromMe:", lid);
  } catch { /* best-effort */ }
}

// A mensagem citada é do bot? Os formatos de id variam entre o envio
// (ZapZap costuma devolver OWNER:MSGID achatado) e a citação (stanzaId do
// Baileys costuma ser só o MSGID) — tenta match exato e depois por sufixo.
async function buscaMensagemBot(quotedId: string): Promise<Conf | null> {
  const puro = quotedId.includes(":") ? (quotedId.split(":").pop() || quotedId) : quotedId;
  const porEq = await sbGet(`bot_mensagens_enviadas?message_id=eq.${encodeURIComponent(quotedId)}&select=message_id,texto&limit=1`).catch(() => []);
  if (Array.isArray(porEq) && porEq.length) return porEq[0];
  const porSufixo = await sbGet(`bot_mensagens_enviadas?message_id=like.${encodeURIComponent("*" + puro)}&select=message_id,texto&limit=1`).catch(() => []);
  return (Array.isArray(porSufixo) && porSufixo.length) ? porSufixo[0] : null;
}

// Avalia os gatilhos e, se for o caso, gera e envia a resposta. Devolve o que
// aconteceu (pro JSON do webhook e pro teste manual do Vini).
async function conversaTalvezResponder(m: Conf, grupoJid: string, telefoneRemetente: string, destinoLabel = "teste") {
  // Skip com gatilho DISPARADO fica auditável em bot_log (status nao_enviado,
  // que o rate-limit ignora — ele só conta status ok). Lição do teste real:
  // o cooldown engoliu dois replies em silêncio e pareceu bug de match de
  // citação — nunca mais skip mudo. Skip sem gatilho (mensagem comum) segue
  // sem log, senão o bot_log viraria espelho do grupo.
  const semResposta = async (motivo: string, gatilho: string | null = null) => {
    if (gatilho) {
      await botLog({
        tipo: "conversa",
        destino: `${destinoLabel} (${grupoJid}) [para:${telefoneRemetente || "?"}] [gatilho:${gatilho}]`,
        status_envio: "nao_enviado",
        erro: motivo,
      });
    }
    return { respondida: false, gatilho, motivo };
  };

  // gatilho a: menção real ao bot (compara contra o CONJUNTO de identidades
  // da instância — telefone E lid, ver botIdentidades)
  const digitos = (s: string) => String(s || "").split("@")[0].split(":")[0].replace(/\D/g, "");
  let gatilho: string | null = null;
  const idsBot = await botIdentidades();
  // cinto extra anti-eco (além do fromMe do webhook): se o remetente for a
  // própria instância (telefone ou lid), nunca responde — sem loop consigo
  if (idsBot.size && m.remetenteJid && idsBot.has(digitos(m.remetenteJid))) {
    return semResposta("mensagem da própria instância (eco)");
  }
  if (idsBot.size && Array.isArray(m.mentions) && m.mentions.some((j: string) => idsBot.has(digitos(j)))) {
    gatilho = "mencao";
  }
  // gatilho b: resposta/citação a uma mensagem que o bot enviou
  let msgOriginal: Conf = null;
  if (m.quotedId) {
    msgOriginal = await buscaMensagemBot(m.quotedId);
    if (msgOriginal && !gatilho) gatilho = "citacao";
  }
  if (!gatilho) return semResposta("nenhum gatilho (arquivada)");
  if (!m.texto) return semResposta("mensagem sem texto (mídia?)", gatilho);

  // Anti-cascata (fail-CLOSED: rate-limit ilegível = não responde):
  // teto por hora + cooldown por pessoa, ambos sobre bot_log, com limites
  // resolvidos POR GRUPO (keys de bot_config; default conservador — v1.17.1).
  const { maxHora, cooldownSeg } = await limitesConversa(destinoLabel);
  const desdeHora = new Date(Date.now() - 3600_000).toISOString();
  const recentes = await sbGet(
    `bot_log?tipo=eq.conversa&status_envio=eq.ok&created_at=gte.${encodeURIComponent(desdeHora)}&select=created_at,destino`
  ).catch(() => null);
  if (recentes === null) return semResposta("rate-limit ilegível (fail-closed, não responde)", gatilho);
  // teto e cooldown contam POR GRUPO (o limite é por grupo, a contagem também
  // — senão uma sessão longa no teste comeria o teto do oficial e vice-versa)
  const doGrupo = (recentes as Conf[]).filter((r: Conf) => String(r.destino || "").startsWith(destinoLabel + " ("));
  if (doGrupo.length >= maxHora) {
    return semResposta(`teto de ${maxHora} respostas/hora atingido`, gatilho);
  }
  const cooldownDesde = Date.now() - cooldownSeg * 1000;
  if (telefoneRemetente && cooldownSeg > 0 && doGrupo.some((r: Conf) =>
    String(r.destino || "").includes(`[para:${telefoneRemetente}]`) &&
    new Date(r.created_at).getTime() > cooldownDesde)) {
    return semResposta(`cooldown de ${cooldownSeg}s por pessoa`, gatilho);
  }

  const logBase = { tipo: "conversa", destino: `${destinoLabel} (${grupoJid}) [para:${telefoneRemetente || "?"}] [gatilho:${gatilho}]` };
  // v1.21.1 — diagnóstico imediato de menção (pedido após o caso "Vsf @...",
  // bot_log 183, que exigiu investigação manual): quando o gatilho de menção
  // dispara, o log guarda TODOS os identificadores recebidos em mentions
  // (dígitos) e o conjunto de identidades conhecidas do bot na hora — se a
  // resolução errar de novo, a comparação já está no próprio bot_log.
  if (gatilho === "mencao") {
    const men = (m.mentions || []).map((j: string) => digitos(j)).filter(Boolean).join(",");
    logBase.destino += ` [men:${men}] [idbot:${[...idsBot].join(",")}]`;
  }
  let userPrompt: string | null = null;
  let respostaIA: string | null = null;
  try {
    // Contexto: quem mandou + ranking + jogos de hoje (dados que a persona
    // pode usar; a IA nunca calcula nada)
    const [confrontos, palpites, cfg, telefones] = await Promise.all([
      sbGet("mata_confrontos?select=*"),
      sbGet("mata_palpites?select=confronto_id,pid,gols_a,gols_b,quem_passa"),
      sbGet("bot_config?key=in.(system_prompt_ratazana,modelo_ia,fase_ativa)&select=key,value"),
      sbGet("bot_telefones?select=participante_id,nome_exibicao,genero,telefone_whatsapp,lid").catch(() => []),
    ]);
    const cfgMap: Record<string, string> = {};
    for (const row of cfg) cfgMap[row.key] = row.value;
    const systemPrompt = cfgMap["system_prompt_ratazana"];
    const modelo = (cfgMap["modelo_ia"] || "").trim() || MODELO_FALLBACK;
    if (!systemPrompt) throw new Error("bot_config sem 'system_prompt_ratazana'");
    // v1.21.2 — RODADA ATIVA no contexto (bug real: perguntado "qual rodada
    // está ativa?", o bot disse "vácuo entre oitavas e quartas" — bot_log 200 —
    // porque o prompt NUNCA recebia fase_ativa; só resultados fechados + "jogos
    // de hoje: nenhum", e o modelo INFERIA errado). Agora a fase entra explícita
    // e por extenso, separada dos jogos do dia. "Sem jogo hoje" ≠ "sem rodada".
    const faseAtivaKey = faseCanonica(cfgMap["fase_ativa"] || "");
    const FASE_EXTENSO: Record<string, string> = {
      "32avos": "16 avos de final", oitavas: "Oitavas de final", quartas: "Quartas de final",
      semis: "Semifinais", "3lugar": "Disputa de 3º lugar", final: "Final",
    };
    const faseAtivaLabel = faseAtivaKey ? (FASE_EXTENSO[faseAtivaKey] || PH_LABEL[faseAtivaKey] || null) : null;

    // Quem fala: match por telefone OU lid (v1.18); sem match na tabela, o
    // nome de exibição do WhatsApp (senderName) ainda dá um nome ao papo.
    const achaTel = (idDigitos: string) => (telefones as Conf[]).find((t: Conf) =>
      idDigitos && (String(t.telefone_whatsapp || "").replace(/\D/g, "") === idDigitos ||
                    String(t.lid || "").replace(/\D/g, "") === idDigitos));
    const tel = achaTel((telefoneRemetente || "").replace(/\D/g, ""));
    const part = tel ? MATA_PARTS_BOT.find((p) => p.id === tel.participante_id) : null;
    const nome = tel?.nome_exibicao || part?.nome || m.senderName || "alguém do grupo";
    const genero = (tel?.genero || "").toUpperCase();

    const PAL: Record<string, Record<string, Conf>> = {};
    for (const p of palpites) (PAL[p.confronto_id] ??= {})[p.pid] = p;
    const rank = MATA_PARTS_BOT.map((p) => ({ p, ...mataStats(p.id, confrontos, PAL) }))
      .sort((a, b) => b.total - a.total || b.eHits - a.eHits || b.rHits - a.rHits);
    const posPessoa = part ? rank.findIndex((r) => r.p.id === part.id) + 1 : 0;
    const posRat = rank.findIndex((r) => r.p.id === RATAZANA_ID) + 1;
    // Ranking COMPLETO E SEM BURACOS (v1.18.1) — TODAS as posições, humanos e
    // IAs, com a numeração real do app. Achado real de teste: filtrar IAs
    // fora do top 3 aqui (como a v1.18 fazia) tirava linhas do meio da
    // lista e o modelo perdia a noção de quem é o último/quinto/etc mesmo
    // entre HUMANOS (perguntado "quem é o lanterna", respondeu 11º em vez do
    // 14º real). A regra de existência das IAs concorrentes deixou de ser
    // filtro de DADO e virou regra de COMPORTAMENTO na persona: o modelo tem
    // a lista inteira, mas só fala de IA fora do top 3 se for perguntado
    // direto sobre ela.
    const rankingCompleto = rank
      .map((r, ix) => `${ix + 1}º ${r.p.nome} — ${fmtPts(r.total)} pts (${r.eHits} placares cravados)`)
      .join("\n");

    const { ddmm } = limitesBrasiliaHojeISO();
    const teamsOf = makeResolver(confrontos);
    const jogosHoje = confrontos
      .filter((c: Conf) => !mmIsTest(c) && !c.finished && MM_AGENDA[c.id]?.dt === ddmm)
      .map((c: Conf) => {
        const t = teamsOf(c);
        const i = mmInfo(c);
        return `${t.a?.name || "A definir"} × ${t.b?.name || "A definir"} às ${i.tm}${MM_TURBO.has(c.id) ? " (⚡ turbo)" : ""}`;
      });

    // ─ Contexto factual (v1.17) — achado grave do teste real: perguntaram do
    // jogo do Brasil de ontem e o bot NEGOU que houve jogo (não tinha nenhum
    // resultado no contexto). Aqui entram data/hora, os placares fechados dos
    // últimos 3 dias e a situação atual das duas seleções do viés emocional. ─
    const agoraD = new Date();
    const dataHoje = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "America/Sao_Paulo" }).format(agoraD);
    const horaAgora = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(agoraD);

    const tresDiasAtras = Date.now() - 3 * 24 * 3600_000;
    const resultadosRecentes = confrontos
      .filter((c: Conf) => !mmIsTest(c) && c.finished && c.real_a != null && c.real_b != null)
      .map((c: Conf) => ({ c, d: mmGameDate(c) }))
      .filter((x: Conf) => x.d && x.d.getTime() >= tresDiasAtras)
      .sort((a: Conf, b: Conf) => b.d.getTime() - a.d.getTime())
      .map(({ c, d }: Conf) => {
        const t = teamsOf(c);
        const nomeA = t.a?.name || c.team_a || "A";
        const nomeB = t.b?.name || c.team_b || "B";
        const rw = mmRealWinner(c);
        const venceu = rw === "A" ? nomeA : nomeB;
        const perdeu = rw === "A" ? nomeB : nomeA;
        const pen = (c.real_a === c.real_b && c.classificado) ? " nos pênaltis" : "";
        const cons = c.id === "fin_1" ? `${venceu} CAMPEÃO da Copa`
          : c.id === "tp_1" ? `${venceu} ficou com o 3º lugar`
          : (() => {
              const q = mmConsequencia(c.id);
              return q.losePhase
                ? `${venceu} avançou; ${perdeu} disputa o ${q.losePhase}`
                : `${venceu} avançou; ${perdeu} ELIMINADO`;
            })();
        return `- ${diaSemana(d)} ${mmInfo(c).dt}: ${nomeA} ${c.real_a}×${c.real_b} ${nomeB}${pen} (${PH_LABEL[mmPhaseKeyOf(c.id)]}) — ${cons}`;
      });

    // Situação atual das seleções do viés emocional (v2.2) — calculada da
    // chave, então continua correta conforme o torneio anda.
    const situacaoTime = (time: string): string => {
      const doTime = confrontos
        .filter((c: Conf) => !mmIsTest(c))
        .map((c: Conf) => ({ c, t: teamsOf(c), d: mmGameDate(c) }))
        .filter((x: Conf) => x.t.a?.name === time || x.t.b?.name === time);
      if (!doTime.length) return `${time}: fora do mata-mata`;
      const fechados = doTime.filter((x: Conf) => x.c.finished && x.c.real_a != null)
        .sort((a: Conf, b: Conf) => (b.d?.getTime() || 0) - (a.d?.getTime() || 0));
      const ultimo = fechados[0];
      if (ultimo) {
        const lado = ultimo.t.a?.name === time ? "A" : "B";
        const adv = lado === "A" ? (ultimo.t.b?.name || "?") : (ultimo.t.a?.name || "?");
        const rw = mmRealWinner(ultimo.c);
        const fase = PH_LABEL[mmPhaseKeyOf(ultimo.c.id)];
        const quando = `${diaSemana(ultimo.d)} ${mmInfo(ultimo.c).dt}`;
        if (rw && rw !== lado) {
          const q = mmConsequencia(ultimo.c.id);
          return q.losePhase
            ? `${time}: perdeu pra ${adv} nas ${fase} (${quando}), ainda disputa o ${q.losePhase}`
            : `${time}: ELIMINADO da Copa — perdeu pra ${adv} nas ${fase} (${quando})`;
        }
        if (ultimo.c.id === "fin_1") return `${time}: CAMPEÃO da Copa`;
        return `${time}: VIVO no torneio — último jogo: venceu ${adv} nas ${fase} (${quando})`;
      }
      return `${time}: vivo no torneio (ainda sem jogo fechado no mata)`;
    };

    // Pessoas CITADAS na mensagem (v1.18.1): por menção real (@, resolvida
    // por telefone/lid) e por nome escrito (match caso/acento-insensitivo com
    // borda de palavra — "Du" não pode casar dentro de "durante"). Varre TODO
    // MATA_PARTS_BOT (não só os citáveis): se a pergunta for direta sobre uma
    // IA fora do top 3, o dado precisa estar disponível — quem decide se fala
    // dela por iniciativa própria é a persona (regra de comportamento), não
    // a busca de dados.
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const citadasIds = new Set<string>();
    // Achado real de teste (v1.18.2): @Jeca mencionada de verdade, LID dela
    // ainda não aprendido em bot_telefones → a menção não resolvia pra
    // ninguém e, sem nenhum sinal disso no prompt, o modelo respondeu como
    // se a marcação fosse a pessoa discutida na mensagem citada (Claude
    // Tonius). `mencaoNaoResolvida` marca esse caso pra avisar o modelo
    // explicitamente em vez de deixar a lacuna aberta pra ele preencher.
    let mencaoNaoResolvida = false;
    // v1.21 (bug real do oficial): a marcação do PRÓPRIO bot pode vir
    // DUPLICADA no payload — a mesma menção visível em duas formas (uma
    // conhecida, que dispara o gatilho, + um alias de LID que ainda não
    // conhecemos). A forma desconhecida caía aqui como "pessoa citada não
    // resolvida" e o bot respondia que não conhece... ele mesmo (bot_log 166).
    // Discriminação pelo TEXTO: cada marcação VISÍVEL vira um token
    // "@<digitos>" no corpo da mensagem. Entrada de mentions cujos dígitos
    // NÃO aparecem como token no texto é alias/fantasma de outra forma da
    // mesma marcação — nunca uma pessoa distinta sendo citada. E se o único
    // token visível é o não resolvido enquanto o bot foi marcado por uma
    // forma que NÃO aparece no texto, esse token é o alias visível da
    // marcação ao bot. O caso Jeca (v1.18.2 — pessoa real marcada antes do
    // LID aprendido) continua protegido: lá o token visível dela existe no
    // texto e não é explicável como alias do bot.
    const tokensVisiveis = new Set((String(m.texto).match(/@\d{5,}/g) || []).map((t) => t.slice(1)));
    const botMarcadoForaDoTexto = (m.mentions || []).some((j: string) => {
      const d = digitos(j);
      return idsBot.has(d) && !tokensVisiveis.has(d);
    });
    for (const j of (m.mentions || [])) {
      const d = digitos(j);
      if (!d || idsBot.has(d)) continue;
      const t = achaTel(d);
      if (t) { citadasIds.add(t.participante_id); continue; }
      if (!tokensVisiveis.has(d)) continue;                       // entrada fantasma (alias)
      if (tokensVisiveis.size === 1 && botMarcadoForaDoTexto) continue; // alias visível do bot
      mencaoNaoResolvida = true;
    }
    // v1.21.1 (caso real "Vsf @61032206725341", bot_log 183): o resolvedor já
    // tratava a menção ao bot certo, mas o TOKEN CRU continuava no texto que o
    // prompt mostra — e o MODELO não tem como saber que aquele número é ele
    // mesmo (a persona não conhece o próprio LID; nem deve — kayfabe). Sem
    // contexto na frase, ele tratava o token como um terceiro e respondia
    // "esse contato eu não conheço" por conta própria, mesmo SEM o aviso de
    // contato desconhecido no prompt. Fix: reescrever os tokens ANTES de
    // mostrar — menção ao bot vira "@Ratazana" (nome que a persona usa pra
    // si), menção a pessoa conhecida vira "@<nome>"; token realmente
    // desconhecido fica cru (casa com o aviso de contato desconhecido).
    let textoExibido = String(m.texto).slice(0, 600);
    let botMarcadoNoTexto = false;
    for (const j of (m.mentions || [])) {
      const d = digitos(j);
      if (!d || !tokensVisiveis.has(d)) continue;
      const t = achaTel(d);
      const ehAliasDoBot = !t && !idsBot.has(d) && tokensVisiveis.size === 1 && botMarcadoForaDoTexto;
      if (idsBot.has(d) || ehAliasDoBot) {
        textoExibido = textoExibido.split("@" + d).join("@Ratazana");
        botMarcadoNoTexto = true;
      } else if (t?.nome_exibicao) {
        textoExibido = textoExibido.split("@" + d).join("@" + t.nome_exibicao);
      }
    }
    const txtNorm = norm(String(m.texto));
    for (const p of MATA_PARTS_BOT) {
      if (part && p.id === part.id) continue;   // quem fala não é "pessoa citada"
      if (p.id === RATAZANA_ID) continue;       // falar do bot não é citar terceiro
      const apelido = (telefones as Conf[]).find((t: Conf) => t.participante_id === p.id)?.nome_exibicao;
      for (const cand of [p.nome, apelido].filter(Boolean)) {
        const re = new RegExp(`(^|[^a-z0-9])${escapaRe(norm(String(cand)))}($|[^a-z0-9])`);
        if (re.test(txtNorm)) { citadasIds.add(p.id); break; }
      }
    }
    // Só é "contato desconhecido" se, MESMO depois do fallback por nome
    // escrito acima, nenhuma pessoa real ficou disponível pro modelo.
    const contatoDesconhecido = mencaoNaoResolvida && citadasIds.size === 0;
    const abertosProximos = confrontos
      .filter((c: Conf) => !mmIsTest(c) && !c.finished)
      .map((c: Conf) => ({ c, d: mmGameDate(c) }))
      .filter((x: Conf) => x.d && x.d.getTime() > Date.now())
      .sort((a: Conf, b: Conf) => a.d.getTime() - b.d.getTime())
      .slice(0, 2);
    const ultimoFechado = confrontos
      .filter((c: Conf) => !mmIsTest(c) && c.finished && c.real_a != null)
      .map((c: Conf) => ({ c, d: mmGameDate(c) }))
      .filter((x: Conf) => x.d)
      .sort((a: Conf, b: Conf) => b.d.getTime() - a.d.getTime())[0];
    const blocoPessoa = (pid: string): string => {
      const ix = rank.findIndex((r) => r.p.id === pid);
      if (ix < 0) return "";
      const r = rank[ix];
      const linhas = [`- ${r.p.nome}: ${ix + 1}º lugar, ${fmtPts(r.total)} pts, ${r.eHits} placares cravados`];
      for (const { c } of abertosProximos) {
        const t = teamsOf(c);
        const jogo = `${t.a?.name || "A definir"} × ${t.b?.name || "A definir"}`;
        const pal = PAL[c.id]?.[pid];
        const qp = pal && pal.gols_a === pal.gols_b && pal.quem_passa
          ? ` (${pal.quem_passa === "A" ? t.a?.name : t.b?.name} nos pênaltis)` : "";
        linhas.push(`  ${jogo}: ${mmHasFullPred(pal) ? `palpite ${pal.gols_a}×${pal.gols_b}${qp}` : "SEM palpite ainda"}`);
      }
      if (ultimoFechado) {
        const t = teamsOf(ultimoFechado.c);
        const s = mmScore(PAL[ultimoFechado.c.id]?.[pid], ultimoFechado.c);
        linhas.push(`  Último jogo fechado (${t.a?.name || "?"} ${ultimoFechado.c.real_a}×${ultimoFechado.c.real_b} ${t.b?.name || "?"}): ${s ? `${fmtPts(s.total)} pts` : "sem palpite"}`);
      }
      return linhas.join("\n");
    };
    const pessoasCitadasBloco = [...citadasIds].slice(0, 3).map(blocoPessoa).filter(Boolean).join("\n");

    userPrompt =
      `DADOS VERIFICADOS DO BOLÃO (conversa no grupo de WhatsApp). Hoje é ${dataHoje}, ${horaAgora} em Brasília. Use somente estes dados. Não calcule nem invente nada.\n\n` +
      `MENSAGEM RECEBIDA AGORA:\n` +
      `- De: ${nome}${genero ? ` (${genero})` : ""}${posPessoa ? ` — ${posPessoa}º lugar no Ranking do Bolão com ${fmtPts(rank[posPessoa - 1].total)} pts` : ""}\n` +
      `- Texto: "${textoExibido}"\n` +
      (gatilho === "mencao"
        ? `- Você foi marcado nessa mensagem${botMarcadoNoTexto
            ? ` — a marcação "@Ratazana" no texto acima é VOCÊ MESMO (é assim que te marcam no WhatsApp), NUNCA um contato de terceiro: jamais responda que "não conhece" essa marcação`
            : ""}.\n`
        : "") +
      (contatoDesconhecido ? `- ATENÇÃO: essa marcação (@) é de um contato que você AINDA NÃO CONHECE (o número dele não está no seu cadastro ainda). Não é ninguém que já apareceu nesta conversa, nem a pessoa da mensagem citada abaixo (se houver), nem qualquer outra pessoa do Bolão — não tem como saber quem é.\n` : "") +
      (msgOriginal ? `- Ela é RESPOSTA a esta mensagem que você mandou no grupo antes: "${String(msgOriginal.texto || "").slice(0, 400)}"\n` : "") +
      (pessoasCitadasBloco ? `\nPESSOAS CITADAS NA MENSAGEM (dados reais delas no Bolão):\n${pessoasCitadasBloco}\n` : "") +
      `\nRESULTADOS RECENTES (últimos 3 dias, placares FINAIS — são fatos):\n` +
      `${resultadosRecentes.length ? resultadosRecentes.join("\n") : "- nenhum jogo fechado nos últimos 3 dias"}\n` +
      `SITUAÇÃO DAS SELEÇÕES DO SEU CORAÇÃO:\n- ${situacaoTime("Brasil")}\n- ${situacaoTime("Argentina")}\n` +
      (faseAtivaLabel ? `RODADA ATIVA AGORA (fase em andamento do mata-mata): ${faseAtivaLabel} — é ESTA a rodada corrente, mesmo que não haja nenhum jogo marcado pra hoje. "Sem jogo hoje" NÃO é "sem rodada": a rodada ativa continua sendo ${faseAtivaLabel} até ela terminar.\n` : "") +
      `JOGOS DE HOJE (ainda abertos): ${jogosHoje.length ? jogosHoje.join("; ") : "nenhum"}\n` +
      `RANKING DO BOLÃO COMPLETO (posições e pontos reais; você está em ${posRat}º):\n${rankingCompleto}\n` +
      `\nTAREFA — MODO CONVERSA (isto NÃO é mensagem programada; o formato de 4 a 7 linhas NÃO vale aqui):\n` +
      `1. PRIMEIRO responda diretamente o que ${nome === "alguém do grupo" ? "a pessoa" : nome} disse ou perguntou, como num papo de verdade.\n` +
      `2. Marcou (@) um contato desconhecido (aviso acima)? NUNCA adivinhe quem é e NUNCA reaproveite a identidade de quem apareceu antes na conversa (nem da mensagem citada, nem de ninguém) — trate como desconhecido de verdade e diga isso com naturalidade, convidando a pessoa a mandar uma mensagem no grupo pra você aprender quem ela é. Se a MESMA mensagem também escrever o nome dela por extenso, o dado real já está no bloco de PESSOAS CITADAS acima — use normalmente, sem esse aviso.\n` +
      `3. Perguntou posição, pontos ou palpite de alguém (o RANKING acima é COMPLETO e REAL, 1º ao último, sem buraco nenhum — inclusive as IAs concorrentes)? Responda com o dado REAL, com gosto e zoeira — NUNCA mande consultar o app nem "conferir depois": você é a fonte. Nunca invente que uma posição ou pessoa "não existe".\n` +
      `4. IAs concorrentes fora do top 3: você tem o dado, mas só fala delas se PERGUNTADO DIRETO sobre aquela posição/jogo/pessoa especificamente — nunca por iniciativa própria, nunca como assunto voluntário.\n` +
      `5. Jogos do dia, palpites e ranking que NÃO foram perguntados só entram se tiverem relação com o assunto — ou como fecho de UMA frase, opcional. Nunca como corpo principal não pedido.\n` +
      `6. Pergunta sobre fato de FUTEBOL/COPA que NÃO está em nenhum dado acima (artilheiro geral do torneio, recorde histórico, notícia, lesão de jogador)? Você TEM ferramenta de busca na internet — USE-A ANTES de responder, SEMPRE: sua memória de treino é antiga e já te fez cravar artilheiro errado com pose de certeza (a família cobrou). Número, recorde ou estatística externa SEM busca nesta resposta = PROIBIDO afirmar com confiança (vale a ressalva do item 8). Se pedirem explicitamente pra pesquisar/conferir, a busca é OBRIGATÓRIA — nunca responda de memória a um pedido desses. NUNCA pesquise pra responder algo que já está nos dados acima (ranking, palpites, pontos, jogos do Bolão) — você já é a fonte disso. Resposta com busca continua no tamanho e tom padrão de conversa (1 a 3 linhas, no seu jeito) — nunca despeje texto corrido da pesquisa nem cite fonte/link, resuma o fato com suas próprias palavras.\n` +
      `7. Curto: 1 a 3 linhas na maioria das vezes. Tom de conversa, ácido, em personagem.\n` +
      `8. COERÊNCIA FACTUAL OBRIGATÓRIA: os resultados e situações acima são FATOS que você conhece e comenta com naturalidade. NUNCA negue algo que está listado — se está nos resultados, aconteceu. Se perguntarem de algo que NÃO está nos dados nem foi pesquisado agora, NÃO crave: responda no tom "de cabeça eu diria X, mas não ponho a mão no fogo" e, se contestado, admita que pode estar desatualizado. Se você pesquisou (item 6) e achou resposta atual e clara, pode afirmar com confiança — não precisa da ressalva de "de cabeça".\n` +
      `9. Seu humor de fundo decorre da SITUAÇÃO DAS SELEÇÕES DO SEU CORAÇÃO acima — mas é humor de FUNDO: não verbalize o luto nem a implicância em toda resposta (dosagem está na sua persona).\n` +
      `10. RODADA/FASE ATIVA: se perguntarem qual rodada ou fase está ativa/rolando agora, a resposta é SEMPRE a "RODADA ATIVA AGORA" listada acima${faseAtivaLabel ? ` (${faseAtivaLabel})` : ""} — afirme com todas as letras que estamos NELA. NUNCA responda que estamos "entre fases", "no vácuo", "sem rodada" ou "esperando a próxima": a rodada corrente é essa até o último jogo dela ser fechado. Você pode e deve dizer, junto, que hoje não tem jogo marcado — mas isso é um detalhe da agenda do dia, não muda a rodada ativa.\n` +
      `11. Calibre a intensidade pelo gênero. Não use @. Sem link do bolão. Não cobre palpite a menos que perguntem sobre isso.`;

    let ia = await chamaIA(modelo, systemPrompt, userPrompt, 2500, WEB_SEARCH_TOOLS);
    respostaIA = ia.texto;
    // [busca:N] no destino do log: N = quantas buscas na web a API executou DE
    // VERDADE nesta resposta (0 = respondeu sem pesquisar) — auditoria do caso
    // real "cravou artilheiro errado com confiança, sem ressalva" (bot_log 164),
    // em que era impossível saber se a tool tinha rodado.
    logBase.destino += ` [busca:${ia.buscas}]`;
    let envio;
    try {
      // sanitiza=true: glitch pontual de caractere é limpo e o envio segue
      envio = await enviaEmPartes(grupoJid, respostaIA, [], true);
    } catch (e1) {
      const msg1 = String((e1 as Error)?.message || e1);
      if (!msg1.includes("Filtro de sanidade")) throw e1;
      // Corrupção grande demais pra limpar: regenera UMA vez avisando o modelo
      // do glitch — desistir aqui era SILÊNCIO total pro grupo (caso real:
      // pediram "pesquisa aí" e nada saiu — bot_log 168/169), o pior desfecho.
      await botLog({ ...logBase, resposta_ia: respostaIA, status_envio: "erro", erro: `1ª geração bloqueada pelo filtro de sanidade — regenerando: ${msg1}` });
      ia = await chamaIA(modelo, systemPrompt, userPrompt +
        "\n\nATENÇÃO (regeneração): sua resposta anterior saiu corrompida com caracteres de outro alfabeto (glitch de geração) e foi bloqueada antes do envio. Gere a resposta de novo, do zero, usando SOMENTE letras e acentos do português + emojis.", 2500, WEB_SEARCH_TOOLS);
      respostaIA = ia.texto;
      logBase.destino += ` [busca2:${ia.buscas}]`;
      envio = await enviaEmPartes(grupoJid, respostaIA, [], true);
    }
    await botLog({
      ...logBase, prompt_enviado: userPrompt, resposta_ia: respostaIA,
      mensagem_enviada: envio.partes.join("\n\n"),
      status_envio: envio.ok ? "ok" : "erro", erro: envio.ok ? null : envio.detalhe,
    });
    return { respondida: envio.ok, gatilho, motivo: envio.ok ? "respondida" : "falha no envio" };
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    await botLog({ ...logBase, prompt_enviado: userPrompt, resposta_ia: respostaIA, status_envio: "erro", erro: msg });
    return semResposta(`erro ao gerar/enviar: ${msg}`, gatilho);
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────
// CORS: a página admin chama esta função via fetch() direto do navegador
// (origem diferente: pages.dev/localhost → supabase.co). Sem estes headers o
// fetch falha silenciosamente ("Failed to fetch") mesmo com a chamada certa.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  const url = new URL(req.url);
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj, null, 2), {
      status,
      headers: { "content-type": "application/json; charset=utf-8", ...CORS_HEADERS },
    });

  // 1) Trava: só executa com o token certo
  const TOKEN = Deno.env.get("BOT_TRIGGER_TOKEN") || "";
  if (!TOKEN) return json({ ok: false, erro: "Secret BOT_TRIGGER_TOKEN não configurado" }, 500);
  if (url.searchParams.get("token") !== TOKEN) {
    return json({ ok: false, erro: "Token inválido ou ausente (?token=...)" }, 401);
  }

  const force = url.searchParams.get("force") === "1";
  const listarGrupos = url.searchParams.get("listar_grupos") === "1";
  // teste_longo=1: pede à IA uma mensagem propositalmente longa em blocos,
  // pra validar o envio dividido de verdade no WhatsApp (implica force)
  const testeLongo = url.searchParams.get("teste_longo") === "1";

  // ─── Modo FECHAR PLACAR (v1.7): ÚNICA via de escrita do placar final ─────────
  // ?tipo=fechar_placar&jogo=<id>&finished=1&real_a=N&real_b=N[&classificado=A|B][&env=dev]
  // ?tipo=fechar_placar&jogo=<id>&finished=0[&env=dev]   → reabrir (só destrava; não mexe no placar)
  // Chamado SÓ pela página admin (protegida por senha = este mesmo ?token=).
  // Roda com SERVICE ROLE KEY: é a ÚNICA via que ainda consegue gravar real_a/
  // real_b/classificado/finished em mata_confrontos — a anon key (usada pela
  // home e por qualquer chamada REST direta) teve UPDATE nessas 4 colunas
  // revogado no banco (supabase_placar_lock.sql). Sem isso, esconder o campo
  // no front não impediria escrita direta via REST com a anon key exposta.
  if (url.searchParams.get("tipo") === "fechar_placar") {
    const jogoId = url.searchParams.get("jogo") || "";
    const pref = url.searchParams.get("env") === "dev" ? "dev_" : "";
    const finishedParam = url.searchParams.get("finished");
    try {
      if (!SERVICE_KEY) throw new Error("Secret SUPABASE_SERVICE_ROLE_KEY não configurado");
      if (!jogoId) throw new Error("parâmetro ?jogo=<id do confronto> é obrigatório");
      if (finishedParam !== "0" && finishedParam !== "1") throw new Error("parâmetro ?finished= deve ser 0 ou 1");
      // Confronto precisa já existir: nunca criar linha nova aqui (um upsert às
      // cegas criaria uma linha "fantasma" sem team_a/team_b/phase se o id não
      // existisse — já aconteceu em teste com um confronto [TESTE] apagado).
      const existentes = await sbGet(`${pref}mata_confrontos?id=eq.${encodeURIComponent(jogoId)}&select=id`);
      if (!Array.isArray(existentes) || !existentes.length) {
        throw new Error(`confronto "${jogoId}" não existe em ${pref}mata_confrontos — nada foi gravado`);
      }
      // deno-lint-ignore no-explicit-any
      const row: Record<string, any> = { id: jogoId, updated_at: new Date().toISOString() };
      if (finishedParam === "0") {
        row.finished = false;   // reabrir: só destrava; placar/classificado ficam como estavam
      } else {
        const ra = url.searchParams.get("real_a"), rb = url.searchParams.get("real_b");
        if (ra == null || rb == null || ra === "" || rb === "") throw new Error("fechar exige ?real_a= e ?real_b=");
        const A = parseInt(ra), B = parseInt(rb);
        if (!Number.isInteger(A) || !Number.isInteger(B) || A < 0 || B < 0) throw new Error("real_a/real_b precisam ser inteiros ≥ 0");
        row.real_a = A; row.real_b = B; row.finished = true;
        if (A === B) {
          const cl = url.searchParams.get("classificado");
          if (cl !== "A" && cl !== "B") throw new Error("empate exige ?classificado=A ou B (quem passou nos pênaltis)");
          row.classificado = cl;
        } else {
          row.classificado = null;   // não é empate: limpa escolha de pênaltis antiga, se houver
        }
      }
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${pref}mata_confrontos?on_conflict=id`, {
        method: "POST",
        headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([row]),
      });
      const corpo = await r.text();
      if (!r.ok) throw new Error(`Supabase → HTTP ${r.status}: ${corpo.slice(0, 300)}`);
      await botLog({
        tipo: finishedParam === "0" ? "reabrir_placar" : "fechar_placar",
        destino: jogoId,
        mensagem_enviada: JSON.stringify(row),
        status_envio: "ok",
      });
      // Avanço automático de fase (v1.19): só ao FECHAR (nunca reabrir) e só
      // em PRODUÇÃO (nunca &env=dev — fase_ativa não tem variante dev).
      if (finishedParam === "1" && !pref) {
        await verificaEAvancaFaseAtiva();
      }
      return json({ ok: true, jogo: jogoId, ambiente: pref ? "dev" : "prod", gravado: row });
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      await botLog({
        tipo: finishedParam === "0" ? "reabrir_placar" : "fechar_placar",
        destino: jogoId,
        status_envio: "erro",
        erro: msg,
      });
      return json({ ok: false, jogo: jogoId, erro: msg }, 400);
    }
  }

  // ─── Modo ENVIAR TEXTO (v1.8): envia um texto PRONTO ao grupo escolhido ──────
  // POST ?tipo=enviar_texto&destino=teste|oficial — body JSON {texto}.
  // Usado pelo admin: enviar o preview aprovado do "Acordar o Ratazana" e a
  // mensagem inaugural. NÃO passa por IA: envia o texto exatamente como veio
  // (só dividido em partes, como qualquer mensagem do robô).
  if (url.searchParams.get("tipo") === "enviar_texto") {
    let destinoLbl = "";
    try {
      const { grupo, destino } = grupoDestino(url);
      destinoLbl = destino;
      const faltamZap = ["ZAPZAP_API_KEY", "ZAPZAP_API_SECRET", "ZAPZAP_ENDPOINT_BASE"].filter((n) => !Deno.env.get(n));
      if (faltamZap.length) throw new Error(`Secrets faltando: ${faltamZap.join(", ")}`);
      if (req.method !== "POST") throw new Error("use POST com body JSON {texto}");
      const body = await req.json().catch(() => ({}));
      const texto = String(body?.texto || "").trim();
      if (!texto) throw new Error("body JSON precisa de {texto} não vazio");
      if (texto.length > 4000) throw new Error("texto longo demais (máx. 4000 caracteres)");
      const envio = await enviaEmPartes(grupo, texto);
      await botLog({
        tipo: "envio_manual",
        destino: `${destino} (${grupo})`,
        mensagem_enviada: envio.partes.join("\n\n"),
        status_envio: envio.ok ? "ok" : "erro",
        erro: envio.ok ? null : envio.detalhe,
      });
      return json({ ok: envio.ok, enviado: envio.ok, destino, n_mensagens: envio.partes.length, zapzap: envio.detalhe }, envio.ok ? 200 : 502);
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      await botLog({ tipo: "envio_manual", destino: destinoLbl, status_envio: "erro", erro: msg });
      return json({ ok: false, erro: msg }, 400);
    }
  }

  // ─── Modo WEBHOOK (Fase 2 — Ouvidos, v1.14; DOIS GRUPOS desde v1.20) ────────
  // POST vindo da ZapZap a cada evento da instância (a URL com o token
  // embutido é registrada pelo modo configurar_webhook, abaixo). Reconhece os
  // DOIS grupos monitorados (GRUPO_TESTE_ID e GRUPO_OFICIAL_ID) — qualquer
  // outro chat é ignorado. Captura (Ouvidos) e Conversa (Fase 3) são DOIS
  // CONTROLES INDEPENDENTES por grupo (antes viviam atrás do mesmo filtro
  // "é o grupo de teste?"): o de TESTE nasceu ligado nos dois desde o início
  // e continua incondicional; o OFICIAL exige opt-in explícito em
  // bot_config (`captura_ativa_oficial`/`conversa_ativa_oficial` = '1' —
  // ausente ou qualquer outro valor = desligado, fail-closed). Isso permite
  // ligar a captura sozinha primeiro (só observar, sem responder) antes de
  // ligar a conversa. Mensagens do próprio bot (fromMe) são sempre ignoradas.
  // Sempre responde 200 (mesmo em erro, com ok:false + bot_log): comportamento
  // de retry da ZapZap não é documentado e um 5xx nosso não pode virar loop.
  if (url.searchParams.get("tipo") === "webhook") {
    // payload/destinoLabel ficam fora do try: o catch precisa deles pro log
    // de erro (o body do Request só pode ser lido uma vez — req.clone()
    // tardio não funciona; destinoLabel pode não ter sido decidido ainda se
    // o erro aconteceu antes, daí o log cai no fallback "grupo desconhecido").
    let payload: Conf = null;
    let destinoLabel: "teste" | "oficial" | null = null;
    try {
      if (req.method !== "POST") return json({ ok: true, ignorado: "webhook só processa POST" });
      payload = await req.json().catch(() => null);
      if (!payload) return json({ ok: true, ignorado: "body não é JSON" });
      const grupoTeste = Deno.env.get("GRUPO_TESTE_ID") || "";
      const grupoOficial = Deno.env.get("GRUPO_OFICIAL_ID") || "";
      if (!grupoTeste) return json({ ok: false, erro: "Secret GRUPO_TESTE_ID não configurado" });

      const m = extraiMensagemWebhook(payload);
      if (m.chatJid && m.chatJid === grupoTeste) destinoLabel = "teste";
      else if (m.chatJid && grupoOficial && m.chatJid === grupoOficial) destinoLabel = "oficial";
      if (!destinoLabel) return json({ ok: true, ignorado: "fora dos grupos monitorados" });
      const grupoAtual = destinoLabel === "oficial" ? grupoOficial : grupoTeste;
      if (m.fromMe) {
        // v1.21: antes de descartar, aproveita o evento do PRÓPRIO bot pra
        // aprender o LID dele NESTE grupo (base do fix "@Ratazana00 virou
        // contato desconhecido" — ver aprendeIdentidadeBotDeFromMe).
        await aprendeIdentidadeBotDeFromMe(m);
        return json({ ok: true, ignorado: "mensagem do próprio bot" });
      }
      if (!m.messageId) return json({ ok: true, ignorado: "evento sem id de mensagem" });

      // Controles por grupo (v1.20): teste sempre ligado nos dois; oficial
      // só com o opt-in explícito. Uma consulta só, feita SÓ quando o
      // destino é oficial (zero custo extra no caminho do teste).
      let capturaHabilitada = true;
      let conversaHabilitada = destinoLabel === "teste";
      if (destinoLabel === "oficial") {
        const cfgOficial = await sbGet(
          "bot_config?key=in.(captura_ativa_oficial,conversa_ativa_oficial)&select=key,value"
        ).catch(() => []);
        const cfgMap: Record<string, string> = {};
        for (const r of (cfgOficial as Conf[])) cfgMap[r.key] = r.value;
        capturaHabilitada = cfgMap.captura_ativa_oficial === "1";
        conversaHabilitada = cfgMap.conversa_ativa_oficial === "1";
      }
      if (!capturaHabilitada) {
        return json({ ok: true, grupo: destinoLabel, ignorado: "captura desligada pro grupo oficial (bot_config.captura_ativa_oficial)" });
      }

      // remetente_telefone: dígitos do JID, trocados pelo E.164 tabelado em
      // bot_telefones quando houver correspondência por TELEFONE ou por LID
      // (v1.18 — remetente em grupo chega como ...@lid; a coluna lid de
      // bot_telefones faz a ponte). Auto-aprendizado: quando o payload traz
      // telefone (sender_pn) E lid do mesmo remetente, o lid é gravado na
      // tabela sozinho (best-effort) — o mapeamento se completa com o uso.
      const digitosDe = (s: string) => String(s || "").split("@")[0].split(":")[0].replace(/\D/g, "");
      let telefone = digitosDe(m.remetenteJid);
      try {
        const tels = await sbGet("bot_telefones?select=participante_id,telefone_whatsapp,lid");
        const dJid = telefone;
        const dPn = digitosDe(m.senderPn || "");
        const dLidMsg = m.remetenteJid && m.remetenteJid.includes("@lid")
          ? dJid
          : digitosDe(m.senderLid || "");
        const hit = (tels as Conf[]).find((t: Conf) => {
          const tTel = String(t.telefone_whatsapp || "").replace(/\D/g, "");
          const tLid = String(t.lid || "").replace(/\D/g, "");
          return (dJid && (tTel === dJid || (tLid && tLid === dJid))) || (dPn && tTel === dPn);
        });
        if (hit) {
          telefone = String(hit.telefone_whatsapp);
          if (dLidMsg && !String(hit.lid || "").trim()) {
            // aprendeu um lid novo: grava pra próxima mensagem já resolver direto
            fetch(`${SUPABASE_URL}/rest/v1/bot_telefones?participante_id=eq.${encodeURIComponent(hit.participante_id)}`, {
              method: "PATCH",
              headers: { ...sbHeaders(), Prefer: "return=minimal" },
              body: JSON.stringify({ lid: dLidMsg }),
            }).catch(() => {});
          }
        }
      } catch { /* sem cruzamento, ficam os dígitos crus do JID */ }

      const row = {
        message_id: m.messageId,
        grupo_jid: m.chatJid,
        remetente_jid: m.remetenteJid,
        remetente_telefone: telefone || null,
        texto: m.texto,
        mentions: m.mentions,
        quoted_message_id: m.quotedId,
        timestamp: m.timestamp,
        raw_payload: payload,
      };
      // ignore-duplicates no message_id: reentrega do mesmo evento não duplica
      const r = await fetch(`${SUPABASE_URL}/rest/v1/mensagens_grupo?on_conflict=message_id`, {
        method: "POST",
        headers: { ...sbHeaders(), Prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify([row]),
      });
      const corpo = await r.text();
      if (!r.ok) throw new Error(`mensagens_grupo → HTTP ${r.status}: ${corpo.slice(0, 300)}`);
      let inserida = false;
      try { inserida = JSON.parse(corpo).length > 0; } catch { /* return=representation sempre é JSON */ }

      // primeira captura da história → aviso único "o Ratazana vê tudo".
      // v1.20: SÓ pro grupo de TESTE — a estreia do oficial é o Comunicado
      // Oficial (texto fixo, disparado manualmente via enviar_texto), nunca
      // esse aviso automático. Reforço explícito de intenção aqui, mesmo o
      // claim de bot_config já sendo permanente/global por natureza.
      const avisoEnviado = (inserida && destinoLabel === "teste") ? await avisoOuvidosUmaVez(grupoAtual) : false;

      // Fase 3 (Conversa): só pra mensagem RECÉM-inserida (reentrega/duplicata
      // nunca responde de novo — dedup do INSERT é também dedup da resposta)
      // E só se a conversa estiver ligada pro grupo (teste sempre; oficial
      // com o opt-in checado acima).
      const conversa = (inserida && conversaHabilitada)
        ? await conversaTalvezResponder(m, grupoAtual, telefone, destinoLabel)
        : { respondida: false, gatilho: null, motivo: inserida ? "conversa desligada pro grupo" : "duplicada" };
      return json({
        ok: true, grupo: destinoLabel, capturada: inserida, duplicada: !inserida, aviso_enviado: avisoEnviado,
        respondida: conversa.respondida, gatilho: conversa.gatilho, motivo_conversa: conversa.motivo,
      });
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      // O payload bruto vai junto no log de erro: se o INSERT falhar, a
      // mensagem não se perde — dá pra reprocessar a partir do bot_log
      // (lição do bug do índice parcial: 3 capturas reais perdidas porque o
      // erro não guardava o evento).
      let payloadTxt: string | null = null;
      try { payloadTxt = payload ? JSON.stringify(payload).slice(0, 8000) : null; } catch { /* payload não serializável */ }
      await botLog({ tipo: "webhook_captura", destino: destinoLabel ? `(grupo ${destinoLabel})` : "(grupo desconhecido)", prompt_enviado: payloadTxt, status_envio: "erro", erro: msg });
      return json({ ok: false, erro: msg }); // 200 de propósito, ver comentário acima
    }
  }

  // ─── Modo CONFIGURAR WEBHOOK (utilitário, v1.14; fix v1.15.1): auto-registro ─
  // A própria função registra a URL de captura na instância (ela conhece o
  // próprio token via env e a própria URL via SUPABASE_URL) — o Vini só chama
  // ?tipo=configurar_webhook uma vez, sem copiar URL pra painel nenhum.
  // O sucesso é CONFERIDO relendo a config depois do POST (campo "configured"),
  // e a "dica" reflete o resultado real — não é mais texto fixo de sucesso.
  if (url.searchParams.get("tipo") === "configurar_webhook") {
    try {
      const faltamZap = ["ZAPZAP_API_KEY", "ZAPZAP_API_SECRET", "ZAPZAP_ENDPOINT_BASE"].filter((n) => !Deno.env.get(n));
      if (faltamZap.length) throw new Error(`Secrets faltando: ${faltamZap.join(", ")}`);
      const urlWebhook = `${SUPABASE_URL}/functions/v1/ratazana-cobranca?token=${TOKEN}&tipo=webhook`;
      // A URL registrada carrega o token; tudo que sai na resposta/log passa
      // por redação (a config da ZapZap ecoa a URL completa de volta).
      const redige = (s: string) => s.split(TOKEN).join("[token]");
      const parse = (s: string) => { try { return JSON.parse(redige(s)); } catch { return redige(s).slice(0, 500); } };
      const antes = await fetch(`${zapBase()}/webhook`, { headers: zapHeaders() })
        .then((r) => r.text()).catch((e) => `(falha ao ler config atual: ${e})`);
      // Achado real (registro falhou com "URL do webhook é obrigatória"
      // mandando só {url}): a doc pública documenta "url" no POST /webhook da
      // instância e "webhook_url" no PUT de gestão — o backend valida o
      // segundo nome. Vão os DOIS no body: campo extra é ignorado, e o que o
      // validador procurar estará lá com o mesmo valor.
      const r = await fetch(`${zapBase()}/webhook`, {
        method: "POST",
        headers: zapHeaders(),
        body: JSON.stringify({ url: urlWebhook, webhook_url: urlWebhook, enabled: true }),
      });
      const corpo = await r.text();
      // Confirmação de verdade: relê a config e procura a NOSSA URL (token
      // incluso) apontando pro modo webhook — não confia só no 2xx do POST.
      const depois = await fetch(`${zapBase()}/webhook`, { headers: zapHeaders() })
        .then((rr) => rr.text()).catch(() => "(falha ao reler a config)");
      const configured = r.ok && depois.includes(TOKEN) && depois.includes("tipo=webhook");
      await botLog({
        tipo: "configurar_webhook", destino: "instância ZapZap",
        mensagem_enviada: configured ? "(webhook de captura registrado e conferido na releitura)" : null,
        status_envio: configured ? "ok" : "erro",
        erro: configured ? null : `POST HTTP ${r.status}: ${redige(corpo).slice(0, 300)}`,
      });
      const dica = configured
        ? "Webhook registrado e CONFERIDO na config da instância. Mande uma mensagem no grupo de TESTE pra validar a captura em mensagens_grupo."
        : r.ok
          ? "A ZapZap respondeu 2xx ao registro, mas a releitura da config NÃO mostrou a URL de captura — confira webhook_atual abaixo antes de confiar."
          : "O registro FALHOU (veja resposta_zapzap). A config vigente está em webhook_atual.";
      return json({
        ok: r.ok,
        configured,
        dica,
        webhook_anterior: parse(antes),
        resposta_zapzap: parse(corpo),
        webhook_atual: parse(depois),
      }, configured ? 200 : 502);
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      await botLog({ tipo: "configurar_webhook", destino: "instância ZapZap", status_envio: "erro", erro: msg });
      return json({ ok: false, configured: false, erro: msg }, 500);
    }
  }

  // 2) Confere secrets necessários (nunca mostra valores, só nomes).
  // Os IDs de grupo NÃO entram aqui: grupoDestino valida só o do destino pedido.
  const necessarios = listarGrupos
    ? ["ZAPZAP_API_KEY", "ZAPZAP_API_SECRET", "ZAPZAP_ENDPOINT_BASE"]
    : ["ZAPZAP_API_KEY", "ZAPZAP_API_SECRET", "ZAPZAP_ENDPOINT_BASE", "ANTHROPIC_API_KEY"];
  const faltandoSecrets = necessarios.filter((n) => !Deno.env.get(n));
  if (faltandoSecrets.length) {
    return json({ ok: false, erro: `Secrets faltando: ${faltandoSecrets.join(", ")}` }, 500);
  }

  // Modo auxiliar: listar grupos do WhatsApp (pra descobrir o ID ...@g.us).
  // Devolve também uma lista normalizada [{nome,id}] pro utilitário do admin.
  if (listarGrupos) {
    try {
      const r = await fetch(`${zapBase()}/group/list`, { headers: zapHeaders() });
      const corpo = await r.text();
      let grupos: unknown;
      try { grupos = JSON.parse(corpo); } catch { grupos = corpo.slice(0, 2000); }
      // normalização best-effort (formato da ZapZap pode variar; o cru vai junto)
      const achaLista = (o: unknown): Conf[] | null => {
        if (Array.isArray(o)) return o as Conf[];
        if (o && typeof o === "object") {
          for (const v of Object.values(o as Record<string, unknown>)) {
            const res = achaLista(v);
            if (res) return res;
          }
        }
        return null;
      };
      const bruta = achaLista(grupos);
      // Campos confirmados na resposta real da ZapZap: "JID" e "Name" (maiúsculos).
      // Fallbacks de nomes alternativos mantidos por robustez (formato pode variar).
      const gruposNorm = bruta
        ? bruta.map((g: Conf) => ({
            nome: g?.Name || g?.name || g?.subject || g?.title || g?.groupName || "(sem nome)",
            id: g?.JID || g?.jid || g?.Jid || g?.id || g?.groupId || g?.chatId || "",
          })).filter((g) => g.id)
        : [];
      return json({
        ok: r.ok,
        dica: "Copie o ID (...@g.us) do grupo da família para o secret GRUPO_OFICIAL_ID (e o do grupo de teste para GRUPO_TESTE_ID).",
        grupos: gruposNorm,
        resposta_zapzap: grupos,
      }, r.ok ? 200 : 502);
    } catch (e) {
      return json({ ok: false, erro: `Falha ao listar grupos: ${String((e as Error)?.message || e)}` }, 500);
    }
  }

  // ─── Modo FIM DE JOGO (v1.6): comentário curto após fechar pela página admin ─
  // ?tipo=fim_de_jogo&jogo=<id>[&env=dev]. Quem FECHA o jogo é a página admin,
  // direto na tabela; este modo só comenta. Falha aqui NUNCA desfaz nem
  // bloqueia o fechamento (erro fica no bot_log e a vida segue).
  if (url.searchParams.get("tipo") === "fim_de_jogo") {
    const jogoId = url.searchParams.get("jogo") || "";
    const pref = url.searchParams.get("env") === "dev" ? "dev_" : "";
    // preview=1: gera e DEVOLVE a mensagem sem enviar nada (o admin mostra o
    // preview e o envio aprovado sai depois pelo tipo=enviar_texto).
    const preview = url.searchParams.get("preview") === "1";
    // Direcionamento opcional do admin (direção de cena, nunca copiado literal)
    const pessoaParam = (url.searchParams.get("pessoa") || "").trim();
    const direcaoParam = (url.searchParams.get("direcao") || "").trim().slice(0, 400);
    const logBase = { tipo: "fim_de_jogo" + (preview ? "_preview" : "") + (pref ? "_dev" : ""), destino: preview ? "(preview, sem envio)" : "" };
    let etapa = "consulta_banco";
    let userPrompt: string | null = null;
    let respostaIA: string | null = null;
    let modelo = MODELO_FALLBACK;
    try {
      if (!jogoId) throw new Error("parâmetro ?jogo=<id do confronto> é obrigatório");
      const [confrontos, palpites, cfg, telefones] = await Promise.all([
        sbGet(`${pref}mata_confrontos?select=*`),
        sbGet(`${pref}mata_palpites?select=confronto_id,pid,gols_a,gols_b,quem_passa`),
        sbGet("bot_config?key=in.(system_prompt_ratazana,modelo_ia)&select=key,value"),
        sbGet("bot_telefones?select=participante_id,nome_exibicao,genero,telefone_whatsapp,is_humano").catch(() => []),
      ]);
      const cfgMap: Record<string, string> = {};
      for (const row of cfg) cfgMap[row.key] = row.value;
      const systemPrompt = cfgMap["system_prompt_ratazana"];
      modelo = (cfgMap["modelo_ia"] || "").trim() || MODELO_FALLBACK;
      if (!systemPrompt) throw new Error("bot_config sem 'system_prompt_ratazana' — rode o supabase_bot.sql");
      const c = confrontos.find((x: Conf) => x.id === jogoId);
      if (!c) throw new Error(`jogo "${jogoId}" não encontrado em ${pref}mata_confrontos`);
      if (c.real_a == null || c.real_b == null || !c.finished) {
        throw new Error(`jogo "${jogoId}" ainda não está fechado com placar final`);
      }

      // Apuração (mesma pontuação do app): pontos, cravadas, zebra, troca de líder.
      // ⚠️ Times SEMPRE resolvidos pela chave (makeResolver): de oitavas em diante
      // team_a/team_b são NULL na tabela — usar a coluna crua deixava a mensagem
      // sair só com o placar, sem nome de time (bug real do lançamento).
      etapa = "apuracao";
      const PAL: Record<string, Record<string, Conf>> = {};
      for (const p of palpites) (PAL[p.confronto_id] ??= {})[p.pid] = p;
      const teamsOf = makeResolver(confrontos);
      const t = teamsOf(c);
      const nomeA = t.a?.name || c.team_a || "Time A";
      const nomeB = t.b?.name || c.team_b || "Time B";
      const phaseKey = mmPhaseKeyOf(c.id);
      const faseNome = PH_LABEL[phaseKey] || phaseKey;
      const turbo = MM_TURBO.has(c.id);
      const mult = fmtPts((MM_PHASE_MULT[phaseKey] || 1) * (turbo ? 2 : 1));

      // Ranking ANTES de montar qualquer lista de nomes: precisa do top 3 pra
      // saber quais IAs concorrentes existem no texto (regra v2.1, ver
      // participantesCitaveis). Calculado aqui (não só lá embaixo pra troca de
      // líder) porque pontos/palpitesTxt de baixo já dependem do filtro.
      const semEste = confrontos.filter((x: Conf) => x.id !== c.id);
      const rankSem = MATA_PARTS_BOT.map((p) => ({ p, ...mataStats(p.id, semEste, PAL) }))
        .sort((a, b) => b.total - a.total || b.eHits - a.eHits || b.rHits - a.rHits);
      const rankCom = MATA_PARTS_BOT.map((p) => ({ p, ...mataStats(p.id, confrontos, PAL) }))
        .sort((a, b) => b.total - a.total || b.eHits - a.eHits || b.rHits - a.rHits);
      const liderAntes = rankSem[0], liderDepois = rankCom[0];
      const posRat = rankCom.findIndex((r) => r.p.id === RATAZANA_ID) + 1;
      const liderTxt = liderAntes.p.id !== liderDepois.p.id
        ? `HOUVE TROCA DE LÍDER: ${liderDepois.p.nome} assumiu a ponta com ${fmtPts(liderDepois.total)} pontos (o líder anterior era ${liderAntes.p.nome} com ${fmtPts(liderAntes.total)} pontos)`
        : `sem troca de líder: segue ${liderDepois.p.nome} com ${fmtPts(liderDepois.total)} pontos`;
      const citaveis = participantesCitaveis(rankCom);

      const pontos = citaveis.map((p) => ({ p, s: mmScore(PAL[c.id]?.[p.id], c) }))
        .filter((x) => x.s)
        .sort((a: Conf, b: Conf) => b.s.total - a.s.total);
      const cravaram = pontos.filter((x: Conf) => x.s.exato).map((x: Conf) => x.p.nome);
      // acertaram o resultado (vencedor/empate), cravando ou não
      const rres = c.real_a > c.real_b ? "A" : c.real_a < c.real_b ? "B" : "E";
      const acertaramRes = pontos.filter((x: Conf) => {
        const pal = PAL[c.id]?.[x.p.id];
        const pres = pal.gols_a > pal.gols_b ? "A" : pal.gols_a < pal.gols_b ? "B" : "E";
        return pres === rres;
      }).map((x: Conf) => x.p.nome);
      // palpites são públicos: lista completa palpite + pontos deste jogo
      // (só de quem é citável — IA concorrente fora do top 3 nem aparece aqui)
      const palpitesTxt = citaveis.map((p) => {
        const pal = PAL[c.id]?.[p.id];
        if (!pal || pal.gols_a == null || pal.gols_b == null) return null;
        const s = mmScore(pal, c);
        const qp = pal.gols_a === pal.gols_b && pal.quem_passa
          ? ` (${pal.quem_passa === "A" ? nomeA : nomeB} nos pênaltis)` : "";
        return `${p.nome} ${pal.gols_a}×${pal.gols_b}${qp} = ${s ? fmtPts(s.total) : "0"} pontos`;
      }).filter(Boolean).join("; ") || "ninguém tinha palpite registrado";

      // Desfecho: vencedor, pênaltis narráveis (placar do tempo normal = o empate)
      const rw = mmRealWinner(c);
      const venceuNome = rw === "A" ? nomeA : rw === "B" ? nomeB : nomeA;
      const perdeuNome = rw === "A" ? nomeB : nomeA;
      const foiPenaltis = c.real_a === c.real_b && !!c.classificado;
      const desfechoTxt = foiPenaltis
        ? `empate em ${c.real_a}×${c.real_b} no tempo normal + prorrogação; ${venceuNome} venceu ${perdeuNome} NOS PÊNALTIS`
        : `${venceuNome} venceu ${perdeuNome} por ${Math.max(c.real_a, c.real_b)}×${Math.min(c.real_a, c.real_b)}`;

      // Consequência: derivada da chave (quem avança pra onde / quem foi eliminado)
      let consequenciaTxt: string;
      if (c.id === "fin_1") {
        consequenciaTxt = `${venceuNome} é o CAMPEÃO da Copa 2026; ${perdeuNome} fica com o vice`;
      } else if (c.id === "tp_1") {
        consequenciaTxt = `${venceuNome} fica com o 3º lugar da Copa; ${perdeuNome} termina em 4º`;
      } else {
        const cons = mmConsequencia(c.id);
        consequenciaTxt = `${venceuNome} está classificado (avança pra fase: ${cons.winPhase || "próxima"})` +
          (cons.losePhase
            ? `; ${perdeuNome} vai disputar o ${cons.losePhase}`
            : `; ${perdeuNome} está ELIMINADO da Copa`);
      }

      const z = mmZebra(c);
      let zebraTxt = "não havia zebra definida neste jogo";
      if (z) {
        const nmAz = z.azarao === "A" ? nomeA : nomeB;
        if (rw === z.azarao) {
          const premiados = pontos.filter((x: Conf) => x.s.zebra > 0).map((x: Conf) => x.p.nome);
          zebraTxt = `${z.tipo === "zebrao" ? "ZEBRÃO PAGOU" : "ZEBRA PAGOU"}: o azarão ${nmAz} eliminou ${rw === "A" ? nomeB : nomeA}` +
            ` (+${z.tipo === "zebrao" ? 5 : 3} pra quem apostou nele${premiados.length ? `: ${listaNomes(premiados)}` : "; ninguém apostou"})`;
        } else {
          zebraTxt = `havia ${z.tipo === "zebrao" ? "zebrão" : "zebra"} definida (azarão ${nmAz}), mas não pagou`;
        }
      }

      const meu = pontos.find((x: Conf) => x.p.id === RATAZANA_ID);
      const meuPal = PAL[c.id]?.[RATAZANA_ID];
      // gêneros de bot_telefones (persona calibra intensidade por gênero)
      const generos = (telefones as Conf[]).filter((x: Conf) => x.genero)
        .map((x: Conf) => `${x.nome_exibicao || MATA_PARTS_BOT.find((p) => p.id === x.participante_id)?.nome || x.participante_id} (${x.genero})`);

      // Direcionamento do admin = direção de cena: a IA incorpora a IDEIA na
      // mensagem, mas NUNCA copia/cita o texto do campo literalmente.
      let direcaoBloco = "";
      if (pessoaParam || direcaoParam) {
        const tel = (telefones as Conf[]).find((x: Conf) => x.participante_id === pessoaParam);
        const alvoNome = tel?.nome_exibicao ||
          MATA_PARTS_BOT.find((p) => p.id === pessoaParam)?.nome ||
          pessoaParam || "";
        direcaoBloco =
          `\nDIREÇÃO DE CENA (instrução INTERNA do admin, invisível pro grupo: siga a ideia dentro do personagem e dos seus limites de tom, mas é PROIBIDO copiar, citar ou parafrasear literalmente o texto desta instrução na mensagem):\n` +
          (alvoNome ? `- Dê atenção especial a ${alvoNome} nesta mensagem.\n` : "") +
          (direcaoParam ? `- ${direcaoParam}\n` : "");
      }

      etapa = "monta_prompt";
      userPrompt =
        `DADOS VERIFICADOS DO BOLÃO (fim de jogo, gerados em ${agoraBrasilia()}, horário de Brasília). Use somente estes dados. Não calcule nem invente nada.\n\n` +
        `JOGO ENCERRADO AGORA (${faseNome}): ${nomeA} ${c.real_a}×${c.real_b} ${nomeB} — valia ×${mult}${turbo ? " (jogo TURBO)" : ""}\n` +
        `- Desfecho: ${desfechoTxt}\n` +
        `- Consequência: ${consequenciaTxt}\n` +
        `- Zebra: ${zebraTxt}\n` +
        `- Cravaram o placar exato: ${cravaram.length ? listaNomes(cravaram) : "ninguém"}\n` +
        `- Acertaram o resultado: ${acertaramRes.length ? listaNomes(acertaramRes) : "ninguém"}\n` +
        `- Palpites e pontos neste jogo: ${palpitesTxt}\n` +
        `- Seu palpite: ${meuPal && meuPal.gols_a != null ? `${meuPal.gols_a}×${meuPal.gols_b}` : "não registrado"}; seus pontos neste jogo: ${meu ? fmtPts(meu.s.total) : "0"}\n` +
        `- Ranking do Bolão: ${liderTxt}; você está em ${posRat}º com ${fmtPts(rankCom[posRat - 1].total)} pontos\n` +
        (generos.length ? `- Gênero dos participantes (pra calibrar a intensidade): ${generos.join("; ")}\n` : "") +
        direcaoBloco +
        `\nTAREFA: escreva o comentário de FIM DE JOGO para o grupo de WhatsApp (4 a 7 linhas), seguindo o CONTEXTO OBRIGATÓRIO da persona: cite os DOIS times pelo nome e a fase, o desfecho (se teve pênaltis, narre a emoção), a consequência (quem avança pra qual fase, quem foi eliminado), zebra se pagou (aí abra com o alerta e elogie quem apostou nela), quem cravou/acertou o resultado e os pontos relevantes das pessoas. Sem cobrar palpite de ninguém, sem link do bolão. Mensagem única.`;

      etapa = "anthropic";
      const ia = await chamaIA(modelo, systemPrompt, userPrompt);
      respostaIA = ia.texto;

      // Menção obrigatória (v1.10): linha final adicionada pela APLICAÇÃO, com
      // marcação real (@<numero> + campo mentions). Quem já é alvo da direção
      // de cena não entra no sorteio (não marcar 2x a mesma pessoa por motivos
      // diferentes na mesma mensagem).
      etapa = "mencao";
      const excluirDaMencao = new Set<string>();
      if (pessoaParam) excluirDaMencao.add(pessoaParam);
      const prov = linhaProvocacao(telefones as Conf[], excluirDaMencao);
      let textoFinal = respostaIA;
      const mentions: string[] = [];
      if (prov) {
        textoFinal += "\n\n" + prov.linha;
        mentions.push(prov.mention);
      }

      // PREVIEW: devolve a mensagem gerada SEM enviar nada ao WhatsApp.
      if (preview) {
        const partes = divideEmPartes(textoFinal);
        await botLog({
          ...logBase,
          prompt_enviado: userPrompt,
          resposta_ia: respostaIA,
          status_envio: "nao_enviado",
        });
        return json({
          ok: true,
          preview: true,
          enviado: false,
          jogo: jogoId,
          ambiente: pref ? "dev" : "prod",
          modelo,
          uso_tokens: ia.usage,
          n_mensagens: partes.length,
          mensagens: partes,
          texto: textoFinal,
          mencao: prov ? prov.alvo : null,
        });
      }

      etapa = "zapzap";
      const { grupo: GRUPO, destino } = grupoDestino(url);
      logBase.destino = `${destino} (${GRUPO})`;
      const envio = await enviaEmPartes(GRUPO, textoFinal, mentions);

      etapa = "log";
      await botLog({
        ...logBase,
        prompt_enviado: userPrompt,
        resposta_ia: respostaIA,
        mensagem_enviada: envio.partes.join("\n\n"),
        status_envio: envio.ok ? "ok" : "erro",
        erro: envio.ok ? null : envio.detalhe,
      });
      return json({
        ok: envio.ok,
        enviado: envio.ok,
        jogo: jogoId,
        destino,
        ambiente: pref ? "dev" : "prod",
        modelo,
        uso_tokens: ia.usage,
        n_mensagens: envio.partes.length,
        mensagens: envio.partes,
        zapzap: envio.detalhe,
      }, envio.ok ? 200 : 502);
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      await botLog({
        ...logBase,
        prompt_enviado: userPrompt,
        resposta_ia: respostaIA,
        status_envio: "erro",
        erro: `[etapa: ${etapa}] ${msg}`,
      });
      return json({ ok: false, etapa, jogo: jogoId, erro: msg }, 500);
    }
  }

  // ─── Modo AGENDA DO DIA (Fase 4 — pensado pra pg_cron às 9h) ────────────────
  // ?tipo=agenda&destino=teste|oficial[&env=dev][&force=1]
  // Painorama dos jogos de hoje (turbo/zebra) + o ÚNICO alerta de liderança
  // detalhado do dia (persona v2.1: "só na futura mensagem de agenda das 9h"
  // — é esta). v1.13: a agenda NÃO fala mais de quem falta palpitar — isso
  // virou trabalho exclusivo da cobrança (`?tipo=cobranca_dia`, ~1min depois).
  // Sem jogo hoje: não envia nada (modo entressafra fica pra outra sessão).
  // force=1 ignora a trava de "já enviei hoje" (teste manual); o teto diário
  // (contaEnviadasHoje) NUNCA é ignorado.
  if (url.searchParams.get("tipo") === "agenda") {
    const pref = url.searchParams.get("env") === "dev" ? "dev_" : "";
    const forceAgenda = url.searchParams.get("force") === "1";
    const tipoLog = "agenda" + (pref ? "_dev" : "");
    const logBase = { tipo: tipoLog, destino: "" };
    let etapa = "destino";
    let userPrompt: string | null = null;
    let respostaIA: string | null = null;
    let modelo = MODELO_FALLBACK;
    try {
      const dst = grupoDestino(url);
      logBase.destino = `${dst.destino} (${dst.grupo})`;

      etapa = "governanca";
      const logsHoje = await botLogHoje();
      const { ddmm } = limitesBrasiliaHojeISO();
      const temJogoHoje = Object.values(MM_AGENDA).some((a: Conf) => a.dt === ddmm);
      const teto = temJogoHoje ? TETO_MSGS_DIA_COM_JOGO : TETO_MSGS_DIA_SEM_JOGO;
      if (!forceAgenda && jaRodouHoje(logsHoje, tipoLog, dst.destino)) {
        await botLog({ ...logBase, status_envio: "pulado_duplicado", erro: "agenda já enviada hoje pra este destino" });
        return json({ ok: true, enviado: false, motivo: "agenda já enviada hoje pra este destino (use &force=1 pra repetir)" });
      }
      if (contaEnviadasHoje(logsHoje, dst.destino) >= teto) {
        await botLog({ ...logBase, status_envio: "pulado_teto", erro: `teto diário atingido (${teto})` });
        return json({ ok: true, enviado: false, motivo: `teto diário de mensagens atingido (${teto})` });
      }

      etapa = "consulta_banco";
      const [confrontos, palpites, cfg, telefones] = await Promise.all([
        sbGet(`${pref}mata_confrontos?select=*`),
        sbGet(`${pref}mata_palpites?select=confronto_id,pid,gols_a,gols_b,quem_passa`),
        sbGet("bot_config?key=in.(system_prompt_ratazana,modelo_ia)&select=key,value"),
        sbGet("bot_telefones?select=participante_id,nome_exibicao,genero,telefone_whatsapp,is_humano").catch(() => []),
      ]);
      const cfgMap: Record<string, string> = {};
      for (const row of cfg) cfgMap[row.key] = row.value;
      const systemPrompt = cfgMap["system_prompt_ratazana"];
      modelo = (cfgMap["modelo_ia"] || "").trim() || MODELO_FALLBACK;
      if (!systemPrompt) throw new Error("bot_config sem 'system_prompt_ratazana' — rode o supabase_bot.sql");

      etapa = "jogos_hoje";
      const PAL: Record<string, Record<string, Conf>> = {};
      for (const p of palpites) (PAL[p.confronto_id] ??= {})[p.pid] = p;
      const teamsOf = makeResolver(confrontos);
      const rank = MATA_PARTS_BOT.map((p) => ({ p, ...mataStats(p.id, confrontos, PAL) }))
        .sort((a, b) => b.total - a.total || b.eHits - a.eHits || b.rHits - a.rHits);

      // Só jogos AINDA POR JOGAR hoje — um jogo de hoje já finalizado (ex.: a
      // agenda rodando de novo depois do apito final) não entra no painel.
      const jogosHoje = confrontos
        .filter((c: Conf) => !mmIsTest(c) && !c.finished && MM_AGENDA[c.id]?.dt === ddmm)
        .map((c: Conf) => ({ c, d: mmGameDate(c) }))
        .sort((a: Conf, b: Conf) => (a.d?.getTime() || 0) - (b.d?.getTime() || 0));

      if (!jogosHoje.length) {
        await botLog({ ...logBase, status_envio: "nao_enviado", erro: "sem jogos hoje pendentes (todos já finalizados, ou nenhum agendado — modo entressafra ainda não implementado)" });
        return json({ ok: true, enviado: false, motivo: "sem jogos hoje pendentes (ou modo entressafra, ainda não implementado)" });
      }

      const jogos = jogosHoje.map(({ c, d }: Conf) => {
        const i = mmInfo(c);
        const t = teamsOf(c);
        const nomeA = t.a?.name || "A definir";
        const nomeB = t.b?.name || "A definir";
        const phaseKey = mmPhaseKeyOf(c.id);
        const turbo = MM_TURBO.has(c.id);
        const z = mmZebra(c);
        return {
          id: c.id, fase: PH_LABEL[phaseKey] || phaseKey, tm: i.tm, onde: i.ven,
          jogo: `${nomeA} × ${nomeB}`, turbo,
          multFinal: fmtPts((MM_PHASE_MULT[phaseKey] || 1) * (turbo ? 2 : 1)),
          zebra: z ? { tipo: z.tipo, azarao: z.azarao === "A" ? nomeA : nomeB, bonus: z.tipo === "zebrao" ? 5 : 3 } : null,
          d,
        };
      });

      etapa = "lideranca";
      const top3 = rank.slice(0, 3).map((r, ix) => `${ix + 1}º ${r.p.nome} ${fmtPts(r.total)} pts`).join("; ");
      const posRat = rank.findIndex((r) => r.p.id === RATAZANA_ID) + 1;
      const alertaLideranca =
        `ALERTA DE LIDERANÇA (detalhado — só nesta mensagem diária): líder é ${rank[0].p.nome} com ${fmtPts(rank[0].total)} pts` +
        (rank.length > 1 ? `, ${fmtPts(rank[0].total - rank[1].total)} pts à frente de ${rank[1].p.nome} (2º)` : "") +
        `. Top 3: ${top3}. Você (Ratazana) está em ${posRat}º com ${fmtPts(rank[posRat - 1].total)} pts.`;

      const generos = (telefones as Conf[]).filter((x: Conf) => x.genero)
        .map((x: Conf) => `${x.nome_exibicao || MATA_PARTS_BOT.find((p) => p.id === x.participante_id)?.nome || x.participante_id} (${x.genero})`);

      const blocoJogo = (j: Conf) =>
        `- ${diaSemana(j.d)} às *${j.tm}* - ${j.fase} - ${j.jogo} - ${j.onde}` +
        (j.turbo ? ` - ⚡ TURBO: vale ×${j.multFinal}` : ` - vale ×${j.multFinal}`) +
        (j.zebra ? ` - ${j.zebra.tipo === "zebrao" ? "ZEBRÃO" : "ZEBRA"} armada: azarão ${j.zebra.azarao}, bônus +${j.zebra.bonus}` : "");

      etapa = "monta_prompt";
      userPrompt =
        `DADOS VERIFICADOS DO BOLÃO (agenda do dia, gerados em ${agoraBrasilia()}, horário de Brasília). Use somente estes dados. Não calcule nem invente nada.\n\n` +
        `JOGOS DE HOJE:\n${jogos.map(blocoJogo).join("\n")}\n\n` +
        `${alertaLideranca}\n` +
        (generos.length ? `Gênero dos participantes (pra calibrar a intensidade): ${generos.join("; ")}\n` : "") +
        `\nTAREFA: escreva a mensagem de AGENDA DO DIA para o grupo de WhatsApp (4 a 7 linhas): liste os jogos de hoje com horário e avise se tem turbo ou zebra armada, e incorpore o alerta de liderança com naturalidade (é a ÚNICA mensagem do dia que detalha isso — respeite a hierarquia de assunto: jogo/pessoas/ranking antes de você mesmo). NÃO fale de quem falta palpitar nem cobre ninguém — isso é assunto exclusivo da cobrança, que roda logo em seguida. Sem link do bolão. Mensagem única.`;

      etapa = "anthropic";
      const ia = await chamaIA(modelo, systemPrompt, userPrompt);
      respostaIA = ia.texto;

      // Menção obrigatória (v1.10): a agenda não fala de pendência, então
      // NUNCA usa a linha de "intimação de devedores" — é sempre a provocação
      // padrão de 1 pessoa sorteada, como qualquer mensagem programada.
      etapa = "mencao";
      let textoFinal = respostaIA;
      const mentions: string[] = [];
      const prov = linhaProvocacao(telefones as Conf[], new Set());
      if (prov) { textoFinal += "\n\n" + prov.linha; mentions.push(prov.mention); }

      etapa = "zapzap";
      const envio = await enviaEmPartes(dst.grupo, textoFinal, mentions);
      etapa = "log";
      await botLog({
        ...logBase, prompt_enviado: userPrompt, resposta_ia: respostaIA,
        mensagem_enviada: envio.partes.join("\n\n"),
        status_envio: envio.ok ? "ok" : "erro", erro: envio.ok ? null : envio.detalhe,
      });
      return json({
        ok: envio.ok, enviado: envio.ok, jogos_hoje: jogos.length, destino: dst.destino,
        modelo, uso_tokens: ia.usage, n_mensagens: envio.partes.length, mensagens: envio.partes,
      }, envio.ok ? 200 : 502);
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      await botLog({ ...logBase, prompt_enviado: userPrompt, resposta_ia: respostaIA, status_envio: "erro", erro: `[etapa: ${etapa}] ${msg}` });
      return json({ ok: false, etapa, erro: msg }, 500);
    }
  }

  // ─── Modo ÚLTIMA CHAMADA (Fase 4 — T-60min, pensado pra pg_cron a cada ~5-10min)
  // ?tipo=ultima_chamada&destino=teste|oficial[&env=dev][&force=1]
  // Dispara só pros jogos que estão ENTRANDO agora na janela de 55-65min antes
  // do kickoff (~1h, com tolerância de 10min pra cobrir a granularidade do
  // cron) E que ainda tenham alguém sem palpitar NAQUELE jogo — v1.13: se
  // todos já palpitaram, não envia nada (antes mandava uma mensagem de "todo
  // mundo pronto" mesmo sem pendência; isso virou exclusividade da agenda/
  // cobrança do dia). Idempotente por jogo (chave "[jogo:<id>]" dentro do
  // destino logado) — não reenviar no mesmo dia pro mesmo jogo mesmo se o
  // cron rodar de novo dentro da janela.
  if (url.searchParams.get("tipo") === "ultima_chamada") {
    const pref = url.searchParams.get("env") === "dev" ? "dev_" : "";
    const forceUC = url.searchParams.get("force") === "1";
    const tipoLog = "ultima_chamada" + (pref ? "_dev" : "");
    try {
      const dst = grupoDestino(url);

      const [confrontos, palpites, cfg, telefones] = await Promise.all([
        sbGet(`${pref}mata_confrontos?select=*`),
        sbGet(`${pref}mata_palpites?select=confronto_id,pid,gols_a,gols_b,quem_passa`),
        sbGet("bot_config?key=in.(system_prompt_ratazana,modelo_ia)&select=key,value"),
        sbGet("bot_telefones?select=participante_id,nome_exibicao,genero,telefone_whatsapp,is_humano").catch(() => []),
      ]);
      const cfgMap: Record<string, string> = {};
      for (const row of cfg) cfgMap[row.key] = row.value;
      const systemPrompt = cfgMap["system_prompt_ratazana"];
      const modelo = (cfgMap["modelo_ia"] || "").trim() || MODELO_FALLBACK;
      if (!systemPrompt) throw new Error("bot_config sem 'system_prompt_ratazana' — rode o supabase_bot.sql");

      const PAL: Record<string, Record<string, Conf>> = {};
      for (const p of palpites) (PAL[p.confronto_id] ??= {})[p.pid] = p;
      const teamsOf = makeResolver(confrontos);
      const now = Date.now();

      // Janela de disparo: ~1h antes do kickoff (55-65min de tolerância).
      const candidatos = confrontos
        .filter((c: Conf) => !mmIsTest(c) && !c.finished)
        .map((c: Conf) => ({ c, d: mmGameDate(c) }))
        .filter((x: Conf) => x.d)
        .filter((x: Conf) => { const diffMin = (x.d.getTime() - now) / 60000; return diffMin > 55 && diffMin <= 65; });

      if (!candidatos.length) {
        return json({ ok: true, enviado: false, motivo: "nenhum jogo entrando na janela de última chamada agora" });
      }

      const logsHoje = await botLogHoje();
      const { ddmm } = limitesBrasiliaHojeISO();
      const temJogoHoje = Object.values(MM_AGENDA).some((a: Conf) => a.dt === ddmm);
      const teto = temJogoHoje ? TETO_MSGS_DIA_COM_JOGO : TETO_MSGS_DIA_SEM_JOGO;

      const resultados: Conf[] = [];
      for (const { c } of candidatos) {
        // v1.13: só age se realmente faltar alguém NAQUELE jogo (mesma trava
        // "só cobra se faltar alguém" da Tarefa A) — antes mandava aviso de
        // "todo mundo pronto" mesmo sem pendência; isso virou exclusividade
        // da agenda/cobrança do dia. &force=1 ainda permite testar manual.
        const faltam = HUMANOS.filter((h) => !mmHasFullPred(PAL[c.id]?.[h.id])).map((h) => h.nome);
        if (!faltam.length && !forceUC) {
          resultados.push({ jogo: c.id, enviado: false, motivo: "todos já palpitaram nesse jogo, nada a cobrar" });
          continue;
        }
        const chave = `[jogo:${c.id}]`;
        if (!forceUC && jaRodouHoje(logsHoje, tipoLog, dst.destino, chave)) {
          resultados.push({ jogo: c.id, enviado: false, motivo: "já avisado hoje" });
          continue;
        }
        if (contaEnviadasHoje(logsHoje, dst.destino) >= teto) {
          resultados.push({ jogo: c.id, enviado: false, motivo: `teto diário atingido (${teto})` });
          continue;
        }
        // v1.15 — claim-then-act: reserva ATÔMICA antes de gerar/enviar. O
        // jaRodouHoje acima virou só atalho barato (poupa um INSERT quando o
        // envio já aconteceu e o log está legível); a AUTORIDADE anti-
        // duplicata é esta key — o UNIQUE da PK de bot_config garante que só
        // UMA execução a cria, mesmo concorrentes no mesmo segundo (cron +
        // disparo manual). Vem DEPOIS do teto pra não queimar claim em envio
        // que nem sairia. Se o envio falhar lá embaixo, liberaClaim devolve a
        // vez pro próximo tick. force=1 pula o claim de propósito (teste
        // manual) e por isso também nunca o libera.
        const chaveClaim = `uc_${ddmm.replace("/", "-")}_${c.id}_${dst.destino}`;
        if (!forceUC && !(await claimUmaVez(chaveClaim))) {
          resultados.push({ jogo: c.id, enviado: false, motivo: "já avisado hoje (claim de outra execução)" });
          continue;
        }
        const logBase = { tipo: tipoLog, destino: `${dst.destino} (${dst.grupo}) ${chave}` };
        let userPrompt: string | null = null;
        let respostaIA: string | null = null;
        try {
          const i = mmInfo(c);
          const t = teamsOf(c);
          const nomeA = t.a?.name || "A definir";
          const nomeB = t.b?.name || "A definir";
          const phaseKey = mmPhaseKeyOf(c.id);
          const turbo = MM_TURBO.has(c.id);
          const z = mmZebra(c);

          userPrompt =
            `DADOS VERIFICADOS DO BOLÃO (última chamada, ~1h antes do jogo, gerados em ${agoraBrasilia()}, horário de Brasília). Use somente estes dados.\n\n` +
            `JOGO: ${nomeA} × ${nomeB} (${PH_LABEL[phaseKey] || phaseKey}) às *${i.tm}* em ${i.ven}` +
            (turbo ? " - ⚡ TURBO" : "") +
            (z ? ` - ${z.tipo === "zebrao" ? "ZEBRÃO" : "ZEBRA"} armada` : "") + `\n` +
            `Faltam palpitar: ${faltam.length ? listaNomes(faltam) : "ninguém, todos em dia (teste forçado)"}\n\n` +
            `TAREFA: escreva um aviso de ÚLTIMA CHAMADA curto (2 a 4 linhas) pro grupo de WhatsApp: o jogo está prestes a começar (faltam ~1h), cutuque com urgência quem ainda falta palpitar. Sem link do bolão. Mensagem única.`;

          const ia = await chamaIA(modelo, systemPrompt, userPrompt, 2500);
          respostaIA = ia.texto;

          let textoFinal = respostaIA;
          const mentions: string[] = [];
          const tokens: string[] = [];
          for (const nome of faltam) {
            const h = HUMANOS.find((p) => p.nome === nome);
            const tel = h ? (telefones as Conf[]).find((t2: Conf) => t2.participante_id === h.id) : null;
            const num = tel?.telefone_whatsapp ? String(tel.telefone_whatsapp).replace(/\D/g, "") : "";
            if (num) { tokens.push("@" + num); mentions.push(num); }
          }
          if (tokens.length) {
            textoFinal += "\n\n📋 Intimação oficial do fiscal: " + tokens.join(" ") + " — palpite pendente, tá no caderninho.";
          } else {
            // Só acontece em teste forçado (&force=1) sem ninguém pendente —
            // fallback pra ainda ter a provocação padrão de mensagem programada.
            const prov = linhaProvocacao(telefones as Conf[], new Set());
            if (prov) { textoFinal += "\n\n" + prov.linha; mentions.push(prov.mention); }
          }

          const envio = await enviaEmPartes(dst.grupo, textoFinal, mentions);
          await botLog({
            ...logBase, prompt_enviado: userPrompt, resposta_ia: respostaIA,
            mensagem_enviada: envio.partes.join("\n\n"),
            status_envio: envio.ok ? "ok" : "erro", erro: envio.ok ? null : envio.detalhe,
          });
          // envio recusado (ZapZap não-2xx): devolve o claim pro próximo tick
          if (!envio.ok && !forceUC) await liberaClaim(chaveClaim);
          resultados.push({ jogo: c.id, enviado: envio.ok });
          // Contabiliza localmente pra não passar do teto se houver 2 jogos na mesma janela.
          logsHoje.push({ tipo: logBase.tipo, destino: logBase.destino, status_envio: envio.ok ? "ok" : "erro" });
        } catch (e) {
          // Exceção aqui é quase sempre PRÉ-envio (IA cortada por max_tokens,
          // filtro de sanidade, banco) — devolve o claim pro próximo tick
          // tentar de novo. Escolha consciente de at-least-once: o único
          // resíduo é rede caindo EXATAMENTE entre a entrega no WhatsApp e a
          // resposta da ZapZap (raríssimo) — preferível a engolir o aviso
          // toda vez que a IA falhar, que é o erro comum.
          if (!forceUC) await liberaClaim(chaveClaim);
          const msg = String((e as Error)?.message || e);
          await botLog({ ...logBase, prompt_enviado: userPrompt, resposta_ia: respostaIA, status_envio: "erro", erro: msg });
          resultados.push({ jogo: c.id, enviado: false, erro: msg });
        }
      }
      return json({ ok: true, resultados });
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      return json({ ok: false, erro: msg }, 500);
    }
  }

  // 3) Pipeline da cobrança — cada etapa em try/catch; tudo vai pro bot_log.
  // Destino EXPLÍCITO obrigatório (?destino=teste|oficial): a URL antiga sem
  // &destino= passa a dar erro claro — nenhum envio "de default" existe mais.
  // v1.13: `?tipo=cobranca_dia` REAPROVEITA este mesmo pipeline (mesmos dados,
  // mesma trava "só envia se faltar alguém" logo abaixo em 3c — ela já existia
  // desde sempre pro modo manual/`force=1`) — pensado pra pg_cron 1min depois
  // da agenda. A única diferença é a governança extra (idempotência por dia +
  // teto diário), igual à dos modos `agenda`/`ultima_chamada`.
  const modoDia = url.searchParams.get("tipo") === "cobranca_dia";
  const logBase = {
    tipo: testeLongo ? "teste_mensagem_longa"
      : modoDia ? (force ? "cobranca_dia_forcada" : "cobranca_dia")
      : (force ? "cobranca_forcada" : "cobranca"),
    destino: "",
  };
  let etapa = "destino";
  let GRUPO = "";
  let userPrompt: string | null = null;
  let respostaIA: string | null = null;
  let modelo = MODELO_FALLBACK;

  try {
    const dst = grupoDestino(url);
    GRUPO = dst.grupo;
    logBase.destino = `${dst.destino} (${dst.grupo})`;

    if (modoDia) {
      etapa = "governanca";
      const logsHoje = await botLogHoje();
      const { ddmm } = limitesBrasiliaHojeISO();
      const temJogoHoje = Object.values(MM_AGENDA).some((a: Conf) => a.dt === ddmm);
      const teto = temJogoHoje ? TETO_MSGS_DIA_COM_JOGO : TETO_MSGS_DIA_SEM_JOGO;
      if (!force && jaRodouHoje(logsHoje, logBase.tipo, dst.destino)) {
        await botLog({ ...logBase, status_envio: "pulado_duplicado", erro: "cobrança do dia já enviada hoje pra este destino" });
        return json({ ok: true, enviado: false, motivo: "cobrança do dia já enviada hoje pra este destino (use &force=1 pra repetir)" });
      }
      if (contaEnviadasHoje(logsHoje, dst.destino) >= teto) {
        await botLog({ ...logBase, status_envio: "pulado_teto", erro: `teto diário atingido (${teto})` });
        return json({ ok: true, enviado: false, motivo: `teto diário de mensagens atingido (${teto})` });
      }
    }

    etapa = "consulta_banco";
    // 3a) Banco (produção): confrontos + palpites + config (prompt e modelo)
    const [confrontos, palpites, cfg, telefones] = await Promise.all([
      sbGet("mata_confrontos?select=*"),
      sbGet("mata_palpites?select=confronto_id,pid,gols_a,gols_b,quem_passa"),
      sbGet("bot_config?key=in.(system_prompt_ratazana,modelo_ia,fase_ativa)&select=key,value"),
      sbGet("bot_telefones?select=participante_id,nome_exibicao,genero,telefone_whatsapp,is_humano").catch(() => []),
    ]);
    const cfgMap: Record<string, string> = {};
    for (const row of cfg) cfgMap[row.key] = row.value;
    const systemPrompt = cfgMap["system_prompt_ratazana"];
    modelo = (cfgMap["modelo_ia"] || "").trim() || MODELO_FALLBACK;
    if (!systemPrompt) {
      throw new Error("bot_config sem 'system_prompt_ratazana' — rode o supabase_bot.sql no SQL Editor");
    }
    // Fase ativa (v1.4): a cobrança NUNCA vaza de rodada. Desde a v1.19 o
    // Vini normalmente NÃO precisa mais atualizar 'fase_ativa' manualmente —
    // fechar o último jogo de uma fase no admin avança sozinho (ver
    // verificaEAvancaFaseAtiva) — mas o Table Editor continua funcionando
    // como via manual de emergência. FASE_CANON/faseCanonica são compartilhados
    // com o avanço automático (hoisted em v1.19).
    const faseRaw = (cfgMap["fase_ativa"] || "").trim();
    const faseAtiva = faseCanonica(faseRaw);
    if (!faseAtiva) {
      throw new Error(`bot_config 'fase_ativa' ausente ou inválida (valor: "${faseRaw}"). Aceitos: 16avos, oitavas, quartas, semis, 3lugar, final.`);
    }

    // 3b) Mesma seleção do app: 3 próximos jogos com kickoff no futuro
    etapa = "faltantes";
    const PAL: Record<string, Record<string, Conf>> = {};
    for (const p of palpites) (PAL[p.confronto_id] ??= {})[p.pid] = p;
    const teamsOf = makeResolver(confrontos);
    // Ranking calculado aqui (não só lá embaixo em "3e"): jogos/ultimoBloco
    // logo abaixo já precisam saber o top 3 pra aplicar a regra de existência
    // das IAs concorrentes (participantesCitaveis, persona v2.1).
    const rank = MATA_PARTS_BOT.map((p) => ({ p, ...mataStats(p.id, confrontos, PAL) }))
      .sort((a, b) => b.total - a.total || b.eHits - a.eHits || b.rHits - a.rHits);
    const citaveis = participantesCitaveis(rank);
    const now = Date.now();
    const futuros = confrontos
      .filter((c: Conf) => !mmIsTest(c))
      .map((c: Conf) => ({ c, d: mmGameDate(c) }))
      .filter((x: Conf) => x.d && x.d.getTime() > now)
      .sort((a: Conf, b: Conf) => a.d.getTime() - b.d.getTime());
    // cobrança: SÓ jogos da fase ativa (fases futuras nunca entram aqui)
    const up = futuros.filter((x: Conf) => mmPhaseKeyOf(x.c.id) === faseAtiva).slice(0, 3);
    // prévia: até 2 jogos da PRÓXIMA fase, só informativo (nunca cobrados)
    const idxFase = MM_COLS.findIndex((col) => col.key === faseAtiva);
    const proximaFase = idxFase >= 0 && idxFase + 1 < MM_COLS.length ? MM_COLS[idxFase + 1].key : null;
    const previaUp = proximaFase
      ? futuros.filter((x: Conf) => mmPhaseKeyOf(x.c.id) === proximaFase).slice(0, 2)
      : [];

    // formata um palpite completo: "2×1" ou "1×1 (Time passa nos pênaltis)"
    const fmtPal = (pal: Conf, tA: string, tB: string): string | null => {
      if (!mmHasFullPred(pal)) return null;
      let s = `${pal.gols_a}×${pal.gols_b}`;
      if (pal.gols_a === pal.gols_b && pal.quem_passa) {
        s += ` (${pal.quem_passa === "A" ? tA : tB} passa nos pênaltis)`;
      }
      return s;
    };

    const jogos = up.map(({ c, d }: Conf) => {
      const i = mmInfo(c);
      const t = teamsOf(c);
      const nomeA = t.a?.name || "A definir";
      const nomeB = t.b?.name || "A definir";
      const phaseKey = mmPhaseKeyOf(c.id);
      const phaseMult = MM_PHASE_MULT[phaseKey] || 1;
      const turbo = MM_TURBO.has(c.id);
      const z = mmZebra(c);
      const faltam = HUMANOS.filter((h) => !mmHasFullPred(PAL[c.id]?.[h.id])).map((h) => h.nome);
      const palDe = (pid: string) => fmtPal(PAL[c.id]?.[pid], nomeA, nomeB);
      const palHumanos = HUMANOS.map((h) => ({ nome: h.nome, pal: palDe(h.id) }))
        .filter((x) => x.pal).map((x) => `${x.nome} ${x.pal}`);
      // só as IAs citáveis (top 3 do ranking geral) — regra v2.1
      const palMaquinas = citaveis.filter((p) => p.tipo === "maquina" && p.id !== RATAZANA_ID)
        .map((m) => ({ nome: m.nome, pal: palDe(m.id) }))
        .filter((x) => x.pal).map((x) => `${x.nome} ${x.pal}`);
      return {
        id: c.id,
        fase: PH_LABEL[phaseKey] || phaseKey,
        quando: `${diaSemana(d)} ${i.dt} às *${i.tm}*`,
        onde: i.ven,
        jogo: `${nomeA} × ${nomeB}`,
        turbo,
        multFinal: fmtPts(phaseMult * (turbo ? 2 : 1)),
        multFase: fmtPts(phaseMult),
        zebra: z ? { tipo: z.tipo, azarao: z.azarao === "A" ? nomeA : nomeB, bonus: z.tipo === "zebrao" ? 5 : 3 } : null,
        faltam,
        seuPalpite: palDe(RATAZANA_ID),  // kayfabe: se pendente, simplesmente não aparece
        palHumanos,
        palMaquinas,
      };
    });
    // prévia da próxima fase: dado informativo, sem lista de faltantes de
    // propósito (pra IA não ter material de cobrança sobre eles)
    const previaJogos = previaUp.map(({ c, d }: Conf) => {
      const i = mmInfo(c);
      const t = teamsOf(c);
      const nomeA = t.a?.name || "A definir";
      const nomeB = t.b?.name || "A definir";
      const phaseKey = mmPhaseKeyOf(c.id);
      const turbo = MM_TURBO.has(c.id);
      const z = mmZebra(c);
      return {
        id: c.id,
        fase: PH_LABEL[phaseKey] || phaseKey,
        quando: `${diaSemana(d)} ${i.dt} às *${i.tm}*`,
        onde: i.ven,
        jogo: `${nomeA} × ${nomeB}`,
        turbo,
        multFinal: fmtPts((MM_PHASE_MULT[phaseKey] || 1) * (turbo ? 2 : 1)),
        zebra: z ? { tipo: z.tipo, azarao: z.azarao === "A" ? nomeA : nomeB, bonus: z.tipo === "zebrao" ? 5 : 3 } : null,
      };
    });
    const comPendencia = jogos.filter((j: Conf) => j.faltam.length > 0);
    const todosFaltantes = [...new Set(comPendencia.flatMap((j: Conf) => j.faltam))] as string[];

    // 3c) Ninguém falta e sem force → não envia nada, só informa (e loga).
    // Esta é A trava "só cobra se faltar alguém" — vale igual pro modo manual
    // (sem tipo) e pro `cobranca_dia` (pg_cron da manhã): nenhum dos dois
    // dispara "todo mundo em dia" sozinho, só com `&force=1` explícito.
    if (!comPendencia.length && !force) {
      await botLog({ ...logBase, status_envio: "nao_enviado", erro: modoDia ? "todos palpitaram, nada a cobrar" : "ninguém falta palpitar na fase ativa (sem force=1)" });
      return json({
        ok: true,
        enviado: false,
        fase_ativa: PH_LABEL[faseAtiva],
        motivo: "Ninguém está devendo palpite na fase ativa. Use ?force=1 para enviar mesmo assim (teste).",
        proximos_jogos: jogos,
        previa: previaJogos,
      });
    }

    // 3d) Enriquecimento: quem completou tudo, último jogo encerrado, ranking
    etapa = "enriquecimento";
    const CITAVEIS = [...HUMANOS, MATA_PARTS_BOT.find((p) => p.id === RATAZANA_ID)!];
    const completaram = CITAVEIS
      .filter((p) => jogos.length && jogos.every((j: Conf) => mmHasFullPred(PAL[j.id]?.[p.id])))
      .map((p) => (p.id === RATAZANA_ID ? "você" : p.nome));

    // jogos futuros já com os dois times definidos (dá pra palpitar de verdade)
    const futurosDef = confrontos
      .filter((c: Conf) => !mmIsTest(c))
      .map((c: Conf) => ({ c, d: mmGameDate(c) }))
      .filter((x: Conf) => x.d && x.d.getTime() > now)
      .filter((x: Conf) => { const t = teamsOf(x.c); return t.a && t.b; });
    const adiantados = CITAVEIS.map((p) => ({
      nome: p.id === RATAZANA_ID ? "você" : p.nome,
      n: futurosDef.filter((x: Conf) => mmHasFullPred(PAL[x.c.id]?.[p.id])).length,
    })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);

    const encerrados = confrontos
      .filter((c: Conf) => !mmIsTest(c) && c.finished && c.real_a != null && c.real_b != null)
      .map((c: Conf) => ({ c, d: mmGameDate(c) }))
      .filter((x: Conf) => x.d)
      .sort((a: Conf, b: Conf) => b.d.getTime() - a.d.getTime());
    let ultimoBloco = "";
    if (encerrados.length) {
      const { c, d } = encerrados[0];
      const i = mmInfo(c);
      const phaseKey = mmPhaseKeyOf(c.id);
      const turbo = MM_TURBO.has(c.id);
      const mult = fmtPts((MM_PHASE_MULT[phaseKey] || 1) * (turbo ? 2 : 1));
      // só as IAs citáveis (top 3 do ranking geral) — regra v2.1
      const pontos = citaveis.map((p) => ({ p, s: mmScore(PAL[c.id]?.[p.id], c) }))
        .filter((x) => x.s)
        .sort((a: Conf, b: Conf) => b.s.total - a.s.total);
      const linhaPts = pontos.filter((x: Conf) => x.s.total > 0)
        .map((x: Conf) => `${x.p.nome} ${fmtPts(x.s.total)}`).join("; ") || "ninguém pontuou";
      const cravaram = pontos.filter((x: Conf) => x.s.exato).map((x: Conf) => x.p.nome);
      const z = mmZebra(c);
      const rw = mmRealWinner(c);
      let zebraTxt = "não havia zebra definida neste jogo";
      if (z) {
        const nmAz = z.azarao === "A" ? (c.team_a || "A") : (c.team_b || "B");
        zebraTxt = rw === z.azarao
          ? `${z.tipo === "zebrao" ? "ZEBRÃO PAGOU" : "ZEBRA PAGOU"}: o azarão ${nmAz} avançou (+${z.tipo === "zebrao" ? 5 : 3} pra quem apostou nele)`
          : `havia ${z.tipo === "zebrao" ? "zebrão" : "zebra"} definida (azarão ${nmAz}), mas não pagou`;
      }
      const meu = pontos.find((x: Conf) => x.p.id === RATAZANA_ID);
      const penTxt = (c.real_a === c.real_b && c.classificado)
        ? ` (${c.classificado === "A" ? c.team_a : c.team_b} passou nos pênaltis)` : "";
      ultimoBloco =
        `ÚLTIMO JOGO ENCERRADO: ${c.team_a} ${c.real_a}×${c.real_b} ${c.team_b}${penTxt} (${diaSemana(d)} ${i.dt}, ${PH_LABEL[phaseKey]}, valia ×${mult})\n` +
        `- Pontuaram: ${linhaPts}\n` +
        `- Cravaram o placar exato: ${cravaram.length ? listaNomes(cravaram) : "ninguém"}\n` +
        `- Zebra: ${zebraTxt}\n` +
        `- Seus pontos nesse jogo: ${meu ? fmtPts(meu.s.total) : "0"}`;
    }

    etapa = "ranking";
    // (rank já foi calculado lá em cima, antes de jogos/ultimoBloco — reaproveita)
    const posRatazana = rank.findIndex((r) => r.p.id === RATAZANA_ID) + 1;
    const ratStats = rank[posRatazana - 1];
    const top3 = rank.slice(0, 3)
      .map((r, ix) => `${ix + 1}º ${r.p.nome} ${fmtPts(r.total)} pts`).join("; ");
    const rankingBloco =
      `RANKING DO BOLÃO (${rank.length} participantes, ${rank[0].played} jogos pontuados):\n` +
      `- Top 3: ${top3}\n` +
      `- Líder: ${rank[0].p.nome}\n` +
      `- Você: ${posRatazana}º lugar com ${fmtPts(ratStats.total)} pts (${ratStats.eHits} placares cravados)`;

    // 3e) Monta o prompt de DADOS para a IA (tudo pré-calculado, pt-BR)
    etapa = "monta_prompt";
    const blocoJogo = (j: Conf) => {
      const l1 = `- ${j.quando} - ${j.fase} - ${j.jogo} - ${j.onde}` +
        (j.turbo ? ` - ⚡ TURBO: vale ×${j.multFinal} (multiplicador final)` : ` - vale ×${j.multFase}`) +
        (j.zebra ? ` - ${j.zebra.tipo === "zebrao" ? "ZEBRÃO" : "ZEBRA"} definido: azarão ${j.zebra.azarao}, bônus +${j.zebra.bonus} pra quem apostar que ele passa e ele passar` : "");
      const linhas = [l1, `  Faltam palpitar: ${j.faltam.length ? listaNomes(j.faltam) : "ninguém, todos em dia"}`];
      if (j.seuPalpite) linhas.push(`  Seu palpite: ${j.seuPalpite}`);
      if (j.palHumanos.length) linhas.push(`  Palpites dos humanos: ${j.palHumanos.join("; ")}`);
      else linhas.push(`  Palpites dos humanos: nenhum registrado ainda`);
      if (j.palMaquinas.length) linhas.push(`  Palpites das outras máquinas: ${j.palMaquinas.join("; ")}`);
      return linhas.join("\n");
    };
    let tarefa = comPendencia.length
      ? "TAREFA: escreva a mensagem de COBRANÇA DE PALPITES para o grupo de WhatsApp do bolão, cutucando pelo nome quem está devendo e citando os jogos pendentes da FASE ATIVA com horário. Se render piada, use os palpites públicos, o último jogo encerrado e a sua própria situação no ranking. Inclua o link do bolão."
      : "TAREFA: ninguém está devendo palpite na fase ativa (mensagem de teste do sistema). Escreva uma mensagem curta comemorando que está todo mundo em dia, provocando com os palpites públicos, o último jogo ou o ranking se render piada. Se houver prévia da próxima fase nos dados, pode citá-la como aquecimento, sem cobrar ninguém por ela. Inclua o link do bolão.";
    if (testeLongo) {
      tarefa = "TAREFA (TESTE DE MENSAGEM LONGA DO SISTEMA): gere uma mensagem COMPLETA e LONGA cobrindo, nesta ordem: o resultado do último jogo encerrado com quem pontuou e quem cravou; o ranking (top 3 e a sua posição); e TODOS os jogos citados nos dados (fase ativa e prévia) com horário e os palpites públicos listados. Use apenas os dados fornecidos, sem inventar nada. Estruture em 2 ou 3 blocos separados por uma linha contendo apenas ---, cada bloco com no máximo 900 caracteres e se sustentando sozinho. Inclua o link do bolão no bloco final.";
    }
    // gêneros de bot_telefones (persona calibra intensidade por gênero)
    const generos = (telefones as Conf[]).filter((x: Conf) => x.genero)
      .map((x: Conf) => `${x.nome_exibicao || MATA_PARTS_BOT.find((p) => p.id === x.participante_id)?.nome || x.participante_id} (${x.genero})`);
    const previaBloco = previaJogos.length
      ? `\nPRÉVIA DA PRÓXIMA FASE (${PH_LABEL[proximaFase!]}) - INFORMATIVO, NÃO COBRAR (a rodada destes jogos ainda não abriu no app; ninguém deve palpite deles):\n` +
        previaJogos.map((j) =>
          `- ${j.quando} - ${j.jogo} - ${j.onde} - vale ×${j.multFinal}${j.turbo ? " (⚡ turbo incluído)" : ""}` +
          (j.zebra ? ` - ${j.zebra.tipo === "zebrao" ? "ZEBRÃO" : "ZEBRA"}: azarão ${j.zebra.azarao}, bônus +${j.zebra.bonus}` : "")
        ).join("\n") + "\n"
      : "";
    userPrompt =
      `DADOS VERIFICADOS DO BOLÃO (gerados pelo sistema em ${agoraBrasilia()}, horário de Brasília). Use somente estes dados. Não calcule nem invente nada.\n\n` +
      `FASE ATIVA DO BOLÃO: ${PH_LABEL[faseAtiva]}. Cobrança de palpite vale SOMENTE para jogos desta fase.\n` +
      (generos.length ? `Gênero dos participantes (pra calibrar a intensidade): ${generos.join("; ")}\n` : "") + "\n" +
      `PRÓXIMOS JOGOS DA FASE ATIVA (palpites ainda abertos):\n${jogos.length ? jogos.map(blocoJogo).join("\n") : "- nenhum jogo futuro restante nesta fase"}\n\n` +
      `Já completaram os palpites de todos os jogos citados: ${completaram.length ? listaNomes(completaram) : "ninguém"}\n` +
      (adiantados.length ? `Palpites completos em jogos futuros já definidos (${futurosDef.length} jogos abertos): ${adiantados.map((x) => `${x.nome} ${x.n}`).join("; ")}\n` : "") +
      previaBloco +
      (ultimoBloco ? `\n${ultimoBloco}\n` : "") +
      `\n${rankingBloco}\n\n` +
      `LINK DO BOLÃO: https://bolao-ratazana00.pages.dev\n\n` +
      tarefa;

    // 3f) Chama a IA com a personalidade do Ratazana
    etapa = "anthropic";
    const ia = await chamaIA(modelo, systemPrompt, userPrompt, testeLongo ? 8000 : 4000);
    respostaIA = ia.texto;

    // Menções reais (v1.11): na cobrança COM faltantes a função da mensagem é
    // NOTIFICAR quem deve — o sistema anexa uma linha final marcando TODOS os
    // devedores com telefone real (única exceção à regra de 1 menção por
    // mensagem; o modelo cita os nomes no corpo só como texto). Sem pendência
    // ("todo mundo em dia", force) vale a regra geral das mensagens
    // programadas: UMA pessoa sorteada com provocação. Quem não tem telefone
    // em bot_telefones fica de fora da linha (sem quebrar nada).
    etapa = "mencao";
    let textoFinal = respostaIA;
    const mentions: string[] = [];
    if (comPendencia.length) {
      const tokens: string[] = [];
      for (const nome of todosFaltantes) {
        const h = HUMANOS.find((p) => p.nome === nome);
        const tel = h ? (telefones as Conf[]).find((t: Conf) => t.participante_id === h.id) : null;
        const num = tel?.telefone_whatsapp ? String(tel.telefone_whatsapp).replace(/\D/g, "") : "";
        if (num) {
          tokens.push("@" + num);
          mentions.push(num);
        }
      }
      if (tokens.length) {
        textoFinal += "\n\n📋 Intimação oficial do fiscal: " + tokens.join(" ") + " — palpite pendente, tá no caderninho.";
      }
    } else {
      const prov = linhaProvocacao(telefones as Conf[], new Set());
      if (prov) {
        textoFinal += "\n\n" + prov.linha;
        mentions.push(prov.mention);
      }
    }

    // 3g) Envia via ZapZap (mensagem única por padrão; blocos "---" ou texto
    // longo viram até 3 mensagens — ver enviaEmPartes)
    etapa = "zapzap";
    const envio = await enviaEmPartes(GRUPO, textoFinal, mentions);
    const partes = envio.partes;

    // 3h) Auditoria
    etapa = "log";
    await botLog({
      ...logBase,
      prompt_enviado: userPrompt,
      resposta_ia: respostaIA,
      mensagem_enviada: partes.join("\n\n"),
      status_envio: envio.ok ? "ok" : "erro",
      erro: envio.ok ? null : envio.detalhe,
    });

    return json({
      ok: envio.ok,
      enviado: envio.ok,
      fase_ativa: PH_LABEL[faseAtiva],
      modelo,
      uso_tokens: ia.usage,
      faltantes: todosFaltantes,
      jogos,
      previa: previaJogos,
      n_mensagens: partes.length,
      tamanhos: partes.map((p: string) => p.length),
      mensagens: partes,
      teste_longo: testeLongo,
      zapzap: envio.detalhe,
    }, envio.ok ? 200 : 502);
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    await botLog({
      ...logBase,
      prompt_enviado: userPrompt,
      resposta_ia: respostaIA,
      status_envio: "erro",
      erro: `[etapa: ${etapa}] ${msg}`,
    });
    return json({ ok: false, etapa, modelo, erro: msg }, 500);
  }
});
