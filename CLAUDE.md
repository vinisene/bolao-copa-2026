# CLAUDE.md

> ## ⛔ REGRA PERMANENTE — NÃO subir pra produção sem ordem explícita
> **Nunca** faça `merge` de Pull Request nem `push` para a branch **`main`** (produção), em
> hipótese alguma, até o usuário pedir **explicitamente**. Frases que liberam: **"pode subir
> para produção"** ou **"pode fazer o merge"**. Sem isso, não suba.
> - Todo desenvolvimento acontece na branch **`dev`**.
> - Se você achar que algo está pronto pra subir, **apenas avise e aguarde** a confirmação explícita.
> - O **PR #3** deve permanecer **aberto e sem merge** até ordem em contrário.

Guia de navegação do projeto. O objetivo é que, ao ler este arquivo, você saiba **onde mexer
sem explorar o código**. Os números de linha **andam** a cada edição — confie nos **nomes de
função** e nos **comentários de seção** (`// ─── NOME ───` no JS e `/* ── nome ── */` no CSS),
que são âncoras estáveis. Os números aqui são referência aproximada (estado em ~1377 linhas).

---

## 0. Estado atual e roadmap (atualizado jun/2026)

**Onde estamos:**
- **Fase de grupos:** em produção (`main`), funcionando, é o que os participantes usam hoje.
- **Fase mata-mata:** **construída e validada no `dev`** — pontuação testada de ponta a ponta na
  tela, incluindo **empate com pênaltis e o bônus +4**, para **humanos E IAs**. Aba "⚔️ Mata-Mata",
  tabelas próprias, integração no ranking. Detalhes técnicos: §10.
- **Ambiente de dev isolado:** funcionando (tabelas `dev_*`, detecção por hostname, botão
  "🪞 Espelhar prod→dev"). Detalhes: §11.
- **Nada subiu pra produção ainda.** **PR #3** (`dev → main`) está **aberto, aguardando** ordem
  explícita do Vini (ver regra de ouro no topo).

**Regra de pontuação do mata-mata (resumo):** base **5 (resultado) + 1 (gol A) + 1 (gol B) +
3 (placar exato)** sobre o **PLACAR FINAL** (inclui prorrogação). **+4** só para quem palpitou
**empate** e acertou **quem passa nos pênaltis**. As **4 duplas (humanos e IAs) competem**. Fórmula
implementada em `calcMataPts` (§10).

**Regra de ouro do fluxo:** nada vai pra produção (merge/push na `main`) sem o Vini pedir
**explicitamente**. Todo trabalho acontece no `dev` (ver banner no topo do arquivo).

**Roadmap (nesta ordem):**
1. **Chaveamento visual interativo** do mata-mata (bracket).
2. **Abas separando** Fase de Grupos e Mata-Mata.
3. **Filtros no ranking** (Total · Grupos · Mata-Mata) + espaço pra disputa **Vini × Jeca**.
4. **Dinâmica anti-desengajamento:** multiplicador por rodada, pontos crescentes por fase,
   bônus de zebra.
5. **Identidade visual da Copa** (por último).

**Meta:** concentrar o **máximo de alterações no `dev` até sábado à noite** e **subir tudo de uma
vez** (com a ordem explícita do Vini).

## 1. O que é

**Bolão Copa 2026** — app de palpites da Copa 2026 ("Bolão Sene Piovan"). Cada participante
palpita o placar dos **72 jogos da fase de grupos**; quando o jogo acontece, preenche-se o
placar real, o app calcula pontos e monta ranking/estatísticas/gráficos.

**8 palpiteiros em 4 times** (cada time = 1 humano + a IA dele). Conhecimento de domínio que
**não está óbvio no código** (IDs internos ≠ nomes de tela):

