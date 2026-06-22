import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Mail, Calendar, MessageSquare, CheckCircle2, MoreHorizontal, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import styles from './Kanban.module.css';

const LeadCard = ({ lead, isOverlay, onDelete, onMove, showMovePrev, showMoveNext }) => {
  const [showMenu, setShowMenu] = useState(false);
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: 'Lead',
      lead,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const getPriorityClass = (priority) => {
    switch(priority) {
      case 'high': return styles.high;
      case 'medium': return styles.medium;
      case 'low': return styles.low;
      default: return '';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${styles.card} ${isDragging ? styles.isDragging : ''} ${isOverlay ? styles.isOverlay : ''}`}
    >
      <div className={styles.cardHeader}>
        <h4 className={styles.cardTitle}>{lead.name}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <Mail size={16} className={styles.cardIcon} />
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <MoreHorizontal size={16} />
          </button>
          
          {showMenu && (
            <div 
              style={{ position: 'absolute', top: '100%', right: 0, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', boxShadow: 'var(--shadow-md)', zIndex: 20, padding: '4px', minWidth: '120px' }}
            >
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  if (onDelete) onDelete(lead.id);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px', textAlign: 'left' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--status-danger-bg)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
      
      <p className={styles.cardDescription}>
        {lead.company} - {lead.tags.join(', ')}
      </p>

      <div className={styles.cardFooter}>
        <div className={styles.cardUser}>
          <div 
            className={styles.cardAvatar}
            style={{ background: lead.color }}
          >
            {/* Using an empty div with gradient background as a placeholder avatar */}
          </div>
          <span className={styles.cardContact}>{lead.contact}</span>
        </div>
        
        <div className={styles.cardMeta}>
          <div className={styles.metaItem}>
            <Calendar size={12} />
            <span>{lead.date}</span>
          </div>
          <div className={styles.metaItem}>
            <MessageSquare size={12} />
            <span>{lead.comments}</span>
          </div>
        </div>
      </div>
      
      {lead.column_id === 'col-6' && (
        <div style={{ position: 'absolute', top: 10, right: 10, color: 'var(--status-success)' }}>
          <CheckCircle2 size={16} />
        </div>
      )}

      {onMove && !isOverlay && (
        <>
          {showMovePrev && (
            <button 
              className={styles.moveArrowLeft}
              onClick={(e) => { e.stopPropagation(); onMove(lead.id, 'prev'); }}
            >
              <ArrowLeft size={18} color="#3B82F6" />
            </button>
          )}
          {showMoveNext && (
            <button 
              className={styles.moveArrowRight}
              onClick={(e) => { e.stopPropagation(); onMove(lead.id, 'next'); }}
            >
              <ArrowRight size={18} color="#3B82F6" />
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default LeadCard;
