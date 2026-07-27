import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { short_lived_token, ad_account_id } = await req.json();

    if (!short_lived_token) {
      return new Response(
        JSON.stringify({ error: 'Token de acesso não fornecido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appId = '894171913029097';
    const appSecret = Deno.env.get('META_APP_SECRET');

    if (!appSecret) {
      return new Response(
        JSON.stringify({ error: 'META_APP_SECRET não configurado nos segredos do Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Validar token e escopos via debug_token
    const debugUrl = `https://graph.facebook.com/v23.0/debug_token?input_token=${short_lived_token}&access_token=${appId}|${appSecret}`;
    const debugRes = await fetch(debugUrl);
    const debugData = await debugRes.json();

    if (debugData.error || !debugData.data?.is_valid) {
      const errMsg = debugData.error?.message || 'Token do Facebook inválido ou expirado.';
      return new Response(
        JSON.stringify({ error: errMsg, code: debugData.error?.code || 190 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Conferir se o escopo ads_read está presente
    const scopes = debugData.data?.scopes || [];
    if (!scopes.includes('ads_read')) {
      return new Response(
        JSON.stringify({ error: 'Permissão ads_read ausente no token.', code: 200 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Trocar por Long-Lived User Access Token
    const exchangeUrl = `https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${short_lived_token}`;
    const exchangeRes = await fetch(exchangeUrl);
    const exchangeData = await exchangeRes.json();

    if (exchangeData.error) {
      return new Response(
        JSON.stringify({ error: exchangeData.error.message, code: exchangeData.error.code }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const longLivedToken = exchangeData.access_token;
    const expiresInSeconds = exchangeData.expires_in || 5184000; // Valor dinâmico da API Meta
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 3. Buscar moeda e timezone da conta de anúncios vinculada
    let currency = 'BRL';
    let timezone_name = 'America/Sao_Paulo';

    if (ad_account_id) {
      const cleanActId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;
      try {
        const actRes = await fetch(`https://graph.facebook.com/v23.0/${cleanActId}?fields=currency,timezone_name&access_token=${longLivedToken}`);
        const actData = await actRes.json();
        if (actData.currency) currency = actData.currency;
        if (actData.timezone_name) timezone_name = actData.timezone_name;
      } catch (e) {
        console.warn("Aviso ao buscar detalhes da conta de anúncio:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_access_token: longLivedToken,
        expires_in: expiresInSeconds,
        token_expires_at: tokenExpiresAt,
        currency,
        timezone_name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno no servidor de troca de token.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
