import { useState } from "react";
import type { Employee, Priority, Task, NewTaskInput } from "../types";
import { PRIORITY_CONFIG } from "../utils";
import Avatar from "./Avatar";

interface TaskFormModalProps {
  employees: Employee[];
  onClose: () => void;
  onSubmit: (task: NewTaskInput) => void;
  /** Nome de quem está criando — fica registrado na atividade. */
  creatorName: string;
  /**
   * Quando informado, a atividade é sempre do próprio funcionário:
   * o seletor de responsáveis vira somente leitura.
   */
  lockedAssignee?: Employee;
  /** Atividade existente: o formulário abre preenchido, em modo de edição. */
  task?: Task;
  heading?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toTimeInput = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function TaskFormModal({
  employees,
  onClose,
  onSubmit,
  creatorName,
  lockedAssignee,
  task,
  heading,
}: TaskFormModalProps) {
  const isEditing = Boolean(task);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimatedMinutes ?? 60);
  const [deadlineDate, setDeadlineDate] = useState(task ? toDateInput(task.deadline) : "");
  const [deadlineTime, setDeadlineTime] = useState(task ? toTimeInput(task.deadline) : "18:00");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task?.assigneeIds ?? (lockedAssignee ? [lockedAssignee.id] : [])
  );
  const [tags, setTags] = useState((task?.tags ?? []).join(", "));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Título obrigatório";
    if (title.length > 120) e.title = "Máximo 120 caracteres";
    if (!lockedAssignee && assigneeIds.length === 0) e.assignees = "Selecione ao menos um responsável";
    if (!deadlineDate) e.deadline = "Data obrigatória";
    if (!deadlineTime) e.deadline = "Hora obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      estimatedMinutes,
      deadline: new Date(`${deadlineDate}T${deadlineTime}`).getTime(),
      assigneeIds,
      tags: tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
    });
    onClose();
  }

  const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
  const deadlinePreview = deadlineDate
    ? new Date(`${deadlineDate}T${deadlineTime || "00:00"}`).toLocaleString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-in shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="text-sm font-semibold">
              {heading ?? (isEditing ? "Editar Atividade" : "Nova Tarefa")}
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {isEditing ? `criada por ${task!.createdByName}` : `criada por ${creatorName}`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Título */}
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Descreva a tarefa brevemente..."
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-muted-foreground"
            />
            <div className="flex justify-between mt-1">
              {errors.title && <span className="text-[11px] text-red-400">{errors.title}</span>}
              <span className="text-[11px] text-muted-foreground font-mono ml-auto">{title.length}/120</span>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detalhes, contexto, links relevantes..."
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500/50 placeholder:text-muted-foreground"
            />
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Prioridade <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-2 text-[11px] font-mono font-medium border rounded-md transition-all ${
                      priority === p
                        ? `${cfg.color} ${cfg.bg} ${cfg.border}`
                        : "text-muted-foreground border-border hover:border-slate-600"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prazo: data + hora */}
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Prazo <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="flex justify-between mt-1 gap-2">
              {errors.deadline && <span className="text-[11px] text-red-400">{errors.deadline}</span>}
              {deadlinePreview && (
                <span className="text-[11px] text-muted-foreground font-mono ml-auto">
                  vence {deadlinePreview}
                </span>
              )}
            </div>
          </div>

          {/* Duração estimada */}
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Duração estimada (min)
            </label>
            <input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              min={1}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Responsáveis */}
          {lockedAssignee ? (
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Responsável
              </label>
              <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-blue-500/50 bg-blue-500/10">
                <Avatar initials={lockedAssignee.avatar} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{lockedAssignee.name}</p>
                  <p className="text-[11px] text-muted-foreground">{lockedAssignee.role}</p>
                </div>
                <span className="text-[11px] font-mono text-blue-400 ml-auto flex-shrink-0">você</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Atividades criadas por você ficam atribuídas a você mesmo.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Responsáveis <span className="text-red-400">*</span>
              </label>
              <div className="space-y-1.5">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => toggleAssignee(emp.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md border text-left transition-all ${
                      assigneeIds.includes(emp.id)
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-border hover:border-slate-600 bg-secondary"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[11px] border ${
                        assigneeIds.includes(emp.id)
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "border-border"
                      }`}
                    >
                      {assigneeIds.includes(emp.id) && "✓"}
                    </div>
                    <span className="text-sm font-medium">{emp.name}</span>
                    <span className="text-[11px] text-muted-foreground ml-auto">{emp.role}</span>
                  </button>
                ))}
              </div>
              {errors.assignees && (
                <span className="text-[11px] text-red-400 mt-1 block">{errors.assignees}</span>
              )}
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Tags (separadas por vírgula)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ex: bug, urgente, frontend"
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-muted-foreground"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              As tags também são usadas pela busca do painel administrativo.
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium border border-border hover:border-slate-600 rounded-md transition-colors text-muted-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
          >
            {isEditing ? "Salvar alterações" : lockedAssignee ? "Criar Atividade" : "Criar Tarefa"}
          </button>
        </div>
      </div>
    </div>
  );
}
