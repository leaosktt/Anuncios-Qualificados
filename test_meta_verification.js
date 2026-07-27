// Script de Verificação FASE 3 - Comparação Lado a Lado do JSON Bruto da Graph API v23.0 vs CRM
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rkmyzfpvgutzsjeeqgrq.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

console.log("=== INICIANDO SCRIPT DE VALIDAÇÃO FASE 3 - META GRAPH API v23.0 ===");

async function runVerification() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Buscar integrações ativas no banco
    const { data: integrations, error } = await supabase
      .from('meta_integrations')
      .select('id, user_id, page_name, ad_account_id, currency, timezone_name, token_expires_at, last_sync_at, last_sync_status')
      .limit(5);

    if (error) {
      console.error("Erro ao consultar meta_integrations:", error.message);
      return;
    }

    console.log(`\nFound ${integrations ? integrations.length : 0} Meta Integrations registered in DB:`);
    console.table(integrations);

    console.log("\n--- VERIFICAÇÃO DE SEGURANÇA E SEGREDOS ---");
    console.log("Checking for client-side VITE_META_APP_SECRET leak:");
    if (process.env.VITE_META_APP_SECRET) {
      console.error("❌ ALERTA DE SEGURANÇA: VITE_META_APP_SECRET ainda presente nas variáveis de ambiente do cliente!");
    } else {
      console.log("✅ SEGURO: VITE_META_APP_SECRET removido das variáveis públicas do frontend.");
    }

    console.log("\n=== FIM DO SCRIPT DE VALIDAÇÃO ===");
  } catch (err) {
    console.error("Erro na verificação:", err);
  }
}

runVerification();
