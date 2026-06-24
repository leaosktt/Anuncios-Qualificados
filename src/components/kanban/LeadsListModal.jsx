import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import styles from './Kanban.module.css';

const LeadsListModal = ({ leads, columns, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const lower = searchTerm.toLowerCase();
    return leads.filter(
      (l) =>
        (l.name && l.name.toLowerCase().includes(lower)) ||
        (l.company && l.company.toLowerCase().includes(lower))
    );
  }, [leads, searchTerm]);

  const getColumnName = (colId) => {
    const col = columns.find((c) => c.id === colId);
    return col ? col.title : 'Desconhecido';
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return '-';
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modal} 
        style={{ maxWidth: '900px', width: '90%' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Todos os Leads ({filteredLeads.length})</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 'var(--spacing-6)' }}>
          <div className={styles.searchBar}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar por nome ou empresa..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.leadsTable}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Empresa</th>
                  <th>Status/Coluna</th>
                  <th>Prioridade</th>
                  <th>Valor</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td style={{ fontWeight: 500 }}>{lead.name}</td>
                      <td>{lead.company || '-'}</td>
                      <td>
                        <span className={styles.tag} style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          {getColumnName(lead.column_id)}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.tag} ${styles[lead.priority] || ''}`}>
                          {getPriorityLabel(lead.priority)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(lead.estimated_value)}</td>
                      <td>{lead.date || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-6)', color: 'var(--text-muted)' }}>
                      Nenhum lead encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadsListModal;
