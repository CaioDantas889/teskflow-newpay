export type Priority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "pending" | "in_progress" | "paused" | "completed" | "overdue" | "cancelled";

export interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
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
  startedAt?: number;
  completedAt?: number;
  pausedAt?: number;
  accumulatedSeconds: number;
  events: TaskEvent[];
  comments: Comment[];
  tags: string[];
}