| Time   | Humano (edita no app) · id interno | IA (palpite fixo no código) · id interno · campo no GT |
|--------|-------------------------------------|--------------------------------------------------------|
| Jeca   | Jeca (Jéssica) · `jessica`          | ChatGPT Jeca · `chatgpt` · `g`                         |
| Tonius | Tonius (Ricardo) · `tonius`         | Claude Tonius · `claudio` · `d`                        |
| Leo    | Leo · `leo`                         | ChatGPT Leo · `chatgptleo` · `e`                       |
| Vini   | Vini (Vinicius) · `vinicius`        | Claude Vini · `claude` · `c`                          |

**Dois bolões** (mesmos palpites, recortes diferentes):
- **Bolão Geral** (padrão): só jogos com `sortKey(g) >= CUT` (a partir de **20/06 12h**, quando
  Tonius e Leo entraram). Todos os 8 participantes.
- **Bolão JxV** (legado): só os 4 de `OLD_IDS` (Jeca, Vini, ChatGPT Jeca, Claude Vini),
  contando a Copa inteira.

## 2. Stack / deploy / dev

- **Frontend:** arquivo único `index.html` — HTML + CSS (`<style>`, linhas ~9–343) + JS vanilla
  (`<script>`, linhas ~369–1375). Sem framework, sem build, sem `import`, sem `package.json`.
- **DB/realtime:** Supabase (Postgres), tabela única `bolao_games`. SDK `@supabase/supabase-js@2`
  via CDN (UMD). RLS público (sem login) + Realtime ligado. `supabase_setup.sql` é o schema inicial.
- **Bandeiras:** flagcdn.com (emoji não renderiza em Windows). `flagImg`/`flagUrl` derivam o
  código do país a partir do emoji.
- **Deploy:** push na `main` → Cloudflare Pages publica sozinho (`bolao-copa-sene-piovan.pages.dev`,
  repo `vinisene/bolao-copa-2026`). `netlify.toml` é legado. **⚠️ subir pra `main` só com ordem
  explícita do usuário — ver regra no topo do arquivo.** Trabalho do dia a dia fica na `dev`.
- **Dev local:** `npx serve` na porta 3333 (`.claude/launch.json`). Verificar no preview: console
  sem erros + viewport **mobile 375px** (uso principal).

## 2.5 Ambientes e Backup (rede de segurança)

- **Safepoint (tag Git):** `v0-fim-fase-grupos` aponta pro estado de **fim da fase de grupos**
  (antes do mata-mata). Para voltar a esse ponto: `git checkout v0-fim-fase-grupos` (inspeção)
  ou, para reverter a produção, `git revert`/`git reset` até a tag e dar push na `main`.
  Listar tags: `git tag -n1`.
- **Backups dos dados (Supabase):** ficam em `backups/bolao_games_AAAA-MM-DD.json` (export
  completo: jogos, palpites dos humanos, placares e flags). Gerar um novo: **`npm run backup`**
  (script em `scripts/backup-supabase.mjs`, Node 18+, sem dependências; usa a anon key pública).
  Não sobrescreve um backup do mesmo dia — acrescenta a hora no nome.
- **Branches / URLs:**
  - **`main` = produção** → `bolao-copa-sene-piovan.pages.dev` (o que os participantes acessam).
  - **`dev` = testes** → preview do Cloudflare Pages em `dev.bolao-copa-sene-piovan.pages.dev`
    (precisa de "Preview deployments" habilitado no projeto do Cloudflare Pages).
  - ⚠️ **A `dev` compartilha o MESMO banco Supabase da produção** (a URL/anon key estão fixas no
    `index.html`). Ou seja, o ambiente de código/URL é isolado, mas **escrever palpites/placar na
    `dev` altera os dados reais**. Para isolar também os dados, é preciso um **projeto Supabase
    separado** e apontar a config da `dev` pra ele (mudança manual, fora do escopo desta rede de
    segurança).

## 3. Mapa do arquivo `index.html`

