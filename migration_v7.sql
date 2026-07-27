-- Migration v7: Suporte a Meta Graph API v23.0 com User Access Tokens de Longa Duração e Segurança RLS

-- 1. Adicionar novas colunas na tabela meta_integrations
ALTER TABLE public.meta_integrations 
ADD COLUMN IF NOT EXISTS ad_account_id text,
ADD COLUMN IF NOT EXISTS ad_account_name text,
ADD COLUMN IF NOT EXISTS user_access_token text,
ADD COLUMN IF NOT EXISTS token_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS timezone_name text DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_sync_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_sync_error text;

-- 2. Garantir habilitação de RLS
ALTER TABLE public.meta_integrations ENABLE ROW LEVEL SECURITY;

-- 3. Atualizar política RLS para restringir leitura/escrita estritamente ao usuário dono do registro (auth.uid() = user_id)
DROP POLICY IF EXISTS "Permitir acesso total as integracoes da meta" ON public.meta_integrations;
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias integrações" ON public.meta_integrations;

CREATE POLICY "Usuários gerenciam suas próprias integrações" 
ON public.meta_integrations 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. Revogar acesso de leitura da coluna sensível user_access_token para o role anon e authenticated
-- Apenas a service_role (usada dentro das Supabase Edge Functions server-side) poderá ler a coluna user_access_token
REVOKE SELECT (user_access_token) ON public.meta_integrations FROM anon, authenticated;
