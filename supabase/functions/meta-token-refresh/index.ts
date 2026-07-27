import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Variáveis de ambiente do Supabase não encontradas.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const appId = '894171913029097';
    const appSecret = Deno.env.get('META_APP_SECRET');

    if (!appSecret) {
      return new Response(
        JSON.stringify({ error: 'META_APP_SECRET não configurado.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar integrações com expiração nos próximos 15 dias
    const fifteenDaysFromNow = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: integrations, error: fetchErr } = await supabaseAdmin
      .from('meta_integrations')
      .select('*')
      .lte('token_expires_at', fifteenDaysFromNow);

    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const item of (integrations || [])) {
      const currentToken = item.user_access_token || item.access_token;
      if (!currentToken) continue;

      try {
        // 1. Validar via debug_token
        const debugUrl = `https://graph.facebook.com/v23.0/debug_token?input_token=${currentToken}&access_token=${appId}|${appSecret}`;
        const debugRes = await fetch(debugUrl);
        const debugData = await debugRes.json();

        if (debugData.error || !debugData.data?.is_valid) {
          await supabaseAdmin.from('meta_integrations').update({
            last_sync_status: 'token_refresh_failed',
            last_sync_error: debugData.error?.message || 'Token expirado ou revogado no Meta.'
          }).eq('id', item.id);

          results.push({ id: item.id, status: 'failed', reason: 'debug_token_invalid' });
          continue;
        }

        // 2. Re-executar troca de token de longa duração usando o token atual ainda válido
        const exchangeUrl = `https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;
        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData = await exchangeRes.json();

        if (exchangeData.error) {
          await supabaseAdmin.from('meta_integrations').update({
            last_sync_status: 'token_refresh_failed',
            last_sync_error: exchangeData.error.message
          }).eq('id', item.id);

          results.push({ id: item.id, status: 'failed', reason: exchangeData.error.message });
          continue;
        }

        const newToken = exchangeData.access_token;
        const expiresInSeconds = exchangeData.expires_in || 5184000;
        const newTokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

        // 3. Atualizar banco com o novo token de longa duração
        await supabaseAdmin.from('meta_integrations').update({
          user_access_token: newToken,
          token_expires_at: newTokenExpiresAt,
          last_sync_status: 'active',
          last_sync_error: null,
          last_sync_at: new Date().toISOString()
        }).eq('id', item.id);

        results.push({ id: item.id, status: 'renewed', expires_at: newTokenExpiresAt });
      } catch (itemErr: any) {
        await supabaseAdmin.from('meta_integrations').update({
          last_sync_status: 'token_refresh_failed',
          last_sync_error: itemErr.message
        }).eq('id', item.id);

        results.push({ id: item.id, status: 'error', message: itemErr.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, details: results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
