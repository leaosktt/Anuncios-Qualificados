import React, { useEffect, useState } from 'react';
import { Facebook, Link as LinkIcon, CheckCircle, Loader2 } from 'lucide-react';
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
    
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: '894171913029097',
        cookie: true,
        xfbml: true,
        version: 'v25.0'
      });
    };

    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/pt_BR/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, [user]);

  const checkActiveIntegration = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('meta_integrations')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
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
    console.log("Checando window.FB no clique: ", window.FB);
    if (window.FB) {
      window.FB.login((response) => {
        if (response.authResponse) {
          fetchUserPages();
        } else {
          console.log('Usuário cancelou o login ou não autorizou totalmente.');
        }
      }, { scope: 'pages_show_list,leads_retrieval,pages_read_engagement' });
    } else {
      alert("SDK do Facebook ainda não foi carregado.");
    }
  };

  const fetchUserPages = () => {
    window.FB.api('/me/accounts', function(response) {
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
        .from('meta_integrations')
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
          .from('meta_integrations')
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
            <div style={{ padding: '12px', backgroundColor: '#ebf4ff', borderRadius: '12px', color: '#1877F2' }}>
              <Facebook size={32} />
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
