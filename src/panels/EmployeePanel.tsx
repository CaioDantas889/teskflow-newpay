import { useState, useMemo } from "react";
import type { Task, Employee, Priority, NewTaskInput } from "../types";
import { PRIORITY_CONFIG } from "../utils";
import KanbanBoard from "../components/KanbanBoard";
import TaskDetail from "../components/TaskDetail";
import TaskTimer from "../components/TaskTimer";
import CreateTaskModal from "../components/CreateTaskModal";

interface EmployeePanelProps {
  currentEmployee: Employee;
  tasks: Task[];
  employees: Employee[];
  onStartTask: (taskId: string) => void;
  onPauseTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onAddComment: (taskId: string, text: string) => void;
  onCreateTask: (task: NewTaskInput) => void;
}

export default function EmployeePanel({
  currentEmployee,
  tasks,
  employees,
  onStartTask,
  onPauseTask,
  onCompleteTask,
  onAddComment,
  onCreateTask,
}: EmployeePanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [showConfirm, setShowConfirm] = useState<{ taskId: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [onlyOwn, setOnlyOwn] = useState(false);

  const myTasks = useMemo(
    () => tasks.filter((t) => t.assigneeIds.includes(currentEmployee.id)),
    [tasks, currentEmployee.id]
  );

  const filtered = useMemo(() => {
    return myTasks.filter((t) => {
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (onlyOwn && t.createdById !== currentEmployee.id) return false;
      return true;
    });
  }, [myTasks, filterPriority, onlyOwn, currentEmployee.id]);

  const selectedTask = tasks.find((t) => t.id === selectedId);
  const activeTask = myTasks.find((t) => t.status === "in_progress");

  const ownCount = myTasks.filter((t) => t.createdById === currentEmployee.id).length;
  const pendingCount = myTasks.filter((t) => t.status === "pending").length;
  const overdueCount = myTasks.filter((t) => t.status === "overdue").length;

  function handleStart(taskId: string) {
    if (activeTask && activeTask.id !== taskId) {
      alert("Pause a tarefa atual antes de iniciar outra.");
      return;
    }
    onStartTask(taskId);
  }

  return (
    <div className="relative flex flex-col h-full bg-background">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-card/40">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-[13px] font-semibold tracking-wide">PAINEL FUNCIONÁRIO</h2>
          <span className="text-[11px] font-mono text-muted-foreground truncate">
            {currentEmployee.name} · {myTasks.length} atividade{myTasks.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {overdueCount > 0 && (
            <span className="text-[11px] font-mono text-red-400">
              {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
            </span>
          )}
          <span className="text-[11px] font-mono text-muted-foreground">
            {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 text-[12px] font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
          >
            + Nova Atividade
          </button>
        </div>
      </div>

      {/* Atividade em andamento */}
      {activeTask && (
        <div className="px-5 py-2.5 border-b border-blue-500/20 bg-blue-500/[0.06] flex items-center gap-4">
          <span className="w-2 h-2 rounded-full bg-blue-400 timer-running flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Em andamento</p>
            <p className="text-[13px] font-medium truncate">{activeTask.title}</p>
          </div>
          <TaskTimer task={activeTask} compact />
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onPauseTask(activeTask.id)}
              className="px-2.5 py-1 text-[11px] font-mono border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 rounded transition-colors"
            >
              ⏸ Pausar
            </button>
            <button
              onClick={() => setShowConfirm({ taskId: activeTask.id })}
              className="px-2.5 py-1 text-[11px] font-mono border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 rounded transition-colors"
            >
              ✓ Concluir
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-border bg-card/20">
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
          className="bg-secondary border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500/50 text-foreground"
        >
          <option value="all">Todas as prioridades</option>
          {(["critical", "high", "medium", "low"] as Priority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_CONFIG[p].label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setOnlyOwn((v) => !v)}
          className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
            onlyOwn
              ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
              : "border-border text-muted-foreground hover:border-slate-600"
          }`}
        >
          Criadas por mim <span className="ml-1 opacity-70">{ownCount}</span>
        </button>
      </div>

      <KanbanBoard
        tasks={filtered}
        employees={employees}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
        onStart={handleStart}
        onPause={onPauseTask}
        onComplete={(taskId) => setShowConfirm({ taskId })}
        onCreate={() => setShowCreate(true)}
      />

      {/* Detalhe em painel lateral */}
      {selectedTask && (
        <>
          <div className="absolute inset-0 bg-black/50 z-30" onClick={() => setSelectedId(null)} />
          <aside className="absolute right-0 top-0 bottom-0 w-[27rem] max-w-[92vw] bg-card border-l border-border z-40 shadow-2xl overflow-hidden">
            <TaskDetail
              task={selectedTask}
              employees={employees}
              onClose={() => setSelectedId(null)}
              onAddComment={onAddComment}
              currentUserId={currentEmployee.id}
              currentUserName={currentEmployee.name}
            />
          </aside>
        </>
      )}

      {showCreate && (
        <CreateTaskModal
          employees={employees}
          creatorName={currentEmployee.name}
          lockedAssignee={currentEmployee}
          heading="Nova Atividade"
          onClose={() => setShowCreate(false)}
          onCreate={onCreateTask}
        />
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowConfirm(null)} />
          <div className="relative bg-card border border-border rounded-lg p-6 max-w-sm w-full animate-slide-in shadow-2xl">
            <h3 className="text-sm font-semibold mb-2">Confirmar conclusão</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Tem certeza que deseja marcar esta atividade como concluída?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-2 text-sm border border-border hover:border-slate-600 rounded-md transition-colors text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onCompleteTask(showConfirm.taskId);
                  setShowConfirm(null);
                  if (selectedId === showConfirm.taskId) setSelectedId(null);
                }}
                className="flex-1 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors font-medium"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
