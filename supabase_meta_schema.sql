-- Tabela de Integrações da Meta (Facebook/Instagram)
CREATE TABLE public.meta_integrations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    page_id text NOT NULL,
    page_name text NOT NULL,
    access_token text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.meta_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso total as integracoes da meta" ON public.meta_integrations FOR ALL USING (true) WITH CHECK (true);
