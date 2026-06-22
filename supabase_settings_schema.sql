-- ============================================================
-- Tabelas de suporte às páginas de Configurações (Settings)
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Tabela de Perfis (dados públicos do usuário, vinculados ao auth.users)
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name text,
    role text,
    phone text,
    avatar_url text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê o próprio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuário cria o próprio perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuário atualiza o próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tabela de Preferências de Aparência / Privacidade
CREATE TABLE public.user_preferences (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    theme text DEFAULT 'light',
    accent_color text DEFAULT 'purple',
    font_size text DEFAULT 'medium',
    profile_visibility text DEFAULT 'team',
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê as próprias preferências" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário cria as próprias preferências" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza as próprias preferências" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Tabela de Preferências de Notificação
CREATE TABLE public.notification_preferences (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email_new_lead boolean DEFAULT true,
    email_lead_moved boolean DEFAULT false,
    email_task_due boolean DEFAULT true,
    sys_new_lead boolean DEFAULT true,
    sys_lead_moved boolean DEFAULT true,
    sys_task_due boolean DEFAULT true,
    sys_task_late boolean DEFAULT true,
    sys_new_client boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê as próprias prefs de notificação" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário cria as próprias prefs de notificação" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza as próprias prefs de notificação" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Tabela de Notificações (sino no cabeçalho)
CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    text text NOT NULL,
    type text DEFAULT 'info',
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê as próprias notificações" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza as próprias notificações" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário apaga as próprias notificações" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Dados de teste (opcional) — troque '<SEU_USER_ID>' pelo id do seu usuário em auth.users
-- INSERT INTO public.notifications (user_id, text, type, read) VALUES
-- ('<SEU_USER_ID>', 'Novo Lead criado: E-commerce Platform', 'lead', false),
-- ('<SEU_USER_ID>', 'Tarefa "Enviar proposta comercial" vencendo hoje', 'task', false);

-- ============================================================
-- Storage: bucket de avatares de perfil
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatares são publicamente visíveis"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Usuário envia o próprio avatar"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Usuário atualiza o próprio avatar"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Usuário apaga o próprio avatar"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );
