import React, { useEffect, useState } from 'react';
import { Facebook, Link as LinkIcon, CheckCircle } from 'lucide-react';
import styles from './Pages.module.css';

const Integrations = () => {
  const [isFbConnected, setIsFbConnected] = useState(false);

  useEffect(() => {
    // Carregar o SDK do Facebook
    window.fbAsyncInit = function() {
      window.FB.init({
        appId      : import.meta.env.VITE_META_APP_ID,
        cookie     : true,
        xfbml      : true,
        version    : 'v19.0'
      });
    };

    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       js.src = "https://connect.facebook.net/pt_BR/sdk.js";
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));
  }, []);

  const handleFacebookConnect = () => {
    if (window.FB) {
      window.FB.login((response) => {
        if (response.authResponse) {
          console.log('Login efetuado com sucesso!', response.authResponse);
          setIsFbConnected(true);
          // O accessToken estaria em response.authResponse.accessToken
        } else {
          console.log('Usuário cancelou o login ou não autorizou totalmente.');
        }
      }, { scope: 'pages_show_list,leads_retrieval,pages_read_engagement,pages_manage_metadata' });
    } else {
      alert("SDK do Facebook ainda não foi carregado.");
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

          {isFbConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 500, padding: '12px', backgroundColor: '#d1fae5', borderRadius: '8px' }}>
              <CheckCircle size={20} />
              <span>Conta conectada com sucesso</span>
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
