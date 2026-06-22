-- ============================================================
-- Triggers que populam a tabela public.notifications
-- automaticamente em eventos reais do CRM, respeitando os
-- toggles salvos em notification_preferences.
--
-- Execute depois de supabase_settings_schema.sql.
--
-- Observação: "Tarefa vencendo hoje" / "Tarefa atrasada" não
-- são implementadas aqui porque tasks.date é um campo de TEXTO
-- livre (ex: "Hoje", "Amanhã", "Sexta-feira"), sem uma data real
-- para comparar — não dá para detectar vencimento de forma
-- confiável a partir desse formato.
-- ============================================================

-- Novo lead criado
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wants boolean;
BEGIN
  SELECT sys_new_lead INTO v_wants FROM public.notification_preferences WHERE user_id = NEW.user_id;
  IF COALESCE(v_wants, true) THEN
    INSERT INTO public.notifications (user_id, text, type)
    VALUES (NEW.user_id, 'Novo lead criado: ' || NEW.name, 'lead');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_lead ON public.leads;
CREATE TRIGGER trg_notify_new_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- Lead movido de coluna
CREATE OR REPLACE FUNCTION public.notify_lead_moved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wants boolean;
  v_column_title text;
BEGIN
  IF NEW.column_id IS DISTINCT FROM OLD.column_id THEN
    SELECT sys_lead_moved INTO v_wants FROM public.notification_preferences WHERE user_id = NEW.user_id;
    IF COALESCE(v_wants, true) THEN
      v_column_title := CASE NEW.column_id
        WHEN 'col-1' THEN 'Novos Leads'
        WHEN 'col-2' THEN 'Primeiro Contato'
        WHEN 'col-3' THEN 'Qualificação'
        WHEN 'col-4' THEN 'Proposta Enviada'
        WHEN 'col-5' THEN 'Negociação'
        WHEN 'col-6' THEN 'Fechados'
        ELSE NEW.column_id
      END;
      INSERT INTO public.notifications (user_id, text, type)
      VALUES (NEW.user_id, 'Lead "' || NEW.name || '" foi movido para ' || v_column_title, 'lead');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_moved ON public.leads;
CREATE TRIGGER trg_notify_lead_moved
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_lead_moved();

-- Novo cliente adicionado
CREATE OR REPLACE FUNCTION public.notify_new_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wants boolean;
BEGIN
  SELECT sys_new_client INTO v_wants FROM public.notification_preferences WHERE user_id = NEW.user_id;
  IF COALESCE(v_wants, true) THEN
    INSERT INTO public.notifications (user_id, text, type)
    VALUES (NEW.user_id, 'Novo cliente adicionado: ' || NEW.name, 'client');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_client ON public.clients;
CREATE TRIGGER trg_notify_new_client
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_client();
