import type { Priority, TaskStatus } from "./types";

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export function formatDeadline(ts: number): string {
  const diff = ts - Date.now();
  const absDiff = Math.abs(diff);
  const m = Math.floor(absDiff / 60000);
  const sign = diff < 0 ? "-" : "+";
  if (m < 60) return `${sign}${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${sign}${h}h`;
  return `${sign}${Math.floor(h / 24)}d`;
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  low: { label: "Baixa", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30", dot: "bg-emerald-400" },
  medium: { label: "Média", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30", dot: "bg-amber-400" },
  high: { label: "Alta", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30", dot: "bg-orange-400" },
  critical: { label: "Crítica", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", dot: "bg-red-400" },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "Pendente", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/30" },
  in_progress: { label: "Em Andamento", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  paused: { label: "Pausada", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
  completed: { label: "Concluída", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  overdue: { label: "Atrasada", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" },
  cancelled: { label: "Cancelada", color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/30" },
};

export function getElapsedSeconds(task: {
  status: TaskStatus;
  startedAt?: number;
  accumulatedSeconds: number;
}): number {
  if (task.status === "in_progress" && task.startedAt) {
    return task.accumulatedSeconds + Math.floor((Date.now() - task.startedAt) / 1000);
  }
  return task.accumulatedSeconds;
}
