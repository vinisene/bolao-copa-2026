# CLAUDE.md

> ## 🚨 LEIA PRIMEIRO — handoff de sessão (08/07/2026, madrugada)
> **No ar: Robô v1.21.2 (commit `3bdb442`, versão 31 no Supabase, ACTIVE, verify_jwt off).** Fix da RODADA ATIVA no contexto da conversa (bug real, bot_log 200): perguntado "qual rodada está ativa agora?" às 00:34 de 08/07, o bot respondeu "vácuo entre oitavas e quartas" — ERRADO, `fase_ativa` já era `quartas`. Causa raiz confirmada no `prompt_enviado` do 200: o contexto da conversa NUNCA recebia `fase_ativa` — só os resultados fechados (todos oitavas) + "jogos de hoje: nenhum", e o modelo INFERIA a rodada (e num dia sem jogo inferiu "entre fases"). Fix: a conversa passa a carregar `bot_config.fase_ativa` e o prompt ganha a linha explícita `RODADA ATIVA AGORA: <fase por extenso>` (separada dos jogos do dia) + TAREFA item 10 proibindo "entre fases"/"no vácuo"/"sem rodada" ("sem jogo hoje" é agenda, não muda a rodada). Verificado com dado real: a linha renderiza `RODADA ATIVA AGORA ... Quartas de final`. **Reteste ao vivo (Vini):** perguntar de novo "qual rodada está ativa?" e conferir que afirma "quartas" sem "vácuo". Ver §15 item -17.
> **✅ QUARTAS PUBLICADAS (leva anterior, já em `main`):** zebras das 4 quartas (todas +3, nenhum zebrão) e filtro de fase abrindo em QUARTAS estão AO VIVO em produção (merge `cf8c285`, safepoint `v18-prod-pre-quartas-zebras`, função redeployada). `fase_ativa='quartas'` (avanço automático da v1.19 funcionou no fechamento do r16_8, bot_log 193). Ver §0 e §15.
> **v1.21.1 (07/07, versão 29) — auto-menção pelo token cru, já no ar antes desta leva:** O reteste real da auto-menção FALHOU ("Vsf @Ratazana00" → "não tenho no cadastro", bot_log 183) por causa na camada do MODELO: o payload provou que a menção veio única e com o LID já cadastrado (o resolvedor da v1.21 funcionou; nenhum aviso de desconhecido entrou no prompt), mas o texto mostrado ao modelo mantinha o token cru `@61032206725341` e o modelo — que não conhece o próprio LID, por kayfabe — tratou como terceiro. Agora os tokens são REESCRITOS antes do prompt (bot → `@Ratazana`, pessoa conhecida → `@<nome>`, desconhecido real fica cru), a linha "Você foi marcado" diz que a marcação É o próprio bot, e todo gatilho de menção loga `[men:...]` `[idbot:...]` no destino do bot_log. Ver §15 item -16. Abaixo, o resumo da v1.21 (mesma tarde):
> - **No ar:** Edge Function v1.21. Fixes: **(A)** menção ao próprio bot não vira mais "contato desconhecido" (alias de LID por grupo tratado no loop de citados + cache de identidades só aceita conjunto completo de `bot_config` + auto-aprendizado do LID próprio em eventos `fromMe`); **(B)** busca na web agora é auditável — bot_log de conversa ganha `[busca:N]` no destino (N = buscas que a API rodou DE VERDADE), `chamaIA` continua o turno em `pause_turn`, e a TAREFA proíbe cravar fato externo sem busca ("pesquisa aí" explícito = busca obrigatória); **(C)** filtro de sanidade em modo conversa REMOVE glitch pontual (≤5 ocorrências) e envia; corrupção maior regenera 1x — nunca mais silêncio mudo; **(D)** teto diário (`contaEnviadasHoje`) não conta mais `conversa` — agenda 9h/cobrança 9h01 não são mais puladas por papo de manhã. Detalhes: §15 item -15.
> - **Causas raiz confirmadas com bot_log real:** id 166 = "não conheço esse contato" com `gatilho:mencao` (menção do bot duplicada no payload, forma conhecida + alias desconhecido); id 164 = artilheiro errado cravado com confiança ("Messi 19 gols") — era impossível saber se buscou, agora o log diz; o "pesquisa aí" mudo teve DUAS causas em sequência: id 165 (teto de 6/h do oficial, 32s após a resposta errada) e ids 168/169 (filtro de sanidade, glitch `覆`); ids 175/176 = `pulado_teto` às 9h00/9h01 com 4 conversas ok antes (170-173) — os crons RODARAM na hora certa, quem pulou foi a própria função. **Teto do oficial subiu de 6/h → 20/h** (key `conversa_max_hora_oficial='20'` criada em `bot_config` prod+dev via REST + seed no `supabase_bot.sql`; cooldown segue 10s).
> - **RETESTE AO VIVO PENDENTE (Vini, grupo oficial):** marcar @Ratazana00 (não pode mais dizer que não conhece); perguntar fato externo ("quem é o artilheiro dessa Copa?") e conferir `[busca:N]` com N≥1 no bot_log; contestar com "pesquisa aí" (tem que responder); amanhã de manhã, conferir agenda 9h + cobrança 9h01 saindo mesmo com conversa rolando antes.
> - **Persona v2.8 APLICADA (07/07/2026, prod+dev via REST, conferida byte a byte + seed no `supabase_bot.sql`):** "PROVOCAÇÃO DIRETA" elevada ao **TETO MÁXIMO de acidez** — provocado/zoado diretamente ("vsf", "cala a boca", "só sabe cobrar"), é o momento de MAIOR intensidade do personagem: ataque direto e cortante na pessoa (histórico no Bolão, palpites vergonhosos, moral que não tem pra falar), ironia pesada, deboche de superioridade, sem desviar o assunto. **Três limites fixos mesmo no pico:** (1) palavrão/baixaria = linha vermelha absoluta; (2) intensidade menor com mulheres vale inclusive no revide mais forte; (3) ataque só a escolhas/desempenho/atitude DENTRO do Bolão — nunca aparência, caráter, vida pessoal ou tema fora do jogo. Fora do gatilho, tom exatamente como hoje (espontâneas/programadas inalteradas). **Sem redeploy da função** — a persona é lida de `bot_config` a cada chamada, efeito imediato.
> - **🔐 Segurança pendente (inalterado):** `BOT_TRIGGER_TOKEN` e o token do GitHub embutido no remote local ficaram expostos em texto puro em sessões anteriores — **nenhum dos dois foi rotacionado ainda**. Ação do Vini.
> - Detalhes completos, valores conferidos e histórico: §13 (robô), §14 (admin), §15 itens -15 e -14.

> ## ✅ EM PRODUÇÃO — "Bolão Ratazana00 / Copa 2026" no ar (jul/2026)
> **AO VIVO:** `bolao-ratazana00.pages.dev` (publica `main`).
> **DEV/TESTE:** `ratazana.bolao-ratazana00.pages.dev` (publica `ratazana`; hostname `ratazana.` → IS_DEV=true → tabelas `dev_*`, badge DEV, título "TESTES -").
> - **Trabalho do dia a dia: branch `ratazana`** (código/visual) — merge pra `main` só com ok explícito do Vini.
> - **Dado direto (palpites/placares):** vai na produção sem passar por `ratazana`.
> - **Sempre crie safepoint (tag) antes de merge pra `main`**.
> - Não toque na `congelado-fase-grupos` (museu) nem na `dev` (backup antigo congelado).
> - **Robô Ratazana (bot WhatsApp) EM PRODUÇÃO**, ainda só no grupo de TESTE — ver §13. Admin de placares no ar — ver §14. **Persona v2.1.2 + função v1.11 DEPLOYADA (versão 14, jul/2026, autorização explícita) + `bot_telefones` PREENCHIDA (9 participantes, prod e dev). Menção real, fix do truncamento e filtro de sanidade por script TESTADOS ao vivo no grupo de teste.** A URL de disparo da cobrança exige `&destino=teste`.
- **Robô v1.21.1 DEPLOYADA (07/07/2026 fim de tarde, commit `8ee9a49`, versão 29, ACTIVE) — auto-menção, causa nova na camada do MODELO.** O reteste real ("Vsf @Ratazana00", bot_log 183) provou que o resolvedor da v1.21 funcionou (payload com menção única e LID cadastrado; sem aviso de desconhecido no prompt), mas o token cru `@<lid>` no texto confundia o próprio modelo (não conhece o próprio LID — kayfabe). Fix: tokens reescritos antes do prompt (bot → `@Ratazana`; pessoa conhecida → `@<nome>`; desconhecido fica cru) + instrução explícita "a marcação é você mesmo" + log `[men:...] [idbot:...]` em todo gatilho de menção. Ver §15 item -16.
- **Robô v1.21 DEPLOYADA (07/07/2026, commit `c5f754c`, versão 28, ACTIVE) — os 4 fixes do 1º dia de conversa no oficial.** (A) menção ao próprio bot ≠ contato desconhecido: entrada de `mentions` sem token `@<digitos>` visível no texto é alias da mesma marcação (nunca terceiro); cache de `botIdentidades` só guarda conjunto completo vindo de `bot_config` (fallback telefone-só da API não é mais cacheado); o bot APRENDE o próprio LID por grupo nos eventos `fromMe` (`aprendeIdentidadeBotDeFromMe`, guarda anti-poisoning: `sender_pn` tem que bater com telefone já cadastrado). O caso Jeca (pessoa real com LID não aprendido) continua protegido — testado em script isolado. (B) `chamaIA` devolve `buscas` (soma de `usage.server_tool_use.web_search_requests`) e continua o turno em `stop_reason:pause_turn`; conversa loga `[busca:N]` no destino do bot_log; TAREFA item 6 endurecida (fato externo sem busca = proibido cravar; pedido explícito de pesquisa = busca obrigatória). (C) `enviaEmPartes` ganhou modo `sanitiza` (só conversa): glitch pontual ≤5 ocorrências é removido e o envio segue; corrupção maior regenera 1x via `chamaIA` com aviso do glitch; programadas seguem estritas. (D) `contaEnviadasHoje` exclui tipo `conversa` (teto diário volta a ser só das programadas) + key `conversa_max_hora_oficial='20'` criada em prod+dev e no seed. Deploy via API do dashboard (fetch de dentro da página logada do Chrome — a UI do editor não renderizou, mas o endpoint `POST /v1/projects/<ref>/functions/deploy` funcionou; fonte = GitHub raw do commit). Ver §15 item -15.
- **Robô v1.20 DEPLOYADA (jul/2026, commit `ecd996f`) — Ouvidos + Conversa NO GRUPO OFICIAL, AO VIVO.** Modo webhook reconhece os DOIS grupos (antes só teste); captura (Ouvidos) e conversa (Fase 3) viraram controles independentes por grupo via `bot_config`: `captura_ativa_oficial='1'` e `conversa_ativa_oficial='1'` — **ambos LIGADOS agora**, confirmados por teste real (captura sem resposta, depois menção real respondida certo, destino gravado como "oficial" e não mais confundido com "teste" — bug real da leva anterior, corrigido). Limites do oficial nos DEFAULTS conservadores do código (6 respostas/hora, cooldown 10s — confirmado: não existe `conversa_max_hora_oficial`/`conversa_cooldown_seg_oficial` em `bot_config`, só os overrides de teste `30`/`5s`). **Comunicado Oficial nº 002 (estreia da conversa) já foi enviado pro grupo oficial** (bot_log `envio_manual` id 159, `status_envio:ok`) — botão dedicado criado no admin (`admin-860c200f.html`, commit `4e2ee47` na `ratazana`) e **já MESCLADO pra `main`** (commit `615db5f`, confirmado ao vivo na URL de produção). **Os 3 bugs reais + o gap do teto achados nessa leva foram CORRIGIDOS na v1.21 — ver item -15 em §15.**
- **Robô v1.19 DEPLOYADA (jul/2026, commit `e350abb`) — avanço automático de fase** — a cada jogo de PRODUÇÃO fechado no admin, `verificaEAvancaFaseAtiva` confere se isso completou `bot_config.fase_ativa`; se sim e a próxima fase já tem todos os confrontos cadastrados, avança sozinha (um passo por vez); se não conseguir decidir com segurança, não troca — só avisa. Aviso fica visível como banner no admin (`admin-860c200f.html`), não só em log. Ver item -13 em §15.
- **Fase 3 (Conversa) — v1.18.2 DEPLOYADA (jul/2026, commit `5a54465`) + persona v2.6** — fix do bug real de menção não resolvida (marcar contato sem LID mapeado fazia o bot reaproveitar por engano a identidade da mensagem citada) + BUSCA NA WEB ligada só no modo conversa (`web_search_20250305`, pra fato de futebol/Copa fora dos dados do bolão). Ver item -12 em §15. **v1.18.1 DEPLOYADA (jul/2026, commit `754e89b`) + persona v2.5** — ranking da conversa deixou de ter buracos (14 posições reais sempre) e a regra das IAs concorrentes virou comportamento (só fala de IA fora do top 3 se perguntado direto), não mais filtro de dado. Ver item -11 em §15. **v1.18 DEPLOYADA (versão 23, jul/2026) + persona v2.4** — o webhook responde quando o bot é mencionado (@) ou quando alguém responde/cita mensagem dele; SÓ grupo de TESTE; anti-cascata com **limites POR GRUPO** (keys `conversa_max_hora_*`/`conversa_cooldown_seg_*` em `bot_config`; TESTE = 30/hora + cooldown 5s, OFICIAL herda os defaults 6/hora + 10s; skip com gatilho é LOGADO). **v1.18 (calibragem):** coluna `lid` em `bot_telefones` (LID→participante; auto-aprendizado via `sender_pn` do payload; LID do Vini preenchido), remetente resolvido por telefone OU lid (fallback `senderName`), contexto com RANKING COMPLETO dos citáveis + dados das PESSOAS CITADAS na mensagem (menção real ou nome escrito). **Persona v2.4:** dosagem do viés Brasil×Argentina (luto máx. 1 a cada 3-4 respostas, decrescente), "você é a fonte" (nunca mandar consultar o app), humildade factual fora do bolão (fato externo nunca é cravado; contestado, admite — caso real: Klose artilheiro). Tabela `bot_mensagens_enviadas` criada em produção (registra o message_id de todo envio do bot; ⚠️ gatilho de citação só enxerga envios PÓS-v1.16). **v1.17 pós 2º teste real:** o "reply mudo" era o cooldown de 30s (mais longo que o ritmo de papo; match de citação estava certo); conversa ganhou CONTEXTO FACTUAL (data/hora, resultados dos últimos 3 dias, situação Brasil/Argentina pela chave, regra "nunca negar fato listado" — o bot tinha negado o jogo do Brasil) e MODO PAPO (responde primeiro o que a pessoa disse; dados do bolão só se relevantes; 1-3 linhas). **Persona v2.3**: bordões com parcimônia (máx. 1/mensagem; "caderninho" raro), aplicada em prod+dev. Reteste pendente. Sem busca na web/ficha relacional ainda. Ver §13/§15 item -7. **Compatibilidade `enviar_texto` × `net.http_post` do pg_net CONFERIDA — nenhum ajuste necessário.**
- **Função v1.15.1 DEPLOYADA (versão 18, jul/2026)** — fix do registro do webhook: o 1º `configurar_webhook` real falhou com "URL do webhook é obrigatória" (o backend da ZapZap valida `webhook_url`, não o `url` documentado no POST da instância) → body agora leva os DOIS nomes; resposta ganhou `configured` (sucesso conferido RELENDO a config, não só o 2xx), `dica` honesta por resultado e redação do token (`[token]`) em tudo que ecoa. Engloba v1.14+v1.15 (Ouvidos + claim-then-act, autorização explícita). Tabela `mensagens_grupo` criada em produção (RLS sem policy pública — privacidade). **Pra ligar a captura falta: Vini chamar `?tipo=configurar_webhook` de novo (agora deve vir `ok:true, configured:true`) + mensagens reais no grupo de teste. Nenhuma resposta a menção/citação ainda — Fase 3.** Ver §13.
- **Função v1.13 DEPLOYADA (versão 16, jul/2026, autorização explícita)** — agenda e cobrança separadas de vez: `?tipo=agenda` (9h, só jogos/turbo/zebra/liderança, NUNCA fala de quem falta palpitar) + `?tipo=cobranca_dia` (9h01, mesmo pipeline da cobrança manual, só envia se faltar alguém) + `?tipo=ultima_chamada` (T-60min, só envia se faltar alguém NAQUELE jogo) — ver §13. **Persona v2.2**: ganhou o viés emocional Brasil×Argentina (torcedor roxo do Brasil, implicância com a Argentina), aplicada em prod+dev via REST. **⚠️ `supabase_pg_cron.sql` agora aponta os 3 jobs pro `&destino=oficial`** (pedido explícito do Vini nesta leva — antes era `teste` de propósito). **pg_cron/pg_net AINDA NÃO habilitados no banco** (auditoria confirmou zero automação): SQL pronto, aguardando o Vini rodar no SQL Editor (armadilha 8 — DDL de extensão é automação bloqueada pro Claude Code). **A partir do momento em que esse SQL rodar, os 3 jobs passam a mandar mensagem de verdade pro grupo oficial da família, sozinhos, todo dia** — até lá, os modos só disparam se alguém chamar a URL manualmente.
> - **⚠️ Repo é PÚBLICO** — nada sensível em arquivo versionado (ver armadilha 9).

