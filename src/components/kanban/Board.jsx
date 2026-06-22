import React, { useState } from 'react';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates 
} from '@dnd-kit/sortable';
import { supabase } from '../../lib/supabase';
import Column from './Column';
import LeadCard from './LeadCard';
import styles from './Kanban.module.css';

const Board = ({ columns, leads, setLeads, loading }) => {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDeleteLead = async (leadId) => {
    if (window.confirm('Tem certeza que deseja excluir este lead?')) {
      try {
        const { error } = await supabase.from('leads').delete().eq('id', leadId);
        if (error) throw error;
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
      } catch (error) {
        console.error("Erro ao deletar lead:", error);
      }
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveLead = active.data.current?.type === 'Lead';
    const isOverLead = over.data.current?.type === 'Lead';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveLead) return;

    if (isActiveLead && isOverLead) {
      setLeads((prevLeads) => {
        const activeIndex = prevLeads.findIndex((t) => t.id === activeId);
        const overIndex = prevLeads.findIndex((t) => t.id === overId);

        if (prevLeads[activeIndex].column_id !== prevLeads[overIndex].column_id) {
          const updatedLeads = [...prevLeads];
          updatedLeads[activeIndex].column_id = prevLeads[overIndex].column_id;
          return arrayMove(updatedLeads, activeIndex, overIndex);
        }

        return arrayMove(prevLeads, activeIndex, overIndex);
      });
    }

    if (isActiveLead && isOverColumn) {
      setLeads((prevLeads) => {
        const activeIndex = prevLeads.findIndex((t) => t.id === activeId);
        const updatedLeads = [...prevLeads];
        updatedLeads[activeIndex].column_id = overId;
        return arrayMove(updatedLeads, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = async (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const isActiveLead = active.data.current?.type === 'Lead';
    
    if (isActiveLead) {
      const activeIndex = leads.findIndex((t) => t.id === activeId);
      const movedLead = leads[activeIndex];
      const targetColumnId = over.data.current?.type === 'Column' ? overId : leads.find(l => l.id === overId)?.column_id;

      if (activeId !== overId) {
        setLeads((prevLeads) => {
          const overIndex = prevLeads.findIndex((t) => t.id === overId);
          return arrayMove(prevLeads, activeIndex, overIndex !== -1 ? overIndex : activeIndex);
        });
      }

      if (targetColumnId && targetColumnId !== movedLead.column_id) {
        try {
          await supabase.from('leads').update({ column_id: targetColumnId }).eq('id', activeId);
        } catch (error) {
          console.error("Erro ao atualizar coluna no Supabase:", error);
        }
      }
    }
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Carregando leads...</div>;
  }

  return (
    <div className={styles.columnsWrapper}>
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {columns.map((col) => (
          <Column 
            key={col.id} 
            column={col} 
            leads={leads.filter((lead) => lead.column_id === col.id)}
            onDeleteLead={handleDeleteLead}
          />
        ))}

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Board;
