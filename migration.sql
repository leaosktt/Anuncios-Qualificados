-- 1. Limpar dados antigos que não tem user_id
DELETE FROM public.leads;
DELETE FROM public.clients;
DELETE FROM public.tasks;

-- 2. Adicionar user_id e estimated_value às tabelas
ALTER TABLE public.leads 
ADD COLUMN user_id uuid REFERENCES auth.users NOT NULL,
ADD COLUMN estimated_value numeric DEFAULT 0;

ALTER TABLE public.clients 
ADD COLUMN user_id uuid REFERENCES auth.users NOT NULL;

ALTER TABLE public.tasks 
ADD COLUMN user_id uuid REFERENCES auth.users NOT NULL;

-- 3. Remover as políticas antigas
DROP POLICY IF EXISTS "Permitir acesso total aos leads" ON public.leads;
DROP POLICY IF EXISTS "Permitir acesso total aos clientes" ON public.clients;
DROP POLICY IF EXISTS "Permitir acesso total às tarefas" ON public.tasks;

-- 4. Criar as novas políticas estritas baseadas no usuário autenticado (RLS)

-- Para LEADS
CREATE POLICY "Leads do usuário logado" ON public.leads
    FOR ALL
    USING (auth.uid() = user_id);

-- Para CLIENTS
CREATE POLICY "Clientes do usuário logado" ON public.clients
    FOR ALL
    USING (auth.uid() = user_id);

-- Para TASKS
CREATE POLICY "Tarefas do usuário logado" ON public.tasks
    FOR ALL
    USING (auth.uid() = user_id);
