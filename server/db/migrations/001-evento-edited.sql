-- Libera o evento "edited" na linha do tempo, para bancos criados antes da
-- funcionalidade de editar atividade.
--   docker compose exec -T db psql -U taskflow -d taskflow < db/migrations/001-evento-edited.sql
alter table task_events drop constraint if exists task_events_type_check;
alter table task_events add constraint task_events_type_check check (type in (
  'created', 'started', 'paused', 'resumed', 'completed',
  'reassigned', 'commented', 'cancelled', 'edited'));
