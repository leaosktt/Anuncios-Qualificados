# Roteiro de Testes Manuais - Estados de Erro (UI)

Siga este passo a passo para forçar os cenários de erro diretamente no seu navegador local e confirmar que a UI responde corretamente, **sem exibir números residuais** quando há falha.

## Pré-requisitos
1. Inicie a aplicação localmente (`npm run dev`) e faça login.
2. Acesse a tela de **Métricas/Dashboard** onde a tabela principal é carregada.
3. Abra a aba **Network** do DevTools do seu navegador (F12) para monitorar as requisições para `meta-insights`.

---

## Cenário 1: Token Inválido ou Expirado (Erro 190)

**Como forçar:**
1. Vá até o Supabase SQL Editor e invalide propositalmente o seu token atual para simular expiração ou revogação pelo Facebook:
   ```sql
   UPDATE public.meta_integrations 
   SET user_access_token = 'EAA_TOKEN_FALSO_E_INVALIDO' 
   WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
   ```
2. Volte para a UI da aplicação e clique no botão de **Atualizar** métricas (ou de um *F5* na página).

**O que observar:**
- A requisição `meta-insights` na aba Network deve falhar com status `400` ou `401` e o payload JSON deve conter `{"error": "...", "code": 190}`.
- Na UI, **não deve aparecer nenhuma tabela com números**.
- O estado de erro deve tomar a tela, informando que a conexão expirou e exibindo um botão claro para **Reconectar conta Meta**.
- Verifique que não há "R$ 0,00" ou "0 leads" vazando por trás da mensagem de erro.

---

## Cenário 2: Falta de permissão `ads_read`

**Como forçar:**
1. Ainda no Supabase SQL Editor, restaure o seu token verdadeiro (se souber qual é, ou reconecte pela UI para gerar um novo).
2. Para simular a falta de permissão, você pode alterar a Edge Function (temporariamente) ou simular a resposta. A maneira mais fácil de simular no cliente é interceptar a requisição usando o DevTools:
   - No Chrome DevTools, vá na aba **Network**, clique com o botão direito na requisição `meta-insights` e escolha **Override content** (Sobrescrever conteúdo).
   - Defina o HTTP Status como `400` e cole o payload:
     `{"error": "Permissão ausente: escopo ads_read não concedido no Facebook", "code": 200}`
3. Recarregue a página.

**O que observar:**
- A UI deve interceptar a resposta de erro e exibir a mensagem de que as permissões necessárias não foram concedidas.
- **Nenhum número de métrica** (nem mesmo zeros) deve ser renderizado.
- A tela deve instruir o usuário a refazer a integração aceitando todas as permissões.

---

## Cenário 3: Conta com gasto ZERO no período (Estado Vazio, NÃO é erro)

**Como forçar:**
1. Garanta que o token no banco de dados está correto e funcional.
2. Na interface da aplicação, selecione um **Período de Data** onde você tem certeza absoluta que as campanhas estavam pausadas e o gasto foi exato `R$ 0,00`.
   *(Por exemplo, use o filtro de "Hoje" se não houve rodagem, ou force no banco um `ad_account_id` de uma conta reserva sua que não roda anúncios).*
3. A API do Meta vai retornar `status 200`, mas com arrays de campanhas sem dados de `spend` ou `actions`, ou simplesmente vazio.

**O que observar:**
- A requisição `meta-insights` na aba Network retornará status `200 OK`.
- Na UI, **a tabela DEVE ser renderizada**.
- Os valores devem aparecer explicitamente como **R$ 0,00**, **0**, etc.
- Este é o único cenário onde "zeros" são esperados. A tela não deve quebrar nem exibir mensagens de erro vermelho, mas sim refletir fielmente o retorno vazio da Meta.

---
**Critério Final de Aceite para a Fase 3:**
Se qualquer erro HTTP (400, 401, 500) ocorrer, o componente React encarregado da renderização deve abortar a exibição da tabela de dados numéricos (Early Return) e injetar exclusivamente a interface de "Fallback/Error State".
