import React, { useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Mail, Calendar, MessageSquare, CheckCircle2, MoreHorizontal, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import styles from './Kanban.module.css';

const LeadCard = ({ lead, isOverlay, onDelete, onMove, showMovePrev, showMoveNext, columnTitle, columnColor, onEdit, onUpdateDate, onEditNotes }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    borderLeft: columnColor ? `4px solid ${columnColor}` : undefined,
  };

  const getPriorityClass = (priority) => {
    switch(priority) {
      case 'high': return styles.high;
      case 'medium': return styles.medium;
      case 'low': return styles.low;
      default: return '';
    }
  };

  const renderFormResponses = () => {
    if (!lead.form_responses) return null;
    
    let responses = [];
    if (Array.isArray(lead.form_responses)) {
      responses = lead.form_responses.map(r => ({
        q: r.question || r.name,
        a: Array.isArray(r.answer || r.values) ? (r.answer || r.values).join(', ') : (r.answer || r.values || r.value)
      })).filter(r => r.q && r.a);
    } else if (typeof lead.form_responses === 'object') {
      responses = Object.entries(lead.form_responses).map(([q, a]) => ({ q, a: String(a) }));
    }

    if (responses.length === 0) return null;

    const visibleResponses = responses.slice(0, 3);
    const hasMore = responses.length > 3;

    return (
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
        {visibleResponses.map((res, i) => (
          <div key={i} style={{ marginBottom: i === visibleResponses.length - 1 && !hasMore ? 0 : '8px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px', lineHeight: '1.2' }}>{res.q}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: '1.3' }}>{res.a}</div>
          </div>
        ))}
        {hasMore && (
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginTop: '6px', fontWeight: 600, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(lead); }}>
            Ver mais...
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isMobile ? {} : listeners)}
      className={`${styles.card} ${isDragging ? styles.isDragging : ''} ${isOverlay ? styles.isOverlay : ''}`}
    >
      <div className={styles.cardHeader}>
        <h4 className={styles.cardTitle} style={{ color: columnColor }}>{lead.company || 'Sem empresa'}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <div 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
            onClick={(e) => {
              e.stopPropagation();
              if (onEditNotes) onEditNotes(lead);
            }}
          >
            <MessageSquare size={16} className={styles.cardIcon} />
            {lead.notes && <span style={{ fontSize: '0.7rem', marginLeft: '4px', fontWeight: 'bold', color: '#10b981' }}>•</span>}
          </div>
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
              {onEdit && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit(lead);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px', textAlign: 'left' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Calendar size={14} /> Editar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <p className={styles.cardDescription} style={{ marginBottom: '4px' }}>
        {lead.name} {lead.tags?.length > 0 ? `- ${lead.tags.join(', ')}` : ''}
      </p>

      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.estimated_value || 0)}
      </p>

      <div className={styles.cardFooter}>
        <div className={styles.cardMeta} style={{ width: '100%', justifyContent: 'flex-start' }}>
          <div className={styles.metaItem} style={{ position: 'relative', cursor: 'pointer' }}>
            <Calendar size={12} />
            <span>{lead.date || 'Sem data'}</span>
            {onUpdateDate && (
              <input
                type="date"
                value={lead.date || ''}
                onChange={(e) => onUpdateDate(lead.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
            )}
          </div>
        </div>
      </div>

      {renderFormResponses()}
      
      {lead.column_id === 'col-6' && (
        <div style={{ position: 'absolute', top: 10, right: 10, color: 'var(--status-success)' }}>
          <CheckCircle2 size={16} />
        </div>
      )}

      {onMove && !isOverlay && (
        <div className={styles.mobileMoveActions}>
          <button 
            className={styles.moveBtn}
            onClick={(e) => { 
              e.stopPropagation(); 
              if (isMoving) return;
              setIsMoving(true);
              onMove(lead.id, 'prev');
              setTimeout(() => setIsMoving(false), 100);
            }}
            disabled={!showMovePrev || isMoving}
          >
            <ArrowLeft size={16} />
          </button>
          <span className={styles.moveColumnName} style={{ color: columnColor }}>{columnTitle || "Mover"}</span>
          <button 
            className={styles.moveBtn}
            onClick={(e) => { 
              e.stopPropagation(); 
              if (isMoving) return;
              setIsMoving(true);
              onMove(lead.id, 'next');
              setTimeout(() => setIsMoving(false), 100);
            }}
            disabled={!showMoveNext || isMoving}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default LeadCard;
