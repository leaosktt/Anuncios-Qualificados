import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    let val = parts[1].trim();
    if(val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length-1);
    env[parts[0].trim()] = val;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkDb() {
  console.log("Checking database...");

  // Check meta_integrations
  const { data: metaData, error: metaError } = await supabase.from('meta_integrations').select('*').limit(1);
  if (metaError) {
    console.log("❌ Tabela 'meta_integrations' NAO encontrada ou com erro:", metaError.message);
  } else {
    console.log("✅ Tabela 'meta_integrations' encontrada com sucesso!");
  }

  // Check user_id in leads
  const { data: leadsData, error: leadsError } = await supabase.from('leads').select('user_id').limit(1);
  if (leadsError) {
    if (leadsError.message.includes("Could not find the 'user_id' column")) {
      console.log("❌ Coluna 'user_id' NAO encontrada na tabela 'leads'.");
    } else {
      console.log("❌ Erro na tabela 'leads':", leadsError.message);
    }
  } else {
    console.log("✅ Coluna 'user_id' encontrada na tabela 'leads'!");
  }
}

checkDb();
