import { Router } from "express";
import { genId, query, withTransaction } from "../db.js";
import { requireAdmin, requireAuth } from "../auth.js";
import { findTask, listTasks } from "../tasks-repo.js";

const router = Router();
router.use(requireAuth);

const PRIORITIES = ["low", "medium", "high", "critical"];

/** Quem está logado, no formato usado nos campos de autoria. */
function actor(req) {
  return req.session.employee
    ? { id: req.session.employee.id, name: req.session.employee.name }
    : { id: "admin", name: req.session.user.name };
}

async function addEvent(client, taskId, type, by, note = null) {
  await client.query(
    `insert into task_events (id, task_id, type, occurred_at, by_name, note)
     values ($1, $2, $3, now(), $4, $5)`,
    [genId("ev"), taskId, type, by, note]
  );
}

router.get("/", async (_req, res) => {
  res.json(await listTasks());
});

router.post("/", async (req, res) => {
  const {
    title,
    description = "",
    priority = "medium",
    estimatedMinutes = 60,
    deadline,
    tags = [],
  } = req.body ?? {};

  if (!title || !String(title).trim()) return res.status(400).json({ error: "Título obrigatório." });
  if (String(title).length > 120) return res.status(400).json({ error: "Título tem no máximo 120 caracteres." });
  if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: "Prioridade inválida." });
  if (!deadline || Number.isNaN(Number(deadline))) return res.status(400).json({ error: "Prazo obrigatório." });

  const creator = actor(req);
  // Funcionário só cria atividade para si mesmo; o admin escolhe os responsáveis.
  const assigneeIds = req.session.employee
    ? [req.session.employee.id]
    : [...new Set(req.body?.assigneeIds ?? [])];

  if (assigneeIds.length === 0) {
    return res.status(400).json({ error: "Selecione ao menos um responsável." });
  }

  const known = await query(`select id from employees where id = any($1::text[])`, [assigneeIds]);
  if (known.rows.length !== assigneeIds.length) {
    return res.status(400).json({ error: "Responsável inexistente." });
  }

  const task = await withTransaction(async (client) => {
    const id = genId("t");
    await client.query(
      `insert into tasks (id, title, description, priority, status, estimated_minutes,
                          deadline, created_at, accumulated_seconds,
                          created_by_id, created_by_name, tags)
       values ($1, $2, $3, $4, 'pending', $5, to_timestamp($6 / 1000.0), now(), 0, $7, $8, $9)`,
      [
        id,
        String(title).trim(),
        String(description).trim(),
        priority,
        Number(estimatedMinutes) || 60,
        Number(deadline),
        creator.id,
        creator.name,
        tags,
      ]
    );
    for (const employeeId of assigneeIds) {
      await client.query(`insert into task_assignees (task_id, employee_id) values ($1, $2)`, [
        id,
        employeeId,
      ]);
    }
    await addEvent(client, id, "created", creator.name);
    return findTask(id, client);
  });

  res.status(201).json(task);
});

/**
 * Iniciar ou retomar. O tempo parado entre a pausa e agora não conta:
 * o acumulado já foi congelado no momento da pausa.
 */
router.post("/:id/start", async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Atividade não encontrada." });
  if (task.status === "in_progress") return res.json(task);

  const who = actor(req);
  const isPaused = task.status === "paused";

  const updated = await withTransaction(async (client) => {
    await client.query(
      `update tasks set status = 'in_progress', started_at = now(), paused_at = null where id = $1`,
      [task.id]
    );
    await addEvent(client, task.id, isPaused ? "resumed" : "started", who.name);
    return findTask(task.id, client);
  });

  res.json(updated);
});

router.post("/:id/pause", async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Atividade não encontrada." });
  if (task.status !== "in_progress") {
    return res.status(409).json({ error: "A atividade não está em andamento." });
  }

  const who = actor(req);
  const updated = await withTransaction(async (client) => {
    // O tempo corrido desde o start entra no acumulado e o cronômetro para.
    await client.query(
      `update tasks
          set status = 'paused',
              paused_at = now(),
              accumulated_seconds = accumulated_seconds
                + floor(extract(epoch from now() - started_at))::int,
              started_at = null
        where id = $1`,
      [task.id]
    );
    await addEvent(client, task.id, "paused", who.name);
    return findTask(task.id, client);
  });

  res.json(updated);
});

router.post("/:id/complete", async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Atividade não encontrada." });

  const who = actor(req);
  const updated = await withTransaction(async (client) => {
    await client.query(
      `update tasks
          set accumulated_seconds = accumulated_seconds
                + case when status = 'in_progress' and started_at is not null
                       then floor(extract(epoch from now() - started_at))::int
                       else 0 end,
              status = 'completed',
              completed_at = now(),
              started_at = null,
              paused_at = null
        where id = $1`,
      [task.id]
    );
    await addEvent(client, task.id, "completed", who.name);
    return findTask(task.id, client);
  });

  res.json(updated);
});

