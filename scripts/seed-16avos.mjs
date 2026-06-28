#!/usr/bin/env node
// ============================================================
// Preenche os TIMES REAIS dos 16 avos no banco de DEV (dev_mata_confrontos).
//   npm run seed:16avos
// Escreve SOMENTE os campos de time (team_a/flag_a/team_b/flag_b/phase) nas vagas r32_1..r32_16.
// PRESERVA real_a/real_b/classificado/finished das vagas que já existem (faz PATCH só dos times).
// Vaga que não existir é criada (POST) com placar/flags nulos.
// Ordem CRONOLÓGICA = ordem da agenda (MM_AGENDA): r32_1 = 1º jogo (28/06) ... r32_16 = último (03/07).
// Só DEV por padrão. Pra mirar produção: MM_TABLE=mata_confrontos (NÃO usar). Usa a anon key pública.
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jgnmenwtxybaqshvxyer.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_-4B34BzFkro0ve-J-OMBKQ_9xO3C5tr';
const TABLE = process.env.MM_TABLE || 'dev_mata_confrontos';
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const U = `${SUPABASE_URL}/rest/v1/${TABLE}`;

// Slot r32_N (N na ordem cronológica) -> times reais (nomes/bandeiras no padrão do app/GT).
const JOGOS = [
  ['r32_1',  'África do Sul','🇿🇦', 'Canadá','🇨🇦'],
  ['r32_2',  'Brasil','🇧🇷', 'Japão','🇯🇵'],
  ['r32_3',  'Alemanha','🇩🇪', 'Paraguai','🇵🇾'],
  ['r32_4',  'Holanda','🇳🇱', 'Marrocos','🇲🇦'],
  ['r32_5',  'Costa do Marfim','🇨🇮', 'Noruega','🇳🇴'],
  ['r32_6',  'França','🇫🇷', 'Suécia','🇸🇪'],
  ['r32_7',  'México','🇲🇽', 'Equador','🇪🇨'],
  ['r32_8',  'Inglaterra','🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'RD Congo','🇨🇩'],
  ['r32_9',  'Bélgica','🇧🇪', 'Senegal','🇸🇳'],
  ['r32_10', 'EUA','🇺🇸', 'Bósnia e Herz.','🇧🇦'],
  ['r32_11', 'Espanha','🇪🇸', 'Áustria','🇦🇹'],
  ['r32_12', 'Portugal','🇵🇹', 'Croácia','🇭🇷'],
  ['r32_13', 'Suíça','🇨🇭', 'Argélia','🇩🇿'],
  ['r32_14', 'Austrália','🇦🇺', 'Egito','🇪🇬'],
  ['r32_15', 'Argentina','🇦🇷', 'Cabo Verde','🇨🇻'],
  ['r32_16', 'Colômbia','🇨🇴', 'Gana','🇬🇭'],
];

async function main() {
  // 1) ids já existentes no dev
  const res = await fetch(`${U}?select=id`, { headers: H });
  if (!res.ok) { console.error(`Erro ${res.status} ao ler ${TABLE}: ${await res.text()}\n(As tabelas dev_* existem? Rode supabase_dev_setup.sql)`); process.exit(1); }
  const existing = new Set((await res.json()).map(r => r.id));

  let patched = 0, created = 0;
  for (const [id, ta, fa, tb, fb] of JOGOS) {
    const teamFields = { team_a: ta, flag_a: fa, team_b: tb, flag_b: fb, phase: '16 avos' };
    if (existing.has(id)) {
      // PATCH: atualiza SÓ os times, preservando real_a/real_b/classificado/finished
      const r = await fetch(`${U}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(teamFields) });
      if (!r.ok) { console.error(`Erro ${r.status} no PATCH ${id}: ${await r.text()}`); process.exit(1); }
      patched++;
    } else {
      // POST: cria a vaga com times e placar/flags nulos
      const row = { id, ...teamFields, real_a: null, real_b: null, classificado: null, finished: false };
      const r = await fetch(`${U}?on_conflict=id`, { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) });
      if (!r.ok) { console.error(`Erro ${r.status} no POST ${id}: ${await r.text()}`); process.exit(1); }
      created++;
    }
  }
  console.log(`✅ 16 avos preenchidos em ${TABLE}: ${patched} atualizados, ${created} criados.`);
  JOGOS.forEach(([id, ta, fa, tb, fb]) => console.log(`   ${id}: ${fa} ${ta} × ${tb} ${fb}`));
  console.log('\nDatas/horários vêm da agenda (MM_AGENDA, no código) por slot — não são gravados no banco.');
}
main().catch(e => { console.error(e); process.exit(1); });
