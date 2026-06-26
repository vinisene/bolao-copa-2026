#!/usr/bin/env node
// ============================================================
// Semeia a ESTRUTURA da chave do mata-mata no banco de DEV.
//   npm run seed:chave    -> cria as 32 vagas (16 jogos de 32avos com seleções
//                            pareadas ALEATORIAMENTE + as vagas vazias das fases
//                            seguintes, que aparecem como "A definir").
//   npm run clean:chave   -> apaga TODAS as vagas da chave (r32_/r16_/qf_/sf_/tp_/fin_) do dev.
// Escreve só em dev_mata_confrontos (nunca produção). Requer supabase_dev_setup.sql rodado.
// As seleções dos 32avos são PLACEHDERS de teste — o sorteio real depois é só ATUALIZAR
// team_a/team_b das mesmas vagas r32_1..r32_16 (os ids são fixos).
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jgnmenwtxybaqshvxyer.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_-4B34BzFkro0ve-J-OMBKQ_9xO3C5tr';
const TABLE = process.env.MM_TABLE || 'dev_mata_confrontos';
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const U = `${SUPABASE_URL}/rest/v1/${TABLE}`;

// 32 seleções tradicionais de Copa (nome + bandeira emoji; flagImg converte no app)
const SELECOES = [
  ['Brasil','🇧🇷'],['Argentina','🇦🇷'],['França','🇫🇷'],['Alemanha','🇩🇪'],['Espanha','🇪🇸'],
  ['Inglaterra','🏴󠁧󠁢󠁥󠁮󠁧󠁿'],['Portugal','🇵🇹'],['Holanda','🇳🇱'],['Bélgica','🇧🇪'],['Croácia','🇭🇷'],
  ['Uruguai','🇺🇾'],['México','🇲🇽'],['EUA','🇺🇸'],['Japão','🇯🇵'],['Coreia do Sul','🇰🇷'],
  ['Senegal','🇸🇳'],['Marrocos','🇲🇦'],['Suíça','🇨🇭'],['Dinamarca','🇩🇰'],['Sérvia','🇷🇸'],
  ['Polônia','🇵🇱'],['Equador','🇪🇨'],['Camarões','🇨🇲'],['Gana','🇬🇭'],['Austrália','🇦🇺'],
  ['Canadá','🇨🇦'],['Catar','🇶🇦'],['Costa Rica','🇨🇷'],['Tunísia','🇹🇳'],['Arábia Saudita','🇸🇦'],
  ['Nigéria','🇳🇬'],['Colômbia','🇨🇴'],
];

function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function build(){
  const rows=[];
  // 32avos: 16 jogos com pares aleatórios
  const s=shuffle(SELECOES);
  for(let i=0;i<16;i++){
    const [ta,fa]=s[2*i], [tb,fb]=s[2*i+1];
    rows.push({id:'r32_'+(i+1),phase:'32 avos',team_a:ta,flag_a:fa,team_b:tb,flag_b:fb,real_a:null,real_b:null,classificado:null,finished:false});
  }
  // Vagas das fases seguintes (sem time; o app resolve pela estrutura conforme saem os resultados)
  const empty=(id,phase)=>rows.push({id,phase,team_a:null,flag_a:null,team_b:null,flag_b:null,real_a:null,real_b:null,classificado:null,finished:false});
  for(let i=1;i<=8;i++) empty('r16_'+i,'Oitavas');
  for(let i=1;i<=4;i++) empty('qf_'+i,'Quartas');
  for(let i=1;i<=2;i++) empty('sf_'+i,'Semis');
  empty('tp_1','3º lugar');
  empty('fin_1','Final');
  return rows;
}

async function seed(){
  const rows=build();
  const res=await fetch(`${U}?on_conflict=id`,{method:'POST',headers:{...H,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
  if(!res.ok){console.error(`Erro ${res.status} em ${TABLE}: ${await res.text()}\n(As tabelas dev_* existem? Rode supabase_dev_setup.sql)`);process.exit(1);}
  const jogos=rows.filter(r=>r.id.startsWith('r32_')).map(r=>`${r.team_a} x ${r.team_b}`);
  console.log(`✅ Chave semeada em ${TABLE}: 32 vagas (16 jogos de 32avos + 16 vagas "A definir").`);
  console.log('   32avos:\n   - '+jogos.join('\n   - '));
}

async function clean(){
  const res=await fetch(`${U}?select=id`,{headers:H});
  if(!res.ok){console.error(`Erro ${res.status}: ${await res.text()}`);process.exit(1);}
  const ids=(await res.json()).map(r=>r.id).filter(id=>/^(r32_|r16_|qf_|sf_|tp_|fin_)/.test(id));
  if(!ids.length){console.log('Nada a limpar: nenhuma vaga de chave encontrada.');return;}
  const del=await fetch(`${U}?id=in.(${ids.map(encodeURIComponent).join(',')})`,{method:'DELETE',headers:{...H,Prefer:'return=minimal'}});
  if(!del.ok){console.error(`Erro ${del.status}: ${await del.text()}`);process.exit(1);}
  console.log(`🧹 Removidas ${ids.length} vagas da chave do dev.`);
}

const mode=process.argv[2];
(mode==='clean'?clean():seed()).catch(e=>{console.error(e);process.exit(1);});
