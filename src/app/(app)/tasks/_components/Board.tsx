"use client";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  GripVertical,
  MessageSquare,
  Paperclip,
  UserRound,
  GitBranch,
} from "lucide-react";
import {
  type WorkItem,
  statuses,
  statusColors,
  shortId,
  overdue,
  dateTime,
  type Status,
} from "../_lib/types";
import type { Copy } from "../_lib/copy";
import s from "../work.module.css";
function Card({
  item,
  copy: c,
  locale,
  disabled,
}: {
  item: WorkItem;
  copy: Copy;
  locale: string;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    disabled: disabled || !item.canEdit,
  });
  return (
    <article ref={setNodeRef} className={s.taskCard} data-dragging={isDragging}>
      <div className={s.cardTop}>
        <span className={s.code}>{shortId(item)}</span>
        <span className={s.priority} data-priority={item.priority}>
          {c.priorities[item.priority]}
        </span>
        {item.canEdit && (
          <button
            className={s.dragHandle}
            title={c.task}
            aria-label={`${c.task}: ${item.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={15} />
          </button>
        )}
      </div>
      <Link className={s.taskTitle} href={"/tasks/" + item.id}>
        {item.title}
      </Link>
      <div className={s.tags}>
        <span className={s.kind}>{c.kinds[item.kind]}</span>
        {item.labels.slice(0, 3).map((label) => (
          <span className={s.tag} key={label}>
            {label}
          </span>
        ))}
      </div>
      {item.parent && (
        <div className={s.muted}>
          <GitBranch size={13} /> {item.parent.title}
        </div>
      )}
      <div className={s.cardMeta}>
        <span data-overdue={overdue(item)}>
          <CalendarDays size={13} />
          {item.dueAt ? dateTime(item.dueAt, locale) : c.noDue}
        </span>
        <div className={s.actions}>
          {item.checklist.length > 0 && (
            <span title={c.checklist}>
              <CheckSquare size={13} />
              {item.checklist.filter((i) => i.done).length}/
              {item.checklist.length}
            </span>
          )}
          {item._count.comments > 0 && (
            <span title={c.comments}>
              <MessageSquare size={13} />
              {item._count.comments}
            </span>
          )}
          {item._count.attachments > 0 && (
            <span title={c.files}>
              <Paperclip size={13} />
              {item._count.attachments}
            </span>
          )}
        </div>
      </div>
      <div className={s.cardOwner}>
        <span className={s.avatar}>
          {item.assignedTo?.name.slice(0, 2).toUpperCase() || (
            <UserRound size={13} />
          )}
        </span>
        <span>{item.assignedTo?.name || c.unassigned}</span>
      </div>
    </article>
  );
}
function Column({
  status,
  items,
  copy,
  locale,
  disabled,
}: {
  status: Status;
  items: WorkItem[];
  copy: Copy;
  locale: string;
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "column:" + status,
    disabled,
  });
  return (
    <section
      ref={setNodeRef}
      className={s.column}
      data-over={isOver}
      aria-label={copy.statuses[status]}
    >
      <header className={s.columnHeader}>
        <span className={s.dot} style={{ background: statusColors[status] }} />
        <h3>{copy.statuses[status]}</h3>
        <span>{items.length}</span>
      </header>
      <div className={s.columnBody}>
        {items.map((item) => (
          <Card
            key={item.id}
            item={item}
            copy={copy}
            locale={locale}
            disabled={disabled}
          />
        ))}
        {!items.length && (
          <div className={s.emptyColumn}>{copy.emptyColumn}</div>
        )}
      </div>
    </section>
  );
}
export default function Board({
  items,
  copy,
  locale,
  disabled,
  onMove,
}: {
  items: WorkItem[];
  copy: Copy;
  locale: string;
  disabled: boolean;
  onMove: (item: WorkItem, status: Status) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = items.find((item) => item.id === activeId);
  function end(event: DragEndEvent) {
    setActiveId(null);
    const target = event.over?.id.toString().replace("column:", "") as Status;
    const item = items.find((row) => row.id === event.active.id);
    if (item && statuses.includes(target) && item.status !== target)
      onMove(item, target);
  }
  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={end}
    >
      <div className={s.board}>
        {statuses.map((status) => (
          <Column
            key={status}
            status={status}
            items={items.filter((item) => item.status === status)}
            copy={copy}
            locale={locale}
            disabled={disabled}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? <div className={s.dragPreview}>{active.title}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}
