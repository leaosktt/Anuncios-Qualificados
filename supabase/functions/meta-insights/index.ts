import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Funções auxiliares para cálculo de intervalo de datas no fuso horário da conta
function getDateRangeForPeriod(period: string, timezone: string) {
  const now = new Date();
  
  // Formatar datas no fuso horário retornado pela Meta API (ex: America/Sao_Paulo)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2026');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '01') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '01');

  const todayDate = new Date(Date.UTC(year, month, day));

  let since = new Date(todayDate);
  let until = new Date(todayDate);

  if (period === 'today') {
    since = todayDate;
    until = todayDate;
  } else if (period === 'yesterday') {
    since = new Date(todayDate);
    since.setUTCDate(since.getUTCDate() - 1);
    until = new Date(since);
  } else if (period === '7days') {
    since = new Date(todayDate);
    since.setUTCDate(since.getUTCDate() - 6);
    until = todayDate;
  } else if (period === '30days') {
    since = new Date(todayDate);
    since.setUTCDate(since.getUTCDate() - 29);
    until = todayDate;
  } else {
    since = new Date(todayDate);
    since.setUTCDate(since.getUTCDate() - 89);
    until = todayDate;
  }

  const formatIso = (d: Date) => d.toISOString().slice(0, 10);
  return { since: formatIso(since), until: formatIso(until) };
}

