import React, { useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal, Plus } from 'lucide-react';
import LeadCard from './LeadCard';
import styles from './Kanban.module.css';

const Column = ({ column, leads, onAddCard, onDeleteLead, onMoveLead, isFirstColumn, isLastColumn }) => {
  const leadsIds = useMemo(() => leads.map((l) => l.id), [leads]);

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
          <span className={styles.columnTitle}>{column.title}</span>
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
            />
          ))}
        </SortableContext>
      </div>


    </div>
  );
};

export default Column;
