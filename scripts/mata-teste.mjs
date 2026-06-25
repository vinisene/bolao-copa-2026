#!/usr/bin/env node
// ============================================================
// Dados de TESTE do mata-mata. Marcados com "[TESTE]" no nome.
//   npm run seed:teste   -> cria 2 confrontos [TESTE] de exemplo
//   npm run clean:teste  -> apaga SÓ os confrontos marcados [TESTE]
//                           (e, por cascade, os palpites deles)
// Requer que as tabelas já existam (rode supabase_mata_mata.sql antes).
// Usa a REST pública (mesma anon key do index.html).
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jgnmenwtxybaqshvxyer.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_-4B34BzFkro0ve-J-OMBKQ_9xO3C5tr';
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const T = `${SUPABASE_URL}/rest/v1/mata_confrontos`;

const isTest = (c) => /\[TESTE\]/i.test(`${c.team_a || ''} ${c.team_b || ''} ${c.phase || ''}`);

// 2 exemplos: um decidido nos 90min e um empate decidido nos pênaltis.
const SEED = [
  { id: 'mm_teste1', phase: '32 avos', team_a: '[TESTE] Brasil', flag_a: '🇧🇷', team_b: 'Argentina', flag_b: '🇦🇷',
    real_a: 2, real_b: 1, classificado: null, finished: true },
  { id: 'mm_teste2', phase: '32 avos', team_a: '[TESTE] Espanha', flag_a: '🇪🇸', team_b: 'Alemanha', flag_b: '🇩🇪',
    real_a: 1, real_b: 1, classificado: 'B', finished: true },   // 1x1, Alemanha passou nos pênaltis
];

async function seed() {
  const res = await fetch(`${T}?on_conflict=id`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(SEED),
  });
  if (!res.ok) { console.error(`Erro ${res.status}: ${await res.text()}\n(As tabelas existem? Rode supabase_mata_mata.sql)`); process.exit(1); }
  console.log(`✅ Seed: ${SEED.length} confrontos [TESTE] criados/atualizados. Abra a aba Mata-Mata e preencha os palpites pra validar.`);
}

async function clean() {
  const res = await fetch(`${T}?select=id,team_a,team_b,phase`, { headers: H });
  if (!res.ok) { console.error(`Erro ${res.status}: ${await res.text()}`); process.exit(1); }
  const ids = (await res.json()).filter(isTest).map((c) => c.id);
  if (!ids.length) { console.log('Nada a limpar: nenhum confronto [TESTE] encontrado.'); return; }
  const del = await fetch(`${T}?id=in.(${ids.map(encodeURIComponent).join(',')})`, {
    method: 'DELETE', headers: { ...H, Prefer: 'return=minimal' },
  });
  if (!del.ok) { console.error(`Erro ${del.status}: ${await del.text()}`); process.exit(1); }
  console.log(`🧹 Limpos ${ids.length} confronto(s) [TESTE]: ${ids.join(', ')} (palpites apagados por cascade).`);
}

const mode = process.argv[2];
(mode === 'clean' ? clean() : seed()).catch((e) => { console.error(e); process.exit(1); });
