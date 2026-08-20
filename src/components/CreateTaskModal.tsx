import { useState } from "react";
import type { Employee, Task, Priority } from "../types";
import { PRIORITY_CONFIG } from "../utils";

interface CreateTaskModalProps {
  employees: Employee[];
  onClose: () => void;
  onCreate: (task: Omit<Task, "id" | "events" | "comments" | "accumulatedSeconds" | "status" | "createdAt">) => void;
}

export default function CreateTaskModal({ employees, onClose, onCreate }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("18:00");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Título obrigatório";
    if (title.length > 120) e.title = "Máximo 120 caracteres";
    if (assigneeIds.length === 0) e.assignees = "Selecione ao menos um responsável";
    if (!deadlineDate) e.deadline = "Prazo obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const deadline = new Date(`${deadlineDate}T${deadlineTime}`).getTime();
    onCreate({
      title: title.trim(),
      description: description.trim(),
      priority,
      estimatedMinutes,
      deadline,
      assigneeIds,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    onClose();
  }

  const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-in shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-sm font-semibold">Nova Tarefa</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Descreva a tarefa brevemente..."
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-muted-foreground"
            />
            <div className="flex justify-between mt-1">
              {errors.title && <span className="text-xs text-red-400">{errors.title}</span>}
              <span className="text-xs text-muted-foreground font-mono ml-auto">{title.length}/120</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detalhes, contexto, links relevantes..."
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500/50 placeholder:text-muted-foreground"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Prioridade <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-2 text-xs font-mono font-medium border rounded-sm transition-all ${
                      priority === p
                        ? `${cfg.color} ${cfg.bg} ${cfg.border}`
                        : "text-muted-foreground border-border hover:border-slate-500"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time + Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Duração Estimada (min)
              </label>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                min={1}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Prazo <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500/50"
              />
              {errors.deadline && <span className="text-xs text-red-400">{errors.deadline}</span>}
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Responsáveis <span className="text-red-400">*</span>
            </label>
            <div className="space-y-1.5">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => toggleAssignee(emp.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm border text-left transition-all ${
                    assigneeIds.includes(emp.id)
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-border hover:border-slate-500 bg-secondary"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center text-xs ${
                    assigneeIds.includes(emp.id) ? "bg-blue-500 border-blue-500 text-white" : "border-border"
                  }`}>
                    {assigneeIds.includes(emp.id) && "✓"}
                  </div>
                  <span className="text-sm font-medium">{emp.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{emp.role}</span>
                </button>
              ))}
            </div>
            {errors.assignees && <span className="text-xs text-red-400 mt-1 block">{errors.assignees}</span>}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Tags (separadas por vírgula)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ex: bug, urgente, frontend"
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium border border-border hover:border-slate-500 rounded-sm transition-colors text-muted-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-sm transition-colors"
          >
            Criar Tarefa
          </button>
        </div>
      </div>
    </div>
  );
}
