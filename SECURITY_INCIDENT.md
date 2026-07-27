# RELATÓRIO DE INCIDENTE DE SEGURANÇA — VAZAMENTO DE META APP SECRET NO GIT

---

## 📌 Detalhes do Incidente
- **Data da Ocorrência Original**: 24 de Junho de 2026 às 16:57:27 -0300
- **Commit do Git**: `3a6e88a7ee6524248323f6f6d9265ee81e873360`
- **Arquivo Afetado**: `.env`
- **Segredo Exposto**: `VITE_META_APP_SECRET=15a579dc52d48d44ace45cf32b929a16`
- **Causa Raiz**: O arquivo `.env` contendo a chave privada do aplicativo Meta (`VITE_META_APP_SECRET`) foi incluído no versionamento do Git e publicado em repositório público. Como a variável continha o prefixo `VITE_`, o segredo também seria empacotado no bundle client-side acessível publicamente pelo navegador.

---

## 🛡️ Ações de Mitigação Executadas e Exigidas

1. **Remoção Imediata do Código Client-Side**:
   - A variável `VITE_META_APP_SECRET` foi completamente **removida do arquivo `.env`** e de todas as telas do aplicativo React frontend.
   - O arquivo `.env` foi incluído no `.gitignore` para prevenir futuros envios de segredos.

2. **Rotação Obrigatória da Chave no Meta Developer Dashboard**:
   - **Status**: *Ação Exigida pelo Administrador do Projeto*
   - **Instruções de Rotação**:
     1. Acesse o [Meta Developer Dashboard](https://developers.facebook.com/).
     2. Selecione o Aplicativo ID `894171913029097`.
     3. Vá em **Configurações do Painel > Básico** (Settings > Basic).
     4. Ao lado de **Chave Secreta do Aplicativo** (App Secret), clique em **Redefinir / Rotacionar** (Reset).
     5. Copie a nova chave secreta gerada.

3. **Injeção Segura nos Segredos do Supabase Edge Functions**:
   - No painel do Supabase (**Supabase Dashboard > Edge Functions > Secrets**), adicione a chave:
     - **Nome**: `META_APP_SECRET`
     - **Valor**: *(Nova chave secreta copiada do Facebook)*
   - A chave será consumida **exclusivamente no lado do servidor** dentro das Edge Functions em Deno/TypeScript (`meta-exchange-token` e `meta-token-refresh`). Nenhum cliente web terá acesso à chave.
