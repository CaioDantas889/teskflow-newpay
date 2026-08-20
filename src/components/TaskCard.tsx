import { PRIORITY_CONFIG, STATUS_CONFIG, formatDeadline, formatDateTime } from "../utils";
import Badge from "./Badge";
import TaskTimer from "./TaskTimer";
import Avatar from "./Avatar";
import type { Task, Employee } from "../types";

interface TaskCardProps {
  task: Task;
  employees: Employee[];
  onClick: () => void;
  selected?: boolean;
  showActions?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
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
  const sCfg = STATUS_CONFIG[task.status];
  const assignees = employees.filter((e) => task.assigneeIds.includes(e.id));
  const deadlineDiff = task.deadline - Date.now();
  const isUrgent = deadlineDiff < 3600000 && task.status !== "completed" && task.status !== "cancelled";
  const isOverDeadline = deadlineDiff < 0;

  return (
    <div
      onClick={onClick}
      className={`group relative border rounded-sm p-4 cursor-pointer transition-all duration-150 animate-slide-in ${
        selected
          ? "border-blue-500/60 bg-blue-500/5"
          : "border-border hover:border-slate-600 bg-card hover:bg-secondary/50"
      }`}
    >
      {/* Priority accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-sm ${pCfg.dot}`} />

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug line-clamp-2 ${task.status === "cancelled" ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </p>
          </div>
          {selected && (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={`${pCfg.color} ${pCfg.bg} ${pCfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} />
            {pCfg.label}
          </Badge>
          <Badge className={`${sCfg.color} ${sCfg.bg} ${sCfg.border}`}>
            {sCfg.label}
          </Badge>
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs text-muted-foreground font-mono">
              #{tag}
            </span>
          ))}
        </div>

        {/* Timer */}
        {(task.status === "in_progress" || task.status === "completed" || task.status === "overdue") && (
          <TaskTimer task={task} compact />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Assignees */}
          <div className="flex -space-x-1">
            {assignees.map((e) => (
              <Avatar key={e.id} initials={e.avatar} size="sm" title={e.name} />
            ))}
          </div>

          {/* Deadline */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-mono">
              {isOverDeadline ? "Atrasou" : "Prazo"}
            </span>
            <span
              className={`text-xs font-mono font-medium tabular-nums ${
                isOverDeadline
                  ? "text-red-400"
                  : isUrgent
                  ? "text-amber-400"
                  : "text-slate-400"
              }`}
            >
              {task.status === "completed"
                ? formatDateTime(task.deadline)
                : formatDeadline(task.deadline)}
            </span>
          </div>
        </div>

        {/* Employee actions */}
        {(onStart || onPause || onComplete) && (
          <div className="flex gap-2 pt-1 border-t border-border">
            {task.status === "pending" && onStart && (
              <button
                onClick={(e) => { e.stopPropagation(); onStart(); }}
                className="flex-1 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-sm transition-colors"
              >
                ▶ Iniciar
              </button>
            )}
            {task.status === "in_progress" && onPause && (
              <button
                onClick={(e) => { e.stopPropagation(); onPause(); }}
                className="flex-1 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-sm transition-colors"
              >
                ⏸ Pausar
              </button>
            )}
            {task.status === "paused" && onStart && (
              <button
                onClick={(e) => { e.stopPropagation(); onStart(); }}
                className="flex-1 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-sm transition-colors"
              >
                ▶ Retomar
              </button>
            )}
            {(task.status === "in_progress" || task.status === "paused") && onComplete && (
              <button
                onClick={(e) => { e.stopPropagation(); onComplete(); }}
                className="flex-1 py-1.5 text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-sm transition-colors"
              >
                ✓ Concluir
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
