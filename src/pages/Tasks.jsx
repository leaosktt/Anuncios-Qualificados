import React, { useState, useEffect } from 'react';
import { Plus, Search, CheckCircle2, Circle, Clock, MoreHorizontal, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import modalStyles from '../components/common/Modal.module.css';
import styles from './Pages.module.css';

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

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
      const { data, error } = await supabase.from('tasks').insert([{
        user_id: user.id,
        title: title.trim(),
        date: date.trim() || 'Sem data',
        priority,
        done: false
      }]).select();
      
      if (error) throw error;
      if (data && data.length > 0) setTasks(prev => [data[0], ...prev]);
      closeModal();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

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
                  type="text"
                  className={modalStyles.formInput}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Ex: Amanhã"
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
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar tarefas..." 
              style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando tarefas...</div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-app)', borderRadius: '8px' }}>
            Nenhuma tarefa encontrada. Clique em "Nova Tarefa" para começar.
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Tarefa</th>
                  <th>Vencimento</th>
                  <th>Prioridade</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} style={{ opacity: task.done ? 0.6 : 1 }}>
                    <td style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleTask(task)}>
                      {task.done ? <CheckCircle2 color="var(--status-success)" /> : <Circle color="var(--text-muted)" />}
                    </td>
                    <td style={{ textDecoration: task.done ? 'line-through' : 'none', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {task.title}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} /> {task.date}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
