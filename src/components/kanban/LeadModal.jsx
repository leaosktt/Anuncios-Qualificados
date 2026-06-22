import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from './Kanban.module.css';

const LeadModal = ({ columns, defaultColumnId, onClose, onSubmit, lead }) => {
  const [name, setName] = useState(lead?.name || '');
  const [company, setCompany] = useState(lead?.company || '');
  const [contact, setContact] = useState(lead?.contact || '');
  const [date, setDate] = useState(lead?.date || '');
  const [priority, setPriority] = useState(lead?.priority || 'medium');
  const [columnId, setColumnId] = useState(lead?.column_id || defaultColumnId);
  const [tags, setTags] = useState(lead?.tags?.join(', ') || '');
  const [estimatedValue, setEstimatedValue] = useState(lead?.estimated_value || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      company: company.trim(),
      contact: contact.trim(),
      date: date.trim(),
      priority,
      columnId,
      estimated_value: Number(estimatedValue) || 0,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{lead ? 'Editar Lead' : 'Novo Lead'}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label className={styles.formLabel}>
            Nome do lead
            <input
              type="text"
              className={styles.formInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: E-commerce Platform"
              autoFocus
              required
            />
          </label>

          <label className={styles.formLabel}>
            Empresa
            <input
              type="text"
              className={styles.formInput}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex: TechCorp"
            />
          </label>

          <label className={styles.formLabel}>
            Contato
            <input
              type="text"
              className={styles.formInput}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Ex: Sara Thompson"
            />
          </label>

          <label className={styles.formLabel}>
            Valor Estimado (R$)
            <input
              type="number"
              className={styles.formInput}
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="Ex: 5000"
            />
          </label>

          <div className={styles.formRow}>
            <label className={styles.formLabel}>
              Data
              <input
                type="text"
                className={styles.formInput}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="Ex: June 15"
              />
            </label>

            <label className={styles.formLabel}>
              Prioridade
              <select
                className={styles.formInput}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </label>
          </div>

          <label className={styles.formLabel}>
            Etapa
            <select
              className={styles.formInput}
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
            >
              {columns.map((col) => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </select>
          </label>

          <label className={styles.formLabel}>
            Tags (separadas por vírgula)
            <input
              type="text"
              className={styles.formInput}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: Web, B2B"
            />
          </label>

          <div className={styles.modalActions}>
            <button type="button" className={`${styles.button} ${styles.buttonOutline}`} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`}>
              {lead ? 'Salvar alterações' : 'Criar lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
