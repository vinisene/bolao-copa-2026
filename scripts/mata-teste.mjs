#!/usr/bin/env node
// ============================================================
// Cenário de TESTE do mata-mata. Confrontos marcados com "[TESTE]" no nome.
//   npm run seed:teste   -> cria 2 confrontos [TESTE] + os palpites dos 8 (4 humanos + 4 IAs)
//   npm run clean:teste  -> apaga SÓ os confrontos [TESTE] (cascade apaga os palpites)
// Escreve no BANCO DE DEV (dev_mata_confrontos / dev_mata_palpites) — nunca na produção.
// Requer as tabelas dev_* já criadas (rode supabase_dev_setup.sql antes).
// Pra mirar produção: export MM_TABLE=mata_confrontos (não usar à toa). Usa a anon key pública.
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jgnmenwtxybaqshvxyer.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_-4B34BzFkro0ve-J-OMBKQ_9xO3C5tr';
const MM_TABLE = process.env.MM_TABLE || 'dev_mata_confrontos';            // escrita só no dev por padrão
const MM_PAL   = MM_TABLE.replace('confrontos', 'palpites');               // dev_mata_palpites
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const U = (t) => `${SUPABASE_URL}/rest/v1/${t}`;

const isTest = (c) => /\[TESTE\]/i.test(`${c.team_a || ''} ${c.team_b || ''} ${c.phase || ''}`);

// Placar FINAL (inclui prorrogação). classificado: 'A'/'B' = quem passou.
const CONFRONTOS = [
  // Conf1: 2x1, decidido na prorrogação (NÃO é empate); classificado A = Teste FC.
  { id: 'mm_teste1', phase: '32 avos [TESTE]', team_a: '[TESTE] Teste FC', flag_a: '', team_b: 'Teste United', flag_b: '',
    real_a: 2, real_b: 1, classificado: 'A', finished: true },
  // Conf2: 1x1, foi pros pênaltis; classificado A = Teste City.
  { id: 'mm_teste2', phase: '32 avos [TESTE]', team_a: '[TESTE] Teste City', flag_a: '', team_b: 'Teste Real', flag_b: '',
    real_a: 1, real_b: 1, classificado: 'A', finished: true },
];

// Palpites: 4 humanos (exato do pedido) + 4 IAs plausíveis (≥1 IA crava empate+quem passa no Conf2).
const P = (confronto_id, pid, gols_a, gols_b, quem_passa = null) => ({ confronto_id, pid, gols_a, gols_b, quem_passa });
const PALPITES = [
  // Conf1 (Teste FC 2x1 Teste United)
  P('mm_teste1', 'jessica', 2, 1),   P('mm_teste1', 'tonius', 3, 1),
  P('mm_teste1', 'leo', 0, 2),       P('mm_teste1', 'vinicius', 1, 0),
  P('mm_teste1', 'chatgpt', 2, 1),   P('mm_teste1', 'claudio', 2, 0),
  P('mm_teste1', 'chatgptleo', 3, 2),P('mm_teste1', 'claude', 2, 1),
  // Conf2 (Teste City 1x1 Teste Real, pênaltis, passou A)
  P('mm_teste2', 'jessica', 1, 1, 'A'),  P('mm_teste2', 'tonius', 0, 0, 'B'),
  P('mm_teste2', 'leo', 2, 0),           P('mm_teste2', 'vinicius', 2, 2, 'A'),
  P('mm_teste2', 'chatgpt', 1, 1, 'A'),  P('mm_teste2', 'claudio', 1, 1, 'B'),
  P('mm_teste2', 'chatgptleo', 0, 0, 'A'),P('mm_teste2', 'claude', 2, 1),
];

async function post(table, rows, conflict) {
  const res = await fetch(`${U(table)}?on_conflict=${conflict}`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${res.status} em ${table}: ${await res.text()}`);
}

async function seed() {
  try {
    await post(MM_TABLE, CONFRONTOS, 'id');                 // confrontos primeiro (FK)
    await post(MM_PAL, PALPITES, 'confronto_id,pid');       // depois os palpites
  } catch (e) {
    console.error(`Erro: ${e.message}\n(As tabelas dev_* existem? Rode supabase_dev_setup.sql no Supabase.)`);
    process.exit(1);
  }
  console.log(`✅ Seed no DEV: ${CONFRONTOS.length} confrontos [TESTE] + ${PALPITES.length} palpites (8 por confronto). Abra a URL dev → aba Mata-Mata.`);
}

async function clean() {
  const res = await fetch(`${U(MM_TABLE)}?select=id,team_a,team_b,phase`, { headers: H });
  if (!res.ok) { console.error(`Erro ${res.status}: ${await res.text()}`); process.exit(1); }
  const ids = (await res.json()).filter(isTest).map((c) => c.id);
  if (!ids.length) { console.log('Nada a limpar: nenhum confronto [TESTE] encontrado.'); return; }
  const del = await fetch(`${U(MM_TABLE)}?id=in.(${ids.map(encodeURIComponent).join(',')})`, {
    method: 'DELETE', headers: { ...H, Prefer: 'return=minimal' },
  });
  if (!del.ok) { console.error(`Erro ${del.status}: ${await del.text()}`); process.exit(1); }
  console.log(`🧹 Limpos ${ids.length} confronto(s) [TESTE]: ${ids.join(', ')} (palpites apagados por cascade).`);
}

const mode = process.argv[2];
(mode === 'clean' ? clean() : seed()).catch((e) => { console.error(e); process.exit(1); });
