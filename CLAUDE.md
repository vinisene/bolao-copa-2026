# CLAUDE.md

Guia do projeto para o Claude Code (e para qualquer dev). Leia antes de editar.

## Descrição geral

**Bolão Copa 2026** — um app web de bolão (palpites) da Copa do Mundo 2026 para um
grupo de amigos/família ("Bolão Sene Piovan"). Cada participante palpita o placar dos
72 jogos da fase de grupos; conforme os jogos acontecem, o placar real é preenchido e
o app calcula a pontuação e monta rankings, estatísticas e comparativos.

São **8 "palpiteiros"** organizados em **4 times** (cada time = 1 humano + a IA dele):

| Time | Humano (edita no app) | IA (palpites fixos no código) |
|------|------------------------|-------------------------------|
| Time Jeca   | Jeca (Jéssica) | ChatGPT Jeca |
| Time Tonius | Tonius (Ricardo) | Claude Tonius |
| Time Leo    | Leo | ChatGPT Leo |
| Time Vini   | Vini (Vinicius) | Claude Vini |

Há **dois bolões**:
- **Bolão Geral** (ranking padrão): conta só jogos a partir de **20/06 12h** (entrada do
  Tonius e do Leo) — todos os 8 participantes.
- **Bolão JxV** (legado): só os 4 originais (Jeca, Vini, ChatGPT Jeca, Claude Vini),
  contando a Copa inteira.

## Stack tecnológica

- **Frontend:** um único arquivo `index.html` (HTML + CSS + JS puro/vanilla, sem framework,
  sem build). CSS inline em `<style>`, JS inline em `<script>`.
