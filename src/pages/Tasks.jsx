import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, CheckCircle2, Circle, Clock, MoreHorizontal, Trash2, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import modalStyles from '../components/common/Modal.module.css';
import styles from './Pages.module.css';

const Tasks = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [leadId, setLeadId] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, progress, completed, overdue, today
  const [sortBy, setSortBy] = useState('date'); // date, priority, name

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('filter') === 'today') {
      setFilterStatus('today');
    }
  }, [location]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase.from('leads').select('id, name, company').order('name');
      if (!error && data) setLeads(data);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task) => {
    try {
      const updatedDone = !task.done;
      const { error } = await supabase.from('tasks').update({ done: updatedDone }).eq('id', task.id);
      if (error) throw error;
      setTasks(tasks.map(t => t.id === task.id ? { ...t, done: updatedDone } : t));
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTitle('');
    setDate('');
    setPriority('medium');
    setLeadId('');
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
        setTasks(prev => prev.filter(t => t.id !== id));
        setOpenMenuId(null);
      } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    try {
      const payload = {
        user_id: user.id,
        title: title.trim(),
        date: date.trim() || null,
        priority,
        done: false,
      };
      if (leadId) payload.lead_id = leadId;

      const { data, error } = await supabase.from('tasks').insert([payload]).select();
      
      if (error) throw error;
      if (data && data.length > 0) setTasks(prev => [data[0], ...prev]);
      closeModal();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  const processedTasks = useMemo(() => {
    let result = [...tasks];
    
    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(lower));
    }

    // Status Filter
    const todayStr = new Date().toISOString().split('T')[0];
    if (filterStatus === 'pending') {
      result = result.filter(t => !t.done);
    } else if (filterStatus === 'completed') {
      result = result.filter(t => t.done);
    } else if (filterStatus === 'overdue') {
      result = result.filter(t => !t.done && t.date && t.date < todayStr);
    } else if (filterStatus === 'today') {
      result = result.filter(t => !t.done && t.date === todayStr);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date') {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      }
      if (sortBy === 'name') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'priority') {
        const pMap = { high: 1, medium: 2, low: 3 };
        return (pMap[a.priority] || 4) - (pMap[b.priority] || 4);
      }
      return 0;
    });

    return result;
  }, [tasks, searchTerm, filterStatus, sortBy]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Minhas Tarefas</h2>
        <button className={styles.buttonPrimary} onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Nova Tarefa
        </button>
      </div>

      {isModalOpen && (
        <Modal title="Nova Tarefa" onClose={closeModal}>
          <form onSubmit={handleSubmit} className={modalStyles.form}>
            <label className={modalStyles.formLabel}>
              Título da tarefa
              <input
                type="text"
                className={modalStyles.formInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Enviar proposta comercial"
                autoFocus
                required
              />
            </label>

            <div className={modalStyles.formRow}>
              <label className={modalStyles.formLabel}>
                Vencimento
                <input
                  type="date"
                  className={modalStyles.formInput}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              <label className={modalStyles.formLabel}>
                Prioridade
                <select
                  className={modalStyles.formInput}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </label>
            </div>

            <label className={modalStyles.formLabel}>
              Lead Relacionado (Opcional)
              <select
                className={modalStyles.formInput}
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
              >
                <option value="">Nenhum lead</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.name} {l.company ? `(${l.company})` : ''}</option>
                ))}
              </select>
            </label>

            <div className={modalStyles.actions}>
              <button type="button" className={`${modalStyles.btn} ${modalStyles.btnOutline}`} onClick={closeModal}>
                Cancelar
              </button>
              <button type="submit" className={`${modalStyles.btn} ${modalStyles.btnPrimary}`}>
                Criar tarefa
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className={styles.card}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', 'pending', 'completed', 'overdue', 'today'].map(status => {
              const labels = { all: 'Todas', pending: 'Pendentes', completed: 'Concluídas', overdue: 'Atrasadas', today: 'Para Hoje' };
              return (
                <button 
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: `1px solid ${filterStatus === status ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    backgroundColor: filterStatus === status ? 'var(--bg-app)' : 'transparent',
                    color: filterStatus === status ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: filterStatus === status ? 600 : 500,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {labels[status]}
                </button>
              );
            })}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
            >
              <option value="date">Vencimento</option>
              <option value="priority">Prioridade</option>
              <option value="name">Nome</option>
            </select>
            
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Buscar tarefas..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando tarefas...</div>
        ) : processedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-app)', borderRadius: '8px' }}>
            Nenhuma tarefa encontrada para os filtros atuais.
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Tarefa</th>
                  <th>Lead Relacionado</th>
                  <th>Vencimento</th>
                  <th>Prioridade</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {processedTasks.map(task => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isOverdue = !task.done && task.date && task.date < todayStr;
                  const linkedLead = leads.find(l => l.id === task.lead_id);
                  
                  return (
                    <tr key={task.id} style={{ opacity: task.done ? 0.6 : 1, borderLeft: isOverdue ? '3px solid var(--status-danger)' : 'none' }}>
                      <td style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleTask(task)}>
                        {task.done ? <CheckCircle2 color="var(--status-success)" /> : <Circle color="var(--text-muted)" />}
                      </td>
                      <td style={{ textDecoration: task.done ? 'line-through' : 'none', fontWeight: 500, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {task.title}
                          {isOverdue && (
                            <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)', fontWeight: 'bold' }}>
                              Atrasada
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {linkedLead ? (
                          <div 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: '0.85rem' }}
                            onClick={() => navigate('/leads')}
                          >
                            <User size={14} /> {linkedLead.name}
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isOverdue ? 'var(--status-danger)' : 'inherit' }}>
                          <Clock size={14} /> {task.date ? new Date(task.date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles[task.priority]}`}>
                          {task.priority.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ position: 'relative' }}>
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        
                        {openMenuId === task.id && (
                          <div style={{ position: 'absolute', top: '100%', right: 0, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', boxShadow: 'var(--shadow-md)', zIndex: 20, padding: '4px', minWidth: '120px' }}>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px', textAlign: 'left' }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--status-danger-bg)'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Trash2 size={14} /> Excluir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
