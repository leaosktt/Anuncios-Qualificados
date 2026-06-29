-- Adicionar a coluna user_id na tabela leads para compatibilidade com o webhook
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users;

-- Atualizar política (opcional) caso passe a usar o user_id para RLS no futuro.
-- Por enquanto mantemos a política pública que já existe.
