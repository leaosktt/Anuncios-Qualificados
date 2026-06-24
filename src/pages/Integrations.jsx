import React from 'react';

const Integrations = () => {
  const handleMetaLogin = () => {
    window.FB.login((response) => {
      if (response.authResponse) {
        alert('Facebook conectado com sucesso!');
      }
    }, { scope: 'pages_show_list,leads_retrieval,pages_read_engagement' });
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px' }}>Integrações</h1>
      <div style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '12px', maxWidth: '420px' }}>
        <h2 style={{ marginBottom: '8px' }}>Meta Ads</h2>
        <p style={{ color: '#666', marginBottom: '16px' }}>
          Conecte sua conta do Facebook para receber leads automaticamente dos seus anúncios.
        </p>
        <button 
          onClick={handleMetaLogin} 
          style={{ 
            padding: '12px 24px', 
            background: '#1877F2', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontSize: '16px',
            width: '100%'
          }}>
          Conectar Facebook
        </button>
      </div>
    </div>
  );
};

export default Integrations; 
