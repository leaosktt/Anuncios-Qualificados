// Edge Function: exclui a conta do usuário autenticado e todos os seus dados.
//
// Por que isto precisa rodar no servidor (Edge Function) e não no browser:
// `supabase.auth.admin.deleteUser()` exige a service_role key, que tem acesso
// total ao banco e ignora o RLS. Colocar essa chave no código do frontend a
// exporia a qualquer pessoa que abrisse o DevTools — uma falha crítica de
// segurança. Aqui ela fica apenas como variável de ambiente da função.
//
// Deploy: supabase functions deploy delete-account
// Segredo necessário (já presentes por padrão no projeto Supabase):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Cabeçalho de autorização ausente' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente autenticado como o próprio usuário — usado só para confirmar quem ele é
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente com privilégios administrativos — a service_role key nunca chega ao navegador
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const userId = user.id;

    // Apaga os dados do usuário nas tabelas da aplicação
    await adminClient.from('notifications').delete().eq('user_id', userId);
    await adminClient.from('notification_preferences').delete().eq('user_id', userId);
    await adminClient.from('user_preferences').delete().eq('user_id', userId);
    await adminClient.from('profiles').delete().eq('id', userId);
    await adminClient.from('tasks').delete().eq('user_id', userId);
    await adminClient.from('clients').delete().eq('user_id', userId);
    await adminClient.from('leads').delete().eq('user_id', userId);
    await adminClient.from('projects').delete().eq('user_id', userId);

    // Por fim, apaga o usuário do Supabase Auth
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
