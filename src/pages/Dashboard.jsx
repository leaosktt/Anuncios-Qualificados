import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Activity, ArrowUpRight, ArrowDownRight, FileDown, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import styles from './Pages.module.css';

const LEAD_COLUMNS = {
  'col-1': 'Novos Leads',
  'col-2': 'Primeiro Contato',
  'col-3': 'Qualificação',
  'col-4': 'Proposta Enviada',
  'col-5': 'Negociação',
  'col-6': 'Fechados',
};

const PRIORITY_LABELS = { high: 'Alta', medium: 'Média', low: 'Baixa' };

const Dashboard = () => {
  const { profile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [leadsRes, tasksRes, clientsRes, projectsRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: true }),
        supabase.from('tasks').select('*').order('created_at', { ascending: true }),
        supabase.from('clients').select('*').order('created_at', { ascending: true }),
        supabase.from('projects').select('*').order('created_at', { ascending: true }),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      setLeads(leadsRes.data || []);
      setTasks(tasksRes.data || []);
      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterByPeriod = (items) => {
    if (selectedPeriod === 'all') return items;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return items.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      const itemDateStr = itemDate.toISOString().split('T')[0];

      const diffTime = Math.abs(now - itemDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      switch (selectedPeriod) {
        case 'today':
          return itemDateStr === todayStr;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          return itemDateStr === yesterday.toISOString().split('T')[0];
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

  const filteredLeads = filterByPeriod(leads);
  const filteredTasks = filterByPeriod(tasks);
  const filteredClients = filterByPeriod(clients);
  const filteredProjects = filterByPeriod(projects);

  const parseValue = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleanStr = String(val).replace(/\./g, '').replace(',', '.');
    const parsed = Number(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Cálculo das métricas reais
  const totalLeads = filteredLeads.length;
  const closedLeads = filteredLeads.filter(l => l.column_id === 'col-6').length;
  const conversionRate = totalLeads === 0 ? 0 : ((closedLeads / totalLeads) * 100).toFixed(1);
  const projectedRevenue = filteredLeads.reduce((acc, lead) => acc + parseValue(lead.estimated_value), 0);

  const formatNumber = (val) => {
    return Number(val).toLocaleString('pt-BR');
  };

  const stats = [
    { title: 'Total de Leads', value: formatNumber(totalLeads), change: '-', isPositive: true, icon: <Users size={24} /> },
    { title: 'Taxa de Conversão', value: `${formatNumber(conversionRate)}%`, change: '-', isPositive: true, icon: <Activity size={24} /> },
    { title: 'Receita Projetada', value: `R$ ${formatNumber(projectedRevenue)}`, change: '-', isPositive: true, icon: <DollarSign size={24} /> },
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

  const formatCurrency = (val) => `R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const PERIOD_LABELS = {
    today: 'Hoje',
    yesterday: 'Ontem',
    '7days': 'Últimos 7 dias',
    '30days': 'Últimos 30 dias',
    '3months': 'Últimos 3 meses',
    all: 'Todo o período',
  };

  const loadImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Logo não encontrado');
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erro ao carregar logo para o relatório:', error);
      return null;
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 14;
      const now = new Date();
      const generatedAt = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

      const logoBase64 = await loadImageAsBase64('/logo.png');
      const textX = logoBase64 ? marginX + 20 : marginX;

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', marginX, 10, 16, 16);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 30, 30);
      doc.text('Anúncios Qualificados', textX, 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text('Relatório de Desempenho', textX, 23);

      doc.setFontSize(9);
      doc.text(`Gerado em: ${generatedAt}`, pageWidth - marginX, 14, { align: 'right' });
      doc.text(`Gerado por: ${profile?.full_name || 'Usuário'}`, pageWidth - marginX, 19, { align: 'right' });
      doc.text(`Período: ${PERIOD_LABELS[selectedPeriod] || 'Todo o período'}`, pageWidth - marginX, 24, { align: 'right' });

      doc.setDrawColor(220, 220, 220);
      doc.line(marginX, 30, pageWidth - marginX, 30);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text('Resumo Executivo', marginX, 38);

      autoTable(doc, {
        startY: 41,
        margin: { left: marginX, right: marginX },
        theme: 'grid',
        head: [['Total de Leads', 'Taxa de Conversão', 'Receita Projetada', 'Clientes', 'Projetos']],
        body: [[
          formatNumber(totalLeads),
          `${formatNumber(conversionRate)}%`,
          formatCurrency(projectedRevenue),
          formatNumber(filteredClients.length),
          formatNumber(filteredProjects.length),
        ]],
        headStyles: { fillColor: [139, 92, 246], textColor: 255, halign: 'center', fontSize: 9 },
        bodyStyles: { halign: 'center', fontStyle: 'bold', textColor: [30, 30, 30], fontSize: 10 },
      });

      let currentY = doc.lastAutoTable.finalY + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Leads', marginX, currentY);

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: marginX, right: marginX },
        head: [['Nome', 'Empresa', 'Status', 'Prioridade', 'Valor']],
        body: filteredLeads.length > 0
          ? filteredLeads.map(lead => [
              lead.name || '-',
              lead.company || '-',
              LEAD_COLUMNS[lead.column_id] || lead.column_id || '-',
              PRIORITY_LABELS[lead.priority] || lead.priority || '-',
              formatCurrency(parseValue(lead.estimated_value)),
            ])
          : [[{ content: 'Nenhum lead encontrado no período selecionado.', colSpan: 5, styles: { halign: 'center', textColor: [150, 150, 150] } }]],
        headStyles: { fillColor: [14, 165, 233], textColor: 255, fontSize: 9 },
        styles: { fontSize: 9 },
      });

      currentY = doc.lastAutoTable.finalY + 10;
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Tarefas', marginX, currentY);

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: marginX, right: marginX },
        head: [['Tarefa', 'Status', 'Vencimento']],
        body: filteredTasks.length > 0
          ? filteredTasks.map(task => [
              task.title || '-',
              task.done ? 'Concluída' : 'Pendente',
              task.date || '-',
            ])
          : [[{ content: 'Nenhuma tarefa encontrada no período selecionado.', colSpan: 3, styles: { halign: 'center', textColor: [150, 150, 150] } }]],
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 9 },
        styles: { fontSize: 9 },
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Anúncios Qualificados', marginX, pageHeight - 10);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - marginX, pageHeight - 10, { align: 'right' });
      }

      const fileDate = now.toISOString().split('T')[0];
      doc.save(`relatorio-anuncios-qualificados-${fileDate}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar relatório PDF:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

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
          <button
            className={styles.buttonPrimary}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={handleGenerateReport}
            disabled={generatingReport}
          >
            {generatingReport ? (
              <>
                <Loader2 size={16} className={styles.spin} /> Gerando...
              </>
            ) : (
              <>
                <FileDown size={16} /> Gerar Relatório
              </>
            )}
          </button>
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
