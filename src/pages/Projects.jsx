import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import modalStyles from '../components/common/Modal.module.css';
import styles from './Pages.module.css';

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Em Andamento');
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setName('');
    setStatus('Em Andamento');
    setProgress(0);
    setDueDate('');
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
      try {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
        setProjects(prev => prev.filter(p => p.id !== id));
        setOpenMenuId(null);
      } catch (error) {
        console.error('Erro ao excluir projeto:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    try {
      const { data, error } = await supabase.from('projects').insert([{
        user_id: user.id,
        name: name.trim(),
        status,
        progress: Number(progress),
        due_date: dueDate.trim() || 'Sem prazo'
      }]).select();
      
      if (error) throw error;
      if (data && data.length > 0) setProjects(prev => [data[0], ...prev]);
      closeModal();
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Concluído': return 'var(--status-success)';
      case 'Atrasado': return 'var(--status-danger)';
      case 'Em Andamento': return 'var(--accent-primary)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Projetos</h2>
        <button className={styles.buttonPrimary} onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Novo Projeto
        </button>
      </div>

      {isModalOpen && (
        <Modal title="Novo Projeto" onClose={closeModal}>
          <form onSubmit={handleSubmit} className={modalStyles.form}>
            <label className={modalStyles.formLabel}>
              Nome do Projeto
              <input type="text" className={modalStyles.formInput} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>

            <div className={modalStyles.formRow}>
              <label className={modalStyles.formLabel}>
                Status
                <select className={modalStyles.formInput} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Atrasado">Atrasado</option>
                  <option value="Planejamento">Planejamento</option>
                </select>
              </label>

              <label className={modalStyles.formLabel}>
                Progresso (%)
                <input type="number" min="0" max="100" className={modalStyles.formInput} value={progress} onChange={(e) => setProgress(e.target.value)} />
              </label>
            </div>

            <label className={modalStyles.formLabel}>
              Prazo de Entrega
              <input type="text" className={modalStyles.formInput} value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="Ex: 15 de Julho" />
            </label>

            <div className={modalStyles.actions}>
              <button type="button" className={`${modalStyles.btn} ${modalStyles.btnOutline}`} onClick={closeModal}>Cancelar</button>
              <button type="submit" className={`${modalStyles.btn} ${modalStyles.btnPrimary}`}>Criar Projeto</button>
            </div>
          </form>
        </Modal>
      )}

      <div className={styles.card}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Buscar projetos..." style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando projetos...</div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-app)', borderRadius: '8px' }}>
            Nenhum projeto encontrado. Comece criando o seu primeiro.
          </div>
        ) : (
          <div className={styles.grid}>
            {projects.map(project => (
              <div key={project.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: '1.5rem', backgroundColor: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', position: 'relative' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{project.name}</h3>
                  <button onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><MoreHorizontal size={18} /></button>
                  
                  {openMenuId === project.id && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', boxShadow: 'var(--shadow-md)', zIndex: 20, padding: '4px', minWidth: '120px' }}>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px', textAlign: 'left' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--status-danger-bg)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  <Calendar size={14} /> {project.due_date}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    <span>Progresso</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${project.progress}%`, backgroundColor: getStatusColor(project.status), borderRadius: '3px' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: getStatusColor(project.status) }}>
                    {project.status}
                  </span>
                  <button style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Detalhes <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