Guia de navegação do projeto — para saber **onde mexer sem explorar o código**.
Os números de linha **andam** a cada edição; confie nos **nomes de função** e nos
**comentários de seção** (`// ─── NOME ───` no JS e `/* ── nome ── */` no CSS).
Os números aqui são referência aproximada (estado em ~3250 linhas).

---

## 0. Estado atual (jul/2026)

**App em produção e em uso real pela família:**
- `main` → `bolao-ratazana00.pages.dev`. Mata-mata completo + fase de grupos (congelada).
- Redesign visual Copa 26 **concluído e no ar** (tokens de cor/fonte, identidade Ratazana).
- **Identidade Visual Copa 2026 (fontes/cantos/cores) — MESCLADA e NO AR em `main`.** Trabalhada na `ratazana`, com merge já feito e publicado em produção (ver detalhes em §3 e §7). Ver §12 para o resumo completo desta leva.
- **Robô Ratazana + admin de placares — MESCLADOS e NO AR em `main`** (merge `8c2bd88`, jul/2026; safepoint `v13-prod-pre-robo-admin` criado na `main` antes do merge). Bot de WhatsApp (Edge Function `ratazana-cobranca`) + página `admin-860c200f.html` + travas de integridade do placar. **O robô ainda aponta pro grupo de TESTE** — trocar pro oficial é decisão do Vini. Ver §13 (robô), §14 (admin) e §15 (pendências).
- **Leva do lançamento v2 do robô — MESCLADA e NO AR em `main`** (merge `1659253`, jul/2026; safepoint `v15-prod-pre-ratazana-lancamento` na `main` antes do merge; Cloudflare confirmado por hash idêntico do admin servido): persona v2.1.1, admin com botão único "Acordar" (pessoa+direcionamento+destino, sem preview), destino explícito, listar grupos JID/Name, mensagem inaugural definitiva, filtro de sanidade. **Função no ar: v1.11 (versão 14, jul/2026)** — menção real, fix do truncamento e sanidade por script, testados ao vivo (§15 item -1).
- Cabeçalho **NÃO é sticky** — foi a correção do bug de clique do chaveamento; não voltar.
- `ratazana` → branch de trabalho diário; publica em `ratazana.bolao-ratazana00.pages.dev`.
- Projeto antigo `bolao-ratazana-copa26.pages.dev` ainda existe mas **não é o oficial**.
- `congelado-fase-grupos` → museu (fase de grupos, congelada). **Não recebe mudanças.**

**Safepoints (tags):**
`v4-pre-redesign` · `v5-prod-pre-redesign` · `v6-prod-pre-fix-palpite` · `v7-prod-pre-mano-gi` · `v8-prod-pre-melhorias` · `v9-prod-pre-fotos` · `v10-pre-visual-v2` · `v10-pre-identidade-copa` · `v11-pre-chaveamento-novo` · `v11-pre-robo-ratazana` · `v12-prod-pre-visual-redesign` · `v12-pre-admin-placar` · `v13-prod-pre-robo-admin` · `v14-prod-pre-identidade-institucional` · `v15-prod-pre-ratazana-lancamento` · `v16-prod-pre-admin-fase-banner` · `v17-prod-pre-comunicado002-btn` · `v18-prod-pre-quartas-zebras`
Voltar: `git checkout <tag>`. Listar: `git tag -n1`.
⚠️ Há **pares de tags com o mesmo número** vindos de levas distintas (não confundir):
`v10-pre-visual-v2` (navegação) ≠ `v10-pre-identidade-copa` (fontes/cantos/cores, §12);
`v11-pre-chaveamento-novo` (chave/visor) ≠ `v11-pre-robo-ratazana` (antes do robô, §13);
`v12-prod-pre-visual-redesign` (na `main`, ponto de retorno da leva de identidade visual) ≠ `v12-pre-admin-placar` (antes da página admin, §14).
**`v13-prod-pre-robo-admin`** foi criada na `main` **antes do merge** da leva robô+admin — é o ponto de retorno de produção para desfazer essa leva inteira de uma vez.

**Detecção de ambiente:** `isDevEnv()` → hostname começa com `dev.` **OU** `ratazana.` = DEV. **NÃO depende de URL fixa** — qualquer hostname com esse prefixo vira DEV.
Em DEV: tabelas `dev_*`, badge visual, título "TESTES -". Em produção/localhost: tabelas sem prefixo.
⚠️ **localhost = produção** (não tem prefixo): ao testar local, lê/escreve dados REAIS.

**Regra de pontuação do MATA-MATA** (SÓ mata-mata; grupos congelados, não recalculam).
Placar FINAL (prorrogação inclusa). Componentes que **multiplicam** pela fase×turbo:
**5** resultado · **1** gol A · **1** gol B · **2** saldo (só vencedor) · **3** placar exato ·
**4** pênaltis (palpitou empate + acertou quem passa) — o +4 entra na base e multiplica.
Multiplicadores: 16avos ×1 · oitavas ×1,25 · quartas ×1,5 · semis ×1,75 · 3º ×1,75 · **final ×4** · turbo ×2.
**Zebra FIXO** (soma no fim, não multiplica): +3 zebra · +5 zebrão (azarão ≤25%/≤12% passa).
Funções: `mmScore` / `calcMataPts` / `MM_PHASE_MULT` / `mmMult` / `MM_TURBO` / `MM_ZEBRA`.

**Fase ativa: QUARTAS** (16avos e oitavas 100% encerrados, 24/24 jogos). `bot_config.fase_ativa = 'quartas'` — **o avanço automático da v1.19 FUNCIONOU de verdade** no fechamento do r16_8 (bot_log 193, 07/07 21:11 BRT, "oitavas -> quartas"; banner verde gravado em `admin_aviso_fase`, consumido na próxima abertura do admin). O Table Editor manual segue como via de emergência (ver §13/§15 item -13).
**Confrontos das quartas** (validados contra a chave em 07/07): `qf_1` Marrocos × França (09/07 17h Boston) · `qf_2` Espanha × Bélgica (10/07 16h Los Angeles) · `qf_3` Noruega × Inglaterra (11/07 18h Miami) · `qf_4` Argentina × Suíça (11/07 22h Kansas City).
**Turbos das quartas** (`MM_TURBO`, pré-definidos desde o início): `qf_1` · `qf_3` (semis: `sf_2`).
**Zebras das quartas** (`MM_ZEBRA`, odds Estrelabet 07/07 — todas ZEBRA +3, nenhum zebrão): `qf_1` lado A (Marrocos, odd 6.70 ~14,7%) · `qf_2` lado B (Bélgica, odd 5.98 ~16,5%) · `qf_3` lado A (Noruega, odd 4.28 ~23,0%) · `qf_4` lado B (Suíça, odd 5.46 ~18,1%). **NO AR nos 3 lugares e em produção** (08/07): index.html + admin **mesclados pra `main`** (merge parcial `cf8c285`, safepoint `v18-prod-pre-quartas-zebras` antes) e Edge Function **redeployada (versão 30, ACTIVE)** — antes ficaram só na `ratazana`/DEV por uma leva.
**Filtro de fase do app abre em QUARTAS** (`mmPhaseFilter='quartas'` em `index.html`, mesclado pra `main` na mesma leva): as oitavas encerraram, então a tela inicial já mostra os 4 cards de quartas com as zebras; antes abria em oitavas e as zebras ficavam a um clique. O admin já escolhe a fase sozinho (`pickSmartDefaultPhase` → quartas), sem default fixo.
(Quantos e quais turbos/zebras por fase é decisão do Vini a cada fase. ⚠️ Ao definir os novos, **replicar nos 3 lugares** — ver armadilha 5.)
Histórico oitavas: turbos `r16_2`/`r16_5`/`r16_8`; zebras `r16_2` ZEBRÃO lado A (Paraguai, não pagou) · `r16_7` zebra lado B (Egito, não pagou).

**Regras TRAVADAS:**
- Pontuação do mata NÃO é retroativa. Fase de grupos CONGELADA (não recalcula, não muda).
- Bolão Geral = grupos (congelados) + mata (regras novas).
- **g01, g02 e g03 NUNCA contam** (em nenhuma aba/tabela/gráfico).
- Só-mata (`mataOnly:true` em `MATA_EXTRA`/`MATA_PARTS`): Pepe, Du, Yuri, Mano, Gi (humanos) + Pepe IA — aparecem só nos cards e ranking do mata, não no Bolão Geral/JxV nem fase de grupos. `PARTICIPANTS` (os 8 originais) segue intacto para grupos/Geral.

**ARMADILHAS TÉCNICAS — não repetir:**

1. **Supabase JS v2: builder sem `.then()`/`await` não dispara o HTTP.** Toda função de escrita precisa de `.then()` ou `await`. Sem isso o palpite "salva" localmente mas nunca vai ao banco. Padrão obrigatório: `const {error} = await sb.from(...).upsert(...)`.

2. **RLS das tabelas do mata:** as 4 tabelas (`mata_confrontos`/`mata_palpites` + espelhos `dev_*`) precisam de policy permissiva de escrita (sem isso, 401). Auditoria de jul/2026 confirmou, via teste real de escrita, que as 4 já aceitam escrita; `supabase_mata_mata.sql` documenta as 4 (idempotente). Exceção: UPDATE em `mata_confrontos`/`dev_mata_confrontos` é condicional a `finished = false` — trava de placar v2, ver §14.

3. **Sempre `git push` após o commit.** O Cloudflare publica o remoto (`origin/main`), não o local. Commitar sem pushar = produção não atualiza.

4. **localhost = PRODUÇÃO.** `npx serve` local não tem prefixo de hostname → lê/escreve dados REAIS. Pra testar UI que depende de IS_DEV=true sem risco: usar `ratazana.bolao-ratazana00.pages.dev`, ou criar cópia local temporária com `IS_DEV=true` forçado no código (via `sed`; NUNCA commitar essa cópia).

5. **Turbo/zebra/agenda/bracket vivem em TRÊS lugares:** `index.html` + `supabase/functions/ratazana-cobranca/index.ts` + `admin-860c200f.html` (`MM_AGENDA`/`MM_TURBO`/`MM_ZEBRA`/`MM_BRACKET`). Quando o Vini definir turbos/zebras de fase nova: replicar nos TRÊS e **redeployar a Edge Function**.

6. **"Verify JWT" da Edge Function pode religar após redeploy** (padrão do painel Supabase). Sintoma: **401 em TODA chamada**, mesmo com `?token=` certo — antes de caçar bug, checar isso. O deploy via API já manda `verify_jwt:false` no metadata; `supabase/config.toml` também fixa. A proteção real do disparo é o `?token=` (`BOT_TRIGGER_TOKEN`).

7. **Palpite de IA no mata: inserir SEMPRE ANTES do kickoff** (via REST/anon key). A trava `mmIsKickoff` vale pra todo mundo e a pontuação não é retroativa — palpite atrasado = rodada perdida pra IA.

8. **Painel do Supabase (SQL Editor/Monaco) anda instável** — não depender dele. Deploy da função: `POST https://api.supabase.com/v1/projects/<id>/functions/deploy?slug=ratazana-cobranca` (token do dashboard; funciona de qualquer página logada). SELECTs também vão bem por esse caminho. Já **DDL/permissão em produção via automação é bloqueado pelo classificador de segurança do Claude Code** (corretamente, mesmo com autorização do usuário): não insistir — preparar o SQL, entregar pro Vini rodar.

9. **O repositório é PÚBLICO.** Nada sensível em arquivo versionado: nem token, nem senha, nem telefone (por isso `bot_telefones` é tabela, não arquivo). Secrets moram só nos Edge Function secrets do Supabase; a senha do admin só no localStorage do navegador de quem administra.

10. **Rótulos internos do prompt vazam pro texto final se não forem neutros.** Achado real em `bot_log`: o modelo ecoou literalmente "Ranking do mata" e "(Ratazana00)" porque era assim que o CÓDIGO (não a persona) rotulava os dados no prompt. A persona pode proibir uma palavra/nome, mas se o dado que o código monta usa exatamente essa palavra, o modelo tende a repetir. Corrigido nos rótulos que eu controlo ("RANKING DO BOLÃO", sem parênteses "(Ratazana00)" redundantes) — ao adicionar um rótulo novo no prompt, evitar termos que a persona baniu do texto final.

---

## 1. O que é

**Bolão Ratazana00 / Copa 2026** — app de palpites de Copa. Fase de grupos (72 jogos, congelada) + mata-mata (32 jogos, em andamento).

**Identidade:** "Bolão Ratazana00". Mascote = Ratazana com troféu (`Imagens/Ratazana.png`). Favicon = cabecinha da ratazana. Paleta de tokens no `:root` do CSS.

**Participantes — ATENÇÃO aos pares parecidos:**

| Contexto | Humano (edita no app) · id | IA (leitura) · id · campo GT |
|----------|---------------------------|------------------------------|
| Grupos + Mata | Jeca (Jéssica) · `jessica` | ChatGPT Jeca · `chatgpt` · `g` |
| Grupos + Mata | Tonius (Ricardo) · `tonius` | Claude Tonius · `claudio` · `d` |
| Grupos + Mata | Leo · `leo` | ChatGPT Leo · `chatgptleo` · `e` |
| Grupos + Mata | Vini (Vinicius) · `vinicius` | **Ratazana00** (ex-Claude Vini) · `claude` · `c` |
| **SÓ Mata** | Pepe · `pepe` | Pepe IA · `pepe_ia` |
| **SÓ Mata** | Du · `du` | — |
| **SÓ Mata** | Yuri · `yuri` | — |
| **SÓ Mata** | Mano · `mano` | — |
| **SÓ Mata** | Gi · `gi` | — |

Total mata: **9 humanos / 5 IAs** (14 em `MATA_PARTS`). Time Pepe = Pepe + Pepe IA.
Pares para não confundir: **Pepe ≠ Pepe IA · Vini ≠ Ratazana00 · Tonius ≠ Claude Tonius · Jeca ≠ ChatGPT Jeca · Leo ≠ ChatGPT Leo**.
**Ratazana00** = o antigo "Claude Vini" renomeado (pid `claude` intacto — só nome e foto mudaram, rename 100% propagado nas 3 abas). É o PRÓPRIO personagem do robô competindo no bolão — ver §13 (kayfabe).

**Dois bolões de grupos** (mesmos palpites, recortes diferentes):
- **Bolão Geral** (padrão): jogos com `sortKey >= CUT` (≥ 20/06 12h). 8 participantes originais.
- **Bolão JxV** (legado): só os 4 de `OLD_IDS` (Jeca, Vini, ChatGPT Jeca, Ratazana00), Copa inteira.

**Navegação (2 abas):**
- **Mata-mata:** Próximos jogos → Classificação do Mata → Como funciona → Chave → Lista por dia.
- **Ranking:** Bolão Geral (filtro Mata+Grupos / Só Grupos) · JxV · Estatísticas · Histórico. A seção "Jogos da Fase de Grupos" fica DENTRO de Ranking > Bolão Geral.