### CSS (`<style>`, ~9–343) — uma regra por linha, cores em CSS vars no `:root` (~10)
`:root` define `--g` (verde), `--gd` (verde escuro), `--gold`, `--mu` (texto fraco), `--brd`
(borda), `--je/--vi/--ch/--cl` (cores legadas). Blocos por comentário:
`/* ── Próximo jogo (hero) ── */` 211 · `Placar final + vencedor` 230 · `Animações & destaques`
237 · `Toggle Geral/Antigo` 245 · `Corrida de times` 250 · `Hero "Jogos de hoje"` 271 ·
`Barra rolante do ranking` 289 · `Delta de posição` 306 · `Gráfico de evolução` 316 · `Pódio` 328 ·
`Ranking & Estatísticas` 147.

### DOM estático (`<body>`, ~345–367)
Só 3 contêineres preenchidos por JS via `innerHTML`: `#tab-palpites` (365), `#tab-ranking` (366),
`#error-banner` (364). `#loading-screen` (347), `header`/`nav` com os botões `showTab(...)` (352–362),
`#sync-indicator` (357).

### JS (`<script>`, ~369–1375) — seções na ordem do arquivo
| Seção (`// ─── … ───`) | Linha | Conteúdo-chave |
|---|---|---|
| CONFIGURAÇÃO SUPABASE | 370 | `SUPABASE_URL` 371, `SUPABASE_KEY` (anon, público) 372, `TABLE` 373, cliente `sb` 376 |
| PARTICIPANTS/TEAMS/CUT | 379 | `PARTICIPANTS` 379, `TEAMS` 389, `OLD_IDS` 395, `CUT` 396, `avInner` 398, `TAGFLAGS` 401, `flagImg` 402, `flagUrl` 412 |
| GT (dados dos jogos) | 422 | array dos 72 jogos; `sortKey` 497 |
| STATE | 504 | `CACHE` 507, `debouncers` 509, `getGame` 514 |
| SUPABASE OPS | 536 | `setSyncing` 537, `upsert` 543, `loadData` 550 |
| Realtime (mesma região) | 561 | `DATA_COLS` 561, `sameRow` 563, `isTyping` 569, `subscribeRealtime` 575, `applyRemoteScores` 596 |
| UI HELPERS | 621 | `hideLoading` 622, `showErr` 623 |
| VIEW STATE | 625 | `filterMode` 626, `activeTab` 629, `setFilter` 631, `renderAll` 633 |
| SCORING | 638 | `calcPts` 639, `ptsClass` 651, `turboIdForDate` 655, `isTurbo` 659, `ptsOf` 660 |
| PRÓXIMO JOGO / CONTAGEM | 662 | `gameDate` 663, `emptyVal` 669, `weekday` 671, `missingPred` 672, `findNextGame` 677, `tickCountdown` 696, `todaySlate` 704, `dayRow` 716, `setupMarquees` 728, `heroHTML` 743, `goToGame` 758 |
| RENDER PALPITES | 766 | `renderPalpites` 767, `winCls` 820, `renderCard` 828 |
| ACTIONS | 899 | `toggleFinish` 900, `toggleRemove` 908, `refreshPoints` 930, `updPred` 968, `updReal` 979 |
| RANKING (stats) | 989 | `getStats` 990 |
| TOOLTIPS | 1012 | `TIPS` 1013, `showTip` 1025, `q` 1041 |
| (comparativos/linhas) | 1043 | `versus` 1043, `teamRace` 1061, `statCard` 1084, `rkRow` 1110 |
| RANKING GERAL | 1125 | `podium` 1127 |
| HISTÓRICO DE CLASSIFICAÇÃO | 1143 | `geralHistory` 1146, `geralDeltas` 1172, `deltaBadge` 1184, `histChart` 1194 + `histApply/Hover/Click` 1251–1257, `rankMarquee` 1259, `rankingNew` 1276 |
| RANKING ANTIGO (JxV) | 1318 | `rankingOld` 1319, `rankMode` 1350, `setRank` 1351, `renderRanking` 1353 |
| TAB NAV | 1361 | `showTab` 1362 |
| BOOT | 1373 | chama `loadData()` |

## 4. Variáveis e arrays centrais

