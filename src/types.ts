export type Priority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "pending" | "in_progress" | "paused" | "completed" | "overdue" | "cancelled";

export interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

/** Conta de acesso vinda da API — o hash da senha nunca sai do servidor. */
export interface UserAccount {
  id: string;
  username: string;
  role: "admin" | "employee";
  employeeId?: string;
  name: string;
}

export interface TaskEvent {
  id: string;
  type: "created" | "started" | "paused" | "resumed" | "completed" | "reassigned" | "commented" | "cancelled";
  timestamp: number;
  by: string;
  note?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  assigneeIds: string[];
  estimatedMinutes: number;
  deadline: number;
  createdAt: number;
  /** Quem criou a atividade: "admin" ou o id do funcionário. */
  createdById: string;
  createdByName: string;
  startedAt?: number;
  completedAt?: number;
  pausedAt?: number;
  accumulatedSeconds: number;
  events: TaskEvent[];
  comments: Comment[];
  tags: string[];
}

/** Campos preenchidos no formulário de criação; o restante é gerado pelo App. */
export type NewTaskInput = Omit<
  Task,
  "id" | "events" | "comments" | "accumulatedSeconds" | "status" | "createdAt" | "createdById" | "createdByName"
>;
