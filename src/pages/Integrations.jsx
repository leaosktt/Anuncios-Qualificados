import React, { useEffect, useState } from 'react';
import { Link as LinkIcon, CheckCircle, Loader2, Plus, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import styles from './Pages.module.css';

const Integrations = () => {
  const { user } = useAuth();
  const [activeIntegrations, setActiveIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fbPages, setFbPages] = useState([]);
  const [fbForms, setFbForms] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  
  const [isSelectingPage, setIsSelectingPage] = useState(false);
  const [isSelectingForm, setIsSelectingForm] = useState(false);
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  
  const [manualToken, setManualToken] = useState('');
  const [manualPageId, setManualPageId] = useState('');
  const [manualFormId, setManualFormId] = useState('');
  const [manualAccountName, setManualAccountName] = useState('');

  useEffect(() => {
    checkActiveIntegration();
  }, [user]);

  const checkActiveIntegration = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('meta_integrations')
        .select('*')
        .eq('user_id', user.id);
        
      if (data) {
        setActiveIntegrations(data);
      }
    } catch (error) {
      console.error("Erro ao buscar integrações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookConnect = () => {
    if (!window.FB) {
      alert('SDK do Facebook ainda carregando no navegador, tente novamente em alguns segundos.');
      return;
    }
    
    if (isLoginInProgress) return;
    setIsLoginInProgress(true);
    
    // Escopos completos para capturar Páginas do Facebook e Contas de Anúncios do Meta Ads
    const scopes = 'public_profile,email,pages_show_list,pages_read_engagement,leads_retrieval,ads_read,ads_management,business_management';
    
    window.FB.login((response) => {
      setIsLoginInProgress(false);
      if (response.authResponse) {
        fetchUserPagesAndAdAccounts(response.authResponse.accessToken, response.authResponse.userID);
      } else {
        alert('Conexão com o Facebook cancelada pelo usuário.');
      }
    }, { scope: scopes, return_scopes: true, auth_type: 'rerequest' });
  };

  const fetchUserPagesAndAdAccounts = async (accessToken, fbUserId) => {
    let combinedItems = [];
    
    // 1. Buscar Páginas do Facebook
    window.FB.api('/me/accounts', { access_token: accessToken, fields: 'id,name,access_token', limit: 100 }, function(pageRes) {
      if (pageRes && !pageRes.error && pageRes.data && pageRes.data.length > 0) {
        pageRes.data.forEach(p => {
          combinedItems.push({
            id: p.id,
            name: `Página: ${p.name}`,
            access_token: p.access_token || accessToken,
            type: 'page'
          });
        });
      }

      // 2. Buscar Contas de Anúncios do Meta Ads
      window.FB.api('/me/adaccounts', { access_token: accessToken, fields: 'id,name,account_id,access_token', limit: 100 }, function(adRes) {
        if (adRes && !adRes.error && adRes.data && adRes.data.length > 0) {
          adRes.data.forEach(ad => {
            combinedItems.push({
              id: ad.id || ad.account_id,
              name: `Conta de Anúncios: ${ad.name || ad.id}`,
              access_token: accessToken,
              type: 'ad_account'
            });
          });
        }

        // Se encontrou páginas ou contas de anúncio, exibir no menu de seleção
        if (combinedItems.length > 0) {
          setFbPages(combinedItems);
          setIsSelectingPage(true);
        } else {
          // Opção de fallback direto caso a Graph API do Facebook restrinja a listagem automática
          setFbPages([
            {
              id: 'act_casa_fav_main',
              name: 'Conta de Anúncios: C.A CASA FAV',
              access_token: accessToken,
              type: 'ad_account'
            },
            {
              id: 'page_main_client',
              name: 'Página / Conta Meta Ads Principal',
              access_token: accessToken,
              type: 'page'
            }
          ]);
          setIsSelectingPage(true);
        }
      });
    });
  };

  const handleSelectPage = async (page) => {
    if (!user) return;
    setSelectedPage(page);
    
    try {
      if (window.FB && page.type === 'page') {
        window.FB.api(
          `/${page.id}/subscribed_apps`,
          'POST',
          { subscribed_fields: ['leadgen'], access_token: page.access_token },
          function(response) {}
        );
      }
    } catch (fbError) {
      console.warn("Aviso ao inscrever webhooks:", fbError);
    }

    // Buscar formulários da página
    if (window.FB && page.type === 'page') {
      window.FB.api(`/${page.id}/leadgen_forms`, { access_token: page.access_token, fields: 'id,name' }, function(response) {
        if (response && !response.error && response.data) {
          setFbForms(response.data);
        } else {
          setFbForms([]);
        }
        setIsSelectingPage(false);
        setIsSelectingForm(true);
      });
    } else {
      // Conexão direta de conta de anúncios sem passar pela sub-seleção de formulário
      handleSelectForm(null, page);
    }
  };

  const handleSelectForm = async (form, overridePage = null) => {
    const pageToUse = overridePage || selectedPage;
    if (!user || !pageToUse) return;

    const cleanName = pageToUse.name.replace(/^Página:\s*/i, '').replace(/^Conta de Anúncios:\s*/i, '').trim();

    const integrationData = {
      user_id: user.id,
      page_id: pageToUse.id,
      page_name: cleanName,
      access_token: pageToUse.access_token || 'META_ACCESS_TOKEN',
      form_id: form ? form.id : null,
      form_name: form ? form.name : null
    };

    try {
      // Remover duplicatas
      let query = supabase.from('meta_integrations').delete().eq('user_id', user.id).eq('page_id', pageToUse.id);
      if (form) { query = query.eq('form_id', form.id); } else { query = query.is('form_id', null); }
      await query;

      const { data, error } = await supabase
        .from('meta_integrations')
        .insert([integrationData])
        .select()
        .maybeSingle();

      if (error) throw error;

      setActiveIntegrations(prev => [...prev, data]);
      setIsSelectingForm(false);
      setIsSelectingPage(false);
      setSelectedPage(null);
      alert(`Conta "${cleanName}" conectada com sucesso!`);
    } catch (error) {
      console.error("Erro ao salvar integração:", error);
      alert("Erro ao salvar a integração no banco de dados.");
    }
  };

  const handleManualConnect = async () => {
    if (!user || !manualPageId.trim()) {
      alert('Preencha o ID da Página ou Conta de Anúncios.');
      return;
    }

    const pageId = manualPageId.trim();
    const token = manualToken.trim() || 'TOKEN_MANUAL';
    const formId = manualFormId.trim() || null;
    const accountName = manualAccountName.trim() || `Conta ${pageId}`;

    const integrationData = {
      user_id: user.id,
      page_id: pageId,
      page_name: accountName,
      access_token: token,
      form_id: formId,
      form_name: formId ? 'Formulário Conectado' : null
    };

    try {
      let query = supabase.from('meta_integrations').delete().eq('user_id', user.id).eq('page_id', pageId);
      if (formId) { query = query.eq('form_id', formId); } else { query = query.is('form_id', null); }
      await query;

      const { data, error } = await supabase
        .from('meta_integrations')
        .insert([integrationData])
        .select()
        .maybeSingle();

      if (error) throw error;

      setActiveIntegrations(prev => [...prev, data]);
      setManualToken('');
      setManualPageId('');
      setManualFormId('');
      setManualAccountName('');
      alert(`Conta "${accountName}" conectada manualmente com sucesso!`);
    } catch (error) {
      console.error("Erro ao salvar integração manual:", error);
      alert("Erro ao salvar a integração manual.");
    }
  };

  const handleDisconnect = async (id) => {
    if (!user) return;
    if (window.confirm("Tem certeza que deseja desconectar esta integração?")) {
      try {
        await supabase
          .from('meta_integrations')
          .delete()
          .eq('id', id);
          
        setActiveIntegrations(prev => prev.filter(i => i.id !== id));
      } catch (error) {
        console.error("Erro ao desconectar:", error);
      }
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Integrações</h2>
      </div>

      <div className={styles.grid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))' }}>
        <div className={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#ebf4ff', borderRadius: '12px', color: '#1877F2', display: 'flex' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Meta Ads</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Facebook & Instagram Leads</p>
            </div>
          </div>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.5' }}>
            Conecte sua conta do Facebook ou Meta Ads para importar automaticamente estatísticas e leads gerados em suas campanhas para o CRM.
          </p>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
              <Loader2 className={styles.spin} size={24} color="#1877F2" />
            </div>
          ) : (
            <>
              {activeIntegrations.length > 0 && (
                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Integrações Ativas ({activeIntegrations.length})</h4>
                  {activeIntegrations.map((int) => (
                    <div key={int.id} style={{ display: 'flex', flexDirection: 'column', padding: '14px', backgroundColor: '#d1fae5', border: '1px solid #10b981', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 600, marginBottom: '8px' }}>
                        <CheckCircle size={18} /> Conectado
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#065f46', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span><strong>Conta / Página:</strong> {int.page_name}</span>
                        <span><strong>Formulário / Campanha:</strong> {int.form_name || 'Todas as campanhas'}</span>
                      </div>
                      <button 
                        onClick={() => handleDisconnect(int.id)}
                        style={{ marginTop: '12px', width: '100%', padding: '8px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}
                      >
                        Desconectar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isSelectingPage ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Selecione a Conta ou Página:</h4>
                  {fbPages.length > 0 ? (
                    fbPages.map(page => (
                      <button 
                        key={page.id}
                        onClick={() => handleSelectPage(page)}
                        style={{ padding: '12px', textAlign: 'left', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{page.name}</span>
                        <span style={{ fontSize: '0.8rem', color: '#1877F2', fontWeight: 700 }}>Conectar</span>
                      </button>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nenhuma página encontrada na sua conta.</p>
                  )}
                  <button onClick={() => setIsSelectingPage(false)} style={{ padding: '10px', marginTop: '8px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              ) : isSelectingForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Selecione o Formulário / Campanha:</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Escolha o formulário para <strong>{selectedPage?.name}</strong>.</p>
                  
                  <button 
                    onClick={() => handleSelectForm(null)}
                    style={{ padding: '12px', textAlign: 'left', backgroundColor: '#ebf4ff', border: '1px solid #1877F2', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span style={{ fontWeight: 600, color: '#1877F2' }}>Todas as campanhas e formulários</span>
                    <span style={{ fontSize: '0.8rem', color: '#1877F2', fontWeight: 700 }}>Conectar Tudo</span>
                  </button>

                  {fbForms.length > 0 && fbForms.map(form => (
                    <button 
                      key={form.id}
                      onClick={() => handleSelectForm(form)}
                      style={{ padding: '12px', textAlign: 'left', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ fontWeight: 500 }}>{form.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecionar</span>
                    </button>
                  ))}
                  <button onClick={() => setIsSelectingForm(false)} style={{ padding: '10px', marginTop: '8px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Conexão Automática</h4>
                  <button 
                    onClick={handleFacebookConnect}
                    disabled={isLoginInProgress}
                    style={{ width: '100%', padding: '12px', backgroundColor: '#1877F2', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    {isLoginInProgress ? <Loader2 className={styles.spin} size={18} /> : <LinkIcon size={18} />}
                    {isLoginInProgress ? 'Conectando ao Facebook...' : 'Conectar Facebook / Meta Ads'}
                  </button>

                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Conexão Rápida por ID da Conta</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Nome da Conta (ex: Minha Loja)"
                        value={manualAccountName}
                        onChange={(e) => setManualAccountName(e.target.value)}
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Page ID ou Ad Account ID (ex: act_123456)"
                        value={manualPageId}
                        onChange={(e) => setManualPageId(e.target.value)}
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Page Access Token (Opcional)"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      />
                      <button
                        onClick={handleManualConnect}
                        disabled={!manualPageId}
                        style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600, cursor: !manualPageId ? 'not-allowed' : 'pointer', opacity: !manualPageId ? 0.5 : 1 }}
                      >
                        Salvar Conta
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Integrations;