- **`GT`** (422) — fonte da verdade dos jogos (template estático, 72 itens). Campos por jogo:
  `id` (`g01`–`g72`), `grp`, `r` (rodada 1–3), `dt` (`"DD/MM"`), `tm` (`"16h"`, `"20h30"`, `"1h"`,
  `"0h"`), `ven`, `tA/fA`, `tB/fB`, e os **palpites das IAs**: `g`/`c`/`d`/`e` (cada um `{a,b}` ou
  ausente). Ordem A×B importa: `a` = mandante (`tA`), `b` = visitante (`tB`).
- **`CACHE`** (507) — espelho em memória da tabela: `{ game_id → row }`. Recebido por `loadData`
  e mantido atualizado pelo realtime. Guarda **só o que vem do banco** (placar real + palpites
  humanos + flags).
- **`PARTICIPANTS`** (379) — 8 objetos `{id, name, type:'human'|'ia', color, init, team, editable?, img}`.
  Ordem do array = ordem visual nos cards e na varredura de pontos. `id` é chave técnica; `name`
  é o que aparece na tela.
- **`CUT`** (396) — `20*10000 + 12*100`. Corte do Bolão Geral via `sortKey`.
- **`DATA_COLS`** (561) — colunas do banco que contam como "mudança real" (usado por `sameRow`
  para ignorar eco do próprio `upsert`). Precisa listar toda coluna nova de humano.
- **`filterMode`** (626, `localStorage 'bf'`) e **`rankMode`** (1350, `localStorage 'brm'`) —
  estado de UI persistido.
- **`histLocked`** (1193) — pessoa fixada no gráfico de evolução (interação).

## 5. Fluxo de dados (ponta a ponta)

### Leitura / merge
`getGame(id)` (514) é o ponto único de leitura: mescla `GT.find(id)` + `CACHE[id]` e monta
`predictions` por participante — humanos vêm das colunas `<id>_a/<id>_b` do `CACHE`; IAs vêm de
`t.g/t.c/t.d/t.e` do GT. Quase tudo que renderiza chama `getGame`. **Palpite de IA mora no
código (GT); palpite de humano mora no banco (CACHE).**

### Como um palpite humano é salvo
1. `<input oninput="updPred(gameId,pid,side,this.value)">` gerado em `renderCard` (828).
2. `updPred` (968): **trava se o jogo já começou** (`gameDate(...).getTime() <= Date.now()` → `return`),
   atualiza `CACHE[gameId][<pid>_<side>]`, chama `refreshPoints(gameId)` (atualização cirúrgica) e
   agenda `upsert` com **debounce ~700ms** (`debouncers`).
3. `upsert` (543): `sb.from(TABLE).upsert({game_id, ...campos, updated_at}, {onConflict:'game_id'})`
   + `setSyncing` (indicador "salvando/salvo").
4. Outros dispositivos recebem via `subscribeRealtime` (575) → `applyRemoteScores(gid)` (596)
   atualiza **só os inputs/selos daquele card**, sem re-render (preserva foco/scroll). `sameRow`
   (563) descarta o eco da própria escrita; `isTyping` evita reescrever input em foco.

Placar real e finalizar seguem o mesmo caminho: `updReal` (979) → coluna `real_a/real_b`;
`toggleFinish` (900) → coluna `finished` (este re-renderiza a lista inteira, é ação estrutural).

### Como a pontuação é calculada
- `calcPts(pred, rA, rB)` (639): regra **+5 resultado** (vitória A / vitória B / empate),
  **+1 gols mandante**, **+1 gols visitante**, **+3 bônus se cravar** → máx **10**. Retorna `null`
  se faltar palpite ou placar.
- `ptsOf(g, pred)` (660): aplica TURBO — `isTurbo(g)` (659) dobra os pontos de **1 jogo por dia**
  (≥20/06), escolhido deterministicamente por data em `turboIdForDate` (655, via `hashStr`).
  **Use `ptsOf`, não `calcPts` direto**, em qualquer lugar que componha ranking/stats.
- "Prévia": `renderCard`/`refreshPoints` mostram pontos em cinza quando há placar mas o jogo não
  foi finalizado; só conta no ranking quando `finished` (filtro em `getStats`/`geralHistory`).

