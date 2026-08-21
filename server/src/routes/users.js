import { Router } from "express";
import { genId, query, withTransaction } from "../db.js";
import { hashPassword, requireAdmin, requireAuth } from "../auth.js";

/** Contas de acesso — só o administrador mexe aqui. */
export const usersRouter = Router();
usersRouter.use(requireAuth, requireAdmin);

usersRouter.get("/", async (_req, res) => {
  const { rows } = await query(
    `select id, username, role, name, employee_id from users order by role, name`
  );
  res.json(
    rows.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      name: u.name,
      employeeId: u.employee_id ?? undefined,
    }))
  );
});

usersRouter.post("/", async (req, res) => {
  const { name, role, username, password, jobRole } = req.body ?? {};

  if (!name?.trim() || !username?.trim() || !password || String(password).length < 6) {
    return res.status(400).json({ error: "Preencha o nome, usuário e uma senha com pelo menos 6 caracteres." });
  }
  if (role !== "admin" && role !== "employee") {
    return res.status(400).json({ error: "Perfil inválido." });
  }

  const taken = await query(`select 1 from users where lower(username) = lower($1)`, [username.trim()]);
  if (taken.rowCount > 0) return res.status(409).json({ error: "Esse nome de usuário já existe." });

  const passwordHash = await hashPassword(String(password));

  const created = await withTransaction(async (client) => {
    if (role === "admin") {
      const id = genId("u");
      await client.query(
        `insert into users (id, username, password_hash, role, employee_id, name)
         values ($1, $2, $3, 'admin', null, $4)`,
        [id, username.trim().toLowerCase(), passwordHash, name.trim()]
      );
      return { id, username: username.trim().toLowerCase(), role: "admin", name: name.trim() };
    }

    // Funcionário nasce com o perfil na equipe e a conta de acesso juntos.
    const employeeId = genId("e");
    const avatar = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    await client.query(
      `insert into employees (id, name, job_role, avatar) values ($1, $2, $3, $4)`,
      [employeeId, name.trim(), jobRole?.trim() || "Funcionário", avatar]
    );
    const id = genId("u");
    await client.query(
      `insert into users (id, username, password_hash, role, employee_id, name)
       values ($1, $2, $3, 'employee', $4, $5)`,
      [id, username.trim().toLowerCase(), passwordHash, employeeId, name.trim()]
    );
    return {
      id,
      username: username.trim().toLowerCase(),
      role: "employee",
      name: name.trim(),
      employeeId,
    };
  });

  res.status(201).json(created);
});

usersRouter.delete("/:id", async (req, res) => {
  const { rows } = await query(`select id, role, name, employee_id from users where id = $1`, [
    req.params.id,
  ]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

  if (user.role === "admin") {
    const admins = await query(`select count(*)::int as total from users where role = 'admin'`);
    if (admins.rows[0].total === 1) {
      return res.status(409).json({ error: "Não é possível remover o último administrador." });
    }
  }

  await withTransaction(async (client) => {
    if (user.employee_id) {
      const employeeId = user.employee_id;

      // 1. As atividades que o funcionário criou saem junto com ele.
      await client.query(`delete from tasks where created_by_id = $1`, [employeeId]);

      // 2. Também saem as que ficariam sem nenhum responsável.
      await client.query(
        `delete from tasks t
          where exists (select 1 from task_assignees ta
                         where ta.task_id = t.id and ta.employee_id = $1)
            and (select count(*) from task_assignees ta2 where ta2.task_id = t.id) = 1`,
        [employeeId]
      );

      // 3. Nas compartilhadas ele apenas deixa de ser responsável, com registro
      //    na linha do tempo. A linha em task_assignees cai por cascade.
      await client.query(
        `insert into task_events (id, task_id, type, occurred_at, by_name, note)
         select 'ev' || left(replace(gen_random_uuid()::text, '-', ''), 12),
                ta.task_id, 'reassigned', now(), $2, $3
           from task_assignees ta
          where ta.employee_id = $1`,
        [employeeId, req.session.user.name, `${user.name} foi removido da equipe`]
      );
    }

    // Remover a conta remove o funcionário (cascade), que remove os vínculos
    // restantes em task_assignees.
    await client.query(`delete from users where id = $1`, [user.id]);
    if (user.employee_id) {
      await client.query(`delete from employees where id = $1`, [user.employee_id]);
    }
  });

  res.status(204).end();
});

/** Equipe — qualquer pessoa logada precisa da lista para montar a interface. */
export const employeesRouter = Router();
employeesRouter.use(requireAuth);

employeesRouter.get("/", async (_req, res) => {
  const { rows } = await query(`select id, name, job_role, avatar from employees order by name`);
  res.json(rows.map((e) => ({ id: e.id, name: e.name, role: e.job_role, avatar: e.avatar })));
});
