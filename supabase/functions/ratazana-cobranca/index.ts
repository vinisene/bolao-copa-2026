// ═══════════════════════════════════════════════════════════════════════════
// ROBÔ RATAZANA — Edge Function "ratazana-cobranca"
// (v1.11: cobrança marca TODOS os devedores com menção real; stop_reason
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
async function chamaIA(modelo: string, systemPrompt: string, userPrompt: string, maxTokens = 4000) {
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
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic (${modelo}) → HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  const texto = (data.content || [])
    .filter((b: Conf) => b.type === "text")
    .map((b: Conf) => b.text)
    .join("\n").trim();
  // Resposta parcial NÃO VAZIA também é falha: texto cortado no meio da frase
  // não pode ir pro WhatsApp. Detalhe técnico completo só no log do servidor.
  if (data.stop_reason === "max_tokens") {
    console.error("[chamaIA] resposta cortada por max_tokens — NÃO enviada", {
      modelo, maxTokens, usage: data.usage || null, texto_parcial: texto.slice(0, 400),
    });
    throw new Error("Não consegui gerar a mensagem completa (estourou o limite de tokens). Clique em 🐀 Acordar o Ratazana de novo.");
  }
  if (!texto) throw new Error(`Anthropic não retornou texto (stop_reason: ${data.stop_reason})`);
  return { texto, usage: data.usage || null };
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
  const corpo = (await r.text()).slice(0, 600);
  return { ok: r.ok, detalhe: `HTTP ${r.status}: ${corpo}` };
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

// Envia como até 3 mensagens sequenciais no WhatsApp. Usado pela cobrança,
// pelo fim de jogo e pelo enviar_texto. O padrão continua sendo mensagem única.
// mentions: números com marcação real — cada parte só recebe os que aparecem
// nela como token @<numero> (a linha da provocação normalmente é a última).
async function enviaEmPartes(grupo: string, texto: string, mentions: string[] = []) {
  const suspeitos = sanidadeTexto(texto);
  if (suspeitos.length) {
    const detalhe = suspeitos
      .map((s) => `'${s.ch}' (U+${(s.ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}, ${s.script})`)
      .join(", ");
    console.error("[filtro de sanidade] script incompatível com português — envio BLOQUEADO:", detalhe, "| texto:", texto.slice(0, 300));
    throw new Error(`Filtro de sanidade bloqueou o envio: caractere de escrita incompatível com português (${detalhe}) — provável glitch do modelo. Clique em 🐀 Acordar o Ratazana de novo.`);
  }
  const partes = divideEmPartes(texto);
  if (!partes.length) throw new Error("texto ficou vazio após a divisão em blocos");
  const envios: { ok: boolean; detalhe: string }[] = [];
  for (const parte of partes) {
    envios.push(await zapEnviaTexto(grupo, parte, mentions.filter((n) => parte.includes("@" + n))));
    if (partes.length > 1) await new Promise((res) => setTimeout(res, 900));
  }
  return {
    partes,
    ok: envios.every((e) => e.ok),
    detalhe: envios.map((e, ix) => `msg ${ix + 1}/${partes.length} ${e.detalhe}`).join(" | "),
  };
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

  // 3) Pipeline da cobrança — cada etapa em try/catch; tudo vai pro bot_log.
  // Destino EXPLÍCITO obrigatório (?destino=teste|oficial): a URL antiga sem
  // &destino= passa a dar erro claro — nenhum envio "de default" existe mais.
  const logBase = { tipo: testeLongo ? "teste_mensagem_longa" : (force ? "cobranca_forcada" : "cobranca"), destino: "" };
  let etapa = "destino";
  let GRUPO = "";
  let userPrompt: string | null = null;
  let respostaIA: string | null = null;
  let modelo = MODELO_FALLBACK;

  try {
    const dst = grupoDestino(url);
    GRUPO = dst.grupo;
    logBase.destino = `${dst.destino} (${dst.grupo})`;

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
    // Fase ativa (v1.4): a cobrança NUNCA vaza de rodada. O Vini atualiza
    // bot_config 'fase_ativa' no Table Editor quando abre uma rodada nova.
    const FASE_CANON: Record<string, string> = {
      "16avos": "32avos", "32avos": "32avos",
      oitavas: "oitavas", "8as": "oitavas",
      quartas: "quartas", "4as": "quartas",
      semis: "semis", semifinal: "semis", semifinais: "semis",
      "3lugar": "3lugar", terceirolugar: "3lugar",
      final: "final",
    };
    const faseRaw = (cfgMap["fase_ativa"] || "").trim();
    const faseAtiva = FASE_CANON[faseRaw.toLowerCase().replace(/\s+/g, "").replace(/º/g, "")] || null;
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

    // 3c) Ninguém falta e sem force → não envia nada, só informa (e loga)
    if (!comPendencia.length && !force) {
      await botLog({ ...logBase, status_envio: "nao_enviado", erro: "ninguém falta palpitar na fase ativa (sem force=1)" });
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
