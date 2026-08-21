import { useState, useMemo } from "react";
import type { Task, Employee, TaskStatus, Priority, UserAccount, NewTaskInput } from "../types";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "../utils";
import TaskCard from "../components/TaskCard";
import TaskDetail from "../components/TaskDetail";
import CreateTaskModal from "../components/CreateTaskModal";

interface AdminPanelProps {
  tasks: Task[];
  employees: Employee[];
  onCreateTask: (t: NewTaskInput) => void;
  onAddComment: (taskId: string, text: string) => void;
  onCancelTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onRescheduleTask: (taskId: string, deadline: number) => void;
  users: UserAccount[];
  onCreateUser: (data: { name: string; role: "admin" | "employee"; username: string; password: string; jobRole?: string }) => Promise<string | null>;
  onDeleteUser: (userId: string) => Promise<string | null>;
}

const STATUSES: TaskStatus[] = ["pending", "in_progress", "paused", "overdue", "completed", "cancelled"];
const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

export default function AdminPanel({ tasks, employees, onCreateTask, onAddComment, onCancelTask, onDeleteTask, onRescheduleTask, users, onCreateUser, onDeleteUser }: AdminPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const [userName, setUserName] = useState("");
  const [jobRole, setJobRole] = useState("Funcionário");
  const [userRole, setUserRole] = useState<"admin" | "employee">("employee");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userError, setUserError] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");

  const selectedTask = tasks.find((t) => t.id === selectedId);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterEmployee !== "all" && !t.assigneeIds.includes(filterEmployee)) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterStatus, filterPriority, filterEmployee, search]);

  // Metrics
  const metrics = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, tasks.filter((t) => t.status === s).length]));
    const totalCompleted = tasks.filter((t) => t.status === "completed").length;
    const totalOverdue = tasks.filter((t) => t.status === "overdue").length;
    return { byStatus, totalCompleted, totalOverdue };
  }, [tasks]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold tracking-wide">PAINEL ADMINISTRADOR</h2>
          <span className="text-xs font-mono text-muted-foreground">{tasks.length} tarefas</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUsers(true)}
            className="px-3 py-1.5 text-xs font-medium border border-border hover:border-slate-500 rounded-sm transition-colors"
          >
            Usuários ({users.length})
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-sm transition-colors"
          >
            + Nova Tarefa
          </button>
        </div>
      </div>

      {/* Metrics bar */}
      <div className="grid grid-cols-6 border-b border-border">
        {STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = metrics.byStatus[s] || 0;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={`flex flex-col items-center py-3 border-r border-border last:border-r-0 transition-colors hover:bg-secondary/50 ${
                filterStatus === s ? "bg-secondary/50" : ""
              }`}
            >
              <span className={`text-xl font-mono font-bold tabular-nums ${cfg.color}`}>{count}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{cfg.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Task list */}
        <div className={`flex flex-col ${selectedTask ? "w-96" : "flex-1"} border-r border-border overflow-hidden transition-all`}>
          {/* Filters */}
          <div className="p-3 space-y-2 border-b border-border">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefa..."
              className="w-full bg-secondary border border-border rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500/50 placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
                className="flex-1 bg-secondary border border-border rounded-sm px-2 py-1 text-xs focus:outline-none text-foreground"
              >
                <option value="all">Prioridade</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                ))}
              </select>
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="flex-1 bg-secondary border border-border rounded-sm px-2 py-1 text-xs focus:outline-none text-foreground"
              >
                <option value="all">Funcionário</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
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
                />
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedTask && (
          <div className="flex-1 overflow-hidden border-l border-border">
            <div className="flex flex-col h-full">
              <div className="flex-1 min-h-0 overflow-hidden">
                <TaskDetail
                  task={selectedTask}
                  employees={employees}
                  onClose={() => setSelectedId(null)}
                  onAddComment={onAddComment}
                  currentUserName="Administrador"
                />
              </div>
              {/* Admin actions */}
              <div className="flex-shrink-0 p-4 border-t border-border bg-card space-y-3">
                <div>
                  <p className="text-xs font-semibold mb-2">Reagendar tarefa</p>
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="flex-1 bg-secondary border border-border rounded-sm px-2 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => {
                        if (!rescheduleDate) return;
                        onRescheduleTask(selectedTask.id, new Date(rescheduleDate).getTime());
                        setRescheduleDate("");
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-sm"
                    >
                      Reagendar
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedTask.status !== "completed" && selectedTask.status !== "cancelled" && (
                    <button
                      onClick={() => onCancelTask(selectedTask.id)}
                      className="px-3 py-1.5 text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-sm transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm("Remover esta atividade definitivamente?")) {
                        onDeleteTask(selectedTask.id);
                        setSelectedId(null);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-sm transition-colors"
                  >
                    Remover atividade
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state for detail */}
        {!selectedTask && (
          <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground text-sm">
            <div className="text-center space-y-2">
              <div className="text-4xl text-slate-700">⊡</div>
              <p>Selecione uma tarefa para ver detalhes</p>
            </div>
          </div>
        )}
      </div>

      {showUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowUsers(false)} />
          <div className="relative bg-card border border-border rounded-sm p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold">Gerenciar usuários</h3>
                <p className="text-xs text-muted-foreground mt-1">Crie contas com usuário e senha para funcionários e administradores.</p>
              </div>
              <button onClick={() => setShowUsers(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="border border-border rounded-sm p-4 space-y-3 mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Criar novo usuário</p>
              <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Nome completo" className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs" />
              <div className="flex gap-2">
                <select value={userRole} onChange={e => setUserRole(e.target.value as "admin" | "employee")} className="flex-1 bg-secondary border border-border rounded-sm px-2 py-2 text-xs">
                  <option value="employee">Funcionário</option>
                  <option value="admin">Administrador</option>
                </select>
                <input value={jobRole} onChange={e => setJobRole(e.target.value)} disabled={userRole === "admin"} placeholder="Cargo" className="flex-1 bg-secondary border border-border rounded-sm px-3 py-2 text-xs disabled:opacity-50" />
              </div>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Nome de usuário" autoComplete="off" className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs" />
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha (mínimo 6 caracteres)" type="password" autoComplete="new-password" className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-xs" />
              {userError && <p className="text-xs text-red-400">{userError}</p>}
              <button
                disabled={creatingUser}
                onClick={async () => {
                  setUserError("");
                  if (!userName.trim() || !username.trim() || password.length < 6) {
                    setUserError("Preencha o nome, usuário e uma senha com pelo menos 6 caracteres.");
                    return;
                  }
                  setCreatingUser(true);
                  const error = await onCreateUser({ name: userName.trim(), role: userRole, username: username.trim(), password, jobRole });
                  setCreatingUser(false);
                  if (error) setUserError(error);
                  else {
                    setUserName(""); setUsername(""); setPassword("");
                    setUserError("");
                  }
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-sm text-xs font-medium"
              >
                {creatingUser ? "Criando..." : "Criar usuário"}
              </button>
            </div>

            <div className="space-y-2">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between border border-border rounded-sm px-3 py-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground">@{user.username} · {user.role === "admin" ? "Administrador" : "Funcionário"}</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Remover o usuário ${user.name}? As atividades criadas por ele e as que ficariam sem responsável também serão removidas.`)) return;
                      const error = await onDeleteUser(user.id);
                      if (error) setUserError(error);
                    }}
                    className="flex-shrink-0 px-2.5 py-1 text-[11px] border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-sm"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateTaskModal
          employees={employees}
          creatorName="Administrador"
          onClose={() => setShowCreate(false)}
          onCreate={onCreateTask}
        />
      )}
    </div>
  );
}
