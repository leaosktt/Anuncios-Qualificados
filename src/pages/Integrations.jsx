import React, { useEffect, useState } from 'react';
import { Link as LinkIcon, CheckCircle, Loader2, Plus, ArrowRight, ShieldCheck, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import styles from './Pages.module.css';

const Integrations = () => {
  const { user } = useAuth();
  const [activeIntegrations, setActiveIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fbPages, setFbPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  
  const [isSelectingPage, setIsSelectingPage] = useState(false);
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const [exchangingToken, setExchangingToken] = useState(false);
  const [noAccountsFound, setNoAccountsFound] = useState(false);

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
    setNoAccountsFound(false);
    
    // Escopos oficiais da Meta API v23.0 (sem ads_management)
    const scopes = 'public_profile,email,pages_show_list,leads_retrieval,ads_read,business_management';
    
    window.FB.login((response) => {
      setIsLoginInProgress(false);
      if (response.authResponse) {
        fetchUserAdAccounts(response.authResponse.accessToken);
      } else {
        alert('Conexão com o Facebook cancelada pelo usuário.');
      }
    }, { scope: scopes, return_scopes: true, auth_type: 'rerequest' });
  };

  const fetchUserAdAccounts = async (shortLivedAccessToken) => {
    let adAccounts = [];
    
    // Consultar as contas de anúncios ativas do usuário na Meta Graph API v23.0
    window.FB.api('/me/adaccounts', { access_token: shortLivedAccessToken, fields: 'id,name,account_id,currency,timezone_name', limit: 100 }, function(res) {
      if (res && !res.error && res.data && res.data.length > 0) {
        res.data.forEach(ad => {
          adAccounts.push({
            id: ad.id || `act_${ad.account_id}`,
            account_id: ad.account_id || ad.id,
            name: ad.name || `Conta ${ad.account_id || ad.id}`,
            currency: ad.currency || 'BRL',
            timezone_name: ad.timezone_name || 'America/Sao_Paulo',
            access_token: shortLivedAccessToken
          });
        });

        setFbPages(adAccounts);
        setIsSelectingPage(true);
      } else {
        // Se a API retornar vazia, exibir estado claro de erro na UI
        setNoAccountsFound(true);
        setIsSelectingPage(false);
      }
    });
  };

  const handleSelectAdAccount = async (adAccount) => {
    if (!user) return;
    setExchangingToken(true);
    
    try {
      // 1. Invocar a Edge Function meta-exchange-token para obter o User Access Token de longa duração (60 dias)
      const { data: exchangeData, error: exchangeErr } = await supabase.functions.invoke('meta-exchange-token', {
        body: {
          short_lived_token: adAccount.access_token,
          ad_account_id: adAccount.id
        }
      });

      if (exchangeErr || !exchangeData || exchangeData.error) {
        const errMsg = exchangeData?.error || exchangeErr?.message || 'Erro ao realizar a troca de token com o servidor do Facebook.';
        alert(`Falha na conexão: ${errMsg}`);
        setExchangingToken(false);
        return;
      }

      const longLivedToken = exchangeData.user_access_token;
      const tokenExpiresAt = exchangeData.token_expires_at;
      const currency = exchangeData.currency || adAccount.currency || 'BRL';
      const timezone_name = exchangeData.timezone_name || adAccount.timezone_name || 'America/Sao_Paulo';

      const cleanName = adAccount.name.replace(/^Conta de Anúncios:\s*/i, '').trim();

      const integrationData = {
        user_id: user.id,
        page_id: adAccount.id,
        page_name: cleanName,
        ad_account_id: adAccount.id,
        ad_account_name: cleanName,
        user_access_token: longLivedToken,
        access_token: longLivedToken,
        token_expires_at: tokenExpiresAt,
        currency,
        timezone_name,
        last_sync_status: 'active',
        last_sync_error: null,
        created_at: new Date().toISOString()
      };

      // Remover duplicatas anteriores do usuário para esta conta
      await supabase.from('meta_integrations').delete().eq('user_id', user.id).eq('ad_account_id', adAccount.id);

      const { data, error } = await supabase
        .from('meta_integrations')
        .insert([integrationData])
        .select()
        .maybeSingle();

      if (error) throw error;

      setActiveIntegrations(prev => [...prev.filter(item => item.ad_account_id !== adAccount.id), data]);
      setIsSelectingPage(false);
      alert(`Conta de Anúncios "${cleanName}" conectada com sucesso! Conexão válida até ${new Date(tokenExpiresAt).toLocaleDateString('pt-BR')}.`);
    } catch (error) {
      console.error("Erro ao salvar integração:", error);
      alert(`Erro ao salvar a integração: ${error.message || 'Falha no banco de dados'}`);
    } finally {
      setExchangingToken(false);
    }
  };

  const handleDisconnect = async (id) => {
    if (!user) return;
    if (window.confirm("Tem certeza que deseja desconectar esta conta do Meta Ads?")) {
      try {
        await supabase
          .from('meta_integrations')
          .delete()
          .eq('id', id);
          
        setActiveIntegrations(prev => prev.filter(item => item.id !== id));
      } catch (error) {
        console.error("Erro ao desconectar:", error);
      }
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Sem data definida';
    return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDaysUntilExpiration = (isoString) => {
    if (!isoString) return 60;
    const exp = new Date(isoString).getTime();
    const now = new Date().getTime();
    return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Integrações Oficiais (Meta Ads API v23.0)</h1>
          <p className={styles.pageSubtitle}>
            Conecte sua Conta de Anúncios do Meta Ads com User Access Token de longa duração de 60 dias.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {/* Card do Meta Ads Manager */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                  f
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Meta Ads & Facebook</h3>
                  <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} /> Server-Side API v23.0
                  </span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
              Importação ao vivo de métricas de investimento, leads de formulário, CTR e CPL direto da Meta Graph API.
            </p>

            {noAccountsFound && (
              <div style={{ padding: '12px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '16px', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} />
                <span>Nenhuma conta de anúncio encontrada — verifique as permissões de escopo no Business Manager.</span>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={handleFacebookConnect}
              disabled={isLoginInProgress || exchangingToken}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #1877F2, #0052cc)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(24, 119, 242, 0.3)'
              }}
            >
              {isLoginInProgress || exchangingToken ? (
                <>
                  <Loader2 className={styles.spin} size={18} />
                  {exchangingToken ? 'Gerando Token de Longa Duração...' : 'Conectando ao Facebook...'}
                </>
              ) : (
                <>
                  <LinkIcon size={18} />
                  Conectar Conta Meta Ads
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal / Seleção de Conta de Anúncios Real */}
      {isSelectingPage && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: 'var(--shadow-card)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Selecione a Conta de Anúncios
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Identificamos as seguintes contas de anúncios no seu perfil Meta. Escolha qual conta vincular ao CRM:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {fbPages.map((adAcc) => (
                <button
                  key={adAcc.id}
                  onClick={() => handleSelectAdAccount(adAcc)}
                  disabled={exchangingToken}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div>{adAcc.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      ID: {adAcc.id} | Moeda: {adAcc.currency} | Fuso: {adAcc.timezone_name}
                    </div>
                  </div>
                  <ArrowRight size={18} color="#3b82f6" />
                </button>
              ))}
            </div>

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                onClick={() => setIsSelectingPage(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Integrações Ativas */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Contas Conectadas ({activeIntegrations.length})
        </h2>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 className={styles.spin} size={24} />
          </div>
        ) : activeIntegrations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeIntegrations.map((item) => {
              const daysLeft = getDaysUntilExpiration(item.token_expires_at);
              const isWarning = daysLeft <= 10;
              return (
                <div key={item.id} style={{
                  background: 'var(--bg-card)',
                  border: isWarning ? '1px solid #ef4444' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '10px' }}>
                      <CheckCircle size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {item.ad_account_name || item.page_name}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '4px' }}>
                        <span>ID Conta: {item.ad_account_id || item.page_id}</span>
                        <span>Moeda: {item.currency || 'BRL'}</span>
                        <span style={{ color: isWarning ? '#ef4444' : 'var(--text-muted)', fontWeight: isWarning ? 700 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} /> Token expira em {formatDate(item.token_expires_at)} ({daysLeft} dias restantes)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isWarning && (
                      <button
                        onClick={handleFacebookConnect}
                        style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Reconectar Agora
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(item.id)}
                      style={{ padding: '8px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      title="Desconectar integração"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '30px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            Nenhuma conta de anúncios do Meta conectada no momento.
          </div>
        )}
      </div>
    </div>
  );
};

export default Integrations;
