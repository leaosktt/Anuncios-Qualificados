import React, { useState, useEffect } from 'react';
import { Filter, Plus } from 'lucide-react';
import Board from '../components/kanban/Board';
import LeadModal from '../components/kanban/LeadModal';
import NotesModal from '../components/kanban/NotesModal';
import LeadsListModal from '../components/kanban/LeadsListModal';
import FilterModal from '../components/kanban/FilterModal';
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
  const [editingLead, setEditingLead] = useState(null);
  const [notesLead, setNotesLead] = useState(null);
  
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({ priority: '', columnId: '', dateRange: '' });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const filteredLeads = leads.filter((lead) => {
    if (filters.priority && lead.priority !== filters.priority) return false;
    if (filters.columnId && lead.column_id !== filters.columnId) return false;
    
    if (filters.dateRange) {
      if (!lead.date) return false;
      
      const leadDate = new Date(lead.date);
      const today = new Date();
      
      if (filters.dateRange === 'today') {
        if (leadDate.toDateString() !== today.toDateString()) return false;
      } else if (filters.dateRange === 'this_week') {
        const daysDiff = (today - leadDate) / (1000 * 60 * 60 * 24);
        if (Math.abs(daysDiff) > 7) return false;
      } else if (filters.dateRange === 'this_month') {
        if (leadDate.getMonth() !== today.getMonth() || leadDate.getFullYear() !== today.getFullYear()) return false;
      }
    }
    
    return true;
  });

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
    setEditingLead(null);
    setIsModalOpen(true);
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  const handleSaveLead = async (leadData) => {
    if (!user) return;
    
    const leadPayload = {
      name: leadData.name,
      company: leadData.company,
      contact: leadData.contact,
      date: leadData.date,
      estimated_value: leadData.estimated_value || 0,
      priority: leadData.priority,
      column_id: leadData.columnId,
      tags: leadData.tags,
    };

    try {
      if (editingLead) {
        // Update existing
        const { data, error } = await supabase
          .from('leads')
          .update(leadPayload)
          .eq('id', editingLead.id)
          .select();
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setLeads((prev) => prev.map((l) => l.id === editingLead.id ? data[0] : l));
        }
      } else {
        // Insert new
        const newColor = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];
        const leadToInsert = {
          ...leadPayload,
          user_id: user.id,
          color: newColor,
        };
        const { data, error } = await supabase.from('leads').insert([leadToInsert]).select();
        if (error) throw error;
        
        if (data && data.length > 0) {
          setLeads((prev) => [data[0], ...prev]);
        }
      }
      setIsModalOpen(false);
      setEditingLead(null);
    } catch (error) {
      console.error("Erro ao salvar lead:", error);
      alert("Erro ao salvar lead. Verifique o console.");
    }
  };

  const handleUpdateField = async (leadId, fieldName, value) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ [fieldName]: value })
        .eq('id', leadId)
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setLeads((prev) => prev.map((l) => l.id === leadId ? data[0] : l));
      }
    } catch (error) {
      console.error(`Erro ao atualizar ${fieldName}:`, error);
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
          <button className={`${styles.button} ${styles.buttonOutline}`} onClick={() => setIsListModalOpen(true)}>
            Todos os leads
          </button>
          <button className={`${styles.button} ${styles.buttonOutline}`} onClick={() => setIsFilterModalOpen(true)}>
            <Filter size={16} /> Filtros
            {activeFilterCount > 0 && <span className={styles.badge}>{activeFilterCount}</span>}
          </button>
          <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => openModal()}>
            <Plus size={16} /> Novo lead
          </button>
        </div>
      </div>

      <Board 
        columns={columnsConfig} 
        leads={filteredLeads} 
        setLeads={setLeads} 
        loading={loading} 
        onEditLead={handleEditLead}
        onUpdateDate={(id, date) => handleUpdateField(id, 'date', date)}
        onEditNotes={(lead) => setNotesLead(lead)}
        fetchLeads={fetchLeads}
      />

      {isModalOpen && (
        <LeadModal
          columns={columnsConfig}
          defaultColumnId={targetColumnId}
          onClose={() => { setIsModalOpen(false); setEditingLead(null); }}
          onSubmit={handleSaveLead}
          lead={editingLead}
        />
      )}

      {notesLead && (
        <NotesModal
          lead={notesLead}
          onClose={() => setNotesLead(null)}
          onSave={(id, text) => {
            handleUpdateField(id, 'notes', text);
            setNotesLead(null);
          }}
        />
      )}

      {isListModalOpen && (
        <LeadsListModal
          leads={leads}
          columns={columnsConfig}
          onClose={() => setIsListModalOpen(false)}
        />
      )}

      {isFilterModalOpen && (
        <FilterModal
          columns={columnsConfig}
          currentFilters={filters}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setIsFilterModalOpen(false);
          }}
          onClear={() => {
            setFilters({ priority: '', columnId: '', dateRange: '' });
            setIsFilterModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Leads;
