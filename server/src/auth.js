import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "./db.js";

const SECRET = process.env.JWT_SECRET || "troque-este-segredo";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function checkPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: EXPIRES_IN });
}

/**
 * Monta a sessão a partir da conta: o admin não tem funcionário vinculado,
 * o funcionário vem com o próprio perfil junto.
 */
export async function buildSession(userId) {
  const { rows } = await query(
    `select u.id, u.username, u.role, u.name, u.employee_id,
            e.name as employee_name, e.job_role, e.avatar
       from users u
       left join employees e on e.id = u.employee_id
      where u.id = $1`,
    [userId]
  );
  const row = rows[0];
  if (!row) return null;

  const session = {
    user: { id: row.id, username: row.username, role: row.role, name: row.name },
  };
  if (row.role === "employee") {
    if (!row.employee_id) return null;
    session.employee = {
      id: row.employee_id,
      name: row.employee_name,
      role: row.job_role,
      avatar: row.avatar,
    };
  }
  return session;
}

/** Exige um token válido e carrega a sessão em req.session. */
export async function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Não autenticado." });

  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ error: "Sessão expirada. Entre novamente." });
  }

  const session = await buildSession(payload.sub);
  // A conta pode ter sido removida depois que o token foi emitido.
  if (!session) return res.status(401).json({ error: "Conta não encontrada." });

  req.session = session;
  next();
}

export function requireAdmin(req, res, next) {
  if (req.session?.user.role !== "admin") {
    return res.status(403).json({ error: "Apenas administradores podem fazer isso." });
  }
  next();
}
