import React, { useEffect, useState } from 'react';
import { Link as LinkIcon, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import styles from './Pages.module.css';

const Integrations = () => {
  const { user } = useAuth();
  const [activeIntegration, setActiveIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fbPages, setFbPages] = useState([]);
  const [isSelectingPage, setIsSelectingPage] = useState(false);

  useEffect(() => {
    checkActiveIntegration();
  }, [user]);

  const checkActiveIntegration = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (data) {
        setActiveIntegration(data);
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
    
    const scopes = 'pages_show_list,pages_read_engagement,leads_retrieval';
    console.log("Solicitando login no Facebook com os seguintes escopos:", scopes);
    
    window.FB.login((response) => {
      console.log("Resposta completa do FB.login:", response);
      if (response.authResponse) {
        console.log("Token de Acesso (User Token) Retornado pelo Login do Facebook:", response.authResponse.accessToken);
        console.log("Escopos garantidos pelo usuário (grantedScopes):", response.authResponse.grantedScopes);
        fetchUserPages(response.authResponse.accessToken);
      } else {
        console.log('Usuário cancelou o login ou não autorizou totalmente.');
      }
    }, { scope: scopes, return_scopes: true });
  };

  const fetchUserPages = (accessToken) => {
    window.FB.api('/me/accounts', { fields: 'id,name,access_token' }, function(response) {
      console.log(`Resposta da chamada https://graph.facebook.com/me/accounts?fields=id,name,access_token&access_token=${accessToken}:`, response);
      if (response && !response.error && response.data) {
        setFbPages(response.data);
        setIsSelectingPage(true);
      } else {
        console.error("Erro ao buscar páginas:", response.error);
        alert("Não foi possível carregar as páginas do Facebook.");
      }
    });
  };

  const handleSelectPage = async (page) => {
    if (!user) return;
    try {
      const integrationData = {
        user_id: user.id,
        page_id: page.id,
        page_name: page.name,
        access_token: page.access_token
      };

      const { data, error } = await supabase
        .from('meta_connections')
        .insert([integrationData])
        .select()
        .single();

      if (error) throw error;

      setActiveIntegration(data);
      setIsSelectingPage(false);
    } catch (error) {
      console.error("Erro ao salvar integração:", error);
      alert("Erro ao conectar a página. Verifique o console.");
    }
  };

  const handleDisconnect = async () => {
    if (!activeIntegration || !user) return;
    if (window.confirm("Tem certeza que deseja desconectar a integração com o Meta Ads?")) {
      try {
        await supabase
          .from('meta_connections')
          .delete()
          .eq('id', activeIntegration.id);
        setActiveIntegration(null);
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
          ) : activeIntegration ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 500, padding: '12px', backgroundColor: '#d1fae5', borderRadius: '8px', marginBottom: '12px' }}>
                <CheckCircle size={20} />
                <span>Conectado ✓</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px', padding: '0 4px' }}>
                <strong>Página:</strong> {activeIntegration.page_name}
              </div>
              <button 
                onClick={handleDisconnect}
                style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Desconectar
              </button>
            </div>
          ) : isSelectingPage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Selecione a página:</h4>
              {fbPages.length > 0 ? (
                fbPages.map(page => (
                  <button 
                    key={page.id}
                    onClick={() => handleSelectPage(page)}
                    style={{ padding: '12px', textAlign: 'left', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#1877F2'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <span style={{ fontWeight: 500 }}>{page.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecionar</span>
                  </button>
                ))
              ) : (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nenhuma página encontrada na sua conta.</p>
              )}
              <button 
                onClick={() => setIsSelectingPage(false)}
                style={{ width: '100%', padding: '10px', marginTop: '8px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button 
              onClick={handleFacebookConnect}
              style={{ width: '100%', padding: '12px', backgroundColor: '#1877F2', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#166fe5'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1877F2'}
            >
              <LinkIcon size={18} />
              Conectar Facebook
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Integrations;
