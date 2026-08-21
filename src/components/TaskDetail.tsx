import { useState } from "react";
import type { Task, Employee } from "../types";
import { PRIORITY_CONFIG, STATUS_CONFIG, formatDateTime, formatRelative, formatDuration, getElapsedSeconds } from "../utils";
import Badge from "./Badge";
import TaskTimer from "./TaskTimer";
import Avatar from "./Avatar";

interface TaskDetailProps {
  task: Task;
  employees: Employee[];
  onClose: () => void;
  onAddComment: (taskId: string, text: string) => void;
  currentUserId?: string;
  currentUserName?: string;
  /** Quando informado, mostra o botão de editar no cabeçalho. */
  onEdit?: () => void;
}

const EVENT_LABELS: Record<string, string> = {
  created: "Tarefa criada",
  started: "Tarefa iniciada",
  paused: "Tarefa pausada",
  resumed: "Tarefa retomada",
  completed: "Tarefa concluída",
  reassigned: "Tarefa reatribuída",
  commented: "Comentário adicionado",
  edited: "Atividade editada",
  cancelled: "Tarefa cancelada",
};

export default function TaskDetail({ task, employees, onClose, onAddComment, currentUserId = "e1", currentUserName = "Ana Oliveira", onEdit }: TaskDetailProps) {
  const [comment, setComment] = useState("");
  const pCfg = PRIORITY_CONFIG[task.priority];
  const sCfg = STATUS_CONFIG[task.status];
  const assignees = employees.filter((e) => task.assigneeIds.includes(e.id));
  const elapsed = getElapsedSeconds(task);
  const creatorInitials = task.createdByName.split(/\s+/).filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  // Atividade que o próprio responsável criou para si mesmo.
  const isSelfCreated = task.assigneeIds.includes(task.createdById);

  function handleComment() {
    const trimmed = comment.trim();
    if (!trimmed) return;
    onAddComment(task.id, trimmed);
    setComment("");
  }

  return (
    <div className="flex flex-col h-full animate-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-border">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${pCfg.dot}`} />
            <span className={`text-xs font-mono ${pCfg.color}`}>{pCfg.label}</span>
            <span className="text-muted-foreground text-xs">/</span>
            <span className={`text-xs font-mono ${sCfg.color}`}>{sCfg.label}</span>
          </div>
          <h2 className="text-base font-semibold leading-snug">{task.title}</h2>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            #{task.id} · Criado {formatRelative(task.createdAt)} por {task.createdByName}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-2 py-1 text-[11px] font-mono rounded border border-border text-muted-foreground hover:text-foreground hover:border-slate-600 transition-colors"
            >
              ✎ Editar
            </button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none px-1"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Timer section */}
        {task.status !== "pending" && task.status !== "cancelled" && (
          <div className="p-5 border-b border-border">
            <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">Tempo</p>
            <TaskTimer task={task} />
            <div className="flex gap-4 mt-3">
              <div>
                <p className="text-xs text-muted-foreground font-mono">Estimado</p>
                <p className="text-sm font-mono font-medium">{formatDuration(task.estimatedMinutes * 60)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono">Gasto</p>
                <p className="text-sm font-mono font-medium">{formatDuration(elapsed)}</p>
              </div>
              {task.completedAt && (
                <div>
                  <p className="text-xs text-muted-foreground font-mono">Concluído</p>
                  <p className="text-sm font-mono font-medium">{formatDateTime(task.completedAt)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="p-5 border-b border-border">
          <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Descrição</p>
          <p className="text-sm leading-relaxed text-slate-300">{task.description}</p>
        </div>

        {/* Meta */}
        <div className="p-5 border-b border-border grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">Responsáveis</p>
            <div className="flex flex-col gap-1.5">
              {assignees.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <Avatar initials={e.avatar} size="sm" />
                  <div>
                    <p className="text-xs font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">Criado por</p>
              <div className="flex items-center gap-2">
                <Avatar initials={creatorInitials} size="sm" />
                <div>
                  <p className="text-xs font-medium">{task.createdByName}</p>
                  <p className="text-xs text-muted-foreground">
                    {isSelfCreated ? "criou para si mesmo" : formatDateTime(task.createdAt)}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">Prazo</p>
              <p className="text-sm font-mono">{formatDateTime(task.deadline)}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">Tags</p>
              <div className="flex flex-wrap gap-1">
                {task.tags.map((t) => (
                  <span key={t} className="text-xs font-mono text-muted-foreground">#{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-5 border-b border-border">
          <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">Linha do Tempo</p>
          <div className="space-y-3">
            {task.events.map((ev, i) => (
              <div key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${
                    ev.type === "completed" ? "bg-emerald-400"
                    : ev.type === "started" || ev.type === "resumed" ? "bg-blue-400"
                    : ev.type === "paused" ? "bg-amber-400"
                    : ev.type === "cancelled" ? "bg-red-400"
                    : "bg-slate-500"
                  }`} />
                  {i < task.events.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1 min-h-3" />
                  )}
                </div>
                <div className="pb-2">
                  <p className="text-xs font-medium">{EVENT_LABELS[ev.type] || ev.type}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {ev.by} · {formatDateTime(ev.timestamp)}
                  </p>
                  {ev.note && <p className="text-xs text-slate-400 mt-0.5">{ev.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="p-5">
          <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">
            Comentários ({task.comments.length})
          </p>
          <div className="space-y-3 mb-4">
            {task.comments.map((c) => (
              <div key={c.id} className="bg-secondary/50 rounded-sm p-3 border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <Avatar initials={c.authorName.split(" ").map(n => n[0]).join("").slice(0,2)} size="sm" />
                  <span className="text-xs font-medium">{c.authorName}</span>
                  <span className="text-xs text-muted-foreground font-mono ml-auto">{formatRelative(c.timestamp)}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>

          {/* Comment input */}
          <div className="space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Adicionar comentário..."
              rows={3}
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500/50 placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleComment();
              }}
            />
            <button
              onClick={handleComment}
              disabled={!comment.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Comentar (Ctrl+Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