---

## 2. Stack / deploy / dev

- **Frontend:** arquivo único `index.html` — HTML + CSS (`<style>`) + JS vanilla (`<script>`). Sem framework, sem build, sem `import`. Agora ~3250 linhas. (`package.json` existe só pra scripts utilitários.)
- **DB/realtime:** Supabase (Postgres). SDK `@supabase/supabase-js@2` via CDN (UMD). RLS público (sem login) + Realtime.
- **Tabelas de grupos:** `bolao_games` (prod) / `dev_bolao_games` (dev). Schema: `supabase_setup.sql`.
- **Tabelas do mata:** `mata_confrontos` + `mata_palpites` (prod) / `dev_mata_*` (dev). Schema: `supabase_mata_mata.sql`.
- **Tabelas do bot:** `bot_config` + `bot_telefones` + `bot_log` (prod) / `dev_bot_*` (dev). Schema: `supabase_bot.sql`. Ver §13.
- **Automação (pg_cron):** `supabase_pg_cron.sql` — habilita `pg_cron`/`pg_net` e agenda os 3 jobs (agenda 9h, cobrança 9h01, última chamada 5/5min), destino `oficial`. Ainda não rodado — ver §13/§15.
- **Ouvidos (Fase 2):** tabela `mensagens_grupo` (schema `supabase_ouvidos.sql`, **JÁ CRIADA em produção**; ⚠️ RLS ligado SEM policy pública de propósito — conversa da família, anon key não lê; só service role). Capturada pelo modo `?tipo=webhook` da Edge Function — ver §13.
- **Conversa (Fase 3):** tabela `bot_mensagens_enviadas` (mesmo arquivo `supabase_ouvidos.sql`, **JÁ CRIADA em produção**, mesma postura de RLS sem policy) — registro do `message_id` de todo envio do bot, base do gatilho "responderam o bot". Ver §13.
- **Edge Function:** `supabase/functions/ratazana-cobranca/index.ts` (robô WhatsApp + fechar placar). Deploy via API — ver armadilha 8.
- **Página admin:** `admin-860c200f.html` (não linkada no site). Ver §14.
- **Bandeiras:** flagcdn.com (emoji não renderiza em Windows). `flagImg`/`flagUrl` pelo emoji.
- **Deploy:** push na `main` → Cloudflare Pages publica `bolao-ratazana00.pages.dev`. `ratazana` → `ratazana.bolao-ratazana00.pages.dev`. **NÃO pushar main sem ok do Vini.**
- **Dev local:** `npx serve` na porta 3333 (`.claude/launch.json`). Mas localhost = produção! Para testar isolado use a URL de preview `ratazana.*`.

## 2.5 Ambientes e Backup

- **Safepoints (tags Git):** criar antes de cada merge pra `main`. `git tag -a vN-desc -m "msg"` + `git push origin vN-desc`. Reverter: `git revert`/`git reset` + push.
- **Backups dos dados:** `backups/bolao_games_AAAA-MM-DD.json`. Gerar: `npm run backup`.
- **Botão "🪞 Espelhar prod→dev"** (`mirrorProdToDev`, só em IS_DEV): copia produção para tabelas `dev_*`. Usa só anon key.
- **Branches / URLs:**
  - `main` → `bolao-ratazana00.pages.dev` (produção, o que os participantes acessam)
  - `ratazana` → `ratazana.bolao-ratazana00.pages.dev` (DEV/preview de código)
  - `congelado-fase-grupos` → museu da fase de grupos (não tocar)
  - `dev` → backup antigo congelado (não tocar)

---

## 3. Mapa do arquivo `index.html`

### CSS (`<style>`, início do arquivo)
`:root` tem dois blocos: legado (`--g`, `--gd`, `--gold`, `--mu`, `--brd`, `--je/vi/ch/cl`) +
tokens Copa 26 (`--frame`, `--card-dark`, `--input-dark`, `--sheet`, `--surface`/`-2`/`-3`,
`--ink`, `--lime`, `--violet`, `--orange`, `--green`, `--font-display`/`--font-body`, `--r-*`, `--shadow-*`).
- **`--font-display`** = **Anton** (Google Fonts). **Archivo Black foi descontinuada** — não reintroduzir.
- **`--r-q-lg`/`--r-q-md`/`--r-q-sm`** — tokens do "quarto de círculo" (ex.: `4px 24px 4px 4px`): um canto bem arredondado, três quase retos. Ver §12.

### DOM estático (`<body>`)
`#loading-screen`, `header` (NÃO sticky), `nav` (2 botões: mata / ranking), `#sync-indicator`,
`#tab-mata`, `#tab-ranking`, `#error-banner`. Todos preenchidos por JS via `innerHTML`.

### JS (`<script>`) — seções na ordem do arquivo

| Seção (`// ─── … ───`) | Conteúdo-chave |
|---|---|
| CONFIGURAÇÃO SUPABASE | `SUPABASE_URL`, `SUPABASE_KEY` (anon, público), `TABLE`/`MM_TCONF`/`MM_TPAL` (por IS_DEV), `sb` |
| PARTICIPANTS/TEAMS/CUT | `PARTICIPANTS` (8), `TEAMS`, `OLD_IDS`, `CUT`, `flagImg`, `flagUrl` |
| GT (dados dos jogos) | array 72 jogos; `sortKey` |
| STATE | `CACHE`, `debouncers`, `getGame` |
| SUPABASE OPS | `setSyncing`, `upsert`, `loadData` |
| Realtime | `DATA_COLS`, `sameRow`, `isTyping`, `subscribeRealtime`, `applyRemoteScores` |
| UI HELPERS | `hideLoading`, `showErr` |
| VIEW STATE | `filterMode`, `activeTab`, `setFilter`, `renderAll` |
| SCORING (grupos) | `calcPts`, `ptsClass`, `turboIdForDate`, `isTurbo`, `ptsOf` |
| PRÓXIMO JOGO / CONTAGEM | `gameDate`, `findNextGame`, `tickCountdown`, `todaySlate`, `heroHTML`, `goToGame` |
| RENDER PALPITES | `renderPalpites`, `winCls`, `renderCard` |
| ACTIONS | `toggleFinish`, `toggleRemove`, `refreshPoints`, `updPred`, `updReal` |
| RANKING (stats) | `getStats` |
| TOOLTIPS | `TIPS`, `showTip`, `q` |
| comparativos/linhas | `versus`, `teamRace`, `statCard`, `rkRow` |
| RANKING GERAL | `podium`, `geralHistory`, `geralDeltas`, `histChart`, `rankMarquee`, `rankingNew` |
| RANKING ANTIGO (JxV) | `rankingOld`, `rankMode`, `setRank`, `renderRanking` |
| MATA-MATA | Ver §10 |
| TAB NAV | `showTab` |
| BOOT | `loadData()` |

---

## 4. Variáveis e arrays centrais

- **`GT`** — fonte da verdade dos 72 jogos de grupos (template estático). Campos: `id` (`g01`–`g72`), `grp`, `r`, `dt`, `tm`, `ven`, `tA/fA`, `tB/fB`, palpites das IAs (`g/c/d/e`, cada um `{a,b}`).
- **`CACHE`** — espelho em memória da tabela `bolao_games`: `{ game_id → row }`. Atualizado por realtime. Só o que vem do banco (placar real + palpites humanos + flags).
- **`PARTICIPANTS`** — 8 objetos `{id, name, type, color, init, team, editable?, img}`. Ordem = ordem visual. `id` é chave técnica.
- **`MATA_EXTRA`/`MATA_PARTS`** — participantes só-mata e lista completa (14) do mata-mata.
- **`MM_CONFRONTOS`** / **`MM_PALPITES`** — estado do mata (carregado do banco).
- **`mmOpen`** (Set) — IDs de cards do mata expandidos. Recalculado a cada load por `mmInitOpenCards()`; overrides manuais na sessão; reload zera.
- **`mmCollapsedDays`** (Set) — dias recolhidos na lista. Inicializado por `mmEnsureDaysInit()` (24h após fim do dia).
- **`CUT`** — `20*10000 + 12*100`. Corte do Bolão Geral.
- **`DATA_COLS`** — colunas que contam como "mudança real" no realtime (incluir toda coluna nova de humano).
- **`filterMode`** (`localStorage 'bf'`) e **`rankMode`** (`localStorage 'brm'`) — UI persistida.
- **`MM_AGENDA`** — datas/horas/sedes de todos os 32 jogos do mata (no código, pois anon key não cria colunas).

---

## 5. Fluxo de dados (ponta a ponta)

### Grupos — leitura / merge
`getGame(id)`: mescla `GT` + `CACHE`. Palpites humanos = colunas `<id>_a/<id>_b` do CACHE; IAs = campos `g/c/d/e` do GT. **Palpite de IA mora no código; palpite de humano mora no banco.**

### Grupos — como um palpite humano é salvo
1. `<input oninput="updPred(...)">` gerado em `renderCard`.
2. `updPred`: trava se jogo já começou → atualiza CACHE → `refreshPoints` (cirúrgico) → debounce 700ms → `upsert`.
3. `upsert`: `sb.from(TABLE).upsert({game_id, ...campos, updated_at}, {onConflict:'game_id'})`.
4. Outros devices: `subscribeRealtime` → `applyRemoteScores` (só o card, sem re-render). `sameRow` descarta eco; `isTyping` protege input em foco.

### Grupos — pontuação
- `calcPts(pred, rA, rB)`: +5 resultado · +1 gols A · +1 gols B · +3 exato → máx 10. `null` se falta dado.
- **`ptsOf(g, pred)`**: aplica TURBO (dobra 1 jogo/dia). **Sempre use `ptsOf`, nunca `calcPts` direto.**
- Prévia: pontos em cinza quando há placar mas não finalizado; só conta no ranking quando `finished`.

### Mata-mata — palpite humano
`mmUpdPalpite` → debounce → `mmUpsertPalpite` (PK `confronto_id`+`pid`). Trava pós-kickoff: `mmIsKickoff(c)` bloqueia escrita se `mmGameDate(c) <= Date.now()`.

---

## 6. Onde está cada feature

| Feature | Função / âncora |
|---|---|
| Card de jogo (grupos) | `renderCard` |
| Trava palpite grupos (kickoff) | `updPred` (guarda `gameDate().getTime()<=Date.now()`) |
| Lista por data / filtros | `renderPalpites` |
| Próximo jogo + contagem | `heroHTML`, `todaySlate`, `tickCountdown` |
| Turbo ×2 (grupos) | `isTurbo` / `turboIdForDate` / `ptsOf` |
| Finalizar / remover (grupos) | `toggleFinish`, `toggleRemove` |
| Atualização cirúrgica de pontos | `refreshPoints` (local), `applyRemoteScores` (remoto) |
| Pódio + leaderboard + setas | `podium`, `rkRow`, `rankingNew` |
| Comparativos (H×M, corrida times) | `versus`, `teamRace` |
| Estatísticas + tooltips | `statCard`, `TIPS`, `q` |
| Gráfico de evolução (SVG) | `histChart` + `histApply/Hover/Click` |
| Barra rolante do ranking | `rankMarquee` |
| Toggle Geral/JxV | `setRank` / `renderRanking` |
| **Mata: trava kickoff** | `mmIsKickoff(c)` · guarda em `mmUpdPalpite` e `mmSetQuemPassa` |
| **Mata: abertura automática de cards** | `mmInitOpenCards()` — último+em andamento+3 próximos; reload zera |
| **Mata: colapso de dia (24h)** | `mmEnsureDaysInit()` — colapsa quando now ≥ últimoJogo+3h+24h |
| **Mata: campo palpite lime/preto** | classe `.filled` nos inputs; `mmUpdPalpite` faz toggle; IA sempre cinza (`--surface-3`) |
| **Mata: botão Fechado / rótulo** | `mmResultHTML` — "🔒 Fechado" quando finalizado, "PRÉVIA DO PLACAR" quando não |
| **Mata: prévia do placar (100% local)** | `mmPreviaLocal`/`mmPreviaOf`/`mmEffConf` — nunca grava no banco; reload zera (§10) |
| **Admin: fechar/reabrir placar** | `admin-860c200f.html` → Edge Function `?tipo=fechar_placar` (service role) — §14 |
| **Robô: cobrança/fim de jogo** | Edge Function `ratazana-cobranca` — §13 |
| **Mata: placar topo** | `mmMatchupHTML` — sempre mostra VS (placar só no rodapé via `mmResultHTML`) |
| **Mata: falta palpite de X,Y,Z** | `mmNextGamesHTML` — inclui humanos E IAs sem palpite completo |
| **Mata: bandeiras quem passa** | `mmQuemPassaHTML` / `mmFootQpHTML` — sempre visíveis (idle quando sem dado) |
| **Mata: frases dinâmicas** | `mmHumQpLabel` — "X avança" / "Quem passa?" / vazio |
| Mata: chave visual (visor) | `mmvViewerHTML`/`mmvStageHTML`/`mmvPeekHTML`/`mmvOpenFull` — ver §12. `MM_BRACKET`/`MM_COLS` seguem como **dados** (32 slots fixos), mas a renderização não usa mais `mmBracketHTML` (removida) |
| Mata: pontuação | `calcMataPts`, `mmScore`, `mataStats`, `MM_PHASE_MULT`, `mmMult`, `MM_TURBO`, `MM_ZEBRA` |
| Mata: ranking integrado | `rankingNew` soma `mataStats`; `showTab`/`renderAll` tratam aba mata |
| Mata: agenda completa | `MM_AGENDA` (no código) — 32 jogos com dt/tm/ven |

---

## 7. NÃO toque sem cuidado (e por quê)

- **`PARTICIPANTS`, `OLD_IDS`, `GT` (campos `g/c/d/e`):** IDs referenciados em dezenas de pontos por string. Renomear quebra `getGame`, `getStats`, etc.
- **Critério de desempate** (`total` → `eHits` → `rHits`): duplicado em `rankingNew`, `rankingOld` e `geralHistory`. Mude os três juntos.
- **`sameRow`/`DATA_COLS`/`isTyping`:** protegem contra eco do realtime e perda de foco. Erro aqui faz card piscar ou entrar em loop de escrita.
- **Re-render completo durante digitação:** `renderPalpites`/`renderMata` matam foco e scroll. Mudança de input = atualização cirúrgica (`refreshPoints`/`applyRemoteScores`/`mmRefreshPts`). Re-render inteiro só em ação estrutural.
- **`upsert` sem `onConflict` / sem `updated_at`:** cria linha duplicada. Sempre use o helper `upsert`.
- **`ptsOf` vs `calcPts`:** usar `calcPts` direto ignora turbo. Sempre `ptsOf` em contexto de ranking.
- **`mmUpdPalpite` / `mmSetQuemPassa`:** verificam `mmIsKickoff(c)` e retornam cedo se travado. Não remover essa guarda.
- **Chaveamento (visor):** `MM_BRACKET`/`MM_COLS` são estrutura fixa de 32 slots (dados — não mexer). **`mmBracketHTML`/`mmFitBracket`/`mmBracketBox` foram REMOVIDAS** na leva de identidade visual (§12) — se algum código ou instrução antiga citar essas funções, está desatualizado. A renderização hoje é toda via `mmv*` (visor em janela) — ver §12.
- **Cabeçalho não-sticky:** NÃO voltar para `position:sticky`. Quebra o clique no chaveamento.
- **`mmOpen`/`mmCollapsedDays` não vão pro localStorage:** reset no reload é comportamento intencional.
- **Banco é produção real.** Não escreva valores de teste sem revertê-los.

---

## 8. Padrões para qualquer nova feature

- **Tudo em `index.html`, vanilla.** Funções globais via `onclick=`/`oninput=` em template strings + `innerHTML`. CSS numa linha por regra, cores via CSS var.
- **Idioma:** UI, comentários e domínio em **português**; nomes de função em camelCase.
- **Render:** ler estado por `getGame` (grupos) ou `MM_CONFRONTOS`/`MM_PALPITES` (mata). Ação estrutural → re-render; mudança pontual → cirúrgica.
- **Escrita:** sempre via `upsert`/`mmUpsertPalpite` (com debounce se vier de input). Estado de UI → `localStorage`. **Todo builder Supabase precisa de `await` ou `.then()`** — ver armadilha §0.
- **Pontos/ranking grupos:** `getStats`/`ptsOf`/`geralHistory`. Mata: `calcMataPts`/`mataStats`.
- **Mobile-first (375px).** Preview porta 3333, console limpo. Checar viewport mobile.
- **Deploy:** commitar na `ratazana` (mensagem em português). Pushar. Vini testa em DEV. Merge pra `main` só com ok do Vini + safepoint antes.