// Requisição com Retry Exponencial exclusivo para 5xx e Rate Limits (4, 17, 613)
async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<any> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        const code = data.error.code;
        if (code === 4 || code === 17 || code === 613 || res.status >= 500) {
          attempt++;
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
            continue;
          }
        }
      }
      return data;
    } catch (err) {
      attempt++;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorização ausente.', code: 401 }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { period = '30days' } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Validação do JWT do usuário
    const jwtToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(jwtToken);

    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida ou expirada.', code: 401 }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar a integração ativa da Meta do usuário
    const { data: intData, error: intErr } = await supabaseAdmin
      .from('meta_integrations')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (intErr || !intData) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma conta do Meta Ads conectada neste perfil. Vincule sua conta na página de Integrações.', code: 404 }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = intData.user_access_token || intData.access_token;
    const adAccountId = intData.ad_account_id;
    const tokenExpiresAt = intData.token_expires_at;

    // Checagem de expiração de token
    if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
      await supabaseAdmin.from('meta_integrations').update({
        last_sync_status: 'token_expired',
        last_sync_error: 'Conexão expirada, reconecte sua conta Meta'
      }).eq('id', intData.id);

      return new Response(
        JSON.stringify({
          error: 'Sua conexão com a conta Meta expirou. Por favor, reconecte sua conta para restabelecer o acesso às métricas.',
          code: 190
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accessToken || !adAccountId) {
      return new Response(
        JSON.stringify({ error: 'Conta de Anúncios do Meta não configurada adequadamente. Reconecte na tela de Integrações.', code: 400 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanActId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // 1. Obter moeda e timezone oficiais da conta de anúncios
    const actDetailsUrl = `https://graph.facebook.com/v23.0/${cleanActId}?fields=currency,timezone_name,name&access_token=${accessToken}`;
    const actDetails = await fetchWithRetry(actDetailsUrl);

    if (actDetails.error) {
      const code = actDetails.error.code;
      let userMsg = actDetails.error.message;

      if (code === 190) userMsg = 'Conexão expirada, reconecte sua conta Meta';
      if (code === 200 || code === 10) userMsg = 'Permissão ausente: escopo ads_read não concedido no Facebook';
      if (code === 4 || code === 17 || code === 613) userMsg = 'Limite de requisições do Facebook atingido, tente em alguns minutos';

      await supabaseAdmin.from('meta_integrations').update({
        last_sync_status: 'error',
        last_sync_error: `${userMsg} (código ${code})`,
        last_sync_at: new Date().toISOString()
      }).eq('id', intData.id);

      return new Response(
        JSON.stringify({ error: userMsg, code, fbtrace_id: actDetails.error.fbtrace_id }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currency = actDetails.currency || intData.currency || 'BRL';
    const timezone_name = actDetails.timezone_name || intData.timezone_name || 'America/Sao_Paulo';
    const account_name = actDetails.name || intData.ad_account_name || 'Conta Meta Ads';

    // 2. Calcular time_range exato no fuso horário da conta
    const { since, until } = getDateRangeForPeriod(period, timezone_name);
    const timeRangeStr = JSON.stringify({ since, until });

    // Definir explicitamente action_attribution_windows para 7d_click e 1d_view (Padrão oficial Meta Ads Manager)
    const attributionWindows = ['7d_click', '1d_view'];
    const attributionWindowsStr = JSON.stringify(attributionWindows);

    // 3. Consultar Insights no nível de campanha (Graph API v23.0) com action_attribution_windows explícito
    let insightsUrl: string | null = `https://graph.facebook.com/v23.0/${cleanActId}/insights?level=campaign&fields=campaign_id,campaign_name,spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values,cost_per_action_type,purchase_roas&time_range=${encodeURIComponent(timeRangeStr)}&action_attribution_windows=${encodeURIComponent(attributionWindowsStr)}&access_token=${accessToken}`;

    let rawCampaignsData: any[] = [];

    // Paginação completa seguindo paging.next até o fim
    while (insightsUrl) {
      const insightsRes = await fetchWithRetry(insightsUrl);

      if (insightsRes.error) {
        const code = insightsRes.error.code;
        let userMsg = insightsRes.error.message;

        if (code === 190) userMsg = 'Conexão expirada, reconecte sua conta Meta';
        if (code === 200 || code === 10) userMsg = 'Permissão ausente: escopo ads_read não concedido no Facebook';
        if (code === 4 || code === 17 || code === 613) userMsg = 'Limite de requisições do Facebook atingido, tente em alguns minutos';

        return new Response(
          JSON.stringify({ error: userMsg, code, fbtrace_id: insightsRes.error.fbtrace_id }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (insightsRes.data && Array.isArray(insightsRes.data)) {
        rawCampaignsData.push(...insightsRes.data);
      }

      insightsUrl = insightsRes.paging?.next || null;
    }

    // 4. Buscar a lista de campanhas para obter o status da veiculação (ACTIVE/PAUSED)
    let activeCampaignsMap: Record<string, string> = {};
    try {
      const campListUrl = `https://graph.facebook.com/v23.0/${cleanActId}/campaigns?fields=id,name,status,effective_status&access_token=${accessToken}`;
      const campListRes = await fetchWithRetry(campListUrl);
      if (campListRes.data && Array.isArray(campListRes.data)) {
        campListRes.data.forEach((c: any) => {
          activeCampaignsMap[c.id] = (c.effective_status === 'ACTIVE' || c.status === 'ACTIVE') ? 'Ativa' : 'Desativado';
        });
      }
    } catch (cErr) {
      console.warn("Aviso ao buscar status de campanhas:", cErr);
    }

    // 5. Normalizar os dados com DEDUPLICAÇÃO DE LEADS
    /*
      REGRA DE DEDUPLICAÇÃO DE LEADS DA META API:
      O array 'actions' retornado pela Meta API contém action_types primários e secundários.
      Para campanhas de Lead Ads, a Meta reporta o action_type 'lead' (somatória geral de formulários)
      E SIMULTANEAMENTE 'onsite_conversion.lead_grouped' (sub-breakdown no Facebook) e/ou 'offsite_conversion.fb_pixel_lead' (sub-breakdown no Pixel).
      
      SE SOMARMOS 'lead' + 'onsite_conversion.lead_grouped', O MESMO LEAD É CONTADO 2 VEZES.
      
      REGRA ADOTADA:
      1. Procurar primeiro pelo action_type === 'lead'. Se existir, usar seu valor diretamente.
      2. Somente se 'lead' NÃO existir no array, buscar por 'onsite_conversion.lead_grouped' ou 'offsite_conversion.fb_pixel_lead' ou 'messaging_conversation_started_7d'.
      3. NUNCA somar 'lead' com seus sub-breakdowns.
    */
    const campaigns = rawCampaignsData.map((item: any) => {
      const spend = parseFloat(item.spend || '0');
      const impressions = parseInt(item.impressions || '0');
      const reach = item.reach ? parseInt(item.reach) : 0;
      const clicks = parseInt(item.clicks || '0');
      const ctr = item.ctr ? parseFloat(item.ctr) : (impressions > 0 ? (clicks / impressions) * 100 : 0);
      const cpc = item.cpc ? parseFloat(item.cpc) : (clicks > 0 ? spend / clicks : 0);
      const cpm = item.cpm ? parseFloat(item.cpm) : (impressions > 0 ? (spend / impressions) * 1000 : 0);

      // Deduplicação estrita de Leads
      let leads = 0;
      if (item.actions && Array.isArray(item.actions)) {
        // Passo 1: Procurar o action_type 'lead' direto
        const primaryLeadObj = item.actions.find((a: any) => (a.action_type || '').toLowerCase() === 'lead');

        if (primaryLeadObj) {
          leads = parseInt(primaryLeadObj.value || '0');
        } else {
          // Passo 2: Se 'lead' não existir, procurar por conversas de mensagem ou agrupados
          const msgObj = item.actions.find((a: any) => {
            const t = (a.action_type || '').toLowerCase();
            return t === 'onsite_conversion.lead_grouped' || t.includes('messaging_conversation_started') || t.includes('conversation');
          });
          if (msgObj) {
            leads = parseInt(msgObj.value || '0');
          }
        }
      }

      // CPL oficial: extrair do cost_per_action_type se presente pela API Meta; caso contrário spend / leads
      let cpl = 0;
      if (item.cost_per_action_type && Array.isArray(item.cost_per_action_type)) {
        const cplObj = item.cost_per_action_type.find((c: any) => {
          const type = (c.action_type || '').toLowerCase();
          return type === 'lead';
        });
        if (cplObj && cplObj.value) {
          cpl = parseFloat(cplObj.value);
        }
      }
      if (cpl === 0 && leads > 0) {
        cpl = spend / leads;
      }

      const campId = item.campaign_id || item.id;
      const campStatus = activeCampaignsMap[campId] || 'Ativa';

      return {
        id: campId,
        account_name,
        campaign_name: item.campaign_name || 'Campanha sem nome',
        platform: 'Meta Ads',
        status: campStatus,
        spend,
        leads_count: leads,
        cpl,
        impressions,
        reach,
        clicks,
        ctr,
        cpc,
        cpm,
        raw_actions: item.actions || [] // Retornado para inspeção/auditoria de ações
      };
    });

    const nowIso = new Date().toISOString();

    // Atualizar registro de sincronização com sucesso no Supabase
    await supabaseAdmin.from('meta_integrations').update({
      currency,
      timezone_name,
      last_sync_at: nowIso,
      last_sync_status: 'success',
      last_sync_error: null
    }).eq('id', intData.id);

    return new Response(
      JSON.stringify({
        success: true,
        account: {
          ad_account_id: cleanActId,
          ad_account_name: account_name,
          currency,
          timezone_name,
          attribution_windows: attributionWindows
        },
        period: { period, since, until },
        last_sync_at: nowIso,
        campaigns
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erro inesperado no servidor de métricas.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
