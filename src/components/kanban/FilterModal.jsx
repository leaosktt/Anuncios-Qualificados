import React, { useState } from 'react';
import { X, Filter } from 'lucide-react';
import styles from './Kanban.module.css';

const FilterModal = ({ columns, currentFilters, onApply, onClose, onClear }) => {
  const [priority, setPriority] = useState(currentFilters.priority || '');
  const [columnId, setColumnId] = useState(currentFilters.columnId || '');
  const [dateRange, setDateRange] = useState(currentFilters.dateRange || '');

  const handleApply = (e) => {
    e.preventDefault();
    onApply({
      priority,
      columnId,
      dateRange
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modal} 
        style={{ maxWidth: '400px' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} /> Filtros do Kanban
          </h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleApply} className={styles.modalForm}>
          
          <div className={styles.filterGroup}>
            <label className={styles.formLabel}>Prioridade</label>
            <select 
              className={styles.formInput} 
              value={priority} 
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">Todas as prioridades</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.formLabel}>Status (Coluna)</label>
            <select 
              className={styles.formInput} 
              value={columnId} 
              onChange={(e) => setColumnId(e.target.value)}
            >
              <option value="">Todos os status</option>
              {columns.map(col => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.formLabel}>Período (Data)</label>
            <select 
              className={styles.formInput} 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="">Qualquer período</option>
              <option value="today">Hoje</option>
              <option value="this_week">Esta semana</option>
              <option value="this_month">Este mês</option>
            </select>
          </div>

          <div className={styles.modalActions} style={{ marginTop: 'var(--spacing-6)' }}>
            <button 
              type="button" 
              className={`${styles.button} ${styles.buttonOutline}`} 
              onClick={onClear}
            >
              Limpar filtros
            </button>
            <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`}>
              Aplicar filtros
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FilterModal;
