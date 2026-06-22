import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import styles from './Pages.module.css';

const Dashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Erro ao buscar leads do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLeads = () => {
    if (selectedPeriod === 'all') return leads;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    return leads.filter(lead => {
      if (!lead.created_at) return false;
      const leadDate = new Date(lead.created_at);
      const leadDateStr = leadDate.toISOString().split('T')[0];
      
      const diffTime = Math.abs(now - leadDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      switch (selectedPeriod) {
        case 'today':
          return leadDateStr === todayStr;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          return leadDateStr === yesterday.toISOString().split('T')[0];
        case '7days':
          return diffDays <= 7;
        case '30days':
          return diffDays <= 30;
        case '3months':
          return diffDays <= 90;
        default:
          return true;
      }
    });
  };

  const filteredLeads = getFilteredLeads();

  // Cálculo das métricas reais
  const totalLeads = filteredLeads.length;
  const closedLeads = filteredLeads.filter(l => l.column_id === 'col-6').length;
  const conversionRate = totalLeads === 0 ? 0 : ((closedLeads / totalLeads) * 100).toFixed(1);
  const projectedRevenue = filteredLeads.reduce((acc, lead) => acc + (Number(lead.estimated_value) || 0), 0);

  const formatCurrency = (val) => {
    return `R$ ${Number(val).toLocaleString('pt-BR')}`;
  };

  const stats = [
    { title: 'Total de Leads', value: totalLeads.toString(), change: '-', isPositive: true, icon: <Users size={24} /> },
    { title: 'Taxa de Conversão', value: `${conversionRate}%`, change: '-', isPositive: true, icon: <Activity size={24} /> },
    { title: 'Receita Projetada', value: formatCurrency(projectedRevenue), change: '-', isPositive: true, icon: <DollarSign size={24} /> },
  ];

  // Cálculo dos dados reais pro Gráfico
  const calculateChartData = () => {
    if (filteredLeads.length === 0) return [];
    
    const grouped = {};
    filteredLeads.forEach(lead => {
      if (!lead.created_at) return;
      const d = new Date(lead.created_at);
      let key = '';
      let sortKey = 0;
      
      if (selectedPeriod === 'today' || selectedPeriod === 'yesterday') {
        key = `${String(d.getHours()).padStart(2, '0')}:00`;
        sortKey = d.getTime();
      } else if (selectedPeriod === '7days' || selectedPeriod === '30days') {
        key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        sortKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      } else {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        key = `${months[d.getMonth()]} ${d.getFullYear()}`;
        sortKey = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      }
        
      if (!grouped[key]) {
        grouped[key] = { name: key, sortKey, leads: 0, conversoes: 0 };
      }
      grouped[key].leads += 1;
      if (lead.column_id === 'col-6') grouped[key].conversoes += 1;
    });

    const result = Object.values(grouped).sort((a, b) => a.sortKey - b.sortKey);
    
    if (result.length === 1) {
      result.unshift({
        name: 'Anterior',
        sortKey: result[0].sortKey - 1,
        leads: 0,
        conversoes: 0
      });
    }
    
    return result;
  };

  const chartData = calculateChartData();

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Carregando dados reais do Dashboard...</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Visão Geral</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            className={styles.selectInput}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="7days">Últimos 7 dias</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="3months">Últimos 3 meses</option>
            <option value="all">Todo o período</option>
          </select>
          <button className={styles.buttonPrimary}>Gerar Relatório</button>
        </div>
      </div>

      <div className={styles.grid}>
        {stats.map((stat, i) => (
          <div key={i} className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>{stat.title}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-app)', borderRadius: '12px', color: '#8b5cf6' }}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle} style={{ marginBottom: '1.5rem' }}>Evolução de Resultados</h3>
        <div style={{ width: '100%', height: 320 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConversoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  name="Novos Leads" 
                  stroke="#0ea5e9" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorLeads)"
                  dot={{ r: 5, fill: "#ffffff", stroke: "#0ea5e9", strokeWidth: 2, filter: "url(#glow)" }}
                  activeDot={{ r: 7, fill: "#ffffff", stroke: "#0ea5e9", strokeWidth: 3 }}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
                <Area 
                  type="monotone" 
                  dataKey="conversoes" 
                  name="Conversões" 
                  stroke="#6366f1" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorConversoes)"
                  dot={{ r: 5, fill: "#ffffff", stroke: "#6366f1", strokeWidth: 2, filter: "url(#glow)" }}
                  activeDot={{ r: 7, fill: "#ffffff", stroke: "#6366f1", strokeWidth: 3 }}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Nenhum dado encontrado para o período selecionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
