# CLAUDE.md

> ## ✅ EM PRODUÇÃO — "Bolão Ratazana00 / Copa 2026" no ar (jun/2026)
> **AO VIVO:** `bolao-ratazana00.pages.dev` (publica `main`).
> **DEV/TESTE:** `ratazana.bolao-ratazana00.pages.dev` (publica `ratazana`; hostname `ratazana.` → IS_DEV=true → tabelas `dev_*`, badge DEV, título "TESTES -").
> - **Trabalho do dia a dia: branch `ratazana`** (código/visual) — merge pra `main` só com ok explícito do Vini.
> - **Dado direto (palpites/placares):** vai na produção sem passar por `ratazana`.
> - **Sempre crie safepoint (tag) antes de merge pra `main`**.
> - Não toque na `congelado-fase-grupos` (museu) nem na `dev` (backup antigo congelado).

Guia de navegação do projeto — para saber **onde mexer sem explorar o código**.
Os números de linha **andam** a cada edição; confie nos **nomes de função** e nos
**comentários de seção** (`// ─── NOME ───` no JS e `/* ── nome ── */` no CSS).
Os números aqui são referência aproximada (estado em ~2900 linhas).

---

## 0. Estado atual (jun/2026)

**App em produção:**
- `main` → `bolao-ratazana00.pages.dev`. Mata-mata completo + fase de grupos (congelada).
- Redesign visual Copa 26 **concluído e no ar** (tokens de cor/fonte, identidade Ratazana).
- Cabeçalho **NÃO é sticky** — foi a correção do bug de clique do chaveamento; não voltar.
- `ratazana` → branch de trabalho diário; publica em `ratazana.bolao-ratazana00.pages.dev`.
- Projeto antigo `bolao-ratazana-copa26.pages.dev` ainda existe mas **não é o oficial**.
- `congelado-fase-grupos` → museu (fase de grupos, congelada). **Não recebe mudanças.**

**Safepoints (tags):**
`v4-pre-redesign` · `v5-prod-pre-redesign` · `v6-prod-pre-fix-palpite` · `v7-prod-pre-mano-gi` · `v8-prod-pre-melhorias`
Voltar: `git checkout <tag>`. Listar: `git tag -n1`.

**Detecção de ambiente:** `isDevEnv()` → hostname começa com `dev.` **OU** `ratazana.` = DEV.
Em DEV: tabelas `dev_*`, badge visual, título "TESTES -". Em produção/localhost: tabelas sem prefixo.
⚠️ **localhost = produção** (não tem prefixo): ao testar local, lê/escreve dados REAIS.

**Regra de pontuação do MATA-MATA** (SÓ mata-mata; grupos congelados, não recalculam).
Placar FINAL (prorrogação inclusa). Componentes que **multiplicam** pela fase×turbo:
**5** resultado · **1** gol A · **1** gol B · **2** saldo (só vencedor) · **3** placar exato ·
**4** pênaltis (palpitou empate + acertou quem passa) — o +4 entra na base e multiplica.
Multiplicadores: 16avos ×1 · oitavas ×1,25 · quartas ×1,5 · semis ×1,75 · 3º ×1,75 · **final ×4** · turbo ×2.
**Zebra FIXO** (soma no fim, não multiplica): +3 zebra · +5 zebrão (azarão ≤25%/≤12% passa).
Funções: `mmScore` / `calcMataPts` / `MM_PHASE_MULT` / `mmMult` / `MM_TURBO` / `MM_ZEBRA`.

**Turbos do 16 avos (desta rodada — 5 jogos):**
Alemanha×Paraguai · México×Equador · Inglaterra×RD Congo · Portugal×Croácia · Austrália×Egito.
(África×Canadá NÃO é turbo. Quantos e quais turbos por fase é decisão do Vini a cada fase.)

**Regras TRAVADAS:**
- Pontuação do mata NÃO é retroativa. Fase de grupos CONGELADA (não recalcula, não muda).
- Bolão Geral = grupos (congelados) + mata (regras novas).
- **g01, g02 e g03 NUNCA contam** (em nenhuma aba/tabela/gráfico).
- Só-mata (`mataOnly:true` em `MATA_EXTRA`/`MATA_PARTS`): Pepe, Du, Yuri, Mano, Gi (humanos) + Pepe IA — aparecem só nos cards e ranking do mata, não no Bolão Geral/JxV nem fase de grupos. `PARTICIPANTS` (os 8 originais) segue intacto para grupos/Geral.

**ARMADILHAS TÉCNICAS — não repetir:**

1. **Supabase JS v2: builder sem `.then()`/`await` não dispara o HTTP.** Toda função de escrita precisa de `.then()` ou `await`. Sem isso o palpite "salva" localmente mas nunca vai ao banco. Padrão obrigatório: `const {error} = await sb.from(...).upsert(...)`.

