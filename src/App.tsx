import { useState, useCallback } from "react";
import { EMPLOYEES, INITIAL_TASKS } from "./data";
import type { Task, Employee, TaskStatus, UserAccount } from "./types";
import Avatar from "./components/Avatar";
import AdminPanel from "./panels/AdminPanel";
import EmployeePanel from "./panels/EmployeePanel";
import LoginScreen from "./LoginScreen";

type Session =
  | { role: "none" }
  | { role: "admin"; user: UserAccount }
  | { role: "employee"; employee: Employee; user: UserAccount };

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: "u-admin",
    username: "admin",
    passwordHash: "3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121",
    role: "admin",
    name: "Administrador",
  },
  ...EMPLOYEES.map((emp) => ({
    id: `u-${emp.id}`,
    username: emp.name.toLowerCase().replace(/[^a-z0-9]+/g, "."),
    passwordHash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
    role: "employee" as const,
    employeeId: emp.id,
    name: emp.name,
  })),
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem("taskflow-employees-v1");
      return saved ? JSON.parse(saved) as Employee[] : EMPLOYEES;
    } catch {
      return EMPLOYEES;
    }
  });
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem("taskflow-users-v1");
      return saved ? JSON.parse(saved) as UserAccount[] : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });
  const [session, setSession] = useState<Session>({ role: "none" });

  const persistUsers = useCallback((next: UserAccount[]) => {
    setUsers(next);
    localStorage.setItem("taskflow-users-v1", JSON.stringify(next));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return "Usuário ou senha incorretos.";
    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) return "Usuário ou senha incorretos.";

    if (user.role === "admin") {
      setSession({ role: "admin", user });
      return null;
    }

    const employee = employees.find(e => e.id === user.employeeId);
    if (!employee) return "Esta conta não está vinculada a um funcionário.";
    setSession({ role: "employee", employee, user });
    return null;
  }, [users, employees]);

  const createUser = useCallback(async (data: { name: string; role: "admin" | "employee"; username: string; password: string; jobRole?: string }): Promise<string | null> => {
    const normalizedUsername = data.username.toLowerCase();
    if (users.some(u => u.username.toLowerCase() === normalizedUsername)) return "Esse nome de usuário já existe.";
    const id = genId();
    const passwordHash = await hashPassword(data.password);

    if (data.role === "admin") {
      const account: UserAccount = { id, username: normalizedUsername, passwordHash, role: "admin", name: data.name };
      persistUsers([...users, account]);
      return null;
    }

    const employee: Employee = {
      id: `e${id}`,
      name: data.name,
      role: data.jobRole?.trim() || "Funcionário",
      avatar: data.name.split(/\s+/).filter(Boolean).map(p => p[0]).join("").slice(0, 2).toUpperCase(),
    };
    const account: UserAccount = {
      id: `u${id}`,
      username: normalizedUsername,
      passwordHash,
      role: "employee",
      employeeId: employee.id,
      name: employee.name,
    };
    const nextEmployees = [...employees, employee];
    setEmployees(nextEmployees);
    localStorage.setItem("taskflow-employees-v1", JSON.stringify(nextEmployees));
    persistUsers([...users, account]);
    return null;
  }, [users, employees, persistUsers]);

  const createTask = useCallback(
    (data: Omit<Task, "id" | "events" | "comments" | "accumulatedSeconds" | "status" | "createdAt">) => {
      const now = Date.now();
      const task: Task = {
        ...data,
        id: `t${genId()}`,
        status: "pending",
        accumulatedSeconds: 0,
        createdAt: now,
        events: [{ id: genId(), type: "created", timestamp: now, by: "Administrador" }],
        comments: [],
      };
      setTasks((prev) => [task, ...prev]);
    },
    []
  );

  const startTask = useCallback(
    (taskId: string, employeeName: string) => {
      const now = Date.now();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          if (t.status === "in_progress") return t;
          const isPaused = t.status === "paused";
          const accumulated =
            isPaused && t.pausedAt && t.startedAt
              ? t.accumulatedSeconds + Math.floor((t.pausedAt - t.startedAt) / 1000)
              : t.accumulatedSeconds;
          return {
            ...t,
            status: "in_progress" as TaskStatus,
            startedAt: now,
            pausedAt: undefined,
            accumulatedSeconds: isPaused ? accumulated : t.accumulatedSeconds,
            events: [
              ...t.events,
              {
                id: genId(),
                type: isPaused ? "resumed" : "started",
                timestamp: now,
                by: employeeName,
              },
            ],
          };
        })
      );
    },
    []
  );

  const pauseTask = useCallback((taskId: string, employeeName: string) => {
    const now = Date.now();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId || t.status !== "in_progress") return t;
        const extra = t.startedAt ? Math.floor((now - t.startedAt) / 1000) : 0;
        return {
          ...t,
          status: "paused" as TaskStatus,
          pausedAt: now,
          accumulatedSeconds: t.accumulatedSeconds + extra,
          startedAt: undefined,
          events: [
            ...t.events,
            { id: genId(), type: "paused", timestamp: now, by: employeeName },
          ],
        };
      })
    );
  }, []);

  const completeTask = useCallback((taskId: string, employeeName: string) => {
    const now = Date.now();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const extra =
          t.status === "in_progress" && t.startedAt
            ? Math.floor((now - t.startedAt) / 1000)
            : 0;
        return {
          ...t,
          status: "completed" as TaskStatus,
          completedAt: now,
          startedAt: undefined,
          pausedAt: undefined,
          accumulatedSeconds: t.accumulatedSeconds + extra,
          events: [
            ...t.events,
            { id: genId(), type: "completed", timestamp: now, by: employeeName },
          ],
        };
      })
    );
  }, []);

  const cancelTask = useCallback((taskId: string) => {
    const now = Date.now();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "cancelled" as TaskStatus,
              events: [
                ...t.events,
                { id: genId(), type: "cancelled", timestamp: now, by: "Administrador" },
              ],
            }
          : t
      )
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const rescheduleTask = useCallback((taskId: string, deadline: number) => {
    const now = Date.now();
    setTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t;
      const nextStatus: TaskStatus = t.status === "overdue" ? "pending" : t.status;
      return {
        ...t,
        deadline,
        status: nextStatus,
        events: [...t.events, { id: genId(), type: "reassigned", timestamp: now, by: "Administrador", note: `Prazo reagendado para ${new Date(deadline).toLocaleString("pt-BR")}` }],
      };
    }));
  }, []);

  const deleteUser = useCallback((userId: string): string | null => {
    const user = users.find(u => u.id === userId);
    if (!user) return "Usuário não encontrado.";
    if (user.role === "admin" && users.filter(u => u.role === "admin").length === 1) {
      return "Não é possível remover o último administrador.";
    }
    if (user.role === "employee" && user.employeeId) {
      setTasks(prev => prev.filter(t => !t.assigneeIds.includes(user.employeeId!)));
      const nextEmployees = employees.filter(e => e.id !== user.employeeId);
      setEmployees(nextEmployees);
      localStorage.setItem("taskflow-employees-v1", JSON.stringify(nextEmployees));
    }
    persistUsers(users.filter(u => u.id !== userId));
    return null;
  }, [users, employees, persistUsers]);

  const addComment = useCallback(
    (taskId: string, text: string, authorId: string, authorName: string) => {
      const now = Date.now();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                comments: [
                  ...t.comments,
                  { id: genId(), authorId, authorName, text, timestamp: now },
                ],
                events: [
                  ...t.events,
                  {
                    id: genId(),
                    type: "commented",
                    timestamp: now,
                    by: authorName,
                    note: text.slice(0, 60),
                  },
                ],
              }
            : t
        )
      );
    },
    []
  );

  // ─── Login screen ───────────────────────────────────────────────────────────
  if (session.role === "none") {
    return (
      <LoginScreen
        employees={employees}
        users={users}
        onLogin={login}
      />
    );
  }

  // ─── Shell (sidebar + main) ──────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
              <span className="text-white font-bold text-xs font-mono">T</span>
            </div>
            <span className="text-sm font-semibold tracking-wide">TaskFlow</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">gestão de tarefas</p>
        </div>

        {/* Session info */}
        <div className="px-4 py-3 border-b border-border">
          {session.role === "admin" ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-blue-400 font-mono text-xs">⊞</span>
              </div>
              <div>
                <p className="text-xs font-semibold">Administrador</p>
                <p className="text-xs text-muted-foreground font-mono">acesso total</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar initials={(session as { role: "employee"; employee: Employee }).employee.avatar} size="sm" />
              <div>
                <p className="text-xs font-semibold">{(session as { role: "employee"; employee: Employee }).employee.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{(session as { role: "employee"; employee: Employee }).employee.role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <nav className="flex-1 p-3 space-y-1">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest px-2 pb-1 pt-1">
            Resumo
          </p>
          {[
            { label: "Total", value: tasks.length, color: "text-foreground" },
            { label: "Em andamento", value: tasks.filter((t) => t.status === "in_progress").length, color: "text-blue-400" },
            { label: "Atrasadas", value: tasks.filter((t) => t.status === "overdue").length, color: "text-red-400" },
            { label: "Concluídas", value: tasks.filter((t) => t.status === "completed").length, color: "text-emerald-400" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground font-mono">{item.label}</span>
              <span className={`text-xs font-mono font-semibold tabular-nums ${item.color}`}>{item.value}</span>
            </div>
          ))}

          {/* Employee quick-view (admin only) */}
          {session.role === "admin" && (
            <>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest px-2 pb-1 pt-4">
                Equipe
              </p>
              {employees.map((emp) => {
                const empTasks = tasks.filter((t) => t.assigneeIds.includes(emp.id));
                const active = empTasks.find((t) => t.status === "in_progress");
                const overdue = empTasks.filter((t) => t.status === "overdue").length;
                return (
                  <div key={emp.id} className="flex items-center gap-2 px-2 py-1.5">
                    <div className="relative flex-shrink-0">
                      <Avatar initials={emp.avatar} size="sm" />
                      {active && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-400 border border-card timer-running" />
                      )}
                      {!active && overdue > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400 border border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{emp.name}</p>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {empTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => setSession({ role: "none" })}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm transition-colors font-mono"
          >
            <span>←</span>
            <span>Trocar perfil</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        {session.role === "admin" ? (
          <AdminPanel
            tasks={tasks}
            employees={employees}
            users={users}
            onCreateUser={createUser}
            onCreateTask={createTask}
            onAddComment={(taskId, text) => addComment(taskId, text, "admin", "Administrador")}
            onCancelTask={cancelTask}
            onDeleteTask={deleteTask}
            onRescheduleTask={rescheduleTask}
            onDeleteUser={deleteUser}
          />
        ) : (
          <EmployeePanel
            currentEmployee={(session as { role: "employee"; employee: Employee }).employee}
            tasks={tasks}
            employees={employees}
            onStartTask={(taskId) =>
              startTask(taskId, (session as { role: "employee"; employee: Employee }).employee.name)
            }
            onPauseTask={(taskId) =>
              pauseTask(taskId, (session as { role: "employee"; employee: Employee }).employee.name)
            }
            onCompleteTask={(taskId) =>
              completeTask(taskId, (session as { role: "employee"; employee: Employee }).employee.name)
            }
            onAddComment={(taskId, text) =>
              addComment(
                taskId,
                text,
                (session as { role: "employee"; employee: Employee }).employee.id,
                (session as { role: "employee"; employee: Employee }).employee.name
              )
            }
          />
        )}
      </main>
    </div>
  );
}
