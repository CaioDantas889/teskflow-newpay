import type { Employee, NewTaskInput, Task, UserAccount } from "./types";

/**
 * Cliente da API do TaskFlow (pasta `server/`, PostgreSQL por trás).
 * A URL vem de VITE_API_URL; sem ela, cai no servidor local padrão.
 */
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";
const TOKEN_KEY = "taskflow-token";

/** Conta de acesso, do jeito que a API devolve (sem a senha). */
export type Account = UserAccount;

export interface Session {
  user: { id: string; username: string; role: "admin" | "employee"; name: string };
  employee?: Employee;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Armazenamento indisponível: a sessão só não sobrevive ao recarregamento.
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Não foi possível falar com o servidor. Ele está rodando?", 0);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError((body as { error?: string }).error ?? "Erro inesperado.", response.status);
  }
  return body as T;
}

export const api = {
  async login(username: string, password: string): Promise<Session> {
    const data = await request<{ token: string; session: Session }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    return data.session;
  },

  logout(): void {
    setToken(null);
  },

  /** Retoma a sessão salva ao recarregar a página. */
  async me(): Promise<Session | null> {
    if (!getToken()) return null;
    try {
      const data = await request<{ session: Session }>("/auth/me");
      return data.session;
    } catch (error) {
      // Token expirado ou conta removida: começa deslogado.
      if (error instanceof ApiError && error.status === 401) {
        setToken(null);
        return null;
      }
      throw error;
    }
  },

  employees: () => request<Employee[]>("/employees"),

  tasks: () => request<Task[]>("/tasks"),

  createTask: (data: NewTaskInput & { assigneeIds?: string[] }) =>
    request<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),

  startTask: (id: string) => request<Task>(`/tasks/${id}/start`, { method: "POST" }),
  pauseTask: (id: string) => request<Task>(`/tasks/${id}/pause`, { method: "POST" }),
  completeTask: (id: string) => request<Task>(`/tasks/${id}/complete`, { method: "POST" }),
  cancelTask: (id: string) => request<Task>(`/tasks/${id}/cancel`, { method: "POST" }),

  rescheduleTask: (id: string, deadline: number) =>
    request<Task>(`/tasks/${id}/deadline`, { method: "PATCH", body: JSON.stringify({ deadline }) }),

  addComment: (id: string, text: string) =>
    request<Task>(`/tasks/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) }),

  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),

  users: () => request<Account[]>("/users"),

  createUser: (data: {
    name: string;
    role: "admin" | "employee";
    username: string;
    password: string;
    jobRole?: string;
  }) => request<Account>("/users", { method: "POST", body: JSON.stringify(data) }),

  deleteUser: (id: string) => request<void>(`/users/${id}`, { method: "DELETE" }),
};
