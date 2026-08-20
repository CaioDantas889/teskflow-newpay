import type { Employee, Task } from "./types";

export const EMPLOYEES: Employee[] = [
  { id: "e1", name: "Ana Oliveira", role: "Dev Frontend", avatar: "AO" },
  { id: "e2", name: "Bruno Souza", role: "Dev Backend", avatar: "BS" },
  { id: "e3", name: "Carla Mendes", role: "QA Engineer", avatar: "CM" },
  { id: "e4", name: "Diego Ferreira", role: "DevOps", avatar: "DF" },
  { id: "e5", name: "Elisa Costa", role: "Designer UX", avatar: "EC" },
];

const now = Date.now();
const h = (n: number) => n * 3600000;
const m = (n: number) => n * 60000;

export const INITIAL_TASKS: Task[] = [
  {
    id: "t1",
    title: "Corrigir bug de autenticação SSO no módulo de login",
    description:
      "Usuários com domínio @empresa.com.br não conseguem fazer login via SSO. O erro aparece após o redirect do provedor de identidade. Verificar configuração do callback URL e validação do token JWT.",
    priority: "critical",
    status: "in_progress",
    assigneeIds: ["e2"],
    estimatedMinutes: 90,
    deadline: now + h(2),
    createdAt: now - h(3),
    startedAt: now - m(45),
    accumulatedSeconds: 45 * 60,
    events: [
      { id: "ev1", type: "created", timestamp: now - h(3), by: "Admin" },
      { id: "ev2", type: "started", timestamp: now - m(45), by: "Bruno Souza" },
    ],
    comments: [
      { id: "c1", authorId: "e2", authorName: "Bruno Souza", text: "Identifiquei o problema: o callback URL está incorreto no provedor. Ajustando agora.", timestamp: now - m(30) },
    ],
    tags: ["bug", "auth", "urgente"],
  },
  {
    id: "t2",
    title: "Implementar dashboard de métricas para relatório mensal",
    description:
      "Criar componentes de gráfico para exibir KPIs do mês: vendas por região, taxa de conversão, ticket médio e NPS. Usar Recharts conforme design aprovado no Figma.",
    priority: "high",
    status: "pending",
    assigneeIds: ["e1", "e5"],
    estimatedMinutes: 240,
    deadline: now + h(24),
    createdAt: now - h(1),
    accumulatedSeconds: 0,
    events: [{ id: "ev3", type: "created", timestamp: now - h(1), by: "Admin" }],
    comments: [],
    tags: ["feature", "dashboard", "design"],
  },
  {
    id: "t3",
    title: "Pipeline CI/CD para ambiente de staging",
    description:
      "Configurar GitHub Actions para deploy automático no ambiente de staging após merge na branch develop. Incluir testes de integração e smoke tests.",
    priority: "high",
    status: "pending",
    assigneeIds: ["e4"],
    estimatedMinutes: 180,
    deadline: now + h(8),
    createdAt: now - h(5),
    accumulatedSeconds: 0,
    events: [{ id: "ev4", type: "created", timestamp: now - h(5), by: "Admin" }],
    comments: [],
    tags: ["devops", "ci-cd"],
  },
  {
    id: "t4",
    title: "Testes de regressão — release v2.4",
    description:
      "Executar suite completa de testes de regressão para a release v2.4. Focar nos módulos de pagamento, perfil de usuário e notificações. Documentar resultados no Confluence.",
    priority: "medium",
    status: "completed",
    assigneeIds: ["e3"],
    estimatedMinutes: 120,
    deadline: now - h(1),
    createdAt: now - h(8),
    startedAt: now - h(5),
    completedAt: now - h(2),
    accumulatedSeconds: 3 * 3600,
    events: [
      { id: "ev5", type: "created", timestamp: now - h(8), by: "Admin" },
      { id: "ev6", type: "started", timestamp: now - h(5), by: "Carla Mendes" },
      { id: "ev7", type: "completed", timestamp: now - h(2), by: "Carla Mendes" },
    ],
    comments: [
      { id: "c2", authorId: "e3", authorName: "Carla Mendes", text: "Todos os 247 casos de teste passaram. 3 casos de borda documentados como conhecidos.", timestamp: now - h(2) },
    ],
    tags: ["qa", "release"],
  },
  {
    id: "t5",
    title: "Atualizar documentação da API REST v3",
    description:
      "Revisar e atualizar documentação OpenAPI 3.0 com os novos endpoints adicionados no sprint. Incluir exemplos de request/response e códigos de erro.",
    priority: "low",
    status: "pending",
    assigneeIds: ["e2"],
    estimatedMinutes: 60,
    deadline: now + h(48),
    createdAt: now - h(2),
    accumulatedSeconds: 0,
    events: [{ id: "ev8", type: "created", timestamp: now - h(2), by: "Admin" }],
    comments: [],
    tags: ["docs", "api"],
  },
  {
    id: "t6",
    title: "Otimizar queries lentas no relatório de estoque",
    description:
      "O relatório de estoque está demorando mais de 30s para carregar. Analisar EXPLAIN ANALYZE das queries, adicionar índices necessários e considerar materialização.",
    priority: "critical",
    status: "overdue",
    assigneeIds: ["e2", "e4"],
    estimatedMinutes: 120,
    deadline: now - h(2),
    createdAt: now - h(10),
    startedAt: now - h(6),
    pausedAt: now - h(3),
    accumulatedSeconds: 3 * 3600,
    events: [
      { id: "ev9", type: "created", timestamp: now - h(10), by: "Admin" },
      { id: "ev10", type: "started", timestamp: now - h(6), by: "Bruno Souza" },
      { id: "ev11", type: "paused", timestamp: now - h(3), by: "Bruno Souza" },
    ],
    comments: [],
    tags: ["performance", "database", "urgente"],
  },
];
