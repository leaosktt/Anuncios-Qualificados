import React, { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, MoreHorizontal, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import modalStyles from '../components/common/Modal.module.css';
import styles from './Pages.module.css';

const Clients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Ativo');
  const [editingClientId, setEditingClientId] = useState(null);

  useEffect(() => {
    if (user) fetchClients();
  }, [user]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setName('');
    setContact('');
    setEmail('');
    setPhone('');
    setStatus('Ativo');
    setEditingClientId(null);
  };

  const handleEditClient = (client) => {
    setEditingClientId(client.id);
    setName(client.name);
    setContact(client.contact || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setStatus(client.status || 'Ativo');
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
        setClients(prev => prev.filter(c => c.id !== id));
        setOpenMenuId(null);
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    try {
      const payload = {
        name: name.trim(),
        contact: contact.trim(),
        email: email.trim(),
        phone: phone.trim(),
        status
      };

      if (editingClientId) {
        const { data, error } = await supabase.from('clients').update(payload).eq('id', editingClientId).select();
        if (error) throw error;
        if (data && data.length > 0) setClients(prev => prev.map(c => c.id === editingClientId ? data[0] : c));
      } else {
        payload.user_id = user.id;
        const { data, error } = await supabase.from('clients').insert([payload]).select();
        if (error) throw error;
        if (data && data.length > 0) setClients(prev => [data[0], ...prev]);
      }
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Clientes</h2>
        <button className={styles.buttonPrimary} onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      {isModalOpen && (
        <Modal title={editingClientId ? "Editar Cliente" : "Novo Cliente"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className={modalStyles.form}>
            <label className={modalStyles.formLabel}>
              Nome da Empresa
              <input type="text" className={modalStyles.formInput} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>

            <label className={modalStyles.formLabel}>
              Ponto de Contato
              <input type="text" className={modalStyles.formInput} value={contact} onChange={(e) => setContact(e.target.value)} />
            </label>

            <div className={modalStyles.formRow}>
              <label className={modalStyles.formLabel}>
                E-mail
                <input type="email" className={modalStyles.formInput} value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>

              <label className={modalStyles.formLabel}>
                Telefone
                <input type="text" className={modalStyles.formInput} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </div>

            <label className={modalStyles.formLabel}>
              Status
              <select className={modalStyles.formInput} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Em Risco">Em Risco</option>
              </select>
            </label>

            <div className={modalStyles.actions}>
              <button type="button" className={`${modalStyles.btn} ${modalStyles.btnOutline}`} onClick={closeModal}>Cancelar</button>
              <button type="submit" className={`${modalStyles.btn} ${modalStyles.btnPrimary}`}>{editingClientId ? 'Salvar' : 'Adicionar Cliente'}</button>
            </div>
          </form>
        </Modal>
      )}

      <div className={styles.card}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Buscar clientes..." style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando clientes...</div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-app)', borderRadius: '8px' }}>
            Nenhum cliente encontrado. Adicione seu primeiro cliente.
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Contato</th>
                  <th>Status</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{client.name}</div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{client.contact}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', gap: '8px', marginTop: '4px' }}>
                        {client.email && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Mail size={12}/> {client.email}</span>}
                        {client.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Phone size={12}/> {client.phone}</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${client.status === 'Ativo' ? styles.success : client.status === 'Em Risco' ? styles.danger : styles.warning}`}>
                        {client.status}
                      </span>
                    </td>
                    <td style={{ position: 'relative' }}>
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === client.id ? null : client.id)} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      
                      {openMenuId === client.id && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', boxShadow: 'var(--shadow-md)', zIndex: 20, padding: '4px', minWidth: '120px' }}>
                          <button
                            onClick={() => handleEditClient(client)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px', textAlign: 'left' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <MoreHorizontal size={14} /> Editar
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
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

export default Clients;
