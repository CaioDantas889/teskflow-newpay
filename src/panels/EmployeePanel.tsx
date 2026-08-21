import { useState, useMemo } from "react";
import type { Task, Employee, TaskStatus, Priority, NewTaskInput } from "../types";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "../utils";
import TaskCard from "../components/TaskCard";
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

const FILTER_STATUSES: (TaskStatus | "all")[] = ["all", "pending", "in_progress", "paused", "completed", "overdue"];

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
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [showConfirm, setShowConfirm] = useState<{ taskId: string; action: "complete" } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [onlyOwn, setOnlyOwn] = useState(false);

  const myTasks = useMemo(
    () => tasks.filter((t) => t.assigneeIds.includes(currentEmployee.id)),
    [tasks, currentEmployee.id]
  );

  const filtered = useMemo(() => {
    return myTasks.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (onlyOwn && t.createdById !== currentEmployee.id) return false;
      return true;
    });
  }, [myTasks, filterStatus, filterPriority, onlyOwn, currentEmployee.id]);

  const selectedTask = tasks.find((t) => t.id === selectedId);
  const activeTask = myTasks.find((t) => t.status === "in_progress");

  const ownCount = myTasks.filter((t) => t.createdById === currentEmployee.id).length;
  const pendingCount = myTasks.filter((t) => t.status === "pending").length;
  const overdueCount = myTasks.filter((t) => t.status === "overdue" || (t.deadline < Date.now() && t.status === "in_progress")).length;

  function handleStart(taskId: string) {
    if (activeTask && activeTask.id !== taskId) {
      alert("Pause a tarefa atual antes de iniciar outra.");
      return;
    }
    onStartTask(taskId);
  }

  function handleCompleteClick(taskId: string) {
    setShowConfirm({ taskId, action: "complete" });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold tracking-wide">PAINEL FUNCIONÁRIO</h2>
          <span className="text-xs font-mono text-muted-foreground">{currentEmployee.name}</span>
        </div>
        <div className="flex items-center gap-4">
          {overdueCount > 0 && (
            <span className="text-xs font-mono text-red-400">
              {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
            </span>
          )}
          <span className="text-xs font-mono text-muted-foreground">
            {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-sm transition-colors"
          >
            + Nova Atividade
          </button>
        </div>
      </div>

      {/* Active task bar */}
      {activeTask && (
        <div className="px-6 py-3 border-b border-blue-500/20 bg-blue-500/5 flex items-center gap-4">
          <span className="w-2 h-2 rounded-full bg-blue-400 timer-running flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-muted-foreground mb-0.5">EM ANDAMENTO</p>
            <p className="text-sm font-medium truncate">{activeTask.title}</p>
          </div>
          <TaskTimer task={activeTask} compact />
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onPauseTask(activeTask.id)}
              className="px-2.5 py-1 text-xs font-mono border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-sm transition-colors"
            >
              ⏸ Pausar
            </button>
            <button
              onClick={() => handleCompleteClick(activeTask.id)}
              className="px-2.5 py-1 text-xs font-mono border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-sm transition-colors"
            >
              ✓ Concluir
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Task list */}
        <div className={`flex flex-col ${selectedTask ? "w-96" : "flex-1"} border-r border-border overflow-hidden`}>
          {/* Filters */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex gap-1 flex-wrap">
              {FILTER_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-sm border transition-colors ${
                    filterStatus === s
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                      : "border-border text-muted-foreground hover:border-slate-500"
                  }`}
                >
                  {s === "all" ? "Todas" : STATUS_CONFIG[s].label}
                  {s !== "all" && (
                    <span className="ml-1 opacity-70">
                      {myTasks.filter((t) => t.status === s).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
                className="bg-secondary border border-border rounded-sm px-2 py-1 text-xs focus:outline-none text-foreground"
              >
                <option value="all">Todas as prioridades</option>
                {(["critical", "high", "medium", "low"] as Priority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                ))}
              </select>
              <button
                onClick={() => setOnlyOwn((v) => !v)}
                className={`px-2.5 py-1 text-xs font-mono rounded-sm border transition-colors ${
                  onlyOwn
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                    : "border-border text-muted-foreground hover:border-slate-500"
                }`}
              >
                Criadas por mim <span className="ml-1 opacity-70">{ownCount}</span>
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhuma tarefa encontrada
              </div>
            ) : (
              filtered.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  employees={employees}
                  onClick={() => setSelectedId(selectedId === task.id ? null : task.id)}
                  selected={selectedId === task.id}
                  onStart={task.status === "pending" || task.status === "paused" ? () => handleStart(task.id) : undefined}
                  onPause={task.status === "in_progress" ? () => onPauseTask(task.id) : undefined}
                  onComplete={task.status === "in_progress" || task.status === "paused" ? () => handleCompleteClick(task.id) : undefined}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedTask && (
          <div className="flex-1 overflow-hidden">
            <TaskDetail
              task={selectedTask}
              employees={employees}
              onClose={() => setSelectedId(null)}
              onAddComment={onAddComment}
              currentUserId={currentEmployee.id}
              currentUserName={currentEmployee.name}
            />
          </div>
        )}

        {!selectedTask && (
          <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground text-sm">
            <div className="text-center space-y-2">
              <div className="text-4xl text-slate-700">⊡</div>
              <p>Selecione uma tarefa para ver detalhes</p>
            </div>
          </div>
        )}
      </div>

      {/* Nova atividade própria */}
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

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowConfirm(null)} />
          <div className="relative bg-card border border-border rounded-sm p-6 max-w-sm w-full animate-slide-in shadow-2xl">
            <h3 className="text-sm font-semibold mb-2">Confirmar conclusão</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Tem certeza que deseja marcar esta tarefa como concluída?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-2 text-sm border border-border hover:border-slate-500 rounded-sm transition-colors text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onCompleteTask(showConfirm.taskId);
                  setShowConfirm(null);
                  if (selectedId === showConfirm.taskId) setSelectedId(null);
                }}
                className="flex-1 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-sm transition-colors font-medium"
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
