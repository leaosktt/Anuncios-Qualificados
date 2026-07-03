import React, { useEffect, useState } from 'react';
import { Link as LinkIcon, CheckCircle, Loader2 } from 'lucide-react';
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
      console.error("Erro ao buscar integracao:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookConnect = () => {
    if (!window.FB) {
      alert('SDK do Facebook ainda carregando, tente novamente em alguns segundos.');
      return;
    }
    
    if (isLoginInProgress) return;
    setIsLoginInProgress(true);
    
    const scopes = 'pages_show_list,pages_read_engagement,leads_retrieval';
    console.log("Solicitando login no Facebook com os seguintes escopos:", scopes);
    
    window.FB.login((response) => {
      setIsLoginInProgress(false);
      console.log("Resposta completa do FB.login:", response);
      if (response.authResponse) {
        fetchUserPages(response.authResponse.accessToken, response.authResponse.userID);
      } else {
        console.log('Usuário cancelou o login ou não autorizou totalmente.');
      }
    }, { scope: scopes, return_scopes: true, auth_type: 'rerequest' });
  };

  const fetchUserPages = async (accessToken, fbUserId) => {
    let finalAccessToken = accessToken;
    
    try {
      const appId = import.meta.env.VITE_META_APP_ID;
      const appSecret = import.meta.env.VITE_META_APP_SECRET;
      
      if (appId && appSecret) {
        const response = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`);
        const data = await response.json();
        
        if (data.access_token) {
          finalAccessToken = data.access_token;
        }
      }
    } catch (err) {
      console.error("Erro na troca de token:", err);
    }

    window.FB.api('/me/accounts', { access_token: finalAccessToken, fields: 'id,name,access_token', limit: 100 }, function(response) {
      if (response && !response.error && response.data && response.data.length > 0) {
        setFbPages(response.data);
        setIsSelectingPage(true);
      } else {
        if (fbUserId) {
          window.FB.api(`/${fbUserId}/accounts`, { access_token: finalAccessToken, fields: 'id,name,access_token', limit: 100 }, function(altResponse) {
            if (altResponse && !altResponse.error && altResponse.data) {
              setFbPages(altResponse.data);
              setIsSelectingPage(true);
            } else {
              alert("Não foi possível carregar as páginas do Facebook.");
            }
          });
        }
      }
    });
  };

  const handleSelectPage = async (page) => {
    if (!user) return;
    setSelectedPage(page);
    
    try {
      await new Promise((resolve, reject) => {
        window.FB.api(
          `/${page.id}/subscribed_apps`,
          'POST',
          { subscribed_fields: ['leadgen'], access_token: page.access_token },
          function(response) {
            if (response && !response.error) resolve(response);
            else reject(response?.error);
          }
        );
      });
    } catch (fbError) {
      console.warn("Aviso: Falha ao assinar webhooks no Facebook.", fbError);
    }

    // Buscar os formulários dessa página
    window.FB.api(`/${page.id}/leadgen_forms`, { access_token: page.access_token, fields: 'id,name' }, function(response) {
      if (response && !response.error && response.data) {
        setFbForms(response.data);
      } else {
        setFbForms([]);
      }
      setIsSelectingPage(false);
      setIsSelectingForm(true);
    });
  };

  const handleSelectForm = async (form) => {
    if (!user || !selectedPage) return;

    const integrationData = {
      user_id: user.id,
      page_id: selectedPage.id,
      page_name: selectedPage.name,
      access_token: selectedPage.access_token,
      form_id: form ? form.id : null,
      form_name: form ? form.name : null
    };

    try {
      // Remover duplicatas exatas para evitar erro
      let query = supabase.from('meta_integrations').delete().eq('user_id', user.id).eq('page_id', selectedPage.id);
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
      setSelectedPage(null);
    } catch (error) {
      console.error("Erro ao salvar integração:", error);
      alert("Erro ao conectar o formulário e salvar no banco.");
    }
  };

  const handleManualConnect = async () => {
    if (!user || !manualToken.trim() || !manualPageId.trim()) return;
    try {
      const pageId = manualPageId.trim();
      const token = manualToken.trim();
      const formId = manualFormId.trim() || null;

      try {
        await fetch(`https://graph.facebook.com/v19.0/${pageId}/subscribed_apps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscribed_fields: ['leadgen'], access_token: token })
        });
      } catch (err) {}

      const integrationData = {
        user_id: user.id,
        page_id: pageId,
        page_name: 'Conexão Manual',
        access_token: token,
        form_id: formId,
        form_name: formId ? 'Formulário Manual' : null
      };

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
    } catch (error) {
      console.error("Erro ao salvar integração manual:", error);
      alert("Erro ao salvar o token manualmente.");
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

      <div className={styles.grid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
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
            Conecte sua conta do Facebook para importar automaticamente leads gerados em suas campanhas do Meta Ads para o CRM.
          </p>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
              <Loader2 className={styles.spin} size={24} color="#1877F2" />
            </div>
          ) : (
            <>
              {activeIntegrations.length > 0 && (
                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Integrações Ativas</h4>
                  {activeIntegrations.map((int) => (
                    <div key={int.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px', backgroundColor: '#d1fae5', border: '1px solid #10b981', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 600, marginBottom: '8px' }}>
                        <CheckCircle size={18} /> Conectado
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#065f46', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span><strong>Página:</strong> {int.page_name}</span>
                        <span><strong>Formulário:</strong> {int.form_name || 'Todos os formulários'}</span>
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
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Selecione a página:</h4>
                  {fbPages.length > 0 ? (
                    fbPages.map(page => (
                      <button 
                        key={page.id}
                        onClick={() => handleSelectPage(page)}
                        style={{ padding: '12px', textAlign: 'left', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <span style={{ fontWeight: 500 }}>{page.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecionar</span>
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
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Selecione o Formulário:</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Escolha qual formulário conectar para a página <strong>{selectedPage?.name}</strong>.</p>
                  
                  <button 
                    onClick={() => handleSelectForm(null)}
                    style={{ padding: '12px', textAlign: 'left', backgroundColor: '#ebf4ff', border: '1px solid #1877F2', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span style={{ fontWeight: 600, color: '#1877F2' }}>Todos os formulários</span>
                    <span style={{ fontSize: '0.8rem', color: '#1877F2' }}>Selecionar</span>
                  </button>

                  {fbForms.length > 0 ? (
                    fbForms.map(form => (
                      <button 
                        key={form.id}
                        onClick={() => handleSelectForm(form)}
                        style={{ padding: '12px', textAlign: 'left', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <span style={{ fontWeight: 500 }}>{form.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecionar</span>
                      </button>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nenhum formulário específico encontrado.</p>
                  )}
                  <button onClick={() => setIsSelectingForm(false)} style={{ padding: '10px', marginTop: '8px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Adicionar Nova Integração</h4>
                  <button 
                    onClick={handleFacebookConnect}
                    style={{ width: '100%', padding: '12px', backgroundColor: '#1877F2', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <LinkIcon size={18} />
                    Conectar Facebook
                  </button>

                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Conexão manual avançada</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Page Access Token"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Page ID"
                        value={manualPageId}
                        onChange={(e) => setManualPageId(e.target.value)}
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Form ID (Opcional - deixe vazio p/ todos)"
                        value={manualFormId}
                        onChange={(e) => setManualFormId(e.target.value)}
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      />
                      <button
                        onClick={handleManualConnect}
                        disabled={!manualToken || !manualPageId}
                        style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600, cursor: (!manualToken || !manualPageId) ? 'not-allowed' : 'pointer', opacity: (!manualToken || !manualPageId) ? 0.5 : 1 }}
                      >
                        Salvar token manualmente
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