---

## 9. Adicionar um participante humano (checklist)

Para grupos (banco `bolao_games`):
1. `ALTER TABLE bolao_games ADD COLUMN <id>_a int, ADD COLUMN <id>_b int;`
2. `PARTICIPANTS`: novo objeto.
3. `TEAMS` se alterar time.
4. `getGame`: adicionar `<id>: {a:n(c.<id>_a), b:n(c.<id>_b)}`.
5. `DATA_COLS`: incluir `<id>_a`, `<id>_b`.
6. `applyRemoteScores`: garantir atualização do novo pid.
7. `missingPred`: incluir se deve contar como "falta palpite".
8. `statsOrder` em `rankingNew`: incluir id.
9. Foto em `fotos/<id>.jpg`.

Para mata-mata apenas (`mataOnly:true`):
- Adicionar em `MATA_EXTRA` (com `mataOnly:true`); `MATA_PARTS` é gerado automaticamente.
- Não é preciso `PARTICIPANTS` nem colunas no `bolao_games`.

Palpite de IA (grupos): campo `g/c/d/e` no GT. Palpite de IA (mata): inserir via admin/REST no banco.

---

## 10. Fase Mata-Mata (eliminatórias)

Separada dos grupos — não toca em `GT`, `bolao_games`, `getStats` nem pontuação de grupos.

**Tabelas Supabase** (schema em `supabase_mata_mata.sql`):
- `mata_confrontos`: `id` (text, ex.: `r32_1`), `phase`, `team_a/flag_a`, `team_b/flag_b`, `real_a/real_b` (placar final, prorrogação inclusa), `classificado` (`'A'`/`'B'`, só em empate → pênaltis), `finished`, `created_at`.
- `mata_palpites`: PK (`confronto_id`, `pid`), `gols_a`, `gols_b`, `quem_passa` (`'A'`/`'B'`, só em empate palpitado). `pid` ∈ ids de `MATA_PARTS`.
- ⚠️ **RLS:** ambas precisam de `FOR ALL USING(true) WITH CHECK(true)` (ver armadilha §0).

**Onde no código** — seção `// ─── MATA-MATA ───`:
- Config: `MM_TCONF`/`MM_TPAL` (nome das tabelas por ambiente), `MM_CONFRONTOS`, `MM_PALPITES`, `mmOpen`, `mmCollapsedDays`, `mmDaysInit`.
- Agenda (no código): `MM_AGENDA` — 32 slots com dt/tm/ven. `mmInfo(c)` faz fallback para ela.
- Dados: `loadMata`, `subscribeMata`/`mmReload` (realtime; não re-renderiza enquanto edita).
- Escritas: `mmUpsertConfronto`/`mmUpsertPalpite`, `mmUpdPalpite`/`mmSetQuemPassa` (debounce 700ms).
- ⚠️ **`mmSetReal`/`mmSetClassificado` NÃO gravam mais no banco** — alimentam só a prévia local (`mmPreviaLocal`); `mmSetFinished` virou no-op na home. Placar final entra SÓ pela Edge Function `fechar_placar` (§14).
- Admin (sem botão na UI): `mmAddConfronto`/`mmRemoveConfronto`/`mmToggleEdit`/`mmSaveEdit`.

**Abertura automática de cards (`mmInitOpenCards`)** — roda 1x no load, após `loadMata()`:
- Passado: `mmGameDate(c)+3h <= now`; em andamento: entre início e início+3h; futuro: após início.
- Abre: **último passado** + **todos em andamento** + **3 próximos futuros** (menos se não existirem).
- `mmOpen = new Set()` a cada reload → overrides manuais não persistem entre sessões.
- Colapso de dia (`mmEnsureDaysInit`): seção do dia recolhida quando `now >= últimoJogo.start + 3h + 24h`.

**Kickoff lock:** `mmIsKickoff(c)` = `mmGameDate(c).getTime() <= Date.now()`. Trava `mmUpdPalpite` e `mmSetQuemPassa`. Inputs ficam `disabled` (fundo cinza `--brd`).

**Campos de palpite:**
- Humano: fundo **lime** (`--lime`) quando vazio; **preto** (`--input-dark`) quando preenchido (classe `.filled`). Gerenciado por `mmHumPredHTML` (render) + `mmUpdPalpite` (live). Disabled = cinza.
- IA: sempre **cinza** (`--surface-3`), nunca lime/preto. Box `mm-iascore`.

**Rodapé do card (`mmResultHTML`):**
- Rótulo: "PLACAR FINAL" se finalizado, "PRÉVIA DO PLACAR" se não.
- Botão: "🔒 Fechado" (`.done`) se finalizado, "Finalizar ✓" se não.
- Placar: só no rodapé. Topo do card (matchup) sempre mostra "VS" (sem número).
- "Quem passou": bandeiras sempre visíveis (idle quando sem dado).

**Prévia do Placar (sandbox 100% LOCAL):** digitar placar num jogo ABERTO alimenta só `mmPreviaLocal` (memória; sem localStorage/sessionStorage — reload zera) e toda leitura de tela passa por `mmEffConf(c)`: devolve o confronto oficial intocado se `finished`, mesclado com a prévia se aberto. **ZERO requests ao banco** — nunca mais grava em `real_a`/`real_b`/`classificado`. `mataStats`/ranking só contam `finished` (nunca leram prévia).

**"falta palpite de:"** (`mmNextGamesHTML`): inclui **humanos E IAs** sem palpite completo em jogos abertos.

**Render:**
- `renderMata` (aba `#tab-mata`), `mmListItem`/`mmCardBody` (cards), `mmv*` (chave/visor — §12).
- `mmHeadHTML`, `mmMatchupHTML`, `mmResultHTML`, `mmCardBody`, `mmListItem`, `mmGhostCard`, `mmListHTML`.
- `mmRefreshPts` (cirúrgico, sem re-render), `mmRenderQuemPassa` (bandeiras/rótulo).
- `mmHumPredHTML`/`mmHumQpFlag`/`mmUpdHumFlags` (célula humana).
- `mmQuemPassaHTML` (IA) / `mmFootQpHTML` (rodapé).

**Integração ranking:** `rankingNew` soma `mataStats` ao total; gráfico de evolução, deltas e barra rolante continuam só da fase de grupos.

**Dados de teste** (não contam no ranking):
- `npm run seed:teste` → 2 confrontos `[TESTE]` no dev.
- `npm run clean:teste` → apaga só os `[TESTE]` (cascade nos palpites).

---

## 11. Ambientes prod/dev (banco isolado por hostname)

- **Detecção:** `isDevEnv(h)` → `h.startsWith('dev.') || h.startsWith('ratazana.')`.
  - IS_DEV=true: tabelas `dev_*`, badge DEV visível, título "TESTES -".
  - IS_DEV=false (prod/localhost): tabelas sem prefixo, sem badge.
- **Mesmo projeto Supabase, mesma anon key.** Isolamento é só pelo nome das tabelas.
- **Botão "🪞 Espelhar prod→dev"** (`mirrorProdToDev`, só IS_DEV): copia produção → dev. Anon key apenas; nunca service_role.
- **⚠️ localhost = produção.** Para testar dados sem risco, usar `ratazana.bolao-ratazana00.pages.dev`.

---

## 12. Identidade Visual Copa 2026 (fontes, cantos, cores) — **MESCLADA em `main`, no ar**

Leva de mudanças **só de CSS/fontes** (sem alterar HTML, JS, dados ou navegação), feita na `ratazana`
e já mesclada+publicada em `main` (commit de merge, tag de segurança `v12-prod-pre-visual-redesign`
criada na `main` **antes** do merge). Safepoint específico desta leva na `ratazana`: `v10-pre-identidade-copa`.

**Tipografia — hierarquia estrita:**
- **Anton** (Google Fonts) é usada **exclusivamente** em títulos de seção e no título do app (header).
  **Archivo Black foi descontinuada** — não reintroduzir em nenhum elemento.
- **Todo o resto** (datas, horários, dias dos jogos no chaveamento, nomes de times, nomes de
  participantes, placares dentro de cards, labels, botões, textos auxiliares) usa **Noto Sans**
  (`--font-body`).
- **Títulos de seção padronizados:** todos idênticos entre si — Anton, CAIXA ALTA, mesmo tamanho de
  fonte, mesmo espaçamento. Tamanho de referência: título "CHAVEAMENTO". Emojis dos títulos mantidos.
  Aplicado em título do app, "Chaveamento", "Palpites de placares", classificações (Mata-mata/Geral/JxV),
  "Evolução da classificação", e demais títulos de seção do app (abas Mata-mata e Ranking).
- **"Próximos jogos · Mata-mata" virou só "PRÓXIMOS JOGOS"**, no mesmo padrão dos demais títulos.

**Assinatura geométrica — "quarto de círculo":**
- `border-radius` assimétrico: **um canto bem arredondado, três quase retos** (ex.: `4px 24px 4px 4px`,
  tokens `--r-q-lg`/`--r-q-md`/`--r-q-sm` — ver §3). Aplicado em cards de jogo, pills de fase, botões
  principais e containers de seção.
- **Bandeiras:** mesmas imagens de sempre, só **recortadas** nesse formato (canto **superior direito**
  arredondado, igual em todas). Não confundir com troca de imagem — é só `border-radius`/`overflow`.
- **Fotos de avatar circulares NÃO mudam** — continuam com o recorte redondo de sempre.

**Cores oficiais adicionadas:**
- **TURBO:** laranja `#FF3D00`, texto branco (era outra cor antes).
- **Eliminados no chaveamento:** vinho `#751312` como cor de apoio (mantém o strikethrough já existente).
- **Ciano `#64FFDA`** (usado como acento) foi **substituído** por **lime `#AFEA00`** em todos os lugares.
- **Subtítulo "Copa 2026"** no header: bloco chapado verde-escuro `#004D3F` com texto lime `#AFEA00`
  (estilo tag/selo, não mais texto solto).
- **Paleta oficial de referência** (brand book FIFA, para consulta em novas peças): `#D50101` · `#CE1125` ·
  `#FF3D00` · `#AFEA00` · `#00C852` · `#304FFE` · `#751312` · `#004D3F` · `#1A237E` · `#6200EA`
  + os metálicos do pódio já em uso (ouro/prata/bronze).

**Chaveamento (visor) — reforço de interação:**
- **Colunas de fase inteiras são clicáveis** para navegar entre fases (mesmo efeito de tocar nas pills
  16av/8as/4as/Semis/Final) — clicar em qualquer parte da coluna de uma fase (título, card ou área vazia)
  muda a fase ativa. Não conflita com o gesto de arrastar/swipe (arrasto detectado por deslocamento
  mínimo antes de suprimir o clique).
- A renderização do chaveamento é toda pelas funções `mmv*` (visor em janela com esteira arrastável);
  `mmBracketHTML`/`mmFitBracket`/`mmBracketBox` (bracket antigo de 6 colunas) **foram removidas do
  código** — `MM_BRACKET`/`MM_COLS` seguem existindo, mas só como **dados** (32 confrontos fixos).

---

## 13. Robô Ratazana (bot de WhatsApp) — EM PRODUÇÃO (teste E oficial)

Bot que cobra palpites pendentes, comenta fim de jogo do mata-mata e (desde v1.20)
conversa de verdade no WhatsApp: Edge Function do Supabase + Claude API + ZapZap API.
**Desde jul/2026 (v1.20), roda nos DOIS grupos** — teste (`GRUPO_TESTE_ID`) e oficial
(`GRUPO_OFICIAL_ID`, com a família de verdade). Mensagens PROGRAMADAS (agenda, cobrança,
fim de jogo) já apontavam pro oficial há mais tempo (via `&destino=oficial` explícito);
o que era exclusivo do teste até aqui era **Ouvidos (captura) e Conversa (Fase 3)** —
agora também ligados no oficial, ver "Ouvidos + Conversa por grupo" abaixo.

### Ouvidos + Conversa por grupo (v1.20, `ecd996f`) — dois controles independentes

O modo `webhook` reconhece os dois grupos monitorados e trata **captura** e **resposta**
como dois liga/desliga separados em `bot_config` (antes viviam atrás do mesmo filtro
"é o grupo de teste?"):

| Grupo | Captura (Ouvidos) | Conversa (resposta) | Limites (`conversa_max_hora_*`/`conversa_cooldown_seg_*`) |
|---|---|---|---|
| **Teste** | sempre ligada (incondicional, como sempre foi) | sempre ligada (incondicional) | override gravado: **30/hora, cooldown 5s** |
| **Oficial** | `bot_config.captura_ativa_oficial='1'` — **LIGADA** | `bot_config.conversa_ativa_oficial='1'` — **LIGADA** | override gravado (v1.21): **20/hora** (`conversa_max_hora_oficial`); cooldown sem key → default 10s. Antes eram os defaults 6/h+10s — o 6/h engoliu em silêncio uma resposta real no 1º dia (bot_log 165) |

Ambas as flags do oficial foram ligadas e confirmadas nesta sessão (jul/2026): primeiro só
a captura (testada com mensagem comum real no oficial → capturou sem responder), depois a
conversa (testada com menção real → respondeu certo, com `destino` no `bot_log` gravado
como `oficial (120363427737461010@g.us) [...]`, não mais confundido com "teste" — esse
bug real de hardcode foi encontrado e corrigido nesta mesma leva, ver código/comentários
em `conversaTalvezResponder`, parâmetro renomeado `grupoTeste`→`grupoJid`).

O aviso automático único "o Ratazana vê tudo" (Ouvidos) continua restrito ao teste de
propósito (checagem explícita `destinoLabel==="teste"`, além do claim global já
existente) — a estreia da conversa no oficial foi um texto fixo manual, o **Comunicado
Oficial nº 002**, enviado via `enviar_texto` (bot_log `envio_manual` id 159, `ok`) —
ver botão dedicado no admin, §14.

✅ **Teto diário × conversa — RESOLVIDO na v1.21:** `contaEnviadasHoje` deixou de contar
o tipo `conversa` (resposta a quem chamou o bot tem governança própria — teto/hora +
cooldown por grupo); o teto diário (`TETO_MSGS_DIA_COM_JOGO=4`) voltou a valer só pras
mensagens programadas, que é do que ele protege. Incidente que motivou: 07/07, 4
respostas de conversa antes das 9h esgotaram o teto do oficial e agenda (9h) + cobrança
(9h01) foram puladas com `pulado_teto` (bot_log 175/176) — os crons rodaram na hora
certa. Ver item -15 em §15.

**Personagem = participante Ratazana00.** O perfil antes chamado "Claude Vini" (pid
`claude`, time Vini) É o próprio Ratazana competindo — só nome e foto mudaram, id intacto.
Fala em primeira pessoa dos próprios palpites, pontos e posição.
- **KAYFABE INVIOLÁVEL:** nunca menciona que os palpites dele são inseridos pelo Vini;
  nunca se cobra por palpite pendente (a função exclui o pid `claude` de "faltam palpitar"
  e esconde palpite pendente dele dos dados); nunca explica a própria mecânica.
