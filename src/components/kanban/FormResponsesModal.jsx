import React from 'react';
import { X } from 'lucide-react';
import styles from './Kanban.module.css';

const FormResponsesModal = ({ lead, onClose }) => {
  if (!lead || !lead.form_responses) return null;

  let responses = [];
  if (Array.isArray(lead.form_responses)) {
    responses = lead.form_responses.map(r => ({
      q: r.question || r.name,
      a: Array.isArray(r.answer || r.values) ? (r.answer || r.values).join(', ') : (r.answer || r.values || r.value)
    })).filter(r => r.q && r.a);
  } else if (typeof lead.form_responses === 'object') {
    responses = Object.entries(lead.form_responses).map(([q, a]) => ({ q, a: String(a) }));
  }

  responses = responses.filter(r => {
    const qLower = r.q.toLowerCase();
    return !qLower.includes('nome') && 
           !qLower.includes('telefone') && 
           !qLower.includes('celular') && 
           !qLower.includes('e-mail') && 
           !qLower.includes('email');
  });

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Respostas do Formulário</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
          {responses.length > 0 ? (
            responses.map((res, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'var(--bg-app)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{res.q}</span>
                <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>{res.a}</span>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Nenhuma resposta encontrada.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormResponsesModal;
