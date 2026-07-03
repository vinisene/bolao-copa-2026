// ═══════════════════════════════════════════════════════════════════════════
// ROBÔ RATAZANA — Edge Function "ratazana-cobranca" (Fase 1: disparo MANUAL)
// ═══════════════════════════════════════════════════════════════════════════
// Uso (navegador ou curl):
//   GET https://<projeto>.supabase.co/functions/v1/ratazana-cobranca?token=XXX
//     → gera a cobrança de quem falta palpitar e envia ao GRUPO DE TESTE
//   ...&force=1         → se ninguém falta, envia "todo mundo em dia" (teste)
//   ...&listar_grupos=1 → NÃO envia nada; lista os grupos do WhatsApp da
//                         instância (para descobrir o ID ...@g.us do grupo)
//
// Dados: SEMPRE tabelas de PRODUÇÃO (mata_confrontos / mata_palpites / bot_config).
// A lógica de "falta palpite" espelha o app (index.html): 3 próximos jogos por
// data (mmNextGamesHTML) + palpite completo (mmHasFullPred). Só HUMANOS.
// Jogos de grupos (g01–g72, incluindo g01–g03) nunca entram: só mata_*.
// IA: POST https://api.anthropic.com/v1/messages (claude-haiku-4-5-20251001).
// WhatsApp: ZapZap API (docs oficiais: https://api.zapzapapi.com/docs)
//   POST {ZAPZAP_ENDPOINT_BASE}/send/text  body {number, text}
//   headers x-api-key / x-api-secret. number aceita ID de grupo (@g.us).
// Auditoria: toda execução do pipeline grava linha em bot_log.
// ⚠️ Deploy com "Verify JWT" DESLIGADO — a proteção é o ?token= (BOT_TRIGGER_TOKEN).
// ═══════════════════════════════════════════════════════════════════════════

// ─── Participantes HUMANOS do mata (ids = coluna pid de mata_palpites) ───────
// IAs (claude, chatgpt, claudio, chatgptleo, pepe_ia) NUNCA são cobradas.
const HUMANOS = [
  { id: "jessica", nome: "Jeca" },
  { id: "tonius", nome: "Tonius" },
  { id: "leo", nome: "Leo" },
  { id: "vinicius", nome: "Vini" },
  { id: "pepe", nome: "Pepe" },
  { id: "du", nome: "Du" },
  { id: "yuri", nome: "Yuri" },
  { id: "mano", nome: "Mano" },
  { id: "gi", nome: "Gi" },
];

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
// deno-lint-ignore no-explicit-any
type Conf = any;

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
// Resolve o nome dos times de uma vaga pela chave + vencedores REAIS
// (porta mmRealWinner/mmResolveSide/mmOutcome/mmTeams do index.html)
function makeResolver(confrontos: Conf[]) {
  const confMap = new Map<string, Conf>(confrontos.map((c: Conf) => [c.id, c]));
  const realWinner = (c: Conf): "A" | "B" | null => {
    if (!c || c.real_a == null || c.real_b == null) return null;
    if (c.real_a > c.real_b) return "A";
    if (c.real_b > c.real_a) return "B";
    return (c.classificado === "A" || c.classificado === "B") ? c.classificado : null;
  };
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
    const w = realWinner(confMap.get(gameId));
    if (w == null) return null;
    const side = take === "win" ? w : (w === "A" ? "B" : "A");
    return resolveSide(gameId, side);
  };
  return (c: Conf) => ({ a: resolveSide(c.id, "A"), b: resolveSide(c.id, "B") });
}

// ─── Utilidades de texto/data (pt-BR, horário de Brasília) ───────────────────
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

// ─── IA (Anthropic Messages API) ─────────────────────────────────────────────
async function chamaIA(systemPrompt: string, userPrompt: string): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") || "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic → HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  const texto = (data.content || [])
    .filter((b: Conf) => b.type === "text")
    .map((b: Conf) => b.text)
    .join("\n").trim();
  if (!texto) throw new Error(`Anthropic não retornou texto (stop_reason: ${data.stop_reason})`);
  return texto;
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

  try {
    // 3a) Banco (produção): confrontos + palpites + system prompt do personagem
    const [confrontos, palpites, cfg] = await Promise.all([
      sbGet("mata_confrontos?select=*"),
      sbGet("mata_palpites?select=confronto_id,pid,gols_a,gols_b,quem_passa"),
      sbGet("bot_config?key=eq.system_prompt_ratazana&select=value"),
    ]);
    const systemPrompt = cfg?.[0]?.value;
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

    const jogos = up.map(({ c, d }: Conf) => {
      const i = mmInfo(c);
      const t = teamsOf(c);
      const faltam = HUMANOS.filter((h) => !mmHasFullPred(PAL[c.id]?.[h.id])).map((h) => h.nome);
      return {
        id: c.id,
        fase: c.phase || MM_BRACKET[c.id]?.phase || "",
        quando: `${diaSemana(d)} ${i.dt} às ${i.tm}`,
        onde: i.ven,
        jogo: `${t.a?.name || "A definir"} × ${t.b?.name || "A definir"}`,
        turbo: MM_TURBO.has(c.id),
        faltam,
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

    // 3d) Monta o prompt de DADOS para a IA
    etapa = "monta_prompt";
    const linhas = jogos.map((j: Conf) => {
      const turbo = j.turbo ? " ⚡TURBO ×2" : "";
      const pend = j.faltam.length ? `faltam palpitar: ${listaNomes(j.faltam)}` : "todos já palpitaram";
      return `- ${j.quando} — ${j.fase} — ${j.jogo}${turbo} (${j.onde}) → ${pend}`;
    }).join("\n");
    const tarefa = comPendencia.length
      ? `TAREFA: escreva a mensagem de COBRANÇA DE PALPITES para o grupo de WhatsApp do bolão, cutucando quem está devendo. Cite os jogos e horários dos jogos pendentes.`
      : `TAREFA: ninguém está devendo palpite (mensagem de teste do sistema). Escreva uma mensagem curta para o grupo comemorando que está todo mundo em dia com os palpites.`;
    userPrompt =
      `DADOS VERIFICADOS DO BOLÃO (gerados pelo sistema em ${agoraBrasilia()}, horário de Brasília):\n\n` +
      `Próximos jogos do mata-mata (palpites ainda abertos):\n${linhas}\n\n` +
      (todosFaltantes.length ? `Resumo de quem falta: ${listaNomes(todosFaltantes)}\n\n` : "") +
      tarefa;

    // 3e) Chama a IA com a personalidade do Ratazana
    etapa = "anthropic";
    respostaIA = await chamaIA(systemPrompt, userPrompt);

    // 3f) Envia ao grupo de teste via ZapZap
    etapa = "zapzap";
    const envio = await zapEnviaTexto(GRUPO, respostaIA);

    // 3g) Auditoria
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
    return json({ ok: false, etapa, erro: msg }, 500);
  }
});
