import React, { useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal, Plus } from 'lucide-react';
import LeadCard from './LeadCard';
import styles from './Kanban.module.css';

const Column = ({ column, leads, onAddCard, onDeleteLead, onMoveLead, isFirstColumn, isLastColumn, onEditLead, onUpdateDate, onEditNotes }) => {
  const leadsIds = useMemo(() => leads.map((l) => l.id), [leads]);

  const getColumnColor = (title) => {
    const t = title.toLowerCase();
    if (t.includes('novos leads')) return '#3B82F6';
    if (t.includes('primeiro contato')) return '#8B5CF6';
    if (t.includes('qualificação') || t.includes('qualificacao')) return '#F59E0B';
    if (t.includes('proposta')) return '#F97316';
    if (t.includes('negociação') || t.includes('negociacao')) return '#EC4899';
    if (t.includes('fechados')) return '#10B981';
    if (t.includes('perdidos')) return '#EF4444';
    
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const columnColor = getColumnColor(column.title);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <div>
          <span className={styles.columnTitle} style={{ color: columnColor }}>{column.title}</span>
        </div>
        <div className={styles.columnActions}>
          <span className={styles.columnCount}>{leads.length} Leads</span>
          <MoreHorizontal size={18} style={{marginLeft: '8px'}} />
        </div>
      </div>

      <div 
        ref={setNodeRef} 
        className={`${styles.columnContent} ${isOver ? styles.isDraggingOver : ''}`}
      >
        <SortableContext items={leadsIds} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard 
              key={lead.id} 
              lead={lead} 
              onDelete={onDeleteLead} 
              onMove={onMoveLead}
              showMovePrev={!isFirstColumn}
              showMoveNext={!isLastColumn}
              columnTitle={column.title}
              columnColor={columnColor}
              onEdit={onEditLead}
              onUpdateDate={onUpdateDate}
              onEditNotes={onEditNotes}
            />
          ))}
        </SortableContext>
      </div>


    </div>
  );
};

export default Column;
