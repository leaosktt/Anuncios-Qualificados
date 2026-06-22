-- Tabela de Projetos
CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active',
    progress integer DEFAULT 0,
    due_date text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Criar política restrita ao usuário logado
CREATE POLICY "Projetos do usuário logado" ON public.projects
    FOR ALL
    USING (auth.uid() = user_id);
