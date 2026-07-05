# CLAUDE.md

> ## ✅ EM PRODUÇÃO — "Bolão Ratazana00 / Copa 2026" no ar (jul/2026)
> **AO VIVO:** `bolao-ratazana00.pages.dev` (publica `main`).
> **DEV/TESTE:** `ratazana.bolao-ratazana00.pages.dev` (publica `ratazana`; hostname `ratazana.` → IS_DEV=true → tabelas `dev_*`, badge DEV, título "TESTES -").
> - **Trabalho do dia a dia: branch `ratazana`** (código/visual) — merge pra `main` só com ok explícito do Vini.
> - **Dado direto (palpites/placares):** vai na produção sem passar por `ratazana`.
> - **Sempre crie safepoint (tag) antes de merge pra `main`**.
> - Não toque na `congelado-fase-grupos` (museu) nem na `dev` (backup antigo congelado).
> - **Robô Ratazana (bot WhatsApp) EM PRODUÇÃO**, ainda só no grupo de TESTE — ver §13. Admin de placares no ar — ver §14. **Persona v2.1.1 aplicada em `bot_config`; função v1.10 (menção obrigatória REAL, determinística) commitada na `ratazana` mas ⚠️ AINDA NÃO deployada (no ar = v1.9/versão 11) — ver §15 item -1.** A URL de disparo da cobrança exige `&destino=teste`.
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
- Cabeçalho **NÃO é sticky** — foi a correção do bug de clique do chaveamento; não voltar.
- `ratazana` → branch de trabalho diário; publica em `ratazana.bolao-ratazana00.pages.dev`.
- Projeto antigo `bolao-ratazana-copa26.pages.dev` ainda existe mas **não é o oficial**.
- `congelado-fase-grupos` → museu (fase de grupos, congelada). **Não recebe mudanças.**

**Safepoints (tags):**
`v4-pre-redesign` · `v5-prod-pre-redesign` · `v6-prod-pre-fix-palpite` · `v7-prod-pre-mano-gi` · `v8-prod-pre-melhorias` · `v9-prod-pre-fotos` · `v10-pre-visual-v2` · `v10-pre-identidade-copa` · `v11-pre-chaveamento-novo` · `v11-pre-robo-ratazana` · `v12-prod-pre-visual-redesign` · `v12-pre-admin-placar` · `v13-prod-pre-robo-admin`
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

**Fase ativa: OITAVAS** (16avos 100% encerrado, 16/16 jogos). `bot_config.fase_ativa = 'oitavas'` — o Vini troca a cada rodada nova (ver §13).
**Turbos das oitavas** (`MM_TURBO`): `r16_2` · `r16_5` · `r16_8` (quartas/semis já pré-definidos lá: `qf_1`, `qf_3`, `sf_2`).
**Zebras das oitavas** (`MM_ZEBRA`): `r16_2` **ZEBRÃO** lado A (Paraguai × França, +5) · `r16_7` **zebra** lado B (Argentina × Egito, +3).
(Quantos e quais turbos/zebras por fase é decisão do Vini a cada fase. ⚠️ Ao definir os novos, **replicar nos 3 lugares** — ver armadilha 5.)

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

## 13. Robô Ratazana (bot de WhatsApp) — EM PRODUÇÃO (grupo de teste)

Bot que cobra palpites pendentes e comenta fim de jogo do mata-mata no WhatsApp:
Edge Function do Supabase + Claude API + ZapZap API. **No ar, mas apontando pro GRUPO DE
TESTE** (secret `GRUPO_TESTE_ID`) — trocar pro grupo oficial é decisão do Vini (§15).

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
    CORS habilitado (OPTIONS → 204; GET e POST liberados).
- Deploy com **"Verify JWT" DESLIGADO** — proteção é o `?token=`. Ver armadilhas 6 e 8.
- Auditoria: toda execução grava linha em `bot_log`.

**`bot_config`** (key/value; espelho `dev_bot_config`):
- `system_prompt_ratazana` — alma destilada. ⚠️ Rodar `supabase_bot.sql` de novo RESETA esta key pra versão do arquivo (`modelo_ia`/`fase_ativa` não são sobrescritas).
- `modelo_ia` — hoje `claude-sonnet-5`; fallback no código `claude-haiku-4-5-20251001`.
- `fase_ativa` — hoje `oitavas`. **O Vini troca no Table Editor a cada rodada nova.** A cobrança nunca inclui jogo de outra fase (a próxima entra no máximo como prévia explicitamente não-cobrável).

**Tabelas `bot_*`** (schema `supabase_bot.sql`, espelhos `dev_*`, RLS permissiva):
`bot_config` (acima) · `bot_telefones` (`participante_id`, `nome_exibicao`,
`telefone_whatsapp`, `is_humano`, `genero` M/F — **VAZIA**, aguardando lista do Vini;
servirá pra @menções reais na Fase 2) · `bot_log` (auditoria).

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

-1. **⚠️ DEPLOY da v1.10 pendente (menção obrigatória real)** — o código da menção
   determinística está commitado na `ratazana`, mas a função NO AR ainda é a v1.9
   (versão 11): até redeployar, mensagem programada sai SEM a linha de provocação.
   Deploy via API (armadilha 8), com autorização explícita do Vini como das outras
   vezes. Sem urgência destrutiva: a v1.9 continua funcionando normal, só sem a
   menção.
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
2. **Fases 2–4 do bot** — webhook (responder mensagens), conversa, agendamentos
   automáticos (incl. a mensagem de agenda das 9h citada na persona). Ainda não
   começadas; virão em prompts futuros.
3. **`bot_telefones` vazia (conferido em prod E dev)** — aguardando a lista do Vini
   (nome + telefone + gênero). ⚠️ Agora também é PRÉ-REQUISITO da menção obrigatória:
   com a tabela vazia, `linhaProvocacao` devolve null e a linha final não sai.
   Agora ela alimenta TRÊS coisas: @menções reais (Fase 2), o seletor de pessoa do
   "Acordar o Ratazana" no admin e a intensidade por gênero da persona v2.0.
4. **FK sem cascade em `mata_palpites` (PRODUÇÃO)** — apagar confronto em prod deixa
   palpites órfãos (em dev o cascade funciona; constraint desalinhada do schema). Tarefa
   registrada; exige DDL manual do Vini.
5. **`supabase_mata_mata.sql` manual (OPCIONAL)** — o arquivo já documenta as policies das
   4 tabelas e a auditoria confirmou que elas já funcionam no banco; rodar no SQL Editor é
   só reforço formal.
6. **Backlog visual antigo (3 itens)** — leva de ajustes visuais pendente, aguardando
   priorização do Vini.
