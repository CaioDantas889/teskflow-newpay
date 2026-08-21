import { useState, useCallback, useEffect } from "react";
import type { Task, Employee, NewTaskInput } from "./types";
import { api, ApiError, type Account, type Session } from "./api";
import Avatar from "./components/Avatar";
import AdminPanel from "./panels/AdminPanel";
import EmployeePanel from "./panels/EmployeePanel";
import LoginScreen from "./LoginScreen";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<Account[]>([]);
  const [booting, setBooting] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Traduz a falha em mensagem e derruba a sessão se o token não vale mais. */
  const report = useCallback((problem: unknown) => {
    if (problem instanceof ApiError) {
      // 0 = servidor fora do ar, 503 = servidor de pé mas sem banco.
      if (problem.status === 0 || problem.status === 503) setOffline(true);
      if (problem.status === 401) {
        api.logout();
        setSession(null);
      }
      setError(problem.message);
      return;
    }
    setError("Erro inesperado.");
  }, []);

  const loadData = useCallback(async (current: Session) => {
    const [taskList, team] = await Promise.all([api.tasks(), api.employees()]);
    setTasks(taskList);
    setEmployees(team);
    // A lista de contas é exclusiva do painel administrativo.
    setUsers(current.user.role === "admin" ? await api.users() : []);
    setOffline(false);
  }, []);

  // Retoma a sessão salva — é o que mantém o login ao recarregar a página.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const restored = await api.me();
        if (!active) return;
        if (restored) {
          setSession(restored);
          await loadData(restored);
        }
      } catch (problem) {
        if (active) report(problem);
      } finally {
        if (active) setBooting(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadData, report]);

  /** Executa uma ação na API e mostra o erro na barra do topo, se houver. */
  const run = useCallback(
    async (action: () => Promise<void>) => {
      try {
        setError(null);
        await action();
      } catch (problem) {
        report(problem);
      }
    },
    [report]
  );

  const applyTask = useCallback((updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      try {
        const next = await api.login(username, password);
        setSession(next);
        await loadData(next);
        return null;
      } catch (problem) {
        if (problem instanceof ApiError) {
          if (problem.status === 0 || problem.status === 503) setOffline(true);
          return problem.message;
        }
        return "Erro inesperado.";
      }
    },
    [loadData]
  );

  const logout = useCallback(() => {
    api.logout();
    setSession(null);
    setTasks([]);
    setEmployees([]);
    setUsers([]);
    setError(null);
  }, []);

  const createTask = useCallback(
    (data: NewTaskInput) =>
      run(async () => {
        const created = await api.createTask(data);
        setTasks((prev) => [created, ...prev]);
      }),
    [run]
  );

  const startTask = useCallback((taskId: string) => run(async () => applyTask(await api.startTask(taskId))), [run, applyTask]);
  const pauseTask = useCallback((taskId: string) => run(async () => applyTask(await api.pauseTask(taskId))), [run, applyTask]);
  const completeTask = useCallback((taskId: string) => run(async () => applyTask(await api.completeTask(taskId))), [run, applyTask]);
  const cancelTask = useCallback((taskId: string) => run(async () => applyTask(await api.cancelTask(taskId))), [run, applyTask]);

  const rescheduleTask = useCallback(
    (taskId: string, deadline: number) => run(async () => applyTask(await api.rescheduleTask(taskId, deadline))),
    [run, applyTask]
  );

  const addComment = useCallback(
    (taskId: string, text: string) => run(async () => applyTask(await api.addComment(taskId, text))),
    [run, applyTask]
  );

  const deleteTask = useCallback(
    (taskId: string) =>
      run(async () => {
        await api.deleteTask(taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }),
    [run]
  );

  const createUser = useCallback(
    async (data: { name: string; role: "admin" | "employee"; username: string; password: string; jobRole?: string }): Promise<string | null> => {
      try {
        await api.createUser(data);
        const [accounts, team] = await Promise.all([api.users(), api.employees()]);
        setUsers(accounts);
        setEmployees(team);
        return null;
      } catch (problem) {
        return problem instanceof ApiError ? problem.message : "Erro inesperado.";
      }
    },
    []
  );

  const deleteUser = useCallback(
    async (userId: string): Promise<string | null> => {
      try {
        await api.deleteUser(userId);
        // O banco removeu as atividades do funcionário junto: recarrega tudo.
        const [accounts, team, taskList] = await Promise.all([api.users(), api.employees(), api.tasks()]);
        setUsers(accounts);
        setEmployees(team);
        setTasks(taskList);
        return null;
      } catch (problem) {
        return problem instanceof ApiError ? problem.message : "Erro inesperado.";
      }
    },
    []
  );

  // ─── Carregando ─────────────────────────────────────────────────────────────
  if (booting) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm font-mono">Carregando...</p>
      </div>
    );
  }

  // ─── Servidor fora do ar ────────────────────────────────────────────────────
  if (offline && !session) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md border border-border bg-card rounded-sm p-6 animate-slide-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <h1 className="text-sm font-semibold">Servidor indisponível</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O TaskFlow guarda os dados em um banco PostgreSQL, acessado pela API da pasta{" "}
            <span className="font-mono text-foreground">server/</span>. Suba os dois e recarregue a página:
          </p>
          <pre className="mt-4 bg-secondary border border-border rounded-sm p-3 text-xs font-mono overflow-x-auto">
{`cd server
docker compose up -d
npm install && npm run db:seed
npm run dev`}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-sm text-sm font-medium"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  // ─── Login ──────────────────────────────────────────────────────────────────
  if (!session) {
    return <LoginScreen onLogin={login} />;
  }

  const isAdmin = session.user.role === "admin";
  const employee = session.employee;

  // ─── Shell (sidebar + main) ─────────────────────────────────────────────────
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
          {isAdmin || !employee ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-blue-400 font-mono text-xs">⊞</span>
              </div>
              <div>
                <p className="text-xs font-semibold">{session.user.name}</p>
                <p className="text-xs text-muted-foreground font-mono">acesso total</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar initials={employee.avatar} size="sm" />
              <div>
                <p className="text-xs font-semibold">{employee.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{employee.role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <nav className="flex-1 p-3 space-y-1">
          <div className="grid grid-cols-2 gap-1.5 px-1 pb-2">
            {[
              { label: "Total", value: tasks.length, color: "text-foreground" },
              { label: "Ativas", value: tasks.filter((t) => t.status === "in_progress").length, color: "text-blue-400" },
              { label: "Atrasadas", value: tasks.filter((t) => t.status === "overdue").length, color: "text-red-400" },
              { label: "Concluídas", value: tasks.filter((t) => t.status === "completed").length, color: "text-emerald-400" },
            ].map((item) => (
              <div key={item.label} className="border border-border rounded-sm px-2 py-1.5">
                <p className={`text-sm font-mono font-semibold tabular-nums ${item.color}`}>{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Employee quick-view (admin only) */}
          {isAdmin && (
            <>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest px-2 pb-1 pt-2">
                Equipe
              </p>
              <div className="flex flex-wrap gap-2 px-2">
                {employees.map((emp) => {
                  const empTasks = tasks.filter((t) => t.assigneeIds.includes(emp.id));
                  const active = empTasks.find((t) => t.status === "in_progress");
                  const overdue = empTasks.filter((t) => t.status === "overdue").length;
                  return (
                    <div key={emp.id} className="relative flex-shrink-0" title={emp.name}>
                      <Avatar initials={emp.avatar} size="sm" />
                      {active && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-400 border border-card timer-running" />
                      )}
                      {!active && overdue > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400 border border-card" />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm transition-colors font-mono"
          >
            <span>←</span>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {error && (
          <div className="flex items-center gap-3 px-6 py-2 bg-red-500/10 border-b border-red-500/30">
            <span className="text-xs text-red-400 flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-400/70 hover:text-red-400 font-mono"
            >
              fechar
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {isAdmin || !employee ? (
            <AdminPanel
              tasks={tasks}
              employees={employees}
              users={users}
              onCreateUser={createUser}
              onCreateTask={createTask}
              onAddComment={addComment}
              onCancelTask={cancelTask}
              onDeleteTask={deleteTask}
              onRescheduleTask={rescheduleTask}
              onDeleteUser={deleteUser}
            />
          ) : (
            <EmployeePanel
              currentEmployee={employee}
              tasks={tasks}
              employees={employees}
              onCreateTask={createTask}
              onStartTask={startTask}
              onPauseTask={pauseTask}
              onCompleteTask={completeTask}
              onAddComment={addComment}
            />
          )}
        </div>
      </main>
    </div>
  );
}
