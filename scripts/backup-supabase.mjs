#!/usr/bin/env node
// ============================================================
// Backup dos dados do Supabase (tabela bolao_games).
// Uso:  npm run backup        (ou: node scripts/backup-supabase.mjs)
// Gera: backups/bolao_games_AAAA-MM-DD.json  (com todos os jogos,
//       palpites dos humanos, placares reais e flags).
//
// Lê a tabela via API REST pública (a anon/publishable key já é
// pública de propósito — mesma usada no index.html). Para apontar
// pra outro projeto, defina SUPABASE_URL e SUPABASE_KEY no ambiente.
// Requer Node 18+ (fetch nativo). Sem dependências externas.
// ============================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jgnmenwtxybaqshvxyer.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_-4B34BzFkro0ve-J-OMBKQ_9xO3C5tr';
const TABLE = process.env.SUPABASE_TABLE || 'bolao_games';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'backups');

async function main() {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=game_id.asc`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) {
    console.error(`Erro ${res.status} ao ler ${TABLE}: ${await res.text()}`);
    process.exit(1);
  }
  const rows = await res.json();

  const now = new Date();
  const date = now.toISOString().slice(0, 10); // AAAA-MM-DD
  mkdirSync(outDir, { recursive: true });
  let file = join(outDir, `${TABLE}_${date}.json`);
  // Não sobrescreve um backup já existente do mesmo dia: acrescenta a hora.
  try {
    const { existsSync } = await import('node:fs');
    if (existsSync(file)) file = join(outDir, `${TABLE}_${date}_${now.toTimeString().slice(0, 8).replace(/:/g, '')}.json`);
  } catch {}

  const payload = {
    exported_at: now.toISOString(),
    project: SUPABASE_URL,
    table: TABLE,
    count: rows.length,
    rows,
  };
  writeFileSync(file, JSON.stringify(payload, null, 2));
  console.log(`✅ Backup salvo: ${file.replace(root + '/', '')}  (${rows.length} linhas)`);
}

main().catch((e) => {
  console.error('Falha no backup:', e);
  process.exit(1);
});
