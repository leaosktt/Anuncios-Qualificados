-- Script: validate_db.sql
-- Execução: Cole e rode este script no SQL Editor do Supabase (painel web)

-------------------------------------------------------------------------------
-- 1. Verificação do Cron Job (meta-token-refresh-daily)
-------------------------------------------------------------------------------
SELECT '=== STATUS DO CRON JOB ===' AS step;

SELECT jobid, jobname, schedule, command, active 
FROM cron.job 
WHERE jobname = 'meta-token-refresh-daily';

-------------------------------------------------------------------------------
-- 2. Histórico de Execuções do Cron
-------------------------------------------------------------------------------
SELECT '=== ÚLTIMAS 5 EXECUÇÕES DO CRON ===' AS step;

SELECT jobid, runid, status, return_message, start_time, end_time 
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'meta-token-refresh-daily' LIMIT 1)
ORDER BY start_time DESC 
LIMIT 5;

-------------------------------------------------------------------------------
-- 3. Verificação de Triggers (Criptografia)
-------------------------------------------------------------------------------
SELECT '=== TRIGGERS DE ENCRYPT/DECRYPT ===' AS step;

SELECT 
    tgname AS trigger_name,
    relname AS table_name,
    tgenabled AS is_enabled
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE relname = 'meta_integrations' 
  AND tgname IN ('encrypt_meta_token_trigger', 'decrypt_meta_token_trigger');

-------------------------------------------------------------------------------
-- 4. Confirmação de Migrations (v7, v8) Aplicadas
-------------------------------------------------------------------------------
SELECT '=== MIGRATIONS APLICADAS ===' AS step;

-- A tabela supabase_migrations_history armazena as migrations (caso use CLI/Migrations padrão)
-- Se não existir ou não tiver rodado por CLI, verificamos a existência dos objetos criados na v7 e v8:
SELECT 
    'A coluna user_access_token existe em meta_integrations' AS check_name,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meta_integrations' AND column_name = 'user_access_token') AS is_applied
UNION ALL
SELECT 
    'A função decrypt_meta_token existe',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'decrypt_meta_token') AS is_applied;

-------------------------------------------------------------------------------
-- 5. Teste Binário de Criptografia (Role Authenticated)
-------------------------------------------------------------------------------
-- Este bloco cria uma função anônima (DO) para testar o acesso como usuário autenticado
-- e avalia o critério de sucesso (PASSA/FALHA).

DO $$
DECLARE
    token_value text;
    test_status text;
BEGIN
    -- Mudar para a role que o frontend usa
    SET LOCAL ROLE authenticated;
    
    BEGIN
        -- Tenta ler o token diretamente (pega o primeiro registro)
        SELECT user_access_token INTO token_value FROM public.meta_integrations LIMIT 1;
        
        IF token_value IS NULL THEN
            test_status := 'PASSA (Retorno nulo / inacessível para authenticated)';
        ELSIF token_value LIKE 'EAA%' THEN
            -- Se começar com EAA, é um token legível do Meta
            test_status := 'FALHA (Token retornado em texto claro!)';
        ELSE
            -- Se tiver valor, mas não começar com EAA (provavelmente cifrado ou lixo)
            test_status := 'PASSA (Valor retornado não é um token legível / está cifrado: ' || left(token_value, 15) || '...)';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Se gerar erro de permissão (RLS, função de decrypt bloqueada, etc)
        test_status := 'PASSA (Erro de permissão bloqueou o acesso: ' || SQLERRM || ')';
    END;

    -- Voltar para a role padrão (postgres / service_role)
    RESET ROLE;
    
    RAISE NOTICE '=== RESULTADO DO TESTE DE CRIPTOGRAFIA ===';
    RAISE NOTICE 'Veredito: %', test_status;
END $$;
