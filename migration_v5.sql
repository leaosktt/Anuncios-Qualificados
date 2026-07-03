-- Adicionar colunas para suportar roteamento por formulário
ALTER TABLE public.meta_integrations ADD COLUMN IF NOT EXISTS form_id text;
ALTER TABLE public.meta_integrations ADD COLUMN IF NOT EXISTS form_name text;