- **Persona v2.1 (jul/2026)** — bloco operativo fornecido pelo Vini; fonte da
  verdade é o seed em `supabase_bot.sql` (key `system_prompt_ratazana`), **já
  aplicado em `bot_config` prod+dev via REST**. Essência: fiscal autonomeado do
  bolão, malandro paulistano com pose de auditor, memória de elefante/caderninho
  eterno; **jamais admite ser robô** ("robô é o teu palpite").
  **ILEÍSMO:** varia ~metade "eu" / ~metade "o Ratazana" ao falar de si; **nunca
  "Ratazana00"** no texto (a IA não sabe desse nome pelo prompt — ver armadilha 10).
  **HIERARQUIA DE ASSUNTO (anti-estrelismo, regra crítica):** 1º o jogo/Copa · 2º as
  pessoas e seus palpites · 3º ranking · 4º ele mesmo (nunca abre falando de si; máx.
  1 frase sobre si por mensagem; fala de si em no máx. 1 a cada 3 mensagens; autoironia
  em vez de se gabar; alerta de liderança detalhado só na futura mensagem de agenda das 9h).
  Tom ácido sem xingar (zoa o palpite/escolha, nunca a pessoa; sem palavrão);
  **intensidade por gênero** (coluna `genero` de `bot_telefones`: homem leva alfinetada
  forte, mulher zoeira leve + incentivo); gramática de rua ocasional (máx. 1/mensagem).
  **REGRA DE EXISTÊNCIA DAS IAs CONCORRENTES:** uma IA que não seja o Ratazana só é
  citável (Pontuaram/Cravaram/Acertaram/zebra/palpites) se estiver no **top 3 do
  ranking geral** — filtro de **DADOS** (`participantesCitaveis`, na Edge Function),
  não só de estilo; fora do top 3 ela simplesmente não aparece no prompt.
  **Menção obrigatória (v2.1.1 — agora é do SISTEMA, não do modelo):** toda mensagem
  programada ganha uma linha final de provocação com **marcação real** de WhatsApp,
  adicionada deterministicamente pela Edge Function (`linhaProvocacao`): sorteia
  alguém de `bot_telefones` (humano, com telefone, fora de quem já é alvo da direção
  de cena), monta a frase por gênero (bancos `PROVOC_M`/`PROVOC_F`, forte/leve) com o
  token `@<numero>` no texto e passa o campo `mentions` (CSV) pro `send/text` da
  ZapZap. Exceção: cobrança COM faltantes não ganha segunda menção; "todo mundo em
  dia" (force) ganha. `bot_telefones` vazia → linha simplesmente não sai. A persona
  agora PROÍBE o modelo de usar "@" (o "@Vini" solto do teste real era o modelo
  fingindo menção — texto morto, sem notificação). **Nomenclatura fixa:** "Bolão"/
  "Ranking"/"Ranking do Bolão", nunca "ranking do mata" (armadilha 10).
  Formato 4–7 linhas, negrito com *asteriscos* colados, 🐀 sempre + máx. 1–2 emojis
  do conjunto padrão; bordões rotativos sem repetir em mensagens seguidas.
  **Contexto obrigatório em mensagem de jogo:** os DOIS times pelo nome + fase,
  consequência (quem avança/eliminado), pênaltis narrados com emoção, zebra abrindo
  com alerta + elogio a quem apostou, cravadas/acertos de resultado/pontos.
  `bot/RATAZANA-ALMA.md` virou **histórico/backstory** — não é mais o texto operativo.
  **Persona v2.2 (jul/2026):** viés emocional BRASIL×ARGENTINA — torcedor roxo do
  Brasil, implicância declarada com a Argentina (animado se o Brasil joga no dia,
  comemora sem exagero se ganha, tristeza/mau humor sincero se perde; reação oposta
  e comedida com a Argentina — resmunga se ela ganha, alívio/deboche comedido se
  perde/é eliminada). É só tempero de tom: não muda a hierarquia de assunto nem o
  tamanho padrão de 4–7 linhas. Aplicada em `bot_config`/`dev_bot_config` via REST
  (seed também atualizado em `supabase_bot.sql`).
  **Persona v2.8 (07/07/2026): PROVOCAÇÃO DIRETA NO TETO MÁXIMO** — provocado/
  zoado/debochado diretamente ("vsf", "cala a boca", "só sabe cobrar"), é o
  momento de MAIOR intensidade do personagem, mais afiado que em qualquer outra
  situação: ataque direto e cortante NA PESSOA que provocou (histórico dela no
  Bolão, palpites vergonhosos, escolhas ruins, moral que não tem pra falar),
  ironia pesada e deboche de superioridade, sem desviar o assunto. TRÊS limites
  fixos mesmo no pico: (1) palavrão/baixaria = linha vermelha absoluta; (2)
  intensidade menor com mulheres vale inclusive no revide mais forte; (3)
  ataque só a escolhas/desempenho/atitude DENTRO do Bolão — nunca aparência,
  caráter, vida pessoal ou tema fora do jogo. Fora do gatilho de provocação,
  tom exatamente como antes (v2.7 introduziu o revide; v2.8 só elevou o teto).
  Aplicada em prod+dev via REST (conferida byte a byte) + seed em
  `supabase_bot.sql`.
- Split de mensagem longa continua no código: blocos "---" → até 3 mensagens
  sequenciais (rede de segurança ~900 chars/parte). Cobrança limitada à FASE ATIVA.
- **Filtro de sanidade (v1.9):** antes de qualquer envio, `sanidadeTexto` varre o
  texto por caracteres fora de ASCII + acentuação PT-BR + emojis aprovados; achado
  fora desse conjunto **bloqueia o envio** (erro claro + log no console da function)
  em vez de mandar a corrupção pro grupo. Motivo: achado real em produção — um
  caractere CJK solto no meio de frase coerente (glitch de amostragem do modelo,
  não truncamento).

**Edge Function `ratazana-cobranca`** (v1.10 — `supabase/functions/ratazana-cobranca/index.ts`):
- ⚠️ **TODO envio exige `&destino=teste|oficial`** (sem default; `oficial` usa o secret
  `GRUPO_OFICIAL_ID`). A URL antiga de cobrança sem `&destino=` passa a dar erro claro.
  **Nenhum envio automático vai pro oficial nesta fase** — tudo passa por ação do admin.
- Dados: SEMPRE tabelas de produção (`mata_*`/`bot_config`/`bot_telefones`), salvo `&env=dev` nos modos que aceitam.
- A função **PRÉ-CALCULA tudo** (ranking, pontos, zebra, multiplicadores, palpites públicos)
  e entrega pronto no prompt — **a IA nunca calcula**. Lógica portada do `index.html`
  (`mmScore`/`mataStats`/`MM_*`) — ver armadilha 5 (3 cópias). Jogos de grupos nunca entram.
  ⚠️ No fim de jogo, os times são resolvidos **PELA CHAVE** (`makeResolver`): `team_a/team_b`
  crus são NULL de oitavas em diante. Contexto completo no prompt: desfecho (pênaltis
  narráveis), consequência (`mmConsequencia`: quem avança pra onde / eliminado / semi →
  3º lugar / final → campeão), zebra com quem levou bônus, cravadas, acertos de resultado,
  palpites+pontos de todos e gêneros de `bot_telefones`.
