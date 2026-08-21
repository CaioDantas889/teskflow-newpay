import type { Employee, Task, TaskStatus } from "../types";
import { BOARD_COLUMNS, STATUS_CONFIG } from "../utils";
import TaskCard from "./TaskCard";

interface KanbanBoardProps {
  tasks: Task[];
  employees: Employee[];
  selectedId: string | null;
  onSelect: (taskId: string) => void;
  /** Ações por atividade — cada painel decide quais entrega. */
  onStart?: (taskId: string) => void;
  onPause?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  /** Botão no rodapé da primeira coluna. */
  onCreate?: () => void;
  columns?: TaskStatus[];
}

export default function KanbanBoard({
  tasks,
  employees,
  selectedId,
  onSelect,
  onStart,
  onPause,
  onComplete,
  onCreate,
  columns = BOARD_COLUMNS,
}: KanbanBoardProps) {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden bg-background">
      <div className="flex gap-3 h-full p-3 min-w-max">
        {columns.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const items = tasks.filter((t) => t.status === status);

          return (
            <section
              key={status}
              className="w-[19.5rem] flex-shrink-0 flex flex-col rounded-lg border border-border bg-column overflow-hidden"
            >
              {/* Faixa colorida + cabeçalho da coluna */}
              <div className={`h-[3px] ${cfg.dot}`} />
              <header className="px-3 py-2.5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  <span className="text-[13px] font-medium">{cfg.label}</span>
                  <span className="ml-auto text-[11px] font-mono text-muted-foreground">
                    {items.length} {items.length === 1 ? "atividade" : "atividades"}
                  </span>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {items.length === 0 ? (
                  <p className="text-center text-[11px] text-muted-foreground/60 py-8 font-mono">
                    Nenhuma atividade
                  </p>
                ) : (
                  items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      employees={employees}
                      selected={selectedId === task.id}
                      onClick={() => onSelect(task.id)}
                      onStart={
                        onStart && (task.status === "pending" || task.status === "paused" || task.status === "overdue")
                          ? () => onStart(task.id)
                          : undefined
                      }
                      onPause={onPause && task.status === "in_progress" ? () => onPause(task.id) : undefined}
                      onComplete={
                        onComplete && (task.status === "in_progress" || task.status === "paused")
                          ? () => onComplete(task.id)
                          : undefined
                      }
                    />
                  ))
                )}
              </div>

              {onCreate && status === columns[0] && (
                <button
                  onClick={onCreate}
                  className="border-t border-border/60 px-3 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-left"
                >
                  + Nova atividade
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
