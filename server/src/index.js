import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import { employeesRouter, usersRouter } from "./routes/users.js";
import taskRoutes from "./routes/tasks.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:8443")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Sem origin = curl, healthcheck, mesma origem.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    },
  })
);
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    const { rows } = await pool.query("select now() as now");
    res.json({ status: "ok", database: "conectado", now: rows[0].now });
  } catch (error) {
    res.status(503).json({ status: "degradado", database: "indisponível", detail: error.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/tasks", taskRoutes);

app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

// Falhas de conexão com o Postgres viram 503 com instrução, não um 500 genérico.
const DB_DOWN = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "57P03", "3D000", "28P01"]);

app.use((error, _req, res, _next) => {
  console.error("[api]", error);
  if (DB_DOWN.has(error.code)) {
    return res.status(503).json({
      error: "Banco de dados indisponível. Suba o PostgreSQL com 'docker compose up -d' na pasta server/.",
    });
  }
  res.status(500).json({ error: "Erro interno no servidor." });
});

app.listen(PORT, () => {
  console.log(`API do TaskFlow em http://localhost:${PORT}`);
  console.log(`Origens liberadas: ${allowedOrigins.join(", ")}`);
});