router.post("/:id/cancel", requireAdmin, async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Atividade não encontrada." });

  const updated = await withTransaction(async (client) => {
    await client.query(
      `update tasks
          set accumulated_seconds = accumulated_seconds
                + case when status = 'in_progress' and started_at is not null
                       then floor(extract(epoch from now() - started_at))::int
                       else 0 end,
              status = 'cancelled',
              started_at = null,
              paused_at = null
        where id = $1`,
      [task.id]
    );
    await addEvent(client, task.id, "cancelled", req.session.user.name);
    return findTask(task.id, client);
  });

  res.json(updated);
});

/**
 * Editar a atividade. O admin edita qualquer uma; o funcionário edita apenas
 * as que ele mesmo criou, e sem trocar os responsáveis.
 */
router.patch("/:id", async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Atividade não encontrada." });

  const isAdmin = req.session.user.role === "admin";
  const isOwner = req.session.employee && task.createdById === req.session.employee.id;
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: "Você só pode editar atividades criadas por você." });
  }

  const {
    title = task.title,
    description = task.description,
    priority = task.priority,
    estimatedMinutes = task.estimatedMinutes,
    deadline = task.deadline,
    tags = task.tags,
  } = req.body ?? {};

  if (!String(title).trim()) return res.status(400).json({ error: "Título obrigatório." });
  if (String(title).length > 120) return res.status(400).json({ error: "Título tem no máximo 120 caracteres." });
  if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: "Prioridade inválida." });
  if (!deadline || Number.isNaN(Number(deadline))) return res.status(400).json({ error: "Prazo inválido." });

  // Trocar responsáveis é privilégio do admin.
  let assigneeIds = null;
  if (isAdmin && Array.isArray(req.body?.assigneeIds)) {
    assigneeIds = [...new Set(req.body.assigneeIds)];
    if (assigneeIds.length === 0) {
      return res.status(400).json({ error: "Selecione ao menos um responsável." });
    }
    const known = await query(`select id from employees where id = any($1::text[])`, [assigneeIds]);
    if (known.rows.length !== assigneeIds.length) {
      return res.status(400).json({ error: "Responsável inexistente." });
    }
  }

  const updated = await withTransaction(async (client) => {
    await client.query(
      `update tasks
          set title = $2,
              description = $3,
              priority = $4,
              estimated_minutes = $5,
              deadline = to_timestamp($6 / 1000.0),
              tags = $7,
              status = case when status in ('overdue', 'cancelled') and to_timestamp($6 / 1000.0) > now()
                            then 'pending' else status end
        where id = $1`,
      [
        task.id,
        String(title).trim(),
        String(description).trim(),
        priority,
        Number(estimatedMinutes) || 60,
        Number(deadline),
        tags,
      ]
    );

    if (assigneeIds) {
      await client.query(`delete from task_assignees where task_id = $1`, [task.id]);
      for (const employeeId of assigneeIds) {
        await client.query(`insert into task_assignees (task_id, employee_id) values ($1, $2)`, [
          task.id,
          employeeId,
        ]);
      }
    }

    const who = actor(req);
    await addEvent(client, task.id, "edited", who.name, "Detalhes da atividade atualizados");
    return findTask(task.id, client);
  });

  res.json(updated);
});

/** Reagendar: atividade atrasada ou cancelada volta a ficar pendente. */
router.patch("/:id/deadline", requireAdmin, async (req, res) => {
  const { deadline } = req.body ?? {};
  if (!deadline || Number.isNaN(Number(deadline))) {
    return res.status(400).json({ error: "Prazo inválido." });
  }
  const task = await findTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Atividade não encontrada." });

  const updated = await withTransaction(async (client) => {
    await client.query(
      `update tasks
          set deadline = to_timestamp($2 / 1000.0),
              status = case when status in ('overdue', 'cancelled') then 'pending' else status end
        where id = $1`,
      [task.id, Number(deadline)]
    );
    await addEvent(
      client,
      task.id,
      "reassigned",
      req.session.user.name,
      `Prazo reagendado para ${new Date(Number(deadline)).toLocaleString("pt-BR")}`
    );
    return findTask(task.id, client);
  });

  res.json(updated);
});

router.post("/:id/comments", async (req, res) => {
  const text = String(req.body?.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "Comentário vazio." });

  const task = await findTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Atividade não encontrada." });

  const who = actor(req);
  const updated = await withTransaction(async (client) => {
    await client.query(
      `insert into task_comments (id, task_id, author_id, author_name, body, created_at)
       values ($1, $2, $3, $4, $5, now())`,
      [genId("c"), task.id, who.id, who.name, text]
    );
    await addEvent(client, task.id, "commented", who.name, text.slice(0, 60));
    return findTask(task.id, client);
  });

  res.json(updated);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  // Responsáveis, eventos e comentários somem junto por cascade no banco.
  const { rowCount } = await query(`delete from tasks where id = $1`, [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "Atividade não encontrada." });
  res.status(204).end();
});

export default router;
