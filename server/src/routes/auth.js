import { Router } from "express";
import { query } from "../db.js";
import { buildSession, checkPassword, requireAuth, signToken } from "../auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Informe usuário e senha." });
  }

  const { rows } = await query(
    `select id, username, password_hash, role from users where lower(username) = lower($1)`,
    [String(username).trim()]
  );
  const user = rows[0];
  // Mensagem única para não revelar se o usuário existe.
  if (!user) return res.status(401).json({ error: "Usuário ou senha incorretos." });

  const ok = await checkPassword(String(password), user.password_hash);
  if (!ok) return res.status(401).json({ error: "Usuário ou senha incorretos." });

  const session = await buildSession(user.id);
  if (!session) return res.status(401).json({ error: "Esta conta não está vinculada a um funcionário." });

  res.json({ token: signToken(user), session });
});

/** Usada no carregamento da página para retomar a sessão salva. */
router.get("/me", requireAuth, (req, res) => {
  res.json({ session: req.session });
});

export default router;
