import React, { useState, useEffect } from 'react';
import { Filter, Plus } from 'lucide-react';
import Board from '../components/kanban/Board';
import LeadModal from '../components/kanban/LeadModal';
import styles from '../components/kanban/Kanban.module.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const columnsConfig = [
  { id: 'col-1', title: 'Novos Leads' },
  { id: 'col-2', title: 'Primeiro Contato' },
  { id: 'col-3', title: 'Qualificação' },
  { id: 'col-4', title: 'Proposta Enviada' },
  { id: 'col-5', title: 'Negociação' },
  { id: 'col-6', title: 'Fechados' }
];

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #f43f5e, #8b5cf6)',
  'linear-gradient(135deg, #8b5cf6, #3b82f6)',
  'linear-gradient(135deg, #f43f5e, #f59e0b)',
  'linear-gradient(135deg, #f59e0b, #10b981)',
  'linear-gradient(135deg, #3b82f6, #10b981)',
];

const Leads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState(columnsConfig[0].id);

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (columnId = columnsConfig[0].id) => {
    setTargetColumnId(columnId);
    setIsModalOpen(true);
  };

  const handleAddLead = async (leadData) => {
    if (!user) return;
    
    const newColor = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];
    const leadToInsert = {
      user_id: user.id,
      name: leadData.name,
      company: leadData.company,
      contact: leadData.contact,
      date: leadData.date,
      estimated_value: leadData.estimated_value || 0,
      priority: leadData.priority,
      column_id: leadData.columnId,
      tags: leadData.tags,
      color: newColor,
    };

    try {
      const { data, error } = await supabase.from('leads').insert([leadToInsert]).select();
      if (error) throw error;
      
      if (data && data.length > 0) {
        setLeads((prev) => [data[0], ...prev]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao inserir lead:", error);
      alert("Erro ao adicionar lead. Verifique o console.");
    }
  };

  const closedCount = leads.filter((lead) => lead.column_id === 'col-6').length;

  return (
    <div className={styles.boardContainer}>
      <div className={styles.boardHeader}>
        <div className={styles.boardStats}>
          Total: {leads.length} Leads • Closed: {closedCount} Deals
        </div>

        <div className={styles.boardControls}>
          <button className={`${styles.button} ${styles.buttonOutline}`}>
            Todos os leads
          </button>
          <button className={`${styles.button} ${styles.buttonOutline}`}>
            <Filter size={16} /> Filtros
          </button>
          <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => openModal()}>
            <Plus size={16} /> Novo lead
          </button>
        </div>
      </div>

      <Board columns={columnsConfig} leads={leads} setLeads={setLeads} loading={loading} />

      {isModalOpen && (
        <LeadModal
          columns={columnsConfig}
          defaultColumnId={targetColumnId}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddLead}
        />
      )}
    </div>
  );
};

export default Leads;