### Ranking e histórico
- `getStats(pid, filterFn)` (990): varre `GT→getGame`, filtra finalizados (e `filterFn`, ex.:
  `inRank` = `sortKey>=CUT`), soma via `ptsOf`, retorna `{total, rHits, eHits, avg, cravadas, ...}`.
- Ordenação/desempate (em `rankingNew` 1276, `rankingOld` 1319, `geralHistory`): `total` →
  `eHits` (cravados) → `rHits` (ganhador/empate). **Mude isso em todos os três juntos.**
- `geralHistory()` (1146): reconta a classificação **após cada jogo finalizado** em ordem
  cronológica → array `steps[i] = {g, pos:{pid→1..8}, tot:{pid→pontos}}`. Base de:
  `geralDeltas` (1172, variação dos últimos 3 jogos → setas), `histChart` (1194, gráfico SVG
  interativo) e `rankMarquee` (1259, barra rolante na aba Palpites).

## 6. Onde está cada feature

| Feature | Função / âncora |
|---|---|
| Card de um jogo (cabeçalho, bandeiras, inputs, prévia) | `renderCard` 828 |
| **Trava de palpite ao começar o jogo** | flag `started` em `renderCard` (828, desabilita inputs + tag "PALPITES FECHADOS") **e** guarda em `updPred` 968 |
| Lista/filtros/seções por data | `renderPalpites` 767 (filtros: pending/all/finished/geral/jxv/naocons) |
| "Jogos de hoje" / próximo jogo + contagem | `heroHTML` 743, `todaySlate` 704, `dayRow` 716, `tickCountdown` 696 |
| Jogo TURBO ×2 | `isTurbo` 659 / `turboIdForDate` 655 / `ptsOf` 660 |
| Finalizar / remover jogo | `toggleFinish` 900, `toggleRemove` 908 |
| Atualização cirúrgica de pontos (sem re-render) | `refreshPoints` 930 (local), `applyRemoteScores` 596 (remoto) |
| Pódio + leaderboard (8 linhas, setas de variação) | `podium` 1127, `rkRow` 1110 (param `delta`), montados em `rankingNew` 1276 |
| Comparativos (Humanos×Máquinas, corrida de times) | `versus` 1043, `teamRace` 1061 |
| Estatísticas individuais + tooltips "?" | `statCard` 1084, `TIPS`/`q` 1013/1041 |
| Gráfico de evolução (SVG, hover/clique, foto+nome) | `histChart` 1194 + `histApply/Hover/Click` 1251 |
| Barra rolante do ranking (aba Palpites) | `rankMarquee` 1259 (chamada em `renderPalpites` 767) |
| Toggle Geral/JxV | `setRank` 1351 / `renderRanking` 1353 |

## 7. NÃO toque sem cuidado (e por quê)

- **`PARTICIPANTS`, `OLD_IDS`, `GT` (campos `g/c/d/e`):** os IDs e o mapeamento IA→campo são
  referenciados em dezenas de pontos por string. Renomear quebra `getGame`, `getStats`, etc.
- **Critério de desempate** (`b.total||b.eHits||b.rHits`): duplicado em `rankingNew`, `rankingOld`
  e `geralHistory`. Se mudar, mude **os três** ou o gráfico/setas divergem da tabela.
- **`sameRow`/`DATA_COLS`/`isTyping`:** desligam o eco do realtime e protegem o input em foco.
  Mexer errado faz o card "piscar"/perder o que está sendo digitado, ou entrar em loop de escrita.
- **Re-render completo durante digitação:** `renderPalpites` reconstrói o `innerHTML` e **mata foco
  e scroll**. Em mudança de input use só `refreshPoints`/`applyRemoteScores`. Re-render inteiro só
  em ação estrutural (filtro, finalizar, trocar aba).
- **`upsert` sem `onConflict:'game_id'` / sem `updated_at`:** cria linha duplicada ou some o
  rastro de "salvo". Sempre use o helper `upsert` (543).
