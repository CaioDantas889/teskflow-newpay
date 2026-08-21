/**
 * Popula o banco com a equipe, as contas de acesso e as atividades de exemplo
 * — os mesmos dados que o frontend usava direto no código (src/data.ts).
 *
 *   npm run db:seed            -> só roda se o banco estiver vazio
 *   npm run db:seed -- --force -> apaga o conteúdo atual e semeia de novo
 *
 * Senhas: SEED_ADMIN_PASSWORD e SEED_EMPLOYEE_PASSWORD (veja o .env).
 */
import { pool, withTransaction } from "../src/db.js";
import { hashPassword } from "../src/auth.js";

const force = process.argv.includes("--force");
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";
const EMPLOYEE_PASSWORD = process.env.SEED_EMPLOYEE_PASSWORD || "123456";

const EMPLOYEES = [
  { id: "e1", name: "Ana Oliveira", jobRole: "Dev Frontend", avatar: "AO" },
  { id: "e2", name: "Bruno Souza", jobRole: "Dev Backend", avatar: "BS" },
  { id: "e3", name: "Carla Mendes", jobRole: "QA Engineer", avatar: "CM" },
  { id: "e4", name: "Diego Ferreira", jobRole: "DevOps", avatar: "DF" },
  { id: "e5", name: "Elisa Costa", jobRole: "Designer UX", avatar: "EC" },
];

const h = (n) => n * 3600000;
const m = (n) => n * 60000;
const now = Date.now();
const at = (offset) => new Date(now + offset);

const TASKS = [
  {
    id: "t1",
    title: "Corrigir bug de autenticação SSO no módulo de login",
    description:
      "Usuários com domínio @empresa.com.br não conseguem fazer login via SSO. O erro aparece após o redirect do provedor de identidade. Verificar configuração do callback URL e validação do token JWT.",
    priority: "critical",
    status: "in_progress",
    assigneeIds: ["e2"],
    estimatedMinutes: 90,
    deadline: at(h(2)),
    createdAt: at(-h(3)),
    startedAt: at(-m(45)),
    accumulatedSeconds: 45 * 60,
    tags: ["bug", "auth", "urgente"],
    events: [
      { type: "created", at: at(-h(3)), by: "Administrador" },
      { type: "started", at: at(-m(45)), by: "Bruno Souza" },
    ],
    comments: [
      {
        authorId: "e2",
        authorName: "Bruno Souza",
        text: "Identifiquei o problema: o callback URL está incorreto no provedor. Ajustando agora.",
        at: at(-m(30)),
      },
    ],
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
    deadline: at(h(24)),
    createdAt: at(-h(1)),
    accumulatedSeconds: 0,
    tags: ["feature", "dashboard", "design"],
    events: [{ type: "created", at: at(-h(1)), by: "Administrador" }],
    comments: [],
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
    deadline: at(h(8)),
    createdAt: at(-h(5)),
    accumulatedSeconds: 0,
    tags: ["devops", "ci-cd"],
    events: [{ type: "created", at: at(-h(5)), by: "Administrador" }],
    comments: [],
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
    deadline: at(-h(1)),
    createdAt: at(-h(8)),
    startedAt: null,
    completedAt: at(-h(2)),
    accumulatedSeconds: 3 * 3600,
    tags: ["qa", "release"],
    events: [
      { type: "created", at: at(-h(8)), by: "Administrador" },
      { type: "started", at: at(-h(5)), by: "Carla Mendes" },
      { type: "completed", at: at(-h(2)), by: "Carla Mendes" },
    ],
    comments: [
      {
        authorId: "e3",
        authorName: "Carla Mendes",
        text: "Todos os 247 casos de teste passaram. 3 casos de borda documentados como conhecidos.",
        at: at(-h(2)),
      },
    ],
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
    deadline: at(h(48)),
    createdAt: at(-h(2)),
    accumulatedSeconds: 0,
    tags: ["docs", "api"],
    events: [{ type: "created", at: at(-h(2)), by: "Administrador" }],
    comments: [],
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
    deadline: at(-h(2)),
    createdAt: at(-h(10)),
    pausedAt: at(-h(3)),
    accumulatedSeconds: 3 * 3600,
    tags: ["performance", "database", "urgente"],
    events: [
      { type: "created", at: at(-h(10)), by: "Administrador" },
      { type: "started", at: at(-h(6)), by: "Bruno Souza" },
      { type: "paused", at: at(-h(3)), by: "Bruno Souza" },
    ],
    comments: [],
  },
];

const usernameOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, ".");
let sequence = 0;
const nextId = (prefix) => `${prefix}-seed-${++sequence}`;

try {
  const existing = await pool.query(`select count(*)::int as total from users`);
  if (existing.rows[0].total > 0 && !force) {
    console.log("O banco já tem dados. Use 'npm run db:seed -- --force' para recomeçar do zero.");
    process.exit(0);
  }

  const adminHash = await hashPassword(ADMIN_PASSWORD);
  const employeeHash = await hashPassword(EMPLOYEE_PASSWORD);

  await withTransaction(async (client) => {
    if (force) {
      // employees em cascata leva users e task_assignees junto; tasks leva
      // eventos e comentários.
      await client.query(`delete from tasks`);
      await client.query(`delete from users`);
      await client.query(`delete from employees`);
    }

    for (const employee of EMPLOYEES) {
      await client.query(
        `insert into employees (id, name, job_role, avatar) values ($1, $2, $3, $4)`,
        [employee.id, employee.name, employee.jobRole, employee.avatar]
      );
      await client.query(
        `insert into users (id, username, password_hash, role, employee_id, name)
         values ($1, $2, $3, 'employee', $4, $5)`,
        [`u-${employee.id}`, usernameOf(employee.name), employeeHash, employee.id, employee.name]
      );
    }

    await client.query(
      `insert into users (id, username, password_hash, role, employee_id, name)
       values ('u-admin', 'admin', $1, 'admin', null, 'Administrador')`,
      [adminHash]
    );

    for (const task of TASKS) {
      await client.query(
        `insert into tasks (id, title, description, priority, status, estimated_minutes,
                            deadline, created_at, started_at, completed_at, paused_at,
                            accumulated_seconds, created_by_id, created_by_name, tags)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'admin', 'Administrador', $13)`,
        [
          task.id,
          task.title,
          task.description,
          task.priority,
          task.status,
          task.estimatedMinutes,
          task.deadline,
          task.createdAt,
          task.startedAt ?? null,
          task.completedAt ?? null,
          task.pausedAt ?? null,
          task.accumulatedSeconds,
          task.tags,
        ]
      );

      for (const employeeId of task.assigneeIds) {
        await client.query(
          `insert into task_assignees (task_id, employee_id) values ($1, $2)`,
          [task.id, employeeId]
        );
      }
      for (const event of task.events) {
        await client.query(
          `insert into task_events (id, task_id, type, occurred_at, by_name, note)
           values ($1, $2, $3, $4, $5, null)`,
          [nextId("ev"), task.id, event.type, event.at, event.by]
        );
      }
      for (const comment of task.comments) {
        await client.query(
          `insert into task_comments (id, task_id, author_id, author_name, body, created_at)
           values ($1, $2, $3, $4, $5, $6)`,
          [nextId("c"), task.id, comment.authorId, comment.authorName, comment.text, comment.at]
        );
      }
    }
  });

  console.log("Dados iniciais carregados:");
  console.log(`  admin        -> usuário 'admin', senha '${ADMIN_PASSWORD}'`);
  for (const employee of EMPLOYEES) {
    console.log(`  ${employee.name.padEnd(16)} -> usuário '${usernameOf(employee.name)}', senha '${EMPLOYEE_PASSWORD}'`);
  }
} catch (error) {
  console.error("Falha ao semear o banco:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
