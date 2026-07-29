import 'dotenv/config';

// Script: validate_meta.js
// Execução: node validate_meta.js
// Variáveis de ambiente necessárias no arquivo .env local:
// FB_ACCESS_TOKEN (token de usuário Meta válido)
// FB_AD_ACCOUNT_ID (id da conta de anúncios, sem 'act_')
// SUPABASE_URL (url do seu projeto supabase)
// SUPABASE_USER_JWT (jwt de um usuário autenticado no Supabase, pegue na aba Network/Application do seu navegador)

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const FB_AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_USER_JWT = process.env.SUPABASE_USER_JWT;

if (!FB_ACCESS_TOKEN || !FB_AD_ACCOUNT_ID || !SUPABASE_URL || !SUPABASE_USER_JWT) {
  console.error("ERRO: Variáveis de ambiente ausentes. Verifique FB_ACCESS_TOKEN, FB_AD_ACCOUNT_ID, SUPABASE_URL, SUPABASE_USER_JWT.");
  process.exit(1);
}

const cleanActId = FB_AD_ACCOUNT_ID.startsWith('act_') ? FB_AD_ACCOUNT_ID : `act_${FB_AD_ACCOUNT_ID}`;

// Função para formatar data (últimos 7 dias no timezone UTC provisoriamente; a EF usa timezone da conta)
function getLast7DaysTimeRange() {
  const today = new Date();
  const since = new Date(today);
  since.setDate(since.getDate() - 6);
  
  const formatIso = (d) => d.toISOString().slice(0, 10);
  return { since: formatIso(since), until: formatIso(today) };
}

async function runValidation() {
  console.log(`\n=== INICIANDO VALIDAÇÃO LADO A LADO - FASE 3 ===\n`);
  
  const timeRange = getLast7DaysTimeRange();
  const timeRangeStr = JSON.stringify(timeRange);
  const attributionWindowsStr = JSON.stringify(['7d_click', '1d_view']);

  // ---------------------------------------------------------
  // 1. CHAMADA DIRETA À GRAPH API v23.0
  // ---------------------------------------------------------
  console.log(`1. Consultando Graph API v23.0 (time_range: ${timeRangeStr})...`);
  
  const fields = 'campaign_id,campaign_name,spend,impressions,reach,clicks,actions,cost_per_action_type';
  const graphUrl = `https://graph.facebook.com/v23.0/${cleanActId}/insights?level=campaign&fields=${fields}&time_range=${encodeURIComponent(timeRangeStr)}&action_attribution_windows=${encodeURIComponent(attributionWindowsStr)}&access_token=${FB_ACCESS_TOKEN}`;

  let graphData = [];
  try {
    const res = await fetch(graphUrl);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    graphData = json.data || [];
  } catch (err) {
    console.error("Erro na Graph API:", err.message);
    process.exit(1);
  }

  console.log("\n[ACTIONS BRUTO] (Primeira campanha com actions):");
  const campWithActions = graphData.find(c => c.actions && c.actions.length > 0);
  if (campWithActions) {
    console.log(JSON.stringify(campWithActions.actions, null, 2));
  } else {
    console.log("Nenhuma action encontrada nas campanhas do período.");
  }

  // Agregando valores da API Direta
  let gSpend = 0, gImpressions = 0, gReach = 0, gClicks = 0, gLeads = 0, gCpl = 0;
  
  graphData.forEach(camp => {
    gSpend += parseFloat(camp.spend || '0');
    gImpressions += parseInt(camp.impressions || '0');
    gReach += parseInt(camp.reach || '0');
    gClicks += parseInt(camp.clicks || '0');
    
    let campLeads = 0;
    if (camp.actions) {
      const primaryLead = camp.actions.find(a => (a.action_type || '').toLowerCase() === 'lead');
      if (primaryLead) {
        campLeads = parseInt(primaryLead.value || '0');
      } else {
        const msgObj = camp.actions.find(a => {
          const t = (a.action_type || '').toLowerCase();
          return t === 'onsite_conversion.lead_grouped' || t.includes('messaging_conversation_started') || t.includes('conversation');
        });
        if (msgObj) campLeads = parseInt(msgObj.value || '0');
      }
    }
    gLeads += campLeads;
  });
  
  gCpl = gLeads > 0 ? gSpend / gLeads : 0;

  // ---------------------------------------------------------
  // 2. CHAMADA À EDGE FUNCTION
  // ---------------------------------------------------------
  console.log(`\n2. Consultando Edge Function (meta-insights)...`);
  let edgeData = [];
  try {
    const efRes = await fetch(`${SUPABASE_URL}/functions/v1/meta-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_USER_JWT}`
      },
      body: JSON.stringify({ period: '7days', force_refresh: true })
    });
    
    if (!efRes.ok) {
      const errorText = await efRes.text();
      throw new Error(`HTTP Error ${efRes.status}: ${errorText}`);
    }

    const efJson = await efRes.json();
    if (efJson.error) throw new Error(efJson.error);
    edgeData = efJson.campaigns || [];
  } catch (err) {
    console.error("Erro na Edge Function (Pode ser que não esteja deployada ou ocorreu um erro de rede):", err.message);
    process.exit(1);
  }

  let eSpend = 0, eImpressions = 0, eReach = 0, eClicks = 0, eLeads = 0, eCpl = 0;
  
  edgeData.forEach(camp => {
    eSpend += camp.spend || 0;
    eImpressions += camp.impressions || 0;
    eReach += camp.reach || 0;
    eClicks += camp.clicks || 0;
    eLeads += camp.leads_count || 0;
  });
  eCpl = eLeads > 0 ? eSpend / eLeads : 0;


  // ---------------------------------------------------------
  // 3. TABELA COMPARATIVA
  // ---------------------------------------------------------
  console.log(`\n3. TABELA COMPARATIVA`);
  console.log("Preencha a coluna 'Gerenciador' com os valores reais da sua conta para validar.\n");

  const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatNum = (val) => new Intl.NumberFormat('pt-BR').format(val);

  const tableData = [
    { Métrica: "Spend", "Graph API (bruta)": formatBRL(gSpend), "Edge Function / UI": formatBRL(eSpend), "Gerenciador": "____________" },
    { Métrica: "Impressions", "Graph API (bruta)": formatNum(gImpressions), "Edge Function / UI": formatNum(eImpressions), "Gerenciador": "____________" },
    { Métrica: "Reach", "Graph API (bruta)": formatNum(gReach), "Edge Function / UI": formatNum(eReach), "Gerenciador": "____________" },
    { Métrica: "Clicks", "Graph API (bruta)": formatNum(gClicks), "Edge Function / UI": formatNum(eClicks), "Gerenciador": "____________" },
    { Métrica: "Leads", "Graph API (bruta)": formatNum(gLeads), "Edge Function / UI": formatNum(eLeads), "Gerenciador": "____________" },
    { Métrica: "CPL", "Graph API (bruta)": formatBRL(gCpl), "Edge Function / UI": formatBRL(eCpl), "Gerenciador": "____________" },
  ];

  console.table(tableData);
  console.log("\nValidação Finalizada.");
}

runValidation();