- **Banco é produção real.** Não escreva valores de teste; se precisar testar escrita, reverta.
  A `anon key` é pública de propósito — não troque nem exponha outras credenciais.
- **`ptsOf` vs `calcPts`:** usar `calcPts` direto em ranking ignora o TURBO e dá pontuação errada.
- **Horário:** tudo é horário de **Brasília** (relógio do dispositivo). Jogos de 0h/1h já têm a
  **data do dia correto** no `GT`. `sortKey = dia*10000 + hora*100 + min`.

## 8. Padrões para qualquer nova feature

- **Tudo em `index.html`, vanilla.** Funções globais chamadas por `onclick=`/`oninput=` em HTML
  gerado por template string + `innerHTML`. CSS numa linha por regra, cores via CSS var ou `p.color`.
- **Idioma:** UI, comentários e domínio em **português**; nomes de função em camelCase.
- **Render:** ler estado por `getGame`; nunca duplicar a lógica de merge. Ação estrutural →
  re-render; mudança de valor pontual → atualização cirúrgica.
- **Escrita:** sempre via `upsert` (com debounce se vier de input). Estado de UI → `localStorage`.
- **Pontos/ranking:** derive de `getStats`/`ptsOf`/`geralHistory`; não recalcule à mão.
- **Mobile-first (375px).** Verificar no preview (porta 3333), console limpo, e olhar no mobile.
  No gráfico/SVG, lembrar que desktop preenche a largura e mobile rola pro lado.
- **Deploy:** commitar na `dev` (mensagem em português, descritiva). **NÃO** dar push/merge na
  `main` sem ordem explícita do usuário (ver regra no topo do arquivo). Cloudflare publica a `main`.

## 9. Adicionar um participante humano (checklist)

1. **Supabase:** `ALTER TABLE bolao_games ADD COLUMN <id>_a int, ADD COLUMN <id>_b int;`
2. `PARTICIPANTS` (379): novo objeto `{id, name, type:'human', color, init, team, editable:true, img}`.
3. `TEAMS` (389) se formar/alterar time.
4. `getGame` (514): adicionar `<id>: {a:n(c.<id>_a), b:n(c.<id>_b)}` em `predictions`.
5. `DATA_COLS` (561): incluir `<id>_a`, `<id>_b`.
6. `applyRemoteScores` (596): garantir que atualiza o input/selo do novo `pid`.
7. `missingPred` (672): incluir o palpite se ele deve contar como "falta palpite".
8. `statsOrder` em `rankingNew` (1276): incluir o `id` na ordem das estatísticas.
9. Adicionar a foto em `fotos/<id>.jpg`.

> Palpite de **IA** não usa banco: entra como campo `g/c/d/e` no objeto do jogo dentro do `GT`,
> casando por **nome do time + rodada** (os rótulos de grupo de fontes externas podem divergir do `grp`).

## 10. Fase Mata-Mata (eliminatórias)

Adição **separada** da fase de grupos — não toca em `GT`, `bolao_games`, `getStats` nem na lógica
de grupos. **Todos os 8 palpitam** (humanos editam na UI; IAs aparecem como leitura, com palpite
inserido por fora/admin). O **placar que vale é o FINAL (inclui prorrogação)**, não os 90 min:
empate só é empate se persistir após a prorrogação → pênaltis.

**Tabelas novas (Supabase)** — schema em `supabase_mata_mata.sql` (produção) e `supabase_dev_setup.sql`
(dev, prefixo `dev_`). Rodar manualmente no SQL Editor; RLS público + realtime:
- `mata_confrontos`: `id` (text, `mm_<rnd>`), `phase`, `team_a/flag_a`, `team_b/flag_b`,
  `real_a/real_b` (**placar final, inclui prorrogação**), `classificado` (`'A'`/`'B'` = quem passou;
  só importa se empatar → pênaltis), `finished` (só conta no ranking quando true), `created_at`.
- `mata_palpites`: PK (`confronto_id`, `pid`), `gols_a`, `gols_b`, `quem_passa` (`'A'`/`'B'`, usado
  só quando o palpite é empate). `pid` ∈ os 8 ids de `PARTICIPANTS`.

