-- Tabela de Métricas de Campanhas (Meta Ads & Google Ads)
CREATE TABLE IF NOT EXISTS public.campaign_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    integration_id uuid REFERENCES public.meta_integrations(id) ON DELETE SET NULL,
    account_name text NOT NULL DEFAULT 'Conta de Anúncios Principal',
    campaign_name text NOT NULL,
    platform text NOT NULL DEFAULT 'Meta Ads',
    status text NOT NULL DEFAULT 'Ativa',
    spend numeric(12,2) DEFAULT 0.00,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    leads_count integer DEFAULT 0,
    conversions integer DEFAULT 0,
    gross_revenue numeric(12,2) DEFAULT 0.00,
    net_revenue numeric(12,2) DEFAULT 0.00,
    profit numeric(12,2) DEFAULT 0.00,
    roas numeric(8,2) DEFAULT 0.00,
    roi numeric(8,2) DEFAULT 0.00,
    date text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso total as metricas de campanhas" ON public.campaign_metrics FOR ALL USING (true) WITH CHECK (true);
