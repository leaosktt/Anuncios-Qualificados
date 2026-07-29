-- Scheduler Configuration SQL para Supabase (pg_cron + net.http_post)

-- 1. Habilitar as extensões pg_cron e pg_net no Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remover agendamentos pré-existentes se houver
SELECT cron.unschedule('meta-token-refresh-daily') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'meta-token-refresh-daily'
);

-- 3. Agendar o job diário para rodar às 03:00 UTC chamando a Edge Function meta-token-refresh
SELECT cron.schedule(
    'meta-token-refresh-daily',
    '0 3 * * *',
    $$
    SELECT net.http_post(
        url:='https://rkmyzfpvgutzsjeeqgrq.supabase.co/functions/v1/meta-token-refresh',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT secret FROM vault.secrets WHERE name = 'SERVICE_ROLE_KEY')
        ),
        body:='{}'::jsonb
    );
    $$
);

-- 4. Comando para testar e forçar a execução manual imediata do Cron:
-- SELECT net.http_post(
--     url:='https://rkmyzfpvgutzsjeeqgrq.supabase.co/functions/v1/meta-token-refresh',
--     headers:=jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || (SELECT secret FROM vault.secrets WHERE name = 'SERVICE_ROLE_KEY')
--     ),
--     body:='{}'::jsonb
-- );

-- 5. Consulta para verificar se o Cron foi registrado com sucesso:
SELECT jobid, jobname, schedule, command, active FROM cron.job WHERE jobname = 'meta-token-refresh-daily';
