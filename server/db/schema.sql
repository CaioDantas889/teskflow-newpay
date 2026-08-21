-- =============================================================================
-- TaskFlow — esquema PostgreSQL
-- Aplicado automaticamente pelo docker-compose no primeiro start do container,
-- ou manualmente com: npm run db:setup
-- =============================================================================

-- Funcionários da equipe (o perfil, não a conta de acesso).
create table if not exists employees (
  id          text primary key,
  name        text        not null,
  job_role    text        not null default 'Funcionário',
  avatar      text        not null,
  created_at  timestamptz not null default now()
);

-- Contas de acesso. Remover a conta de um funcionário remove o funcionário
-- junto (e, em cascata, tudo que depende dele).
create table if not exists users (
  id             text        primary key,
  username       text        not null,
  password_hash  text        not null,
  role           text        not null check (role in ('admin', 'employee')),
  employee_id    text        references employees (id) on delete cascade,
  name           text        not null,
  created_at     timestamptz not null default now(),
  -- Admin não tem funcionário vinculado; funcionário obrigatoriamente tem.
  constraint users_employee_link check (
    (role = 'admin' and employee_id is null) or
    (role = 'employee' and employee_id is not null)
  )
);

-- Login é case-insensitive, então a unicidade também precisa ser.
create unique index if not exists users_username_lower_idx on users (lower(username));

create table if not exists tasks (
  id                   text        primary key,
  title                text        not null check (char_length(title) between 1 and 120),
  description          text        not null default '',
  priority             text        not null check (priority in ('low', 'medium', 'high', 'critical')),
  status               text        not null default 'pending'
                       check (status in ('pending', 'in_progress', 'paused', 'completed', 'overdue', 'cancelled')),
  estimated_minutes    integer     not null default 60 check (estimated_minutes > 0),
  deadline             timestamptz not null,
  created_at           timestamptz not null default now(),
  started_at           timestamptz,
  completed_at         timestamptz,
  paused_at            timestamptz,
  accumulated_seconds  integer     not null default 0 check (accumulated_seconds >= 0),
  -- Quem criou: o id do funcionário, ou 'admin'. Sem chave estrangeira
  -- justamente porque 'admin' não é um funcionário da tabela employees.
  created_by_id        text        not null,
  created_by_name      text        not null,
  tags                 text[]      not null default '{}'
);

-- Responsáveis pela atividade (uma atividade pode ter vários).
create table if not exists task_assignees (
  task_id      text not null references tasks (id)     on delete cascade,
  employee_id  text not null references employees (id) on delete cascade,
  primary key (task_id, employee_id)
);

-- Linha do tempo da atividade.
create table if not exists task_events (
  id           text        primary key,
  task_id      text        not null references tasks (id) on delete cascade,
  type         text        not null check (type in (
                 'created', 'started', 'paused', 'resumed', 'completed',
                 'reassigned', 'commented', 'cancelled', 'edited')),
  occurred_at  timestamptz not null default now(),
  by_name      text        not null,
  note         text
);

create table if not exists task_comments (
  id           text        primary key,
  task_id      text        not null references tasks (id) on delete cascade,
  author_id    text        not null,
  author_name  text        not null,
  body         text        not null,
  created_at   timestamptz not null default now()
);

create index if not exists tasks_status_idx           on tasks (status);
create index if not exists tasks_deadline_idx         on tasks (deadline);
create index if not exists tasks_created_by_idx       on tasks (created_by_id);
create index if not exists task_assignees_emp_idx     on task_assignees (employee_id);
create index if not exists task_events_task_idx       on task_events (task_id, occurred_at);
create index if not exists task_comments_task_idx     on task_comments (task_id, created_at);
