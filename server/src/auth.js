import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const SECRET =
  process.env.JWT_SECRET ||
  'ips-salud-vital-dev-secret-cambiar-en-produccion';

/* =========================================================
   ROLES OFICIALES DEL SISTEMA
========================================================= */

export const ROLES = {
  ADMIN: 'ADMIN',
  RECEPCION: 'RECEPCION',
  MEDICO: 'MEDICO',
};

/* =========================================================
   COMPATIBILIDAD CON ROLES ANTIGUOS
========================================================= */

const ROLE_MAP = {
  ADMIN: ROLES.ADMIN,
  ADMINISTRACION: ROLES.ADMIN,

  RECEPCION: ROLES.RECEPCION,
  FACTURACION: ROLES.RECEPCION,

  MEDICO: ROLES.MEDICO,

  PACIENTE: 'PACIENTE',
};

export function normalizeRole(role) {
  return ROLE_MAP[role] || null;
}

/* =========================================================
   LOGIN
========================================================= */

export function login(username, password) {
  const user = db
  .prepare(`
    SELECT
      id,
      name,
      username,
      password_hash,
      role,
      active,
      must_change_password
    FROM users
    WHERE username = ?
      AND active = 1
  `)
  .get(username);

  if (
    !user ||
    !bcrypt.compareSync(
      password,
      user.password_hash
    )
  ) {
    return null;
  }

  const normalizedRole = normalizeRole(user.role);

  if (!normalizedRole) {
    return null;
  }

  const payload = {
  id: user.id,
  name: user.name,
  username: user.username,
  role: normalizedRole,
  mustChangePassword: Boolean(
    user.must_change_password
  ),
};

  return {
    token: jwt.sign(
      payload,
      SECRET,
      { expiresIn: '8h' }
    ),
    user: payload,
  };
}

/* =========================================================
   AUTENTICACIÓN
========================================================= */

export function requireAuth(req, res, next) {
  try {
    const header =
      req.headers.authorization || '';

    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        message: 'Sesión requerida',
      });
    }

    const decoded = jwt.verify(
      token,
      SECRET
    );

    const normalizedRole =
  decoded.role === 'PACIENTE'
    ? 'PACIENTE'
    : normalizeRole(decoded.role);

if (!normalizedRole) {
  return res.status(401).json({
    message: 'Rol de usuario inválido',
  });
}

    req.user = {
      ...decoded,
      role: normalizedRole,
    };

    next();
  } catch {
    return res.status(401).json({
      message:
        'Sesión inválida o expirada',
    });
  }
}

/* =========================================================
   CONTROL DE PERMISOS
========================================================= */

export function allow(...allowedRoles) {
  return (req, res, next) => {
    const currentRole =
      normalizeRole(req.user?.role);

    const normalizedAllowedRoles =
      allowedRoles
        .map(normalizeRole)
        .filter(Boolean);

    if (
      currentRole &&
      normalizedAllowedRoles.includes(
        currentRole
      )
    ) {
      return next();
    }

    return res.status(403).json({
      message:
        'No tienes permisos para esta operación',
    });
  };
}