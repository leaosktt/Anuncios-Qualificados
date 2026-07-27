-- Migration v8: Criptografia da Coluna user_access_token via pgsodium / Supabase Vault

-- 1. Habilitar extensões pgsodium e pgcrypto se não estiverem ativas
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Criar função de criptografia simétrica para tokens sensíveis
CREATE OR REPLACE FUNCTION public.encrypt_meta_token(token_text text)
RETURNS text AS $$
DECLARE
    secret_key text := 'AQ_CRM_SECURE_VAULT_KEY_2026_META_V23';
BEGIN
    IF token_text IS NULL OR length(token_text) = 0 THEN
        RETURN NULL;
    END IF;
    RETURN encode(pgp_sym_encrypt(token_text, secret_key), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar função de descriptografia simétrica (acessível apenas pelo service_role)
CREATE OR REPLACE FUNCTION public.decrypt_meta_token(encrypted_hex text)
RETURNS text AS $$
DECLARE
    secret_key text := 'AQ_CRM_SECURE_VAULT_KEY_2026_META_V23';
BEGIN
    IF encrypted_hex IS NULL OR length(encrypted_hex) = 0 THEN
        RETURN NULL;
    END IF;
    -- Se o token já for texto legível antigo, retornar como está
    IF encrypted_hex NOT SIMILAR TO '[0-9a-fA-F]+' OR length(encrypted_hex) < 64 THEN
        RETURN encrypted_hex;
    END IF;
    RETURN pgp_sym_decrypt(decode(encrypted_hex, 'hex'), secret_key);
EXCEPTION WHEN OTHERS THEN
    RETURN encrypted_hex;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar Trigger para criptografar automaticamente o user_access_token ao ser gravado na tabela
CREATE OR REPLACE FUNCTION public.trg_encrypt_user_access_token()
RETURNS trigger AS $$
BEGIN
    IF NEW.user_access_token IS NOT NULL AND NEW.user_access_token NOT SIMILAR TO '[0-9a-fA-F]+' THEN
        NEW.user_access_token := public.encrypt_meta_token(NEW.user_access_token);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS encrypt_meta_token_trigger ON public.meta_integrations;
CREATE TRIGGER encrypt_meta_token_trigger
BEFORE INSERT OR UPDATE OF user_access_token ON public.meta_integrations
FOR EACH ROW EXECUTE FUNCTION public.trg_encrypt_user_access_token();

-- 5. Revogar permissão de execução das funções de descriptografia para roles públicas
REVOKE EXECUTE ON FUNCTION public.decrypt_meta_token(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_meta_token(text) TO service_role;
