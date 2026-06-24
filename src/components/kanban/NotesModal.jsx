import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import styles from './Kanban.module.css';

const NotesModal = ({ lead, onClose, onSave }) => {
  const [notes, setNotes] = useState(lead?.notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(lead.id, notes);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Anotações: {lead?.name}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label className={styles.formLabel}>
            Observações / Anotações
            <textarea
              className={styles.formInput}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Digite aqui as observações, links ou detalhes sobre este lead..."
              rows={8}
              autoFocus
              style={{ resize: 'vertical', minHeight: '150px' }}
            />
          </label>

          <div className={styles.modalActions}>
            <button type="button" className={`${styles.button} ${styles.buttonOutline}`} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`}>
              <Save size={16} /> Salvar anotações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotesModal;
