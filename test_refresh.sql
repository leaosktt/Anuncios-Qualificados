-- Script: test_refresh.sql
-- Execução: Cole e rode este script no SQL Editor do Supabase (painel web)

-------------------------------------------------------------------------------
-- 1. CRIAR REGISTRO DE TESTE ISOLADO
-------------------------------------------------------------------------------
-- Inserimos um registro falso para não tocar nos dados reais dos clientes.
-- A trigger de criptografia vai rodar normalmente sobre o token que inserirmos.
INSERT INTO public.meta_integrations (
    id, 
    user_id, 
    ad_account_id, 
    user_access_token, 
    token_expires_at, 
    last_sync_status
) VALUES (
    '99999999-9999-9999-9999-999999999999', -- ID Falso
    (SELECT id FROM auth.users LIMIT 1),    -- Pega um user_id válido qualquer para cumprir a FK
    'act_123456789_test',                   -- Conta de teste
    'EAA_TOKEN_FALSO_PARA_TESTE',           -- Será cifrado pela trigger de insert
    (now() + interval '10 days'),           -- Simula que vai expirar em 10 dias
    'success'
) ON CONFLICT (id) DO UPDATE SET 
    token_expires_at = (now() + interval '10 days'),
    user_access_token = 'EAA_TOKEN_FALSO_PARA_TESTE';

SELECT 'Registro de teste inserido com sucesso. Verifique a tabela meta_integrations para o id 99999999-9999-9999-9999-999999999999.' AS status;

-------------------------------------------------------------------------------
-- 2. VERIFICAÇÃO ANTES DO REFRESH
-------------------------------------------------------------------------------
-- Confira como o registro está gravado (o token_expires_at será daqui a 10 dias)
SELECT id, ad_account_id, token_expires_at, last_sync_status
FROM public.meta_integrations 
WHERE id = '99999999-9999-9999-9999-999999999999';

-------------------------------------------------------------------------------
-- 3. DISPARAR O REFRESH (Simulação Manual do Cron)
-------------------------------------------------------------------------------
-- Rode esta instrução para forçar a chamada da Edge Function, que vai analisar 
-- todos os tokens que vencem nos próximos 15 dias (nosso teste cai nessa regra).
SELECT net.http_post(
    url:='https://rkmyzfpvgutzsjeeqgrq.supabase.co/functions/v1/meta-token-refresh',
    headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT secret FROM vault.secrets WHERE name = 'SERVICE_ROLE_KEY')
    ),
    body:='{}'::jsonb
);

-- DICA: Aguarde uns 10 a 15 segundos para a Edge Function processar a requisição e a API do Meta responder.

-------------------------------------------------------------------------------
-- 4. VERIFICAÇÃO PÓS-REFRESH
-------------------------------------------------------------------------------
-- Execute este SELECT depois de esperar. 
-- O que observar:
-- a) Se a Meta API aceitou renovar o token falso (o que deve falhar pois EAA_TOKEN_FALSO... é inválido), 
--    last_sync_status pode mudar para 'error' ou 'token_expired', e o token_expires_at SE MANTÉM, preservando o antigo.
-- b) Se você usou um token VÁLIDO no Passo 1, o token_expires_at será atualizado 
--    somando o novo expires_in retornado pelo Meta (geralmente +60 dias a partir de hoje).
SELECT id, ad_account_id, token_expires_at, last_sync_status, last_sync_error
FROM public.meta_integrations 
WHERE id = '99999999-9999-9999-9999-999999999999';

-------------------------------------------------------------------------------
-- 5. LIMPEZA (CLEANUP) DO REGISTRO DE TESTE
-------------------------------------------------------------------------------
-- Rode isto ao final para apagar o registro falso e deixar o banco limpo.
-- DELETE FROM public.meta_integrations WHERE id = '99999999-9999-9999-9999-999999999999';