**Onde no código (`index.html`)** — seção `// ─── MATA-MATA ───` (antes de TAB NAV):
- Tabelas por ambiente: `MM_TCONF`/`MM_TPAL` (= `mata_*` em produção, `dev_mata_*` no dev — ver §11).
- Estado: `MM_CONFRONTOS`, `MM_PALPITES` (map `cid→pid→palpite`), `MM_HUMANS` (quem é editável na UI).
- Dados: `loadMata`, `subscribeMata`/`mmReload` (realtime; não re-renderiza enquanto edita).
- Escritas: `mmUpsertConfronto`/`mmUpsertPalpite`, `mmSetReal`/`mmSetClassificado`/`mmSetFinished`,
  `mmUpdPalpite`/`mmSetQuemPassa` (debounce ~700ms). **`mmAddConfronto`/`mmRemoveConfronto`/
  `mmToggleEdit`/`mmSaveEdit` continuam no código mas NÃO têm botão na UI** — criar/editar/remover
  confronto é feito por fora (admin/Claude Code, via REST/script apontando pro banco de dev).
- Pontuação: **`calcMataPts(pal,c)`** — placar final igual à fase de grupos (**5** resultado + **1**
  gol A + **1** gol B + **3** exato) **+ 4 SÓ se o palpite foi empate E acertou o `classificado`**.
  `mataStats(pid)` agrega para o ranking (ignora `[TESTE]` e não finalizados); roda pros 8.
- Render: `renderMata` (aba `#tab-mata`, sem controles de admin), `mmCard` (reusa `.card/.matchup/
  .pred-cell/.real-row`; humanos com inputs, IAs leitura via `.mm-iascore`), `mmQuemPassaHTML`
  (seletor/leitura "quem passa", **só quando o palpite é empate**), `mmRefreshPts`/`mmRenderQuemPassa`.
- Integração: `rankingNew` soma `mataStats` ao `total/eHits/rHits/played/cravadas` (recalcula `avg`);
  nav tem a aba "⚔️ Mata-Mata"; `showTab`/`renderAll` tratam `'mata'`. **Gráfico de evolução, deltas
  e barra rolante continuam só da fase de grupos.**

**Dados de teste** (confrontos com `[TESTE]` no nome; **não contam no ranking**) — escrevem no **dev**:
- `npm run seed:teste` → cria 2 confrontos `[TESTE]` em `dev_mata_confrontos`. Requer `supabase_dev_setup.sql` rodado.
- **`npm run clean:teste`** → apaga só os `[TESTE]` (cascade nos palpites). Rodar antes dos 16 reais.
- Os scripts miram o dev por padrão; `MM_TABLE=mata_confrontos npm run …` aponta pra produção (não usar à toa).

## 11. Ambientes prod/dev (banco isolado por hostname)

- **Detecção:** `isDevEnv()` (em `index.html`, junto da config) — `IS_DEV = hostname começa com "dev."`.
  No dev, `TABLE`/`MM_TCONF`/`MM_TPAL` viram `dev_bolao_games`/`dev_mata_confrontos`/`dev_mata_palpites`.
  Em produção/localhost ficam as tabelas sem prefixo — **produção não muda de comportamento**.
- **Mesmo projeto Supabase, mesma anon key.** O isolamento é só pelo **nome das tabelas**. O banco de
  dev é um sandbox (RLS deixa a anon key apagar/escrever). `supabase_dev_setup.sql` cria as `dev_*`.
- **Botão "🪞 Espelhar prod→dev"** (`mirrorProdToDev`, canto sup. direito, só com `IS_DEV`): lê a
  produção (somente leitura) e regrava tudo no dev. Usa só a anon key; nunca a service_role.
- ⚠️ **localhost = produção** (não começa com `dev.`): ao testar local, o app lê/escreve na PRODUÇÃO.
  Pra mexer em dados de teste sem risco, use a URL de preview `dev.*` (ou os scripts, que miram o dev).