- **Modos** (`?token=<BOT_TRIGGER_TOKEN>` obrigatório em todos):
  - *(sem tipo)* `&destino=...` → cobrança de quem falta palpitar na fase ativa. `&force=1` = envia "todo mundo em dia" mesmo sem pendência (teste). `&teste_longo=1` existe pra testar split.
  - `&listar_grupos=1` → não envia nada; devolve `grupos` normalizado `[{nome,id}]` + resposta crua da ZapZap (pra preencher `GRUPO_OFICIAL_ID`/`GRUPO_TESTE_ID`).
  - `&tipo=fim_de_jogo&jogo=<id>[&env=dev]` → comentário de fim de jogo. **O admin (Acordar o Ratazana) chama SEM `&preview=1`** — gera e já envia numa chamada só, sem etapa intermediária (leva pós-lançamento simplificou o clique). `&preview=1` continua existindo na função (gera e devolve sem enviar, loga `fim_de_jogo_preview`) mas não é mais usado pelo admin — só útil pra debug manual via curl. **`&pessoa=<pid>`** e **`&direcao=<texto>`** = direção de cena (instrução interna no prompt; PROIBIDO copiar/citar literalmente).
  - **POST** `&tipo=enviar_texto&destino=...` com body JSON `{texto}` → envia texto PRONTO sem passar por IA (preview aprovado / mensagem inaugural). Loga `envio_manual`.
  - `&tipo=fechar_placar&jogo=<id>&finished=1&real_a=N&real_b=N[&classificado=A|B][&env=dev]`
    → **ÚNICA via de escrita do placar final** (roda com service role). `finished=0` reabre
    (só destrava; mantém placar). Valida server-side: empate exige `classificado`; recusa
    confronto inexistente (não cria linha fantasma). **Fechar NUNCA envia mensagem.**
    CORS habilitado (OPTIONS → 204; GET e POST liberados). **v1.19 — ao FECHAR (nunca
    reabrir) em PRODUÇÃO (nunca `&env=dev`), chama `verificaEAvancaFaseAtiva`**: ver
    detalhe logo abaixo ("Avanço automático de fase").
  - **`&tipo=agenda&destino=...[&force=1]`** (v1.13) → **AGENDA DO DIA**, pensada pra
    pg_cron 1x/dia às 9h: jogos de hoje (turbo/zebra) + o ÚNICO alerta de liderança
    detalhado do dia (a persona já previa isso: "alerta de liderança detalhado só na
    futura mensagem de agenda das 9h"). **v1.13: NÃO fala mais de quem falta
    palpitar** (isso virou trabalho exclusivo do `cobranca_dia`, abaixo). Sem jogo
    hoje (ou todos já finalizados) → não envia nada, só loga (modo entressafra fica
    pra outra sessão). Idempotente (1x por dia+destino; `&force=1` ignora só essa
    trava, nunca o teto).
  - **`&tipo=cobranca_dia&destino=...[&force=1]`** (v1.13, novo) → **COBRANÇA DO
    DIA**, pensada pra pg_cron 1min depois da agenda (9h01). REAPROVEITA o mesmo
    pipeline da cobrança manual (`?token=...&destino=...`, sem `tipo`) — mesma trava
    "só cobra se faltar alguém" (sem `force=1`, ninguém devendo = não envia nada, só
    loga "todos palpitaram"). Diferença: governança extra (idempotente 1x/dia por
    destino + teto diário), igual aos outros modos automáticos.
  - **`&tipo=ultima_chamada&destino=...[&force=1]`** (v1.13) → **ÚLTIMA CHAMADA**,
    pensada pra pg_cron a cada ~5min: só age nos jogos que estão entrando na janela
    de **~1h antes do kickoff (55–65min)** — mudou de T-30min pra T-60min nesta leva
    — **E** que ainda tenham alguém sem palpitar NAQUELE jogo específico (se todos já
    palpitaram, não envia nada; antes mandava "todo mundo pronto" mesmo sem
    pendência). **Idempotência v1.15 = claim-then-act:** antes de chamar a IA, a
    função cria atomicamente a key `uc_<dd-mm>_<jogo>_<destino>` em `bot_config`
    (INSERT ignore-duplicates; helpers `claimUmaVez`/`liberaClaim`) — só uma
    execução ganha, mesmo cron + disparo manual simultâneos; falha de envio devolve
    a key pro próximo tick. O check antigo em `bot_log` virou só atalho barato.
    ⚠️ As keys `uc_*` em `bot_config` são operacionais — não apagar à mão (apagar =
    autorizar reenvio naquele dia).
  - **POST `&tipo=webhook`** (v1.14, Ouvidos) → endpoint que a ZapZap chama a cada
    evento da instância; não é chamado por humano. Grava em `mensagens_grupo` cada
    mensagem de TERCEIROS do grupo de **TESTE** (`GRUPO_TESTE_ID`): `message_id`
    (dedup por unique index + ignore-duplicates), remetente (JID + telefone cruzado
    com `bot_telefones`), texto, `mentions` (JIDs), `quoted_message_id` (se for
    resposta), timestamp e `raw_payload` completo. Parser DEFENSIVO (`achaProfundo`,
    BFS por nomes de campo Baileys — o envelope exato da ZapZap não é documentado);
    o raw_payload permite reprocessar se o parser errar. Ignora: outros chats
    (incl. o grupo OFICIAL), `fromMe`, eventos sem id. **Responde sempre 200**
    (erro vira `ok:false` + `bot_log`, nunca 5xx — retry da ZapZap não documentado).
    Na 1ª captura da história dispara o aviso único in character ("o Ratazana vê
    tudo", texto fixo, sem IA) com trava ATÔMICA: INSERT ignore-duplicates da key
    `ouvidos_aviso_enviado` em `bot_config` (falha no envio devolve a trava).
  - **`&tipo=configurar_webhook`** (v1.14, utilitário) → a função registra a própria
    URL de captura (`?token=<próprio>&tipo=webhook`) na instância ZapZap
    (`POST {base}/webhook`). Chamar UMA vez; devolve config anterior + resposta da
    ZapZap. Sem isso, nada chega no modo webhook.
  - **CONVERSA (Fase 3, v1.16 — dentro do modo webhook, SÓ grupo de TESTE):** após
    arquivar a mensagem, responde se (a) o bot foi **mencionado** (`mentions` ×
    número da instância — lido de `bot_config.bot_numero_whatsapp` se existir,
    senão da API de gestão da ZapZap, com cache no isolate) ou (b) a mensagem
    **cita um envio do bot** (`quoted_message_id` × `bot_mensagens_enviadas`,
    match exato e por sufixo). Todo envio do bot (qualquer modo) registra o
    `message_id` da ZapZap em `bot_mensagens_enviadas` via `registraEnvioBot`
    (best-effort, nunca derruba envio). Contexto da resposta: nome/gênero (por
    `bot_telefones`), posição no ranking, jogos do dia, texto citado; 1–4 linhas,
    sem @, sem link, `bot_log` tipo `conversa` com `[para:<tel>] [gatilho:...]`.
    **Anti-cascata (v1.17.1 — limites POR GRUPO):** defaults conservadores no
    código (6 respostas/hora + cooldown 10s por pessoa), sobrescritos por grupo
    pelas keys opcionais de `bot_config` `conversa_max_hora_<teste|oficial>` /
    `conversa_cooldown_seg_<teste|oficial>` (`limitesConversa`). **Grupo de
    TESTE: key gravada = 30/hora** (o teto de 6 matou uma sessão real de
    calibragem — bot_log 105-106); o OFICIAL fica nos defaults até existir key.
    Contagem do teto/cooldown também é por grupo. Fail-closed se o rate-limit
    estiver ilegível; skip com gatilho é LOGADO (`nao_enviado`); anti-eco duplo
    (fromMe + remetente==instância); dedup do INSERT também deduplica a
    resposta. Sem gatilho → só arquiva (Fase 2 intacta). SEM busca na web e SEM
    ficha relacional nesta leva.
- **Governança de volume (v1.12+, `agenda`/`cobranca_dia`/`ultima_chamada`):** teto
  diário de mensagens automáticas — **4 mensagens em dia com jogo, 2 em dia sem
  jogo** (`TETO_MSGS_DIA_COM_JOGO`/`TETO_MSGS_DIA_SEM_JOGO` no código) — conta
  QUALQUER mensagem enviada com sucesso naquele dia+destino (`bot_log`), não só as
  desses três modos, **EXCETO (v1.21) o tipo `conversa`** — resposta a quem chamou
  o bot tem governança própria (teto/hora + cooldown por grupo) e não compete mais
  com o orçamento das programadas (incidente real: bot_log 175/176). **NÃO se
  aplica** a cobrança manual/fim_de_jogo/enviar_texto (gatilho manual do admin —
  já naturalmente espaçado). Helpers: `botLogHoje`, `contaEnviadasHoje`,
  `jaRodouHoje`, `limitesBrasiliaHojeISO`.
- **Avanço automático de fase (v1.19, `verificaEAvancaFaseAtiva`):** chamado só ao
  FECHAR jogo de PRODUÇÃO (nunca reabrir, nunca `&env=dev`). Confere se isso completou
  TODOS os confrontos da fase hoje em `bot_config.fase_ativa` (ids de `MM_COLS`,
  fonte de verdade — não a coluna `phase` de texto do banco, que é só rótulo). Se
  sim **e** a próxima fase da sequência (`32avos→oitavas→quartas→semis→3lugar→final`)
  já tiver **todos** os seus confrontos como linha em `mata_confrontos` (existência,
  não "fechado"), avança `fase_ativa` sozinho — **um passo por vez**, nunca cascateia
  mais de uma fase na mesma chamada. Se não conseguir decidir com segurança
  (`fase_ativa` atual não reconhecida pelo `FASE_CANON`/`faseCanonica`, ou a próxima
  fase ainda sem confrontos cadastrados), **NÃO troca nada** — só grava um aviso
  pedindo confirmação manual. Os dois resultados (trocou OU precisa confirmar) vão
  pra `bot_config.admin_aviso_fase` (JSON: `{tipo:'trocou'|'ambiguo', ...}`), que o
  admin lê e **consome (apaga)** no boot — vira banner visível na tela (ver §14),
  não só `bot_log` (tipo `fase_ativa_auto`) que ninguém olha no dia a dia. Nunca
  lança erro — uma falha aqui não pode derrubar o `fechar_placar`, que já gravou o
  placar com sucesso antes de chegar nessa checagem. `FASE_CANON`/`faseCanonica`
  viraram constante/função de módulo (antes só existiam dentro do handler de
  cobrança) — compartilhadas entre os dois usos.
- **pg_cron:** o SQL pra habilitar `pg_cron`/`pg_net` e criar os 3 jobs (agenda 9h,
  cobrança 9h01, última chamada a cada 5min) está em `supabase_pg_cron.sql`.
  **⚠️ Os 3 jobs apontam `&destino=oficial`** (pedido explícito do Vini nesta leva —
  trocar de volta pra `teste`, se quiser, é só editar o `command` antes de rodar).
  **Ainda NÃO rodado** — automação de DDL/extensão é bloqueada pro Claude Code
  (armadilha 8); preparado pro Vini rodar no SQL Editor. A partir do momento em que
  rodar, os 3 jobs mandam mensagem de verdade pro grupo oficial da família sozinhos.
- Deploy com **"Verify JWT" DESLIGADO** — proteção é o `?token=`. Ver armadilhas 6 e 8.
- Auditoria: toda execução grava linha em `bot_log`.

**`bot_config`** (key/value; espelho `dev_bot_config`):
- `system_prompt_ratazana` — alma destilada. ⚠️ Rodar `supabase_bot.sql` de novo RESETA esta key pra versão do arquivo (`modelo_ia`/`fase_ativa` não são sobrescritas).
- `modelo_ia` — hoje `claude-sonnet-5`; fallback no código `claude-haiku-4-5-20251001`.
- `fase_ativa` — hoje `oitavas`. **O Vini troca no Table Editor a cada rodada nova.** A cobrança nunca inclui jogo de outra fase (a próxima entra no máximo como prévia explicitamente não-cobrável).

**Tabelas `bot_*`** (schema `supabase_bot.sql`, espelhos `dev_*`, RLS permissiva):
`bot_config` (acima) · `bot_telefones` (`participante_id`, `nome_exibicao`,
`telefone_whatsapp`, `is_humano`, `genero` M/F — **PREENCHIDA** (9 participantes
humanos, prod e dev; alimenta a menção real) · `bot_log` (auditoria).

**Secrets** (Edge Function secrets no Supabase — só os NOMES aqui; valores NUNCA em
arquivo, o repo é público): `BOT_TRIGGER_TOKEN` (protege o disparo; é também a senha do
admin, §14) · `ANTHROPIC_API_KEY` · `ZAPZAP_API_KEY` · `ZAPZAP_API_SECRET` ·
`ZAPZAP_ENDPOINT_BASE` · `GRUPO_TESTE_ID` · **`GRUPO_OFICIAL_ID`** (grupo da família —
ainda VAZIO, preencher via utilitário "Listar grupos" do admin) ·
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (automáticos).

**Custo:** ~US$ 0,012–0,022 por mensagem gerada (Sonnet). ZapZap: docs em
`api.zapzapapi.com/docs` (consultar com User-Agent de navegador).

**Fases futuras (2–4, ainda NÃO começadas):** webhook (responder mensagens do grupo),
conversa, agendamentos automáticos. Virão em sessões próprias — ver §15.

---

## 14. Admin de placares (`admin-860c200f.html`) — EM PRODUÇÃO

Página **não linkada** no site (URL obscura; a proteção real da escrita é a senha).
É o único caminho de lançar placar final e fechar/reabrir jogo do mata.
Cloudflare também serve na URL sem `.html`.

**Fluxo fechar/reabrir:**
1. Admin cola a **senha** 1x → fica em `localStorage['ratz_admin_code']` (NUNCA embutida
   no código). Senha = o secret `BOT_TRIGGER_TOKEN` (referência; valor só no Supabase e no
   navegador de quem administra).
2. Fechar jogo → chama a Edge Function `?tipo=fechar_placar` (service role, §13), que
   grava `real_a`/`real_b`/`classificado`/`finished`. **Fechar NUNCA envia mensagem**
   (o checkbox "Mandar comentário ao fechar" foi extinto na leva do lançamento).
3. Jogo fechado **continua na lista**: placar somente-leitura + "quem avança" (bandeiras)
   + botão "✏️ Reabrir para corrigir" (`finished=0`, mantém placar; corrigir e refechar).
4. UI: pills de fase portadas 1:1 da tela de palpites (vars `--pill-*`), filtro
   Todos/Abertos/Fechados, busca por time (acentos normalizados), bandeiras via bracket
   (`resolveSide`), 920px/2 colunas. Tem cópia própria de `MM_AGENDA`/`MM_ZEBRA` etc. —
   armadilha 5.

**Banner de troca de fase (v1.19, `#fase-aviso`, topo da tela):** lido de
`bot_config.admin_aviso_fase` (`checkFaseAviso`, no boot, sempre tabela de PRODUÇÃO —
sem variante dev, igual `bot_telefones`) e **consumido (apagado) na hora** — só aparece
UMA vez, na primeira vez que a tela abre depois do evento. Dois tipos: banner **verde**
("🔄 Fase mudou automaticamente de X para Y...") quando `fechar_placar` avançou
`fase_ativa` sozinho (ver §13); banner **âmbar** ("⚠️ Fase ativa pode precisar de ajuste
manual...") quando o sistema completou a fase mas não teve segurança pra avançar
sozinho — motivo vem pronto no texto. Botão "×" fecha na hora (client-side; o servidor
já apagou a key ao gravar o banner).

**🐀 Acordar o Ratazana (só em card de jogo FECHADO):**
- Campos de direcionamento (opcionais, mantidos desde o lançamento): seletor de pessoa
  (lido de `bot_telefones`, tabela de produção) + texto livre "Direcionamento (opcional)"
  — viram direção de cena no prompt (`&pessoa=`/`&direcao=`, §13); a IA incorpora a
  ideia, nunca copia literal.
- **Fluxo simplificado (pós-lançamento): um clique só.** Seletor de destino
  (Teste/Oficial) ao lado dos campos de direção. Botão único desabilita, mostra
  "Gerando e enviando…", chama `fim_de_jogo` já com `&destino=` (gera E envia na mesma
  chamada — **sem preview, sem confirm() antes do envio**) e mostra o resultado inline
  (sucesso com nome do grupo / erro resumido; dump técnico completo só no
  `console.error`, nunca cru na tela). ⚠️ Sem etapa de preview, escolher o destino
  certo ANTES de clicar é o único freio — não fica mais nada pra revisar depois.

**Utilitários no topo do admin:**
- "📡 Listar grupos" → chama `&listar_grupos=1`; a Edge Function lê os campos
  confirmados na resposta real da ZapZap (`JID`/`Name`, maiúsculos) e devolve
  `grupos` normalizado `[{nome,id}]`. Se a normalização falhar, o admin nunca mostra
  dump cru na tela — só loga no `console.error` (F12 pra ver o detalhe).
- "📣 Mensagem inaugural" → texto FIXO na constante `MSG_INAUGURAL` do script (hoje é
  PLACEHOLDER — trocar quando o Vini fornecer o definitivo), preview na tela, destino
  explícito e confirmação. Não passa por IA. Usa o mesmo `postEnviarTexto`
  (`tipo=enviar_texto`) que sobrou do fluxo antigo do Acordar.
- **"📢 Comunicado nº 002"** (v1.20, commit `4e2ee47` na `ratazana`, **já MESCLADO pra
  `main`** via merge parcial `615db5f` — confirmado ao vivo na URL de produção) → mesmo
  mecanismo exato da Mensagem inaugural (constante própria `MSG_COMUNICADO_002`, preview,
  radio teste/oficial, confirm(), `postEnviarTexto`), pro texto fixo que anuncia a estreia
  da Conversa no grupo oficial. **Já foi enviado pro grupo oficial nesta sessão** (bot_log
  `envio_manual`, `status_envio:ok`) — o botão continua no admin caso precise reenviar ou
  sirva de modelo pro próximo comunicado fixo (nº 003 etc.).

**Travas de integridade do placar (3 camadas):**
1. **Home (`index.html`):** placar final e "quem passou" são somente leitura pra QUALQUER
   usuário (jogo aberto ou fechado); `mmSetFinished` é no-op; `mmSetReal`/`mmSetClassificado`
   só alimentam a Prévia local (§10). Motivo: a anon key é pública (está no fonte), então
   esconder no front não bastava.
2. **Banco — trava de placar v2 (`supabase_placar_lock_v2.sql`, APLICADA):** a policy única
   `public_all` de `mata_confrontos`/`dev_mata_confrontos` virou 4 policies
   (select/insert/delete seguem `USING(true)`); o **UPDATE ficou condicional a
   `finished = false`** — anon key não altera jogo já finalizado; jogo aberto segue livre.
   ⚠️ `supabase_placar_lock_DEPRECATED_nao_usar.sql` (v1, REVOKE incondicional) está
   **DEPRECATED** — quebrava a Prévia da época; não usar nunca.
3. **Escrita oficial só via service role** (Edge Function `fechar_placar`) — imune à trava
   do banco, com validação server-side.

**Prévia do Placar na home = 100% local** (`mmPreviaLocal`/`mmEffConf`, §10): zero request,
reload zera — a prévia de um participante nunca mais aparece na página admin nem contamina
o banco.

---

## 15. Pendências abertas (jul/2026)

-17. **✅ v1.21.2 DEPLOYADA (08/07/2026 madrugada, commit `3bdb442`, versão 31
   ACTIVE) — a conversa não recebia a rodada ativa e o modelo inferia errado:**
   - **Incidente:** 00:34 de 08/07, no grupo de TESTE, Vini marcou "@Ratazana
     qual rodada está ativa agora?" → o bot respondeu "tecnicamente estamos no
     vácuo entre oitavas e quartas" (bot_log 200, `gatilho:mencao`). `fase_ativa`
     já era `quartas` desde o fechamento do r16_8 (bot_log 193).
   - **Causa raiz confirmada no `prompt_enviado` do 200 (não suposição):** o
     contexto da conversa (`conversaTalvezResponder`) montava RESULTADOS
     RECENTES (todos rotulados "Oitavas"), SITUAÇÃO DAS SELEÇÕES, `JOGOS DE HOJE
     (ainda abertos): nenhum` e o RANKING — mas **em nenhum lugar entregava
     `fase_ativa`**. O `bot_config` fetch da conversa só pegava
     `system_prompt_ratazana,modelo_ia`. Sem a fase explícita, o modelo INFERIU
     a rodada pelos últimos resultados (oitavas) + ausência de jogo hoje, e
     concluiu "entre fases". Não havia fonte de dado DESATUALIZADA — havia uma
     fonte AUSENTE (agenda/cobrança sempre leram `fase_ativa` direto; só a
     conversa nunca lia). Contraste: o caso de 07/07 22:36 (id ~198) estava
     certo porque a pergunta era sobre "hoje tem jogo?", que o "nenhum" responde
     bem — a diferença é a pergunta ser sobre a RODADA em si.
   - **Fix (v1.21.2):** (1) o fetch da conversa passou a
     `key=in.(system_prompt_ratazana,modelo_ia,fase_ativa)`; (2)
     `faseCanonica(fase_ativa)` + mapa `FASE_EXTENSO` produzem o rótulo por
     extenso; (3) o prompt ganhou a linha `RODADA ATIVA AGORA (fase em
     andamento do mata-mata): <fase> — é ESTA a rodada corrente, mesmo que não
     haja nenhum jogo marcado pra hoje...`, colocada ANTES de `JOGOS DE HOJE`;
     (4) TAREFA item 10 novo proíbe responder "entre fases"/"no vácuo"/"sem
     rodada" (o antigo item 10 virou 11). Verificado com dado real do banco:
     `fase_ativa="quartas"` → linha renderiza `RODADA ATIVA AGORA ... Quartas
     de final`. Deploy via API do dashboard (Chrome logado; token do
     localStorage recarregado após expirar): v30 → v31, ACTIVE, verify_jwt off,
     401 próprio conferido na URL.
   - **RETESTE AO VIVO PENDENTE (Vini):** o teste de modelo end-to-end exige o
     `BOT_TRIGGER_TOKEN`/mensagem real no WhatsApp (não dá pra disparar daqui).
     Perguntar de novo "qual rodada está ativa agora?" e conferir no bot_log
     que a resposta afirma "quartas" (sem "vácuo"/"entre fases"), podendo dizer
     junto que hoje não tem jogo.
-16. **✅ v1.21.1 DEPLOYADA (07/07/2026 fim de tarde, commit `8ee9a49`, versão 29
   ACTIVE) — a auto-menção falhou DE NOVO no reteste real, por causa NOVA (camada
   do modelo), agora corrigida:**
   - **Incidente:** Tonius marcou "Vsf @Ratazana00" às 12:36 BRT → resposta "esse
     contato eu não tenho no cadastro" (bot_log 183, `gatilho:mencao`).
   - **Investigação com dado real (não suposição):** o payload bruto foi lido de
     `mensagens_grupo` via SQL do dashboard: `mentionedJID = [61032206725341@lid]`
     — menção ÚNICA, exatamente o LID já cadastrado em `bot_numero_whatsapp`.
     Nada de alias, forma nova ou aprendizado atrasado. E o `prompt_enviado` do
     bot_log 183 prova que o aviso de "contato desconhecido" NÃO entrou no
     prompt — ou seja, o resolvedor da v1.21 funcionou perfeitamente.
   - **Causa raiz REAL:** o texto mostrado ao modelo mantinha o token cru
     (`Texto: "Vsf @61032206725341"`) e o modelo não tem como saber que aquele
     número é ele mesmo (a persona não conhece o próprio LID — kayfabe). Sem
     contexto na frase, tratou o token como terceiro e aplicou o comportamento
     "contato não reconhecido" da persona POR CONTA PRÓPRIA. Prova de contraste:
     bot_log 182, um minuto antes, MESMO token numa frase com contexto ("o
     pessoal tá te xingando... vou te defender") → resposta certa.
   - **Fix (v1.21.1):** tokens de menção reescritos ANTES de entrar no prompt —
     dígitos em `idsBot` (ou alias visível do bot pela regra da v1.21) viram
     `@Ratazana`; pessoa conhecida (tel/lid em `bot_telefones`) vira `@<nome>`;
     desconhecido de verdade fica cru, casando com o aviso já existente. A linha
     "Você foi marcado" agora afirma que a marcação `@Ratazana` é o próprio bot
     e proíbe responder que "não conhece". Validado em script isolado com o caso
     real 183 + alias + pessoa conhecida + desconhecido cru + sem menção.
   - **Diagnóstico permanente (pedido do Vini):** todo gatilho de menção loga no
     destino do bot_log `[men:<dígitos recebidos em mentions>]` e
     `[idbot:<identidades conhecidas na hora>]` — a próxima falha de resolução
     se diagnostica lendo o log, sem investigação manual.
   - **Deploy:** mesmo caminho da v1.21 (API do dashboard de dentro da página
     logada; fonte = GitHub raw do commit `8ee9a49`): versão 28 → 29, ACTIVE,
     `verify_jwt:false`, 401 próprio conferido na URL.
   - **RETESTE:** repetir a marcação seca ("Vsf @Ratazana00" ou similar) no
     oficial — agora o modelo recebe `Vsf @Ratazana` + a instrução explícita.
-15. **✅ v1.21 DEPLOYADA (07/07/2026 à tarde, commit `c5f754c`, versão 28 ACTIVE) —
   os 4 problemas do item -14 CORRIGIDOS, com causa raiz confirmada em bot_log:**
   - **(A) Menção ao próprio bot ≠ "contato desconhecido".** Incidente = bot_log
     166 (`gatilho:mencao` + resposta "esse contato eu não conheço"): a marcação
     do bot veio DUPLICADA no payload — forma conhecida (disparou o gatilho) +
     um alias de LID que não está em `bot_config.bot_numero_whatsapp` (LID varia
     por grupo/contexto, mesma classe já vista em `bot_telefones.lid`). Fix em 3
     camadas em `conversaTalvezResponder`/`botIdentidades`: (1) entrada de
     `mentions` cujos dígitos NÃO aparecem como token `@<digitos>` no texto é
     alias/fantasma da mesma marcação — nunca "pessoa citada"; o único token
     visível vira alias do bot quando ele foi marcado por forma invisível no
     texto; (2) o cache de identidades só aceita o conjunto COMPLETO vindo de
     bot_config — o fallback telefone-só da API da ZapZap não é mais cacheado
     (uma falha transitória do REST deixava o isolate cego pra LID por horas);
     (3) `aprendeIdentidadeBotDeFromMe`: eventos `fromMe` do webhook ensinam o
     LID do próprio bot por grupo (append em `bot_numero_whatsapp`; guarda
     anti-poisoning: só aprende se o `sender_pn` do evento bater com telefone já
     cadastrado; teto de 8 ids; invalida o cache). Caso Jeca (v1.18.2) continua
     protegido — validado em script isolado com os 4 cenários.
   - **(B) Busca na web auditável e obrigatória pra fato externo.** Incidente =
     bot_log 164 ("Messi 19 gols, ultrapassou Klose", cravado com confiança) —
     era IMPOSSÍVEL saber se a tool rodou (log não guardava usage). Agora:
     `chamaIA` devolve `buscas` (soma de `usage.server_tool_use.
     web_search_requests`) e o bot_log de conversa ganha `[busca:N]` no destino;
     `chamaIA` também continua o turno quando a API devolve `stop_reason:
     pause_turn` (loop de tool de servidor — antes viraria "não retornou texto");
     TAREFA item 6: fato externo sem busca = PROIBIDO cravar, pedido explícito de
     "pesquisa aí" = busca obrigatória. Diagnóstico à posteriori do 164 fica em
     aberto (sem usage logado na época); daqui pra frente o log responde.
   - **(C) Silêncio total — DUAS causas confirmadas, duas correções.** O
     "pesquisa aí" mudo foi o bot_log 165 (23:59, 32s após a resposta errada do
     artilheiro, mesma pessoa): bloqueado pelo **teto de 6/h do oficial** →
     key `conversa_max_hora_oficial='20'` criada (prod+dev via REST + seed;
     conversa é demand-driven, 20/h segue conservador). O segundo silêncio
     (bot_log 168/169, 01:40) foi o **filtro de sanidade**: glitch `覆` (U+8986)
     no meio de frase coerente bloqueou o envio inteiro → `enviaEmPartes` ganhou
     modo `sanitiza` (só conversa): ≤5 ocorrências de caractere bloqueado são
     REMOVIDAS e o envio segue; corrupção maior regenera 1x via `chamaIA` com
     aviso do glitch no prompt; mensagens programadas seguem no modo estrito
     (admin tem retry manual). Skip de rate-limit segue silencioso pro grupo por
     design (mas logado como `nao_enviado`).
   - **(D) Teto diário não conta mais `conversa`.** Incidente = bot_log 175/176
     (`pulado_teto` às 9h00/9h01 BRT) com 4 conversas ok antes (170-173, 07:21–
     07:58 BRT): os crons RODARAM na hora certa; a própria função pulou por teto.
     `contaEnviadasHoje` exclui o tipo `conversa` — o teto diário volta a
     proteger só do que ele foi feito (transmissões programadas não solicitadas);
     conversa já tem teto/hora + cooldown próprios. (Não foi possível ler
     `cron.job_run_details` sem acesso SQL, mas os registros `pulado_teto` da
     própria função às 12:00:00/12:01:00 UTC provam que os jobs dispararam no
     horário e o pulo foi decisão interna — evidência mais direta que a do cron.)
   - **Deploy:** via API do dashboard (`POST /v1/projects/<ref>/functions/deploy`)
     com fetch de DENTRO da página logada do Supabase no Chrome do Vini (a UI do
     editor não renderizou — página em branco — mas a API funcionou; token lido
     do localStorage da própria página, nunca ecoado pra fora). Confirmado:
     versão 27 → 28, ACTIVE, `verify_jwt:false`, e o 401 próprio da função
     respondendo na URL. Fonte do deploy = GitHub raw do commit `c5f754c`
     (conferido conter os marcadores da v1.21 antes de subir).
   - **RETESTE AO VIVO PENDENTE (Vini):** ver banner no topo do arquivo.
-14. **✅ RESOLVIDO NA v1.21 — ver item -15. (histórico) v1.20 DEPLOYADA E AO VIVO
   NO OFICIAL (jul/2026, commit `ecd996f`) — MAS
   com 3 bugs reais confirmados em uso pela família + 1 causa raiz já achada.**
   Resumo do que aconteceu nesta leva: separei captura/conversa em dois controles
   por grupo (`captura_ativa_oficial`/`conversa_ativa_oficial`), liguei os dois
   pro oficial depois de testar em 2 etapas (captura sozinha, depois conversa),
   corrigi o bug do destino hardcoded "teste" em `conversaTalvezResponder`,
   criei e mesclei pra `main` o botão "Comunicado nº 002" no admin, e enviei o
   Comunicado nº 002 de verdade pro grupo oficial. A família começou a usar a
   conversa de verdade (várias trocas reais e bem-sucedidas em `bot_log`) — mas
   o próprio Vini achou 3 problemas ao vivo, ainda NÃO investigados/corrigidos
   por falta de espaço de contexto nesta sessão:
   - **(a) Bot não reconhece a própria menção.** Quando alguém marca @Ratazana00,
     o código de "pessoas citadas" (`citadasIds`/`mencaoNaoResolvida`/
     `contatoDesconhecido` em `conversaTalvezResponder`, leva v1.18.2) trata essa
     menção como se fosse um CONTATO DESCONHECIDO sendo citado, e o bot responde
     "não conheço esse contato" — mesmo a própria identidade do bot já estando
     cadastrada (telefone `5511937366681` + LID `61032206725341` em
     `bot_config.bot_numero_whatsapp`, usados por `botIdentidades()`/`idsBot`
     pra decidir o GATILHO de resposta). **Hipótese mais provável (não
     confirmada — só raciocínio, sem ler o payload real):** o gatilho de
     "fui mencionado" e o loop de "pessoas citadas" usam a MESMA checagem
     `idsBot.has(digitos(j))` pra pular a própria menção — se o bug é real,
     ou essa checagem está falhando pra alguma variante de JID/LID que aparece
     especificamente no GRUPO OFICIAL (mesma classe de problema já visto antes:
     LID pode diferir por contexto/grupo — ver histórico de `bot_telefones.lid`),
     ou existe um segundo caminho no código que resolve "quem foi citado" sem
     passar por `idsBot`. Não dá pra confirmar sem ler `mensagens_grupo` do
     incidente real (tabela sem policy pública — só service role vê) ou sem
     rodar um teste dirigido. **Próximo passo sugerido:** achar a mensagem real
     no `mensagens_grupo` (via service role) que gerou essa resposta errada,
     conferir `mentions`/`raw_payload`, e comparar com o valor salvo em
     `bot_numero_whatsapp`.
   - **(b) Suspeita de que a busca na web nem sempre roda de verdade.**
     Perguntado sobre o artilheiro das Copas, o bot respondeu ERRADO com
     confiança total, sem nenhuma ressalva de incerteza nem sinal de ter
     pesquisado. Pode ser: (i) o modelo decidiu não chamar `web_search` pra
     essa pergunta específica (a instrução do prompt deixa a critério do
     modelo) e respondeu "de cabeça" mesmo assim, ignorando a regra de
     humildade factual da persona v2.6; ou (ii) chamou a tool mas o resultado
     não influenciou a resposta corretamente. Não investigado.
   - **(c) MAIS GRAVE — silêncio total.** Alguém deu reply contestando o erro
     de (b) e pedindo pra ele "pesquisar aí" — **nenhuma resposta saiu no grupo
     oficial**. Achei uma pista real em `bot_log` que pode ser exatamente esse
     incidente (ou um irmão dele): dois registros `tipo:conversa`,
     `destino:oficial`, por volta de 2026-07-07T01:40 UTC (22:40 em Brasília,
     ainda 06/07), com `status_envio` `erro` e depois `nao_enviado`, erro
     idêntico: `"Filtro de sanidade bloqueou o envio: caractere de escrita
     incompatível com português ('覆', U+8986, CJK unificado) — provável
     glitch do modelo."` — ou seja, o modelo (possivelmente durante/depois de
     uma busca na web) gerou um caractere CJK solto no meio da resposta, o
     filtro de sanidade (`sanidadeTexto`, armadilha/proteção já existente desde
     a v1.9) bloqueou CORRETAMENTE o envio de texto corrompido — mas fez isso
     **silenciosamente pro usuário** (só loga no servidor, por design). Do
     ponto de vista de quem está no WhatsApp, isso é indistinguível de "o bot
     simplesmente não respondeu". **Se for mesmo esse o incidente, não é bem
     um bug novo — é uma limitação conhecida do filtro de sanidade (silencioso
     por design) batendo de frente com uma situação nova (glitch de caractere
     mais provável quando a resposta envolve busca na web, que é nova nesta
     leva).** Vale considerar, numa próxima sessão: quando o filtro de sanidade
     bloquear um envio de CONVERSA (não mensagem programada), talvez valha a
     pena tentar reenviar automaticamente pedindo pro modelo regenerar sem o
     caractere problemático, em vez de desistir silenciosamente — hoje só a
     cobrança/agenda tem esse tipo de retry manual (via admin), conversa não
     tem nenhum.
   - **✅ Item que ERA pendência mas foi RESOLVIDO nesta sessão (não é mais
     mistério):** agenda das 9h e cobrança das 9h01 não saíram hoje (07/07) no
     grupo oficial. Causa raiz CONFIRMADA em `bot_log` (ids 175 e 176,
     `status_envio:pulado_teto`, `erro:"teto diário atingido (4)"`): o teto
     diário de mensagens (`TETO_MSGS_DIA_COM_JOGO=4`, `contaEnviadasHoje`) conta
     QUALQUER envio bem-sucedido no dia+destino — isso sempre incluiu
     `conversa` (não é bug de código, é o design documentado desde a v1.12),
     mas só virou problema PRÁTICO agora que a conversa está ao vivo: 4
     respostas de conversa bem-sucedidas antes das 9h (bot_log ids 170-173,
     entre 07:21 e 07:58 de Brasília) já tinham esgotado o teto do oficial
     quando os crons de agenda/cobrança rodaram. **NÃO é bug de pg_cron** (os
     dois jobs RODARAM na hora certa, 9h/9h01 Brasília, e ficou provado que
     pg_cron está ativo e funcionando) **nem da transição automática de fase**
     (oitavas nem terminou — `r16_7`/`r16_8` seguem abertos, jogos de hoje
     mesmo; `fase_ativa` continua `'oitavas'`, sem avanço). **Decisão pendente
     do Vini pra próxima sessão:** como ajustar — as opções mais óbvias são
     (i) excluir `tipo==='conversa'` da contagem de `contaEnviadasHoje` (mais
     cirúrgico: conversa é resposta a quem chamou o bot, não transmissão não
     solicitada, então não devia competir pelo mesmo orçamento de "mensagens
     que a família não pediu"), ou (ii) subir `TETO_MSGS_DIA_COM_JOGO`, ou
     (iii) dar um teto SEPARADO só pra conversa. Nenhuma mudança de código
     feita ainda — só o diagnóstico.
   - **🔐 Segurança, ainda pendente:** `BOT_TRIGGER_TOKEN` e o token do GitHub
     (embutido na URL do remote local, `.git/config`) ficaram expostos em texto
     puro em saídas de comando/ferramentas em sessões anteriores desta mesma
     conversa. **Nenhum dos dois foi rotacionado.** Ação do Vini: gerar novo
     `BOT_TRIGGER_TOKEN` (Supabase secrets — atualizar também a senha salva no
     `localStorage` do admin) e um novo token do GitHub (trocar no remote local,
     idealmente migrar pra SSH ou um credential helper em vez de token na URL).
-13. **✅ v1.19 DEPLOYADA (jul/2026, commit `e350abb`) — avanço automático de
   fase_ativa + banner no admin:** investigação da leva anterior (ver histórico
   de conversa) mapeou que `fase_ativa` só mudava manualmente (Table Editor) e
   que esquecer de trocar fazia a cobrança silenciosamente parar de cutucar
   quem falta palpitar assim que o último jogo da fase configurada passasse do
   kickoff — sem erro, sem aviso. Fix: `verificaEAvancaFaseAtiva`, chamada a
   cada FECHAR de jogo de produção (nunca reabertura, nunca `&env=dev`),
   confere se isso completou a fase ativa e, se a próxima fase já tiver todos
   os confrontos cadastrados em `mata_confrontos` (existência, não "fechado"),
   avança `fase_ativa` sozinha — um passo por vez, nunca cascateia. Se não
   conseguir decidir com segurança (fase não reconhecida, ou próxima fase sem
   confrontos cadastrados), NÃO troca — só grava aviso pedindo confirmação
   manual. Ambos os resultados viram banner visível no admin (`#fase-aviso`,
   verde = trocou / âmbar = precisa confirmar), lido e consumido no boot —
   não fica só em `bot_log` que ninguém olha. `FASE_CANON`/`faseCanonica`
   viraram compartilhados entre cobrança e avanço automático (antes eram
   duplicados). **Verificado ao vivo nesta sessão** (preview local do admin
   contra o banco de PRODUÇÃO real): escrevi manualmente os dois formatos de
   aviso em `bot_config.admin_aviso_fase` e confirmei visualmente os dois
   banners (verde e âmbar) aparecendo certos e sendo consumidos (não
   reaparecem no reload seguinte) — sem nunca tocar no `fase_ativa` real
   (que seguiu `oitavas` o tempo todo do teste). A lógica do lado do servidor
   (`verificaEAvancaFaseAtiva` em si) não pôde ser exercitada ao vivo nesta
   sessão por falta do `BOT_TRIGGER_TOKEN` (só existe no Supabase/navegador
   de quem administra) — confirmada por leitura cuidadosa do código e pelo
   estado real do banco (as 32 linhas de `mata_confrontos`, incluindo
   quartas/semis/3º/final, já existem pré-cadastradas desde o início do
   mata-mata — confirmado por query direta). **RETESTE sugerido:** fechar o
   próximo jogo de oitavas real (r16_5 a r16_8) e conferir que nada muda
   (fase incompleta ainda); ao fechar o ÚLTIMO (r16_8), abrir o admin em
   seguida e conferir o banner verde "Fase mudou automaticamente de Oitavas
   para Quartas".
-12. **✅ v1.18.2 DEPLOYADA (jul/2026, commit `5a54465`) + persona v2.6 — fix
   da menção não resolvida + busca na web (SÓ modo conversa):** (A) achado
   real de teste — marcaram @Jeca de verdade (mentionedJID real) ANTES do
   LID dela estar aprendido em `bot_telefones`; sem nenhum sinal disso no
   prompt, o bot respondeu como se a marcação fosse a pessoa discutida na
   mensagem citada (Claude Tonius) em vez de admitir que não conhecia o
   contato. Toda menção real sem match agora vira `mencaoNaoResolvida`; se,
   mesmo com o fallback por nome escrito na mensagem, nenhuma pessoa real
   sobra (`contatoDesconhecido`), o prompt avisa o modelo explicitamente
   pra nunca adivinhar/reaproveitar identidade de quem quer que seja — só
   admitir que ainda não conhece o contato e convidar a mandar mensagem
   pra aprender quem é. **Bloqueante pro lançamento no grupo oficial** (9
   pessoas sem LID mapeado inicialmente — cenário vai ser muito mais
   comum lá do que no teste). (B) BUSCA NA WEB: tool nativa
   `web_search_20250305` (versão básica, não a `_20260209` com filtragem
   dinâmica — de propósito, pra funcionar também no fallback Haiku 4.5)
   ligada só na chamada do modo conversa; o modelo decide sozinho quando
   buscar (fato de futebol/Copa fora dos dados do bolão, ex.: artilheiro
   geral do torneio) via instrução na TAREFA — nunca pra pergunta sobre
   dado do próprio bolão. Join dos blocos de texto da resposta virou `""`
   (era `"\n"`): blocos fatiados por citação da busca são pra colar
   direto, senão uma frase contínua vira quebrada no meio. Persona v2.6:
   humildade factual fora do bolão ganhou exceção pra fato pesquisado
   agora (pode afirmar com confiança, não é mais "de cabeça"); parágrafos
   novos "BUSCA NA WEB" e "CONTATO NÃO RECONHECIDO" na persona (reforço do
   comportamento, não só na TAREFA por mensagem). Deploy feito pelo
   dashboard do Supabase (Monaco `model.setValue()` com o conteúdo puxado
   direto do GitHub raw do commit `5a54465` — sem token de API). RETESTE
   sugerido: mencionar alguém dos `bot_telefones` que ainda não mandou
   mensagem no grupo de teste (LID não mapeado) e conferir a resposta de
   "não conheço" em vez de errar a identidade; perguntar algo fora do
   bolão tipo "quem é o artilheiro dessa Copa até agora" pra ver a busca
   funcionando; perguntar um dado do bolão (ranking/palpite) e confirmar
   que continua respondendo rápido, sem acionar busca à toa.
-11. **✅ v1.18.1 DEPLOYADA (jul/2026) + persona v2.5 — ranking sem buracos +
   regra das IAs vira comportamento (achado real de teste):** perguntado
   "quem é o lanterna", o bot respondeu o 11º em vez do 14º real, porque o
   ranking da conversa filtrava as IAs fora do top 3 ANTES de montar a
   lista — tirava linhas do meio e distorcia posição relativa mesmo entre
   humanos. Fix: `rankingCompleto` na conversa agora é SEMPRE as 14
   posições reais, sem buraco nenhum; `pessoasCitadasBloco` passou a
   varrer todo `MATA_PARTS_BOT` (não só os citáveis) — se alguém perguntar
   direto por uma IA fora do top 3, o dado precisa estar disponível.
   **A "regra de existência das IAs concorrentes" deixou de ser filtro de
   DADO e virou regra de COMPORTAMENTO na persona (v2.5):** em mensagens
   programadas (agenda/cobrança/pós-jogo) nada muda — IA fora do top 3
   simplesmente não vem nos dados. Em CONVERSA, o modelo agora recebe o
   dado completo mas só fala de IA fora do top 3 se for perguntado direto
   sobre ela — nunca por iniciativa própria. Persona v2.5 aplicada via
   REST em `bot_config`+`dev_bot_config` (relida do banco pra conferir:
   bate byte-a-byte com o texto novo). Deploy da Edge Function feito pelo
   dashboard do Supabase (Monaco `model.setValue()` com o conteúdo puxado
   direto do GitHub raw do commit `754e89b` — sem token de API, só sessão
   logada do navegador); confirmado no ar (timestamp "a few seconds ago",
   0 erros desde o deploy). Commit do código: `754e89b` (branch `ratazana`).
   **Investigação encerrada — pré-carga de LID via API não resolve o caso
   da Jeca:** `POST /group/info` e `POST /group/list?getParticipants=true`
   da ZapZap trazem a lista de participantes sem precisar de mensagem
   prévia, mas a doc não mostra nenhum campo que junte telefone+LID — o
   esperado (mesma lógica da privacidade de LID já observada ao vivo) é
   que quem tem privacidade ativada apareça como `@lid` ali também, sem
   revelar o telefone. A única via confirmada de aprender o par
   telefone↔LID continua sendo receber uma mensagem da pessoa (payload
   traz `sender_pn`+`sender_lid` juntos). Item -8 (LID da Jeca) segue
   pendente até ela mandar mensagem no grupo de teste — sem atalho de API.
-10. **✅ v1.18 DEPLOYADA (versão 23, jul/2026) + persona v2.4 — calibragem da
   conversa (4ª leva de teste real):** (A) dosagem do viés (luto do Brasil
   máx. 1 a cada 3-4 respostas de conversa, decrescente; Argentina só com
   gancho); (B) contexto com RANKING COMPLETO (posições reais dos citáveis;
   IA fora do top 3 segue sem linha e o prompt proíbe inventar nome pra
   posição ausente) + "nunca mande consultar o app"; (C) coluna `lid` em
   `bot_telefones` (prod+dev; LID do Vini preenchido do payload real;
   auto-aprendizado quando o payload traz `sender_pn`+lid juntos;
   `senderName` como fallback de nome) e PESSOAS CITADAS resolvidas por
   menção real (tel/lid) ou nome escrito (borda de palavra, sem acento/
   caixa), com bloco de dados no contexto; (D) humildade factual fora do
   bolão na persona (caso Klose: fato externo nunca é cravado; contestado,
   admite desatualização); (E) reply mudo das 10:36 era o cooldown de 10s
   (bot_log 121, reply em 9s) → key `conversa_cooldown_seg_teste = 5`.
   RETESTE: posição fora do top 3, pergunta citando pessoa, fato externo
   (esperar humildade), sequência rápida de replies.
-9. **✅ v1.17.1 DEPLOYADA (versão 22, jul/2026) — limites da conversa POR
   GRUPO:** o reteste da v1.17 passou (menção casual, jogo do Brasil e reply
   via citação todos responderam — bot_log 99-104), mas a sessão morreu no
   teto fixo de 6 respostas/hora (skips auditáveis 105-106 confirmaram na
   hora, sem sessão de debug). Teto/cooldown agora vêm de keys por grupo em
   `bot_config` (`conversa_max_hora_<destino>`/`conversa_cooldown_seg_<destino>`,
   helper `limitesConversa`; contagem também por grupo): TESTE = 30/hora
   (key gravada em prod+dev e seed no `supabase_bot.sql`), OFICIAL herda os
   defaults conservadores do código (6/hora, 10s) até alguém criar key.
   Cooldown de 10s intocado — zero skips de cooldown nos logs. RETESTE:
   sequência longa (10+ mensagens) pra confirmar que a conversa não morre.
-8. **✅ v1.17 DEPLOYADA (versão 21, jul/2026) — conversa com contexto factual +
   modo papo + fix do reply mudo (2º teste real):** (1) o reply em mensagem do
   bot não respondia por causa do COOLDOWN de 30s (replies reais em 13s/22s;
   o match de citação exato+sufixo estava correto — formatos reais: enviado
   `5511937366681:3EB0...`, citado `3EB0...`) → cooldown 10s + skip com
   gatilho logado em `bot_log` (status `nao_enviado`); (2) contexto da
   conversa: data/hora de Brasília, resultados fechados dos últimos 3 dias
   com consequência, situação Brasil/Argentina calculada da chave, e regra
   dura de nunca negar fato listado (o bot NEGOU o jogo do Brasil de ontem —
   quebra grave de kayfabe por falta de contexto, não por estilo);
   (3) TAREFA do modo conversa: responder primeiro, dados do bolão só se
   relevantes, 1-3 linhas, humor puxado da situação das seleções. Persona
   v2.3 em prod+dev (bordões: máx. 1/mensagem, "caderninho" raro — aparecia
   em TODA resposta). RETESTE: menção casual, pergunta sobre o jogo do
   Brasil, reply em resposta nova.
-7. **Fase 3 (Conversa) — v1.16.1 DEPLOYADA (versão 20, jul/2026); 1º teste real
   achou e corrigiu DUAS causas do bot mudo:** (1) o campo de menções no
   envelope da ZapZap é `content.contextInfo.mentionedJID` (JID MAIÚSCULO) —
   faltava no parser (case-sensitive; `mentions` vinha NULL em toda captura);
   (2) **menção em grupo chega como LID de privacidade (`...@lid`), NÃO como
   telefone** — o gatilho agora compara contra o CONJUNTO de identidades da
   instância (`botIdentidades`; key `bot_config.bot_numero_whatsapp` =
   `"5511937366681,61032206725341"` = telefone,LID — PREENCHIDA em prod+dev
   com valores confirmados no payload real). ⚠️ Remetentes também chegam como
   LID → cruzamento com `bot_telefones` falha e o nome vira "alguém do grupo"
   no contexto da conversa — limitação conhecida; mapear LID→participante é
   leva futura. Gatilho de citação segue só enxergando envios PÓS-v1.16
   (`bot_mensagens_enviadas` começou vazia). Teste manual: mencionar o bot →
   resposta; responder mensagem dele (nova) → resposta; comum → só arquiva.
   RETESTE PENDENTE do Vini após o fix.
-6. **v1.15.1 DEPLOYADA (versão 18, jul/2026) — fix do configurar_webhook após
   FALHA REAL no 1º registro:** a ZapZap recusou `{url}` com "URL do webhook é
   obrigatória" (backend valida `webhook_url`; a doc pública do POST /webhook
   da instância diz `url` — os DOIS nomes vão no body agora). Resposta ganhou
   `configured` (conferido relendo a config da instância — HTTP 200 só se a
   URL de captura aparecer lá), `dica` que reflete o resultado real (a antiga
   era texto fixo de sucesso mesmo com `ok:false`) e redação do token nos ecos.
   **AÇÃO DO VINI: chamar `?tipo=configurar_webhook` de novo** e conferir
   `ok:true, configured:true`. ⚠️ O teste real da chamada NÃO foi feito por
   automação: ler o valor de secret é bloqueado pelo classificador (correto);
   só quem tem o token consegue disparar.
-5. **✅ v1.15 DEPLOYADA (versão 17, jul/2026, autorização explícita, junto com a
   v1.14)** — claim-then-act na última chamada: idempotência deixou de ser
   check-then-act sobre `bot_log` (fail-open, com corrida de ~5-15s durante a
   geração da IA) e virou reserva atômica em `bot_config` ANTES da IA (ver §13).
   `supabase_pg_cron.sql` ganhou `timeout_milliseconds := 60000` nos 3 jobs
   (default ~5s do pg_net era mais curto que a execução real da função). Rodar o
   SQL de novo é seguro: `cron.schedule` com o mesmo jobname substitui o job.
   **Com isso o pg_cron está LIBERADO pra ativar** — só falta o Vini rodar o SQL.
-4. **✅ v1.14 (Ouvidos) DEPLOYADA (versão 17); captura precisa de 2 passos pra
   ligar:** (1) chamar `?tipo=configurar_webhook` UMA vez (registra a URL de
   captura na ZapZap — só quem tem o token consegue); (2) alguém mandar mensagem
   no grupo de TESTE. Tabela `mensagens_grupo` JÁ CRIADA em produção (RLS sem
   policy pública). O aviso "o Ratazana vê tudo" sai sozinho na 1ª captura (1x na
   vida, trava em `bot_config.ouvidos_aviso_enviado`). Amostra real pro relatório
   (2-3 mensagens com mentions/quoted preenchidos) só depois desses passos.
   Fase 3 (responder menção/citação) NÃO começou — nenhuma lógica de resposta
   existe.
-3. **✅ v1.13 DEPLOYADA (versão 16, jul/2026, autorização explícita)** — agenda e
   cobrança separadas de vez (agenda não fala mais de quem falta palpitar),
   `?tipo=cobranca_dia` novo (mesmo pipeline da
   cobrança manual, mesma trava "só cobra se faltar alguém", pensado pra rodar
   9h01), última chamada mudou de T-30min pra T-60min (55-65min) e só envia se
   faltar alguém NAQUELE jogo. Persona v2.2 (viés Brasil×Argentina) aplicada em
   prod+dev via REST. **`supabase_pg_cron.sql` reescrito com os 3 jobs, AGORA
   apontando `&destino=oficial`** (pedido explícito do Vini — antes era `teste`
   de propósito). **AÇÃO RESTANTE DO VINI: rodar `supabase_pg_cron.sql` no SQL
   Editor** — sem isso nada dispara sozinho. ⚠️ A partir do momento em que rodar,
   os 3 jobs (agenda 9h, cobrança 9h01, última chamada a cada 5min) mandam
   mensagem de verdade pro grupo OFICIAL da família, sozinhos, todo dia — se
   quiser mais um tempo de validação, trocar `&destino=oficial` por `&destino=
   teste` nos 3 comandos antes de rodar. Teste funcional em runtime (chamar a
   URL de verdade) não foi feito nesta sessão — exige o `BOT_TRIGGER_TOKEN`
   real, que por design só existe no Supabase e no navegador de quem
   administra, não neste ambiente.
-2. **✅ v1.12 DEPLOYADA (versão 15, jul/2026)** — modos `agenda` e `ultima_chamada`
   no ar (código + deploy confirmados). Auditoria confirmou zero automação hoje
   (pg_cron nem instalado). Fora do escopo desta leva (ficam pra quando o Vini
   priorizar): apito inicial, resumo pós-rodada com troféus/Humanos×Máquinas,
   modo entressafra.
-1. **✅ v1.11 DEPLOYADA E TESTADA (versão 14, jul/2026, autorização explícita)** —
   menção real no ar e provada em teste real no grupo de teste: pós-jogo com
   exatamente 1 sorteado (@tel real, frase por gênero), cobrança intimando os
   5 devedores reais com telefone certo, mensagem completa com volume de 9
   participantes (thinking sozinho já passava de 1100 tokens — o teto antigo
   de 800 era matematicamente impossível), 😬 enviado e 肥 bloqueado.
   `bot_telefones` PREENCHIDA (9 humanos, prod e dev; E.164 com "+", o código
   tira o "+" pro token/mentions). Achado do teste: o SELECT de bot_telefones
   não trazia telefone_whatsapp — corrigido (commit eac52e5) e redeployado.
0. **✅ Edge Function v1.9 DEPLOYADA (jul/2026, autorização explícita do Vini)** —
   versão 11 no ar (deploy via API do dashboard, armadilha 8; fonte = commit
   `a3e9ed7` da `ratazana`), verificada sem enviar nada: 401 nosso sem token
   (Verify JWT segue OFF) e `listar_grupos` devolvendo `grupos` normalizado com
   o parser JID/Name novo. **AÇÃO RESTANTE DO VINI: a URL salva de disparo da
   cobrança precisa ganhar `&destino=teste`** — a antiga sem o parâmetro passa a
   dar erro claro, de propósito (nenhum envio sem destino explícito).
1. **Ligar o robô no grupo OFICIAL** — descobrir o ID com o utilitário "📡 Listar
   grupos" do admin e preencher o secret novo `GRUPO_OFICIAL_ID`; daí enviar com
   `&destino=oficial` (sempre ação explícita). Fornecer também o texto definitivo da
   `MSG_INAUGURAL` (constante no admin). Decisão e ação do Vini.
2. **Fases do bot** — **Fase 2 (Ouvidos) FUNCIONANDO** (captura validada com
   mentions/quoted preenchidos). **Fase 3 (Conversa) COMEÇOU na v1.16** (ver
   item -7): responde menção e resposta/citação no grupo de TESTE; próximas
   etapas da Fase 3 (busca na web, ficha relacional, conversa multi-turno)
   ficam pra levas futuras. **Fase 4 (agendamentos automáticos) começou**:
   agenda 9h + cobrança 9h01 + última chamada T-60min no ar (v1.13, ver §13);
   faltam apito inicial, resumo pós-rodada e modo entressafra.
3. **✅ `bot_telefones` PREENCHIDA (jul/2026)** — 9 participantes humanos em prod
   e dev (nome + telefone E.164 + gênero M/F). Alimenta: menção real (pós-jogo e
   intimação da cobrança), seletor de pessoa do admin e intensidade por gênero.
4. **FK sem cascade em `mata_palpites` (PRODUÇÃO)** — apagar confronto em prod deixa
   palpites órfãos (em dev o cascade funciona; constraint desalinhada do schema). Tarefa
   registrada; exige DDL manual do Vini.
5. **`supabase_mata_mata.sql` manual (OPCIONAL)** — o arquivo já documenta as policies das
   4 tabelas e a auditoria confirmou que elas já funcionam no banco; rodar no SQL Editor é
   só reforço formal.
6. **Backlog visual antigo (3 itens)** — leva de ajustes visuais pendente, aguardando
   priorização do Vini.
