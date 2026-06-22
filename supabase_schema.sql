-- Tabela de Leads
CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    company text NOT NULL,
    contact text,
    date text,
    comments integer DEFAULT 0,
    priority text DEFAULT 'medium',
    color text DEFAULT 'linear-gradient(135deg, #f43f5e, #8b5cf6)',
    column_id text DEFAULT 'col-1',
    tags text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Clientes
CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    contact text NOT NULL,
    email text,
    phone text,
    status text DEFAULT 'Ativo',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Tarefas
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    date text,
    priority text DEFAULT 'medium',
    done boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (opcional, mas recomendado)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para fins de desenvolvimento inicial
CREATE POLICY "Permitir acesso total aos leads" ON public.leads FOR ALL USING (true);
CREATE POLICY "Permitir acesso total aos clientes" ON public.clients FOR ALL USING (true);
CREATE POLICY "Permitir acesso total às tarefas" ON public.tasks FOR ALL USING (true);

-- Inserir alguns dados de teste (opcional)
INSERT INTO public.leads (name, company, contact, priority, column_id, tags) 
VALUES 
('E-commerce Platform', 'TechCorp', 'Sara Thompson', 'high', 'col-1', ARRAY['Web', 'B2B']),
('Social Media Dashboard', 'MediaInc', 'Mark Chen', 'medium', 'col-2', ARRAY['SaaS']);
