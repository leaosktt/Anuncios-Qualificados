-- 1. Adicionar campo de notas aos leads (se não existir)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes text;

-- 2. Adicionar campos de user_id e lead_id nas tarefas
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS lead_id uuid;

-- 3. Migrar os leads da coluna "Qualificação" (col-3) para "Novos Leads" (col-1)
UPDATE public.leads SET column_id = 'col-1' WHERE column_id = 'col-3';

-- 4. Opcional: Se você usa foreign keys ou restrições de usuário, pode vincular o user_id (ajuste conforme seu setup auth):
-- ALTER TABLE public.tasks ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id);
