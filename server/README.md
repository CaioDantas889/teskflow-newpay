# TaskFlow — banco PostgreSQL + API

Backend do TaskFlow: um banco PostgreSQL e uma API REST em Node/Express que
substituem o `localStorage` do navegador como fonte dos dados.

## Subir tudo (3 comandos)

Com o Docker Desktop aberto, a partir desta pasta (`server/`):

```bash
docker compose up -d
```

```bash
npm install && npm run db:seed
```

```bash
npm run dev
```

A API fica em `http://localhost:3001`. Confira com:

```bash
curl http://localhost:3001/api/health
```

Resposta esperada: `{"status":"ok","database":"conectado", ...}`.

## Contas criadas pelo seed

| Usuário | Senha | Perfil |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `ana.oliveira` | `123456` | Funcionária |
| `bruno.souza` | `123456` | Funcionário |
| `carla.mendes` | `123456` | Funcionária |
| `diego.ferreira` | `123456` | Funcionário |
| `elisa.costa` | `123456` | Funcionário |

As senhas saem de `SEED_ADMIN_PASSWORD` e `SEED_EMPLOYEE_PASSWORD` no `.env`.
Elas são gravadas com **bcrypt** — o banco nunca guarda a senha em texto.

## Sem Docker

Se você instalar o PostgreSQL direto na máquina, crie o banco e ajuste a
`DATABASE_URL` no `.env`; depois:

```bash
npm run db:setup && npm run db:seed
```

Para recomeçar do zero a qualquer momento: `npm run db:reset && npm run db:seed`.

## Estrutura

| Arquivo | Papel |
|---|---|
| `db/schema.sql` | As 6 tabelas, restrições e índices |
| `docker-compose.yml` | O container do PostgreSQL 17 (aplica o schema sozinho) |
| `src/index.js` | Servidor Express, CORS e tratamento de erro |
| `src/db.js` | Pool de conexões e helper de transação |
| `src/auth.js` | bcrypt, token JWT e os guardas `requireAuth` / `requireAdmin` |
| `src/tasks-repo.js` | Consulta que monta a atividade completa em um único SELECT |
| `src/routes/` | `auth.js`, `tasks.js`, `users.js` |
| `scripts/setup-db.js` | Aplica o esquema fora do Docker |
| `scripts/seed.js` | Equipe, contas e atividades de exemplo |

## Tabelas

```
employees        perfil do funcionário (id, nome, cargo, avatar)
users            conta de acesso (username, hash bcrypt, papel, employee_id)
tasks            a atividade (título, prioridade, status, prazo, tempo, criador)
task_assignees   quem é responsável por qual atividade (N:N)
task_events      linha do tempo (criada, iniciada, pausada, concluída...)
task_comments    comentários
```

Regras que o próprio banco garante:

- `users.employee_id` → `employees.id` **on delete cascade**: apagar o
  funcionário apaga a conta dele.
- `task_assignees`, `task_events` e `task_comments` caem em cascata com a
  atividade — nunca sobra registro órfão.
- `status` e `priority` só aceitam os valores válidos (`check`).
- Nome de usuário é único **sem diferenciar maiúsculas** (índice em `lower(username)`).

## Endpoints

Autenticação por token: `Authorization: Bearer <token>` em tudo, menos o login.

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| POST | `/api/auth/login` | público | Valida a senha e devolve token + sessão |
| GET | `/api/auth/me` | logado | Retoma a sessão ao recarregar a página |
| GET | `/api/employees` | logado | Lista a equipe |
| GET | `/api/tasks` | logado | Lista as atividades com responsáveis, eventos e comentários |
| POST | `/api/tasks` | logado | Cria atividade — funcionário só cria para si mesmo |
| POST | `/api/tasks/:id/start` | logado | Inicia ou retoma o cronômetro |
| POST | `/api/tasks/:id/pause` | logado | Pausa e acumula o tempo corrido |
| POST | `/api/tasks/:id/complete` | logado | Conclui |
| POST | `/api/tasks/:id/cancel` | admin | Cancela e congela o tempo |
| PATCH | `/api/tasks/:id/deadline` | admin | Reagenda (atrasada/cancelada volta a pendente) |
| POST | `/api/tasks/:id/comments` | logado | Comenta |
| DELETE | `/api/tasks/:id` | admin | Remove a atividade |
| GET | `/api/users` | admin | Lista as contas |
| POST | `/api/users` | admin | Cria conta (e o funcionário junto, quando for do tipo funcionário) |
| DELETE | `/api/users/:id` | admin | Remove a conta e as atividades dela (regra abaixo) |

### O que acontece com as atividades ao remover um funcionário

1. As atividades que ele **criou** são excluídas.
2. As atividades em que ele era o **único responsável** são excluídas.
3. Nas **compartilhadas**, ele sai da lista de responsáveis e fica o registro
   "Fulano foi removido da equipe" na linha do tempo.

Tudo dentro de uma transação: ou acontece inteiro, ou nada acontece.
