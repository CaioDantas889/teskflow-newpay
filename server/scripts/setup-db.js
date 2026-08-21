/**
 * Cria (ou recria) as tabelas do TaskFlow.
 *
 *   npm run db:setup   -> aplica o esquema, sem apagar nada
 *   npm run db:reset   -> derruba as tabelas e aplica o esquema do zero
 *
 * Quem sobe o banco pelo docker-compose deste diretório não precisa rodar o
 * setup: o schema.sql já é aplicado na criação do container.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "../src/db.js";

const here = dirname(fileURLToPath(import.meta.url));
const reset = process.argv.includes("--reset");

const DROP = `
  drop table if exists task_comments cascade;
  drop table if exists task_events cascade;
  drop table if exists task_assignees cascade;
  drop table if exists tasks cascade;
  drop table if exists users cascade;
  drop table if exists employees cascade;
`;

try {
  if (reset) {
    console.log("Derrubando tabelas existentes...");
    await pool.query(DROP);
  }

  const schema = await readFile(join(here, "..", "db", "schema.sql"), "utf8");
  await pool.query(schema);

  const { rows } = await pool.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`
  );
  console.log("Tabelas no banco:", rows.map((r) => r.table_name).join(", "));
  console.log("Esquema aplicado. Rode 'npm run db:seed' para os dados iniciais.");
} catch (error) {
  console.error("Falha ao aplicar o esquema:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
