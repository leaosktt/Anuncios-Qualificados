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
  const [estimatedValue, setEstimatedValue] = useState(
    lead?.estimated_value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.estimated_value) : ''
  );

  const handleContactChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);
    if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
    if (val.length > 10) val = `${val.slice(0, 10)}-${val.slice(10)}`;
    setContact(val);
  };

  const handleEstimatedValueChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setEstimatedValue('');
      return;
    }
    const num = parseInt(val, 10) / 100;
    setEstimatedValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num));
  };

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
      estimated_value: estimatedValue ? parseInt(estimatedValue.replace(/\D/g, ''), 10) / 100 || 0 : 0,
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
              onChange={handleContactChange}
              placeholder="(47) 99999-9999"
            />
          </label>

          <label className={styles.formLabel}>
            Valor Estimado
            <input
              type="text"
              className={styles.formInput}
              value={estimatedValue}
              onChange={handleEstimatedValueChange}
              placeholder="R$ 5.000,00"
            />
          </label>

          <div className={styles.formRow}>
            <label className={styles.formLabel}>
              Data
              <input
                type="date"
                className={styles.formInput}
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
