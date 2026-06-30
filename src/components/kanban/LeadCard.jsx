import React, { useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Mail, Phone, Calendar, MessageSquare, CheckCircle2, MoreHorizontal, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import styles from './Kanban.module.css';

const LeadCard = ({ lead, isOverlay, onDelete, onMove, showMovePrev, showMoveNext, columnTitle, columnColor, onEdit, onUpdateDate, onEditNotes, onViewResponses }) => {
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

    responses = responses.filter(r => {
      const qLower = r.q.toLowerCase();
      return !qLower.includes('nome') && 
             !qLower.includes('telefone') && 
             !qLower.includes('celular') && 
             !qLower.includes('e-mail') && 
             !qLower.includes('email');
    });

    if (responses.length === 0) return null;

    const visibleResponses = responses.slice(0, 3);
    const hasMore = responses.length > 3;

    return (
      <div className={styles.formResponsesBox}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Respostas do Formulário</div>
        {visibleResponses.map((res, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{res.q}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{res.a}</span>
          </div>
        ))}
        {hasMore && (
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }} onClick={(e) => { e.stopPropagation(); if (onViewResponses) onViewResponses(lead); }}>
            Ver todas as respostas...
          </div>
        )}
      </div>
    );
  };

  const isMetaLead = lead.company === 'Meta Ads';
  const displayTitle = isMetaLead ? lead.name : (lead.company || 'Sem empresa');
  const displaySubtitle = isMetaLead ? null : lead.name;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        '--card-accent': columnColor || 'var(--accent-primary)'
      }}
      {...attributes}
      {...(isMobile ? {} : listeners)}
      className={`${styles.card} ${isDragging ? styles.isDragging : ''} ${isOverlay ? styles.isOverlay : ''}`}
    >
      <div className={styles.cardHeader}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h4 className={styles.cardTitle} style={{ margin: 0 }}>{displayTitle}</h4>
            {isMetaLead && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 700, color: '#1877F2', backgroundColor: 'rgba(24, 119, 242, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                LEAD META ADS
              </div>
            )}
            {!displaySubtitle && lead.tags?.length > 0 && lead.tags.map((tag, idx) => (
              <span key={idx} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '12px', color: columnColor || 'var(--accent-primary)', fontWeight: 600, backgroundColor: `${columnColor}15` || 'var(--accent-primary-transparent)' }}>
                {tag}
              </span>
            ))}
          </div>
          {displaySubtitle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <p className={styles.cardDescription} style={{ margin: 0 }}>{displaySubtitle}</p>
              {lead.tags?.length > 0 && lead.tags.map((tag, idx) => (
                <span key={idx} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '12px', color: columnColor || 'var(--accent-primary)', fontWeight: 600, backgroundColor: `${columnColor}15` || 'var(--accent-primary-transparent)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <div 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
            onClick={(e) => {
              e.stopPropagation();
              if (onEditNotes) onEditNotes(lead);
            }}
          >
            <MessageSquare size={16} className={styles.cardIcon} />
            {lead.notes && <span style={{ fontSize: '0.7rem', marginLeft: '4px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>•</span>}
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
              style={{ position: 'absolute', top: '100%', right: 0, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', zIndex: 20, padding: '4px', minWidth: '120px' }}
            >
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  if (onDelete) onDelete(lead.id);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px', textAlign: 'left', fontWeight: 500 }}
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
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px', textAlign: 'left', fontWeight: 500 }}
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
      
      {lead.contact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
          {lead.contact.includes('@') ? <Mail size={12} /> : <Phone size={12} />}
          <span style={{ fontWeight: 500 }}>{lead.contact}</span>
        </div>
      )}


      {lead.estimated_value > 0 && (
        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.estimated_value)}
        </p>
      )}

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