- **Banco de dados / realtime:** [Supabase](https://supabase.com) (Postgres). Acessado pelo
  navegador via `@supabase/supabase-js@2` (UMD, carregado por CDN jsdelivr). Tabela única
  `bolao_games`. RLS com política pública (sem login) e Realtime habilitado para sincronizar
  palpites entre dispositivos ao vivo.
- **Bandeiras:** imagens de [flagcdn.com](https://flagcdn.com) (emoji de bandeira não renderiza
  em Windows/alguns Android) — convertidas a partir do emoji em runtime (`flagImg`).
- **Hospedagem:** Cloudflare Pages (produção: `bolao-copa-sene-piovan.pages.dev`), deploy
  automático a cada push no GitHub (repo `vinisene/bolao-copa-2026`, branch `main`).
  Foi migrado do Netlify (que tinha limite de créditos); `netlify.toml` é legado.
- **Dev local:** `npx serve` na porta 3333 (ver `.claude/launch.json`).

## Estrutura de pastas

```
.
├── index.html              # O app inteiro (UI + lógica + dados dos jogos). ~1180 linhas.
├── supabase_setup.sql      # SQL inicial da tabela bolao_games (RLS + realtime)
├── netlify.toml            # Redirect SPA (legado — hoje roda no Cloudflare Pages)
├── fotos/                  # Avatares e logos (servidos como estáticos)
│   ├── jeca.jpg, tonius.jpg, leo.jpg, vini.jpg        # fotos dos humanos
│   ├── jeca-ia.jpeg, tonius-ia.jpeg, leo-ia.jpeg, vini-ia.jpg  # avatares das IAs
│   ├── logo-copa-branco.png   # logo no cabeçalho (fundo verde escuro)
│   └── logo-copa-preto.png
├── .claude/launch.json     # Config do dev server (npx serve -p 3333)
├── .mcp.json               # MCP server do Supabase (escopo projeto)
├── .agents/skills/         # Agent Skills do Supabase (referência, não afeta runtime)
└── .gitignore              # ignora .DS_Store e .claude/settings.local.json
```

> Não há `package.json`, build, nem dependências instaladas — tudo é estático.

## Arquitetura do `index.html`

O `<script>` é dividido por comentários de seção `// ─── NOME ───`:

- **CONFIGURAÇÃO SUPABASE** — `SUPABASE_URL`, `SUPABASE_KEY` (anon/publishable, público de
  propósito), `TABLE='bolao_games'`, cliente `sb`.
- **PARTICIPANTS / TEAMS / CUT** — participantes (id, name, type `human|ia`, color, init,
  team, `editable`, `img`), times, e `CUT` (sortKey de corte do Bolão Geral = 20/06 12h).
- **GT** — array dos 72 jogos (template estático). Campos: `id` (g01–g72), `grp`, `r` (rodada),
  `dt` ("DD/MM"), `tm` ("16h"/"20h30"/"1h"), `ven`, `tA`/`fA`, `tB`/`fB`, e os palpites das IAs:
  `g`=ChatGPT Jeca, `c`=Claude Vini, `d`=Claude Tonius, `e`=ChatGPT Leo (`{a,b}` ou ausente).
- **STATE** — `CACHE` (espelho da tabela: `game_id → row`), `getGame(id)` (mescla GT + CACHE
  e monta `predictions` por participante).
- **SUPABASE OPS** — `loadData` (select inicial + render + subscribe), `upsert`, `setSyncing`.
- **Realtime** — `subscribeRealtime`, `sameRow` (ignora eco da própria escrita), `applyRemoteScores`
  (atualização cirúrgica de um card sem re-render), `isTyping`.
- **SCORING** — `calcPts(pred,rA,rB)` (regra: +5 resultado, +1 gols mandante, +1 gols visitante,
  +3 bônus cravado = máx 10), `ptsClass`, e **TURBO** (`isTurbo`, `ptsOf`): 1 jogo/dia (≥20/06)
  vale 2× — escolhido de forma determinística por data (`hashStr`/`turboIdForDate`).
- **PRÓXIMO JOGO / CONTAGEM** — `gameDate`, `weekday`, `missingPred`, `todaySlate`, `heroHTML`
  (bloco "Jogos de hoje"), `tickCountdown`, `setupMarquees` (rola o texto quando não cabe).
- **RENDER PALPITES** — `renderPalpites` (filtros + seções por data), `renderCard`.
- **ACTIONS** — `toggleFinish`, `updPred`/`updReal` (debounce + upsert), `refreshPoints`
  (atualiza só os selos de pontos e a "prévia" sem reconstruir a lista).
- **RANKING** — `getStats(pid, filterFn)`, `versus`, `teamRace`, `statCard`, `rkRow`, `podium`,
  `rankingNew` (Geral), `rankingOld` (JxV), `renderRanking`, `showTab`.

### Modelo de dados (tabela `bolao_games`)
Uma linha por jogo (`game_id` = id do GT). Colunas: `finished`, `removed`, `real_a/real_b`
(placar do jogo), e os palpites dos **humanos**: `jessica_*`, `vinicius_*`, `tonius_*`, `leo_*`
(+ `updated_at`). Os palpites das **IAs ficam no código** (GT), não no banco.
Ao adicionar um novo humano, é preciso `ALTER TABLE` adicionando `<id>_a` e `<id>_b`.

## Features já implementadas

- **Palpites:** card por jogo (cabeçalho com grupo/rodada/tag do bolão/data com dia da semana
  abreviado; bandeiras como imagem; local com 📍 no centro). Coluna esquerda 3/5 (humanos,
  editáveis: foto + nome + caixas de placar) e direita 2/5 (IAs, leitura).
- **Placar do Jogo + prévia:** ao digitar o placar (sem finalizar), mostra a **prévia** dos
  pontos de cada um em cinza; só conta no ranking ao clicar em **Finalizar**.
- **Jogo TURBO ×2:** 1 jogo por dia (≥20/06) vale o dobro, com tag/glow laranja.
- **Filtros:** Pendentes (padrão) · Todos · Finalizados · Bolão Geral · Bolão JxV · Fora
  (= "removidos"/não considerados). Finalizados/Geral/JxV ordenam do mais recente p/ o antigo.
- **Jogos de hoje:** bloco no topo com os jogos do dia (até a madrugada seguinte), contagem
  regressiva por jogo, destaque do turbo, marquee quando o texto não cabe.
- **Ranking & Stats:** alterna entre **Bolão Geral** e **Bolão JxV**. Pódio (ouro/prata/bronze
  com foto + medalha), classificação, **comparativos** (Humanos vs Máquinas; corrida dos 4 times),
  e **estatísticas individuais** (pontos, pontos/jogo, acerto ganhador/empate, placares cravados +
  lista, viés de gols) com tooltips "?" explicativos.
- **Critérios de pontuação e desempate** exibidos no ranking (desempate: 1º cravados, 2º
  ganhador/empate — refletido na ordenação).
- **Sync em tempo real** entre dispositivos (Supabase Realtime) com indicador "salvando/salvo".
- **Avatares com foto** (fallback para inicial colorida se a foto faltar).

## Convenções de código

- **Tudo em um arquivo, vanilla JS.** Sem framework, sem build, sem `import`. Funções globais
  (chamadas via `onclick=` no HTML gerado por template strings).
- **Idioma:** UI, comentários e nomes de domínio em **português**; nomes de função em camelCase
  (ex.: `renderCard`, `getStats`). IDs internos (`jessica`, `claudio`, `chatgptleo`) são chaves
  técnicas e **não** aparecem na tela — o que o usuário vê é o `name` (ex.: "Claude Tonius").
- **Estilo conciso:** linhas densas, poucas quebras; CSS minificado-ish numa linha por regra.
  Cores via CSS vars no `:root` (`--gd` verde escuro, `--gold`, etc.); cores por participante
  inline via `p.color`.
- **Render por template string + `innerHTML`.** Para não perder foco/scroll ao digitar, NÃO
  re-renderize a lista inteira em mudanças de input: use `refreshPoints`/`applyRemoteScores`
  (atualização cirúrgica). Re-render completo só em ações estruturais (filtro, finalizar).
- **Escrita no banco:** sempre `upsert` com `onConflict:'game_id'` e `updated_at`; escritas de
  input são **debounced** (~700ms). O realtime ignora o eco da própria escrita via `sameRow`.
- **Persistência de UI:** preferências do usuário em `localStorage` (`bf` = filtro, `brm` =
  bolão geral/jxv).
- **Datas/horários:** sempre horário de **Brasília**; jogos de madrugada (0h/1h) já têm a data
  do dia correto no GT. `sortKey` = `dia*10000 + hora*100 + min` para ordenar.
- **Deploy:** commit + push na `main` → Cloudflare publica sozinho. Mensagens de commit em
  português, descritivas do que mudou.
- **Verificação:** validar mudanças no preview local (porta 3333) — checar console sem erros e
  conferir no viewport mobile (375px), que é o uso principal.

## Cuidados / pegadinhas

- **App em uso real** com dados de verdade no Supabase. Evite escrever no banco em testes; se
  precisar, reverta o valor. Não exponha/!mexa em credenciais além das já públicas (anon key).
- **Palpites das IAs** entram **no código** (campos `g/c/d/e` do GT). Palpites de **humanos**
  entram pelo app (banco). Tonius e Leo foram pré-preenchidos no banco mas continuam editáveis.
- Ao **adicionar participante humano**: criar colunas no Supabase, e atualizar `PARTICIPANTS`,
  `TEAMS`, `getGame`, `DATA_COLS`, `applyRemoteScores`, `missingPred`, `statsOrder`.
- `flagImg` deriva o código do país a partir do emoji; bandeiras especiais (Escócia/Inglaterra)
  estão em `TAGFLAGS`.
