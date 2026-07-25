import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Eye, 
  MousePointer, 
  Filter, 
  Plus, 
  RefreshCw, 
  Layers, 
  Award, 
  Zap, 
  BarChart2, 
  PieChart as PieIcon,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import styles from './CampaignMetrics.module.css';

// Cores para os gráficos (conforme tema e inspiração da foto)
const COLORS_PAYMENT = ['#3b82f6', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6'];

const CampaignMetrics = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  const [integrations, setIntegrations] = useState([]);
  const [dbCampaigns, setDbCampaigns] = useState([]);
  const [dbLeads, setDbLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Modal para criar/editar métricas de campanha
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    campaign_name: '',
    platform: 'Meta Ads',
    account_name: 'Meta Ads Account',
    status: 'Ativa',
    spend: '',
    impressions: '',
    clicks: '',
    leads_count: '',
    conversions: '',
    gross_revenue: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Buscar integrações de anúncios ativas
      let userIntegrations = [];
      if (user) {
        const { data: intData } = await supabase
          .from('meta_integrations')
          .select('*')
          .eq('user_id', user.id);
        if (intData) userIntegrations = intData;
      }
      setIntegrations(userIntegrations);

      // 2. Buscar leads cadastrados no CRM
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*');
      setDbLeads(leadsData || []);

      // 3. Buscar métricas de campanhas salvas no Supabase
      let userCampaigns = [];
      if (user) {
        const { data: campData } = await supabase
          .from('campaign_metrics')
          .select('*')
          .order('created_at', { ascending: false });
        if (campData && campData.length > 0) {
          userCampaigns = campData;
        }
      }

      // Se não houver campanhas cadastradas no banco, inicializamos com um conjunto rico de demonstração baseado em Meta & Google Ads
      if (userCampaigns.length === 0) {
        const totalRealLeads = leadsData ? leadsData.length : 124;
        userCampaigns = [
          {
            id: 'c1',
            account_name: 'Conta Principal - Meta Ads',
            campaign_name: 'Campanha Conversão - Qualificados VIP',
            platform: 'Meta Ads',
            status: 'Ativa',
            spend: 129240.87,
            impressions: 485000,
            clicks: 34200,
            leads_count: Math.max(totalRealLeads, 3310),
            conversions: 840,
            gross_revenue: 1003717.53,
            net_revenue: 471644.35,
            profit: 342326.82,
            roas: 7.77,
            roi: 3.49,
            date: new Date().toISOString()
          },
          {
            id: 'c2',
            account_name: 'Conta Secundaria - Instagram',
            campaign_name: 'Remarketing Retargeting - Leads Frio',
            platform: 'Meta Ads',
            status: 'Ativa',
            spend: 34500.00,
            impressions: 195000,
            clicks: 14800,
            leads_count: 980,
            conversions: 210,
            gross_revenue: 310500.00,
            net_revenue: 185000.00,
            profit: 150500.00,
            roas: 9.00,
            roi: 4.36,
            date: new Date().toISOString()
          },
          {
            id: 'c3',
            account_name: 'Google Search Ads',
            campaign_name: 'Pesquisa Fundo de Funil - CRM e Automações',
            platform: 'Google Ads',
            status: 'Ativa',
            spend: 21800.50,
            impressions: 92000,
            clicks: 8100,
            leads_count: 540,
            conversions: 145,
            gross_revenue: 217500.00,
            net_revenue: 142000.00,
            profit: 120199.50,
            roas: 9.97,
            roi: 5.51,
            date: new Date().toISOString()
          }
        ];
      }

      setDbCampaigns(userCampaigns);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar dados live da API do Meta ou recalcular com base nos leads
  const handleSyncMetrics = async () => {
    setSyncing(true);
    try {
      // Re-fetch leads and recalculate insights
      const { data: updatedLeads } = await supabase.from('leads').select('*');
      if (updatedLeads) setDbLeads(updatedLeads);

      // Atualizar lista
      await fetchInitialData();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  // Salvar nova métrica de campanha
  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    const spendNum = parseFloat(newCampaign.spend) || 0;
    const grossNum = parseFloat(newCampaign.gross_revenue) || 0;
    const netNum = grossNum * 0.7; // ~70% líquido
    const profitNum = netNum - spendNum;
    const roasNum = spendNum > 0 ? (grossNum / spendNum).toFixed(2) : 0;
    const roiNum = spendNum > 0 ? (profitNum / spendNum).toFixed(2) : 0;

    const payload = {
      user_id: user?.id,
      campaign_name: newCampaign.campaign_name || 'Nova Campanha',
      account_name: newCampaign.account_name || 'Conta de Anúncios',
      platform: newCampaign.platform,
      status: newCampaign.status,
      spend: spendNum,
      impressions: parseInt(newCampaign.impressions) || 0,
      clicks: parseInt(newCampaign.clicks) || 0,
      leads_count: parseInt(newCampaign.leads_count) || 0,
      conversions: parseInt(newCampaign.conversions) || 0,
      gross_revenue: grossNum,
      net_revenue: netNum,
      profit: profitNum,
      roas: parseFloat(roasNum),
      roi: parseFloat(roiNum),
      date: new Date().toISOString()
    };

    try {
      if (user) {
        const { data, error } = await supabase.from('campaign_metrics').insert([payload]).select();
        if (data && data[0]) {
          setDbCampaigns(prev => [data[0], ...prev]);
        }
      } else {
        setDbCampaigns(prev => [{ ...payload, id: 'temp_' + Date.now() }, ...prev]);
      }
      setIsModalOpen(false);
      setNewCampaign({
        campaign_name: '',
        platform: 'Meta Ads',
        account_name: 'Meta Ads Account',
        status: 'Ativa',
        spend: '',
        impressions: '',
        clicks: '',
        leads_count: '',
        conversions: '',
        gross_revenue: ''
      });
    } catch (err) {
      console.error('Erro ao salvar campanha:', err);
    }
  };

  // Filtragem dos dados de acordo com os seletores
  const filteredCampaigns = dbCampaigns.filter(c => {
    if (selectedPlatform !== 'all' && c.platform !== selectedPlatform) return false;
    if (selectedAccount !== 'all' && c.account_name !== selectedAccount) return false;
    if (selectedCampaign !== 'all' && c.campaign_name !== selectedCampaign) return false;
    return true;
  });

  // Totais Agregados
  const totalSpend = filteredCampaigns.reduce((acc, c) => acc + Number(c.spend || 0), 0);
  const totalGrossRevenue = filteredCampaigns.reduce((acc, c) => acc + Number(c.gross_revenue || 0), 0);
  const totalNetRevenue = filteredCampaigns.reduce((acc, c) => acc + Number(c.net_revenue || 0), 0);
  const totalProfit = filteredCampaigns.reduce((acc, c) => acc + Number(c.profit || 0), 0);
  const totalImpressions = filteredCampaigns.reduce((acc, c) => acc + Number(c.impressions || 0), 0);
  const totalClicks = filteredCampaigns.reduce((acc, c) => acc + Number(c.clicks || 0), 0);
  const totalLeads = filteredCampaigns.reduce((acc, c) => acc + Number(c.leads_count || 0), 0);
  const totalConversions = filteredCampaigns.reduce((acc, c) => acc + Number(c.conversions || 0), 0);

  // Derivados calculados
  const calculatedROAS = totalSpend > 0 ? (totalGrossRevenue / totalSpend).toFixed(2) : '0.00';
  const calculatedROI = totalSpend > 0 ? (totalProfit / totalSpend).toFixed(2) : '0.00';
  const profitMarginPercent = totalGrossRevenue > 0 ? ((totalProfit / totalGrossRevenue) * 100).toFixed(1) : '0.0';
  const cpl = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '0.00';
  const cpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0.00';
  const cpm = totalImpressions > 0 ? ((totalSpend / totalImpressions) * 1000).toFixed(2) : '0.00';
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatCompactNum = (val) => {
    return new Intl.NumberFormat('pt-BR').format(val || 0);
  };

  // Funil de Conversão (Visual Funnel conforme a foto de referência)
  const funnelSteps = [
    { label: 'Impressões', value: totalImpressions, rate: '100%', color: 'linear-gradient(90deg, #1d4ed8, #3b82f6)' },
    { label: 'Cliques', value: totalClicks, rate: `${ctr}%`, color: 'linear-gradient(90deg, #2563eb, #60a5fa)' },
    { label: 'Leads / Formulários', value: totalLeads, rate: totalClicks > 0 ? `${((totalLeads / totalClicks) * 100).toFixed(1)}%` : '0%', color: 'linear-gradient(90deg, #0284c7, #38bdf8)' },
    { label: 'Vendas Fechadas', value: totalConversions, rate: totalLeads > 0 ? `${((totalConversions / totalLeads) * 100).toFixed(1)}%` : '0%', color: 'linear-gradient(90deg, #059669, #10b981)' },
  ];

  // Dados para Gráfico Donut de Pagamento / Origem dos Leads
  const paymentData = [
    { name: 'Pix', value: Math.round(totalConversions * 0.48) || 400 },
    { name: 'Cartão de Crédito', value: Math.round(totalConversions * 0.35) || 290 },
    { name: 'Boleto', value: Math.round(totalConversions * 0.12) || 100 },
    { name: 'Outros', value: Math.round(totalConversions * 0.05) || 50 },
  ];

  // Dados de Vendas por Dia da Semana (Seg a Dom)
  const weekDaysData = [
    { name: 'Seg', leads: 42, vendas: 18 },
    { name: 'Ter', leads: 58, vendas: 24 },
    { name: 'Qua', leads: 64, vendas: 29 },
    { name: 'Qui', leads: 72, vendas: 35 },
    { name: 'Sex', leads: 81, vendas: 40 },
    { name: 'Sáb', leads: 49, vendas: 19 },
    { name: 'Dom', leads: 38, vendas: 15 },
  ];

  // Evolução Diária de Investimento vs Leads
  const timelineData = [
    { dia: '01/07', spend: 3200, leads: 85 },
    { dia: '05/07', spend: 4100, leads: 110 },
    { dia: '10/07', spend: 3900, leads: 102 },
    { dia: '15/07', spend: 5200, leads: 145 },
    { dia: '20/07', spend: 4800, leads: 130 },
    { dia: '25/07', spend: 6100, leads: 175 },
  ];

  if (loading) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <RefreshCw className={styles.spin} size={32} color="#3b82f6" />
        <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Carregando métricas das campanhas...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Top Header & Filters Bar */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.12)', borderRadius: '12px', color: '#3b82f6', display: 'flex' }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <h2 className={styles.title}>Métricas de Campanhas</h2>
            <p className={styles.subtitle}>Acompanhe seus anúncios da Meta & Google Ads, gastos, leads e ROI em tempo real.</p>
          </div>
        </div>

        <div className={styles.filterBar}>
          {/* Seletor de Período */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Período</span>
            <select 
              className={styles.selectInput} 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="all">Todo o Período</option>
            </select>
          </div>

          {/* Seletor de Plataforma */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Plataforma</span>
            <select 
              className={styles.selectInput}
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="Meta Ads">Meta Ads (FB/IG)</option>
              <option value="Google Ads">Google Ads</option>
            </select>
          </div>

          <button className={styles.btnSecondary} onClick={handleSyncMetrics} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? styles.spin : ''} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>

          <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Nova Campanha
          </button>
        </div>
      </div>

      {/* Top Financial Hero KPI Cards (Inspired by the photo layout) */}
      <div className={styles.heroGrid}>
        {/* Faturamento Bruto */}
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statTitle}>Faturamento Bruto</span>
            <div className={styles.statIconWrapper}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className={styles.statValue}>{formatBRL(totalGrossRevenue)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Receita total gerada pelas campanhas
          </div>
        </div>

        {/* Gastos com Anúncios */}
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statTitle}>Gastos com Anúncios</span>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className={styles.statValue}>{formatBRL(totalSpend)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Investimento total veiculado
          </div>
        </div>

        {/* Faturamento Líquido / Lucro (In neon green callout like in user's photo) */}
        <div className={`${styles.statCard} ${styles.profitCard}`}>
          <div className={styles.statCardHeader}>
            <span className={styles.statTitle} style={{ color: '#10b981' }}>Lucro Líquido</span>
            <div className={styles.statIconWrapper}>
              <Zap size={20} />
            </div>
          </div>
          <div className={styles.statValue}>{formatBRL(totalProfit)}</div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, marginTop: '8px' }}>
            Margem de Lucro: +{profitMarginPercent}%
          </div>
        </div>

        {/* Faturamento Líquido Geral */}
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statTitle}>Faturamento Líquido</span>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <Award size={20} />
            </div>
          </div>
          <div className={styles.statValue}>{formatBRL(totalNetRevenue)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Após deduções estimadas
          </div>
        </div>
      </div>

      {/* Secondary Performance Pills Bar */}
      <div className={styles.pillsBar}>
        <div className={styles.pillItem}>
          <span className={styles.pillLabel}>ROI</span>
          <span className={`${styles.pillValue} ${styles.greenTag}`}>{calculatedROI}x</span>
        </div>
        <div className={styles.pillItem}>
          <span className={styles.pillLabel}>ROAS</span>
          <span className={`${styles.pillValue} ${styles.greenTag}`}>{calculatedROAS}x</span>
        </div>
        <div className={styles.pillItem}>
          <span className={styles.pillLabel}>CPL (Custo/Lead)</span>
          <span className={`${styles.pillValue} ${styles.blueTag}`}>{formatBRL(cpl)}</span>
        </div>
        <div className={styles.pillItem}>
          <span className={styles.pillLabel}>CPC</span>
          <span className={styles.pillValue}>{formatBRL(cpc)}</span>
        </div>
        <div className={styles.pillItem}>
          <span className={styles.pillLabel}>CPM</span>
          <span className={styles.pillValue}>{formatBRL(cpm)}</span>
        </div>
        <div className={styles.pillItem}>
          <span className={styles.pillLabel}>CTR</span>
          <span className={`${styles.pillValue} ${styles.purpleTag}`}>{ctr}%</span>
        </div>
        <div className={styles.pillItem}>
          <span className={styles.pillLabel}>Total Leads</span>
          <span className={`${styles.pillValue} ${styles.blueTag}`}>{formatCompactNum(totalLeads)}</span>
        </div>
      </div>

      {/* Main Content Layout (Funnel + Donut Charts) */}
      <div className={styles.contentGrid}>
        {/* Funil de Conversão (Meta Ads Style) */}
        <div className={styles.cardSection}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <Layers size={18} color="#3b82f6" />
              Funil de Conversão (Meta Ads & Form)
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Desempenho por Etapas</span>
          </div>

          <div className={styles.funnelContainer}>
            {funnelSteps.map((step, idx) => (
              <div key={idx} className={styles.funnelStep}>
                <span className={styles.funnelLabel}>{step.label}</span>
                <div className={styles.funnelBarTrack}>
                  <div 
                    className={styles.funnelBarFill} 
                    style={{ 
                      width: step.rate === '100%' ? '100%' : `calc(20% + ${Math.min(parseFloat(step.rate) * 4, 75)}%)`,
                      background: step.color
                    }}
                  >
                    {step.rate}
                  </div>
                </div>
                <span className={styles.funnelValue}>{formatCompactNum(step.value)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <h4 className={styles.cardTitle} style={{ fontSize: '0.95rem', marginBottom: '14px' }}>
              Evolução Diária: Investimento vs Leads
            </h4>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="dia" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="spend" name="Investimento (R$)" stroke="#3b82f6" fill="url(#spendGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#10b981" fill="url(#leadGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Visual Charts: Donut Vendas por Pagamento/Origem & Dia da Semana */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Donut Chart (Origem / Pagamento) */}
          <div className={styles.cardSection}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <PieIcon size={18} color="#f59e0b" />
                Vendas por Método / Origem
              </h3>
            </div>

            <div className={styles.donutWrapper}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PAYMENT[index % COLORS_PAYMENT.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>

              <div className={styles.donutCenterBadge}>
                <div className={styles.donutCenterValue}>{formatCompactNum(totalConversions)}</div>
                <div className={styles.donutCenterLabel}>Total Vendas</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
              {paymentData.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS_PAYMENT[idx % COLORS_PAYMENT.length] }} />
                  <span>{item.name}: <strong>{item.value}</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* Vendas por Dia da Semana */}
          <div className={styles.cardSection}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Vendas por Dia da Semana</h3>
            </div>
            <div style={{ width: '100%', height: 160 }}>
              <ResponsiveContainer>
                <BarChart data={weekDaysData}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                  <Bar dataKey="vendas" name="Vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Campaigns Table */}
      <div className={styles.cardSection}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <Filter size={18} color="#10b981" />
            Desempenho Detalhado por Campanha ({filteredCampaigns.length})
          </h3>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.campaignTable}>
            <thead>
              <tr>
                <th>Plataforma / Conta</th>
                <th>Nome da Campanha</th>
                <th>Status</th>
                <th>Investimento</th>
                <th>Impressões</th>
                <th>Cliques (CTR)</th>
                <th>Leads (CPL)</th>
                <th>Conversões</th>
                <th>ROAS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((camp) => {
                  const campCpl = camp.leads_count > 0 ? (camp.spend / camp.leads_count).toFixed(2) : '0.00';
                  const campCtr = camp.impressions > 0 ? ((camp.clicks / camp.impressions) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={camp.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{camp.platform}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{camp.account_name}</div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{camp.campaign_name}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${camp.status === 'Ativa' ? styles.statusActive : styles.statusPaused}`}>
                          <span className={styles.dot} />
                          {camp.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatBRL(camp.spend)}</td>
                      <td>{formatCompactNum(camp.impressions)}</td>
                      <td>
                        <div>{formatCompactNum(camp.clicks)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>{campCtr}% CTR</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#3b82f6' }}>{formatCompactNum(camp.leads_count)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>R$ {campCpl}/lead</div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCompactNum(camp.conversions)}</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>{camp.roas}x</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Nenhuma campanha encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova / Editar Campanha */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Adicionar Métrica de Campanha</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Plataforma</label>
                  <select 
                    className={styles.formInput}
                    value={newCampaign.platform}
                    onChange={(e) => setNewCampaign({ ...newCampaign, platform: e.target.value })}
                  >
                    <option value="Meta Ads">Meta Ads (FB/IG)</option>
                    <option value="Google Ads">Google Ads</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label>Conta de Anúncios</label>
                  <input 
                    type="text" 
                    className={styles.formInput}
                    placeholder="Ex: Conta de Anúncios #1" 
                    value={newCampaign.account_name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, account_name: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label>Nome da Campanha</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  required
                  placeholder="Ex: Campanha Leads WhatsApp - Julho" 
                  value={newCampaign.campaign_name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, campaign_name: e.target.value })}
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Investimento (Gastos R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className={styles.formInput} 
                    placeholder="1500.00"
                    value={newCampaign.spend}
                    onChange={(e) => setNewCampaign({ ...newCampaign, spend: e.target.value })}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Faturamento Bruto (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className={styles.formInput} 
                    placeholder="12000.00"
                    value={newCampaign.gross_revenue}
                    onChange={(e) => setNewCampaign({ ...newCampaign, gross_revenue: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Impressões</label>
                  <input 
                    type="number" 
                    className={styles.formInput} 
                    placeholder="45000"
                    value={newCampaign.impressions}
                    onChange={(e) => setNewCampaign({ ...newCampaign, impressions: e.target.value })}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Cliques</label>
                  <input 
                    type="number" 
                    className={styles.formInput} 
                    placeholder="3200"
                    value={newCampaign.clicks}
                    onChange={(e) => setNewCampaign({ ...newCampaign, clicks: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Leads / Formulários</label>
                  <input 
                    type="number" 
                    className={styles.formInput} 
                    placeholder="180"
                    value={newCampaign.leads_count}
                    onChange={(e) => setNewCampaign({ ...newCampaign, leads_count: e.target.value })}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Conversões / Vendas</label>
                  <input 
                    type="number" 
                    className={styles.formInput} 
                    placeholder="45"
                    value={newCampaign.conversions}
                    onChange={(e) => setNewCampaign({ ...newCampaign, conversions: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className={styles.btnSecondary} 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Salvar Métrica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignMetrics;
