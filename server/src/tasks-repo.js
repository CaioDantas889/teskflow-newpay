import { query } from "./db.js";

/**
 * Uma atividade completa, no mesmo formato que o frontend já usa
 * (datas em milissegundos, responsáveis/eventos/comentários embutidos).
 */
const TASK_SELECT = `
  select
    t.*,
    coalesce(a.assignee_ids, '{}') as assignee_ids,
    coalesce(ev.events, '[]'::json) as events,
    coalesce(cm.comments, '[]'::json) as comments
  from tasks t
  left join lateral (
    select array_agg(ta.employee_id order by ta.employee_id) as assignee_ids
      from task_assignees ta
     where ta.task_id = t.id
  ) a on true
  left join lateral (
    select json_agg(json_build_object(
             'id', e.id, 'type', e.type, 'timestamp', e.occurred_at,
             'by', e.by_name, 'note', e.note
           ) order by e.occurred_at) as events
      from task_events e
     where e.task_id = t.id
  ) ev on true
  left join lateral (
    select json_agg(json_build_object(
             'id', c.id, 'authorId', c.author_id, 'authorName', c.author_name,
             'text', c.body, 'timestamp', c.created_at
           ) order by c.created_at) as comments
      from task_comments c
     where c.task_id = t.id
  ) cm on true
`;

const ms = (value) => (value ? new Date(value).getTime() : undefined);

export function mapTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assigneeIds: row.assignee_ids ?? [],
    estimatedMinutes: row.estimated_minutes,
    deadline: ms(row.deadline),
    createdAt: ms(row.created_at),
    startedAt: ms(row.started_at),
    completedAt: ms(row.completed_at),
    pausedAt: ms(row.paused_at),
    accumulatedSeconds: row.accumulated_seconds,
    createdById: row.created_by_id,
    createdByName: row.created_by_name,
    events: (row.events ?? []).map((e) => ({ ...e, timestamp: ms(e.timestamp) })),
    comments: (row.comments ?? []).map((c) => ({ ...c, timestamp: ms(c.timestamp) })),
    tags: row.tags ?? [],
  };
}

export async function listTasks() {
  const { rows } = await query(`${TASK_SELECT} order by t.created_at desc`);
  return rows.map(mapTask);
}

export async function findTask(id, client = { query }) {
  const { rows } = await client.query(`${TASK_SELECT} where t.id = $1`, [id]);
  return rows[0] ? mapTask(rows[0]) : null;
}
