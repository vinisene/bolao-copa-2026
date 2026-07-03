// ═══════════════════════════════════════════════════════════════════════════
// ROBÔ RATAZANA — Edge Function "ratazana-cobranca" (Fase 1.5: calibragem)
// ═══════════════════════════════════════════════════════════════════════════
// Uso (navegador ou curl):
//   GET https://<projeto>.supabase.co/functions/v1/ratazana-cobranca?token=XXX
//     → gera a cobrança de quem falta palpitar e envia ao GRUPO DE TESTE
//   ...&force=1         → se ninguém falta, envia "todo mundo em dia" (teste)
//   ...&listar_grupos=1 → NÃO envia nada; lista os grupos do WhatsApp da
//                         instância (para descobrir o ID ...@g.us do grupo)
//
// Dados: SEMPRE tabelas de PRODUÇÃO (mata_confrontos / mata_palpites / bot_config).
// Modelo de IA: lido de bot_config key 'modelo_ia' (fallback Haiku 4.5).
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
// Só os 16 avos têm zebra definida por enquanto; novas fases entram aqui
// quando o Vini definir (sempre espelhando o index.html).
const MM_ZEBRA: Record<string, { tipo: "zebra" | "zebrao"; azarao: "A" | "B" }> = {
  r32_3: { tipo: "zebra", azarao: "B" },   // Alemanha × Paraguai      → azarão: Paraguai
  r32_6: { tipo: "zebra", azarao: "B" },   // França × Suécia          → azarão: Suécia
  r32_8: { tipo: "zebrao", azarao: "B" },  // Inglaterra × RD Congo    → azarão: RD Congo
  r32_11: { tipo: "zebra", azarao: "B" },  // Espanha × Áustria        → azarão: Áustria
  r32_15: { tipo: "zebrao", azarao: "B" }, // Argentina × Cabo Verde   → azarão: Cabo Verde
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
function listaNomes(nomes: string[]) {
  if (nomes.length <= 1) return nomes[0] || "";
  return nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];
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
async function chamaIA(modelo: string, systemPrompt: string, userPrompt: string) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") || "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 800,
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
async function zapEnviaTexto(numero: string, texto: string) {
  const r = await fetch(`${zapBase()}/send/text`, {
    method: "POST",
    headers: zapHeaders(),
    body: JSON.stringify({ number: numero, text: texto }),
  });
  const corpo = (await r.text()).slice(0, 600);
  return { ok: r.ok, detalhe: `HTTP ${r.status}: ${corpo}` };
}

// ─── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj, null, 2), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });

  // 1) Trava: só executa com o token certo
  const TOKEN = Deno.env.get("BOT_TRIGGER_TOKEN") || "";
  if (!TOKEN) return json({ ok: false, erro: "Secret BOT_TRIGGER_TOKEN não configurado" }, 500);
  if (url.searchParams.get("token") !== TOKEN) {
    return json({ ok: false, erro: "Token inválido ou ausente (?token=...)" }, 401);
  }

  const force = url.searchParams.get("force") === "1";
  const listarGrupos = url.searchParams.get("listar_grupos") === "1";

  // 2) Confere secrets necessários (nunca mostra valores, só nomes)
  const necessarios = listarGrupos
    ? ["ZAPZAP_API_KEY", "ZAPZAP_API_SECRET", "ZAPZAP_ENDPOINT_BASE"]
    : ["ZAPZAP_API_KEY", "ZAPZAP_API_SECRET", "ZAPZAP_ENDPOINT_BASE", "GRUPO_TESTE_ID", "ANTHROPIC_API_KEY"];
  const faltandoSecrets = necessarios.filter((n) => !Deno.env.get(n));
  if (faltandoSecrets.length) {
    return json({ ok: false, erro: `Secrets faltando: ${faltandoSecrets.join(", ")}` }, 500);
  }

  // Modo auxiliar: listar grupos do WhatsApp (pra descobrir o ID ...@g.us)
  if (listarGrupos) {
    try {
      const r = await fetch(`${zapBase()}/group/list`, { headers: zapHeaders() });
      const corpo = await r.text();
      let grupos: unknown;
      try { grupos = JSON.parse(corpo); } catch { grupos = corpo.slice(0, 2000); }
      return json({
        ok: r.ok,
        dica: "Ache o grupo de teste na lista e copie o campo id (termina em @g.us) para o secret GRUPO_TESTE_ID.",
        resposta_zapzap: grupos,
      }, r.ok ? 200 : 502);
    } catch (e) {
      return json({ ok: false, erro: `Falha ao listar grupos: ${String((e as Error)?.message || e)}` }, 500);
    }
  }

  // 3) Pipeline da cobrança — cada etapa em try/catch; tudo vai pro bot_log
  const GRUPO = Deno.env.get("GRUPO_TESTE_ID") || "";
  const logBase = { tipo: force ? "cobranca_forcada" : "cobranca", destino: GRUPO };
  let etapa = "consulta_banco";
  let userPrompt: string | null = null;
  let respostaIA: string | null = null;
  let modelo = MODELO_FALLBACK;

  try {
    // 3a) Banco (produção): confrontos + palpites + config (prompt e modelo)
    const [confrontos, palpites, cfg] = await Promise.all([
      sbGet("mata_confrontos?select=*"),
      sbGet("mata_palpites?select=confronto_id,pid,gols_a,gols_b,quem_passa"),
      sbGet("bot_config?key=in.(system_prompt_ratazana,modelo_ia)&select=key,value"),
    ]);
    const cfgMap: Record<string, string> = {};
    for (const row of cfg) cfgMap[row.key] = row.value;
    const systemPrompt = cfgMap["system_prompt_ratazana"];
    modelo = (cfgMap["modelo_ia"] || "").trim() || MODELO_FALLBACK;
    if (!systemPrompt) {
      throw new Error("bot_config sem 'system_prompt_ratazana' — rode o supabase_bot.sql no SQL Editor");
    }

    // 3b) Mesma seleção do app: 3 próximos jogos com kickoff no futuro
    etapa = "faltantes";
    const PAL: Record<string, Record<string, Conf>> = {};
    for (const p of palpites) (PAL[p.confronto_id] ??= {})[p.pid] = p;
    const teamsOf = makeResolver(confrontos);
    const now = Date.now();
    const up = confrontos
      .filter((c: Conf) => !mmIsTest(c))
      .map((c: Conf) => ({ c, d: mmGameDate(c) }))
      .filter((x: Conf) => x.d && x.d.getTime() > now)
      .sort((a: Conf, b: Conf) => a.d.getTime() - b.d.getTime())
      .slice(0, 3);

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
      const palMaquinas = MATA_PARTS_BOT.filter((p) => p.tipo === "maquina" && p.id !== RATAZANA_ID)
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
    const comPendencia = jogos.filter((j: Conf) => j.faltam.length > 0);
    const todosFaltantes = [...new Set(comPendencia.flatMap((j: Conf) => j.faltam))] as string[];

    // 3c) Ninguém falta e sem force → não envia nada, só informa (e loga)
    if (!comPendencia.length && !force) {
      await botLog({ ...logBase, status_envio: "nao_enviado", erro: "ninguém falta palpitar (sem force=1)" });
      return json({
        ok: true,
        enviado: false,
        motivo: "Ninguém está devendo palpite nos próximos jogos. Use ?force=1 para enviar mesmo assim (teste).",
        proximos_jogos: jogos,
      });
    }

    // 3d) Enriquecimento: quem completou tudo, último jogo encerrado, ranking
    etapa = "enriquecimento";
    const CITAVEIS = [...HUMANOS, MATA_PARTS_BOT.find((p) => p.id === RATAZANA_ID)!];
    const completaram = CITAVEIS
      .filter((p) => jogos.length && jogos.every((j: Conf) => mmHasFullPred(PAL[j.id]?.[p.id])))
      .map((p) => (p.id === RATAZANA_ID ? "Ratazana00 (você)" : p.nome));

    // jogos futuros já com os dois times definidos (dá pra palpitar de verdade)
    const futurosDef = confrontos
      .filter((c: Conf) => !mmIsTest(c))
      .map((c: Conf) => ({ c, d: mmGameDate(c) }))
      .filter((x: Conf) => x.d && x.d.getTime() > now)
      .filter((x: Conf) => { const t = teamsOf(x.c); return t.a && t.b; });
    const adiantados = CITAVEIS.map((p) => ({
      nome: p.id === RATAZANA_ID ? "Ratazana00 (você)" : p.nome,
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
      const pontos = MATA_PARTS_BOT.map((p) => ({ p, s: mmScore(PAL[c.id]?.[p.id], c) }))
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
        `- Seus pontos nesse jogo (Ratazana00): ${meu ? fmtPts(meu.s.total) : "0"}`;
    }

    etapa = "ranking";
    const rank = MATA_PARTS_BOT.map((p) => ({ p, ...mataStats(p.id, confrontos, PAL) }))
      .sort((a, b) => b.total - a.total || b.eHits - a.eHits || b.rHits - a.rHits);
    const posRatazana = rank.findIndex((r) => r.p.id === RATAZANA_ID) + 1;
    const ratStats = rank[posRatazana - 1];
    const top3 = rank.slice(0, 3)
      .map((r, ix) => `${ix + 1}º ${r.p.nome} ${fmtPts(r.total)} pts`).join("; ");
    const rankingBloco =
      `RANKING DO MATA-MATA (${rank.length} participantes, ${rank[0].played} jogos pontuados):\n` +
      `- Top 3: ${top3}\n` +
      `- Líder: ${rank[0].p.nome}\n` +
      `- Você (Ratazana00): ${posRatazana}º lugar com ${fmtPts(ratStats.total)} pts (${ratStats.eHits} placares cravados)`;

    // 3e) Monta o prompt de DADOS para a IA (tudo pré-calculado, pt-BR)
    etapa = "monta_prompt";
    const blocoJogo = (j: Conf) => {
      const l1 = `- ${j.quando} - ${j.fase} - ${j.jogo} - ${j.onde}` +
        (j.turbo ? ` - ⚡ TURBO: vale ×${j.multFinal} (multiplicador final)` : ` - vale ×${j.multFase}`) +
        (j.zebra ? ` - ${j.zebra.tipo === "zebrao" ? "ZEBRÃO" : "ZEBRA"} definido: azarão ${j.zebra.azarao}, bônus +${j.zebra.bonus} pra quem apostar que ele passa e ele passar` : "");
      const linhas = [l1, `  Faltam palpitar: ${j.faltam.length ? listaNomes(j.faltam) : "ninguém, todos em dia"}`];
      if (j.seuPalpite) linhas.push(`  Seu palpite (Ratazana00): ${j.seuPalpite}`);
      if (j.palHumanos.length) linhas.push(`  Palpites dos humanos: ${j.palHumanos.join("; ")}`);
      else linhas.push(`  Palpites dos humanos: nenhum registrado ainda`);
      if (j.palMaquinas.length) linhas.push(`  Palpites das outras máquinas: ${j.palMaquinas.join("; ")}`);
      return linhas.join("\n");
    };
    const tarefa = comPendencia.length
      ? "TAREFA: escreva a mensagem de COBRANÇA DE PALPITES para o grupo de WhatsApp do bolão, cutucando pelo nome quem está devendo e citando os jogos pendentes com horário. Se render piada, use os palpites públicos, o último jogo encerrado e a sua própria situação no ranking. Inclua o link do bolão."
      : "TAREFA: ninguém está devendo palpite (mensagem de teste do sistema). Escreva uma mensagem curta comemorando que está todo mundo em dia, provocando com os palpites públicos, o último jogo ou o ranking se render piada. Inclua o link do bolão.";
    userPrompt =
      `DADOS VERIFICADOS DO BOLÃO (gerados pelo sistema em ${agoraBrasilia()}, horário de Brasília). Use somente estes dados. Não calcule nem invente nada.\n\n` +
      `PRÓXIMOS JOGOS (palpites ainda abertos):\n${jogos.map(blocoJogo).join("\n")}\n\n` +
      `Já completaram os palpites de todos os jogos citados: ${completaram.length ? listaNomes(completaram) : "ninguém"}\n` +
      (adiantados.length ? `Palpites completos em jogos futuros já definidos (${futurosDef.length} jogos abertos): ${adiantados.map((x) => `${x.nome} ${x.n}`).join("; ")}\n` : "") +
      (ultimoBloco ? `\n${ultimoBloco}\n` : "") +
      `\n${rankingBloco}\n\n` +
      `LINK DO BOLÃO: https://bolao-ratazana00.pages.dev\n\n` +
      tarefa;

    // 3f) Chama a IA com a personalidade do Ratazana
    etapa = "anthropic";
    const ia = await chamaIA(modelo, systemPrompt, userPrompt);
    respostaIA = ia.texto;

    // 3g) Envia ao grupo de teste via ZapZap
    etapa = "zapzap";
    const envio = await zapEnviaTexto(GRUPO, respostaIA);

    // 3h) Auditoria
    etapa = "log";
    await botLog({
      ...logBase,
      prompt_enviado: userPrompt,
      resposta_ia: respostaIA,
      mensagem_enviada: respostaIA,
      status_envio: envio.ok ? "ok" : "erro",
      erro: envio.ok ? null : envio.detalhe,
    });

    return json({
      ok: envio.ok,
      enviado: envio.ok,
      modelo,
      uso_tokens: ia.usage,
      faltantes: todosFaltantes,
      jogos,
      mensagem: respostaIA,
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
