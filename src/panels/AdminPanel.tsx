import { useState, useMemo } from "react";
import type { Task, Employee, Priority, UserAccount, NewTaskInput } from "../types";
import { PRIORITY_CONFIG } from "../utils";
import KanbanBoard from "../components/KanbanBoard";
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

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

export default function AdminPanel({
  tasks,
  employees,
  onCreateTask,
  onAddComment,
  onCancelTask,
  onDeleteTask,
  onRescheduleTask,
  users,
  onCreateUser,
  onDeleteUser,
}: AdminPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
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
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterEmployee !== "all" && !t.assigneeIds.includes(filterEmployee)) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterPriority, filterEmployee, search]);

  return (
    <div className="relative flex flex-col h-full bg-background">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-card/40">
        <div className="flex items-center gap-3">
          <h2 className="text-[13px] font-semibold tracking-wide">PAINEL ADMINISTRADOR</h2>
          <span className="text-[11px] font-mono text-muted-foreground">
            {tasks.length} atividade{tasks.length !== 1 ? "s" : ""} · {employees.length} na equipe
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUsers(true)}
            className="px-3 py-1.5 text-[12px] font-medium border border-border hover:border-slate-600 rounded-md transition-colors"
          >
            Usuários ({users.length})
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 text-[12px] font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
          >
            + Nova Tarefa
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-border bg-card/20">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar atividade..."
          className="w-64 bg-secondary border border-border rounded px-2.5 py-1 text-[11px] focus:outline-none focus:border-blue-500/50 placeholder:text-muted-foreground"
        />
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
          className="bg-secondary border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500/50 text-foreground"
        >
          <option value="all">Prioridade</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_CONFIG[p].label}
            </option>
          ))}
        </select>
        <select
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="bg-secondary border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500/50 text-foreground"
        >
          <option value="all">Funcionário</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        {(search || filterPriority !== "all" || filterEmployee !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setFilterPriority("all");
              setFilterEmployee("all");
            }}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground"
          >
            limpar filtros
          </button>
        )}
        <span className="ml-auto text-[11px] font-mono text-muted-foreground">
          {filtered.length} no quadro
        </span>
      </div>

      <KanbanBoard
        tasks={filtered}
        employees={employees}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
        onCreate={() => setShowCreate(true)}
      />

      {/* Detalhe em painel lateral */}
      {selectedTask && (
        <>
          <div className="absolute inset-0 bg-black/50 z-30" onClick={() => setSelectedId(null)} />
          <aside className="absolute right-0 top-0 bottom-0 w-[27rem] max-w-[92vw] bg-card border-l border-border z-40 shadow-2xl flex flex-col">
            <div className="flex-1 min-h-0 overflow-hidden">
              <TaskDetail
                task={selectedTask}
                employees={employees}
                onClose={() => setSelectedId(null)}
                onAddComment={onAddComment}
                currentUserName="Administrador"
              />
            </div>

            {/* Ações do administrador */}
            <div className="flex-shrink-0 p-4 border-t border-border bg-card space-y-3">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                  Reagendar
                </p>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="flex-1 bg-secondary border border-border rounded px-2 py-1.5 text-[11px]"
                  />
                  <button
                    onClick={() => {
                      if (!rescheduleDate) return;
                      onRescheduleTask(selectedTask.id, new Date(rescheduleDate).getTime());
                      setRescheduleDate("");
                    }}
                    className="px-3 py-1.5 text-[11px] font-medium bg-blue-600 hover:bg-blue-500 text-white rounded"
                  >
                    Reagendar
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedTask.status !== "completed" && selectedTask.status !== "cancelled" && (
                  <button
                    onClick={() => onCancelTask(selectedTask.id)}
                    className="px-3 py-1.5 text-[11px] font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded transition-colors"
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
                  className="px-3 py-1.5 text-[11px] font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  Remover atividade
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {showUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowUsers(false)} />
          <div className="relative bg-card border border-border rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold">Gerenciar usuários</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Crie contas com usuário e senha para funcionários e administradores.
                </p>
              </div>
              <button onClick={() => setShowUsers(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="border border-border rounded-md p-4 space-y-3 mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Criar novo usuário
              </p>
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Nome completo"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs"
              />
              <div className="flex gap-2">
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as "admin" | "employee")}
                  className="flex-1 bg-secondary border border-border rounded px-2 py-2 text-xs"
                >
                  <option value="employee">Funcionário</option>
                  <option value="admin">Administrador</option>
                </select>
                <input
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  disabled={userRole === "admin"}
                  placeholder="Cargo"
                  className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-xs disabled:opacity-50"
                />
              </div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nome de usuário"
                autoComplete="off"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha (mínimo 6 caracteres)"
                type="password"
                autoComplete="new-password"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs"
              />
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
                  const error = await onCreateUser({
                    name: userName.trim(),
                    role: userRole,
                    username: username.trim(),
                    password,
                    jobRole,
                  });
                  setCreatingUser(false);
                  if (error) setUserError(error);
                  else {
                    setUserName("");
                    setUsername("");
                    setPassword("");
                    setUserError("");
                  }
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-medium"
              >
                {creatingUser ? "Criando..." : "Criar usuário"}
              </button>
            </div>

            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between border border-border rounded-md px-3 py-2 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      @{user.username} · {user.role === "admin" ? "Administrador" : "Funcionário"}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Remover o usuário ${user.name}? As atividades criadas por ele e as que ficariam sem responsável também serão removidas.`
                        )
                      )
                        return;
                      const error = await onDeleteUser(user.id);
                      if (error) setUserError(error);
                    }}
                    className="flex-shrink-0 px-2.5 py-1 text-[11px] border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded"
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