2. **RLS de `mata_confrontos`:** precisa de `FOR ALL USING(true) WITH CHECK(true)` (igual a `mata_palpites`) ou lançar placar e finalizar dá erro 401. PENDÊNCIA: garantir essa policy no `supabase_mata_mata.sql` e nas tabelas `dev_mata_confrontos`.

3. **Sempre `git push` após o commit.** O Cloudflare publica o remoto (`origin/main`), não o local. Commitar sem pushar = produção não atualiza.

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
| Grupos + Mata | Vini (Vinicius) · `vinicius` | Claude Vini · `claude` · `c` |
| **SÓ Mata** | Pepe · `pepe` | Pepe IA · `pepe_ia` |
| **SÓ Mata** | Du · `du` | — |
| **SÓ Mata** | Yuri · `yuri` | — |
| **SÓ Mata** | Mano · `mano` | — |
| **SÓ Mata** | Gi · `gi` | — |

Total mata: **9 humanos / 5 IAs** (14 em `MATA_PARTS`). Time Pepe = Pepe + Pepe IA.
Pares para não confundir: **Pepe ≠ Pepe IA · Vini ≠ Claude Vini · Tonius ≠ Claude Tonius · Jeca ≠ ChatGPT Jeca · Leo ≠ ChatGPT Leo**.

**Dois bolões de grupos** (mesmos palpites, recortes diferentes):
- **Bolão Geral** (padrão): jogos com `sortKey >= CUT` (≥ 20/06 12h). 8 participantes originais.
- **Bolão JxV** (legado): só os 4 de `OLD_IDS` (Jeca, Vini, ChatGPT Jeca, Claude Vini), Copa inteira.

**Navegação (2 abas):**
- **Mata-mata:** Próximos jogos → Classificação do Mata → Como funciona → Chave → Lista por dia.
- **Ranking:** Bolão Geral (filtro Mata+Grupos / Só Grupos) · JxV · Estatísticas · Histórico. A seção "Jogos da Fase de Grupos" fica DENTRO de Ranking > Bolão Geral.

---

## 2. Stack / deploy / dev

- **Frontend:** arquivo único `index.html` — HTML + CSS (`<style>`) + JS vanilla (`<script>`). Sem framework, sem build, sem `import`, sem `package.json`. Agora ~2900 linhas.
- **DB/realtime:** Supabase (Postgres). SDK `@supabase/supabase-js@2` via CDN (UMD). RLS público (sem login) + Realtime.
- **Tabelas de grupos:** `bolao_games` (prod) / `dev_bolao_games` (dev). Schema: `supabase_setup.sql`.
- **Tabelas do mata:** `mata_confrontos` + `mata_palpites` (prod) / `dev_mata_*` (dev). Schema: `supabase_mata_mata.sql`.
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
| **Mata: botão Fechado / rótulo** | `mmResultHTML` — "🔒 Fechado" quando finalizado, "PRÉVIA PLACAR" quando não |
| **Mata: placar topo** | `mmMatchupHTML` — sempre mostra VS (placar só no rodapé via `mmResultHTML`) |
| **Mata: falta palpite de X,Y,Z** | `mmNextGamesHTML` — inclui humanos E IAs sem palpite completo |
| **Mata: bandeiras quem passa** | `mmQuemPassaHTML` / `mmFootQpHTML` — sempre visíveis (idle quando sem dado) |
| **Mata: frases dinâmicas** | `mmHumQpLabel` — "X avança" / "Quem passa?" / vazio |
| Mata: chave visual (bracket) | `mmBracketHTML`, `MM_BRACKET`, `MM_COLS` — 32 slots fixos |
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
- **Chaveamento (bracket):** `MM_BRACKET`/`MM_COLS`/`mmBracketHTML` são estrutura fixa de 32 slots. Não alterar linhas nem estrutura.
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
- Escritas: `mmUpsertConfronto`/`mmUpsertPalpite`, `mmSetReal`/`mmSetClassificado`/`mmSetFinished`, `mmUpdPalpite`/`mmSetQuemPassa` (debounce 700ms).
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
- Rótulo: "PLACAR FINAL" se finalizado, "PRÉVIA PLACAR" se não.
- Botão: "🔒 Fechado" (`.done`) se finalizado, "Finalizar ✓" se não.
- Placar: só no rodapé. Topo do card (matchup) sempre mostra "VS" (sem número).
- "Quem passou": bandeiras sempre visíveis (idle quando sem dado).

**"falta palpite de:"** (`mmNextGamesHTML`): inclui **humanos E IAs** sem palpite completo em jogos abertos.

**Render:**
- `renderMata` (aba `#tab-mata`), `mmListItem`/`mmCardBody` (cards), `mmBracketHTML` (chave).
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
