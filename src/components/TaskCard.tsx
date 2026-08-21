import { PRIORITY_CONFIG, formatDeadline, formatDateTime, formatDuration, getElapsedSeconds } from "../utils";
import Avatar from "./Avatar";
import type { Task, Employee } from "../types";

interface TaskCardProps {
  task: Task;
  employees: Employee[];
  onClick: () => void;
  selected?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
}

/** Uma linha de metadado do cartão: rótulo curto à esquerda, valor à direita. */
function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 w-11 flex-shrink-0">
        {label}
      </span>
      <span className="text-[11px] text-slate-400 truncate min-w-0">{children}</span>
    </div>
  );
}

export default function TaskCard({
  task,
  employees,
  onClick,
  selected,
  onStart,
  onPause,
  onComplete,
}: TaskCardProps) {
  const pCfg = PRIORITY_CONFIG[task.priority];
  const assignees = employees.filter((e) => task.assigneeIds.includes(e.id));
  const deadlineDiff = task.deadline - Date.now();
  const isClosed = task.status === "completed" || task.status === "cancelled";
  const isUrgent = deadlineDiff < 3600000 && !isClosed;
  const isOverDeadline = deadlineDiff < 0;
  const elapsed = getElapsedSeconds(task);
  const isSelfCreated = task.assigneeIds.includes(task.createdById);

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-md border bg-card px-2.5 py-2.5 cursor-pointer transition-colors animate-slide-in ${
        selected
          ? "border-blue-500/60 bg-blue-500/[0.06]"
          : "border-border hover:border-slate-700 hover:bg-secondary/40"
      }`}
    >
      {/* Faixa de prioridade */}
      <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${pCfg.dot}`} />

      {/* Cabeçalho: avatar + título + id */}
      <div className="flex items-start gap-2 pl-1.5">
        <Avatar
          initials={assignees[0]?.avatar ?? task.createdByName.slice(0, 2).toUpperCase()}
          size="sm"
          title={assignees[0]?.name}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-[13px] font-medium leading-snug line-clamp-2 ${
              task.status === "cancelled" ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </p>
          <p className={`text-[11px] mt-0.5 ${pCfg.color}`}>{pCfg.label}</p>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/60 flex-shrink-0">
          #{task.id.replace(/^t/, "").slice(0, 4)}
        </span>
      </div>

      {/* Metadados */}
      <div className="mt-2 space-y-1 pl-1.5 font-mono">
        <Meta label="resp">
          {assignees.length > 0 ? assignees.map((e) => e.name).join(", ") : "sem responsável"}
        </Meta>
        <Meta label="prazo">
          <span className={isOverDeadline ? "text-red-400" : isUrgent ? "text-amber-400" : ""}>
            {formatDateTime(task.deadline)}
            {!isClosed && ` · ${formatDeadline(task.deadline)}`}
          </span>
        </Meta>
        {elapsed > 0 && (
          <Meta label="tempo">
            <span className={task.status === "in_progress" ? "text-blue-400" : ""}>
              {formatDuration(elapsed)}
              {task.status === "in_progress" && " ▸"}
            </span>
          </Meta>
        )}
      </div>

      {/* Etiquetas */}
      <div className="mt-2 flex flex-wrap items-center gap-1 pl-1.5">
        {isSelfCreated ? (
          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded text-blue-300 bg-blue-500/15 border border-blue-500/25">
            própria
          </span>
        ) : (
          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded text-slate-400 bg-secondary border border-border">
            {task.createdByName}
          </span>
        )}
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-[10px] font-mono text-muted-foreground/80">
            #{tag}
          </span>
        ))}
      </div>

      {/* Ações */}
      {(onStart || onPause || onComplete) && (
        <div className="mt-2 pt-2 border-t border-border/70 flex gap-1.5 pl-1.5">
          {onStart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              className="flex-1 py-1 text-[11px] font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 rounded transition-colors"
            >
              {task.status === "paused" ? "▶ Retomar" : "▶ Iniciar"}
            </button>
          )}
          {onPause && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPause();
              }}
              className="flex-1 py-1 text-[11px] font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded transition-colors"
            >
              ⏸ Pausar
            </button>
          )}
          {onComplete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              className="flex-1 py-1 text-[11px] font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 rounded transition-colors"
            >
              ✓ Concluir
            </button>
          )}
        </div>
      )}
    </div>
  );
}
