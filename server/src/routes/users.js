import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { allow } from '../auth.js';

const router = Router();

/* =========================================================
   MIGRACIÓN LOCAL
========================================================= */

try {
  const columns = db
    .prepare(`PRAGMA table_info(users)`)
    .all();

  const hasSpecialty = columns.some(
    (column) => column.name === 'specialty'
  );

  if (!hasSpecialty) {
    db.exec(`
      ALTER TABLE users
      ADD COLUMN specialty TEXT
    `);
  }
} catch (error) {
  console.error(
    'Error preparando columna specialty:',
    error
  );
}

/* =========================================================
   VALIDACIÓN
========================================================= */

const SPECIALTIES = [
  'Medicina General',
  'Odontología',
  'Pediatría',
  'Medicina Interna',
  'Laboratorio',
];

const userSchema = z
  .object({
    name: z
      .string()
      .min(
        3,
        'El nombre debe tener al menos 3 caracteres.'
      )
      .max(100),

    username: z
      .string()
      .min(
        4,
        'El usuario debe tener al menos 4 caracteres.'
      )
      .max(50)
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        'El usuario contiene caracteres no permitidos.'
      ),

    role: z.enum([
      'RECEPCION',
      'MEDICO',
      'ADMINISTRACION',
    ]),

    specialty: z
      .enum(SPECIALTIES)
      .nullable()
      .optional(),

    password: z
      .string()
      .min(
        8,
        'La contraseña debe tener mínimo 8 caracteres.'
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.role === 'MEDICO' &&
      !data.specialty
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specialty'],
        message:
          'Debes seleccionar la especialidad del médico.',
      });
    }

    if (
      data.role !== 'MEDICO' &&
      data.specialty
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specialty'],
        message:
          'La especialidad solo corresponde a usuarios con rol Médico.',
      });
    }
  });

/* =========================================================
   VALIDACIÓN PARA EDICIÓN
========================================================= */

const editUserSchema = z.object({
  name: z
    .string()
    .min(
      3,
      'El nombre debe tener al menos 3 caracteres.'
    )
    .max(100)
    .optional(),

  username: z
    .string()
    .min(
      4,
      'El usuario debe tener al menos 4 caracteres.'
    )
    .max(50)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      'El usuario contiene caracteres no permitidos.'
    )
    .optional(),

  role: z
    .enum([
      'RECEPCION',
      'MEDICO',
      'ADMINISTRACION',
    ])
    .optional(),

  specialty: z
    .enum(SPECIALTIES)
    .nullable()
    .optional(),

  password: z
    .string()
    .min(
      8,
      'La contraseña debe tener mínimo 8 caracteres.'
    )
    .optional(),
});

/* =========================================================
   LISTAR MÉDICOS ACTIVOS
   RECEPCIÓN Y MÉDICOS
========================================================= */

router.get(
  '/doctors',
  allow('RECEPCION', 'MEDICO'),
  (req, res) => {
    const doctors = db
      .prepare(`
        SELECT
          id,
          name,
          username,
          role,
          specialty,
          active
        FROM users
        WHERE role = 'MEDICO'
          AND active = 1
          AND specialty IS NOT NULL
          AND TRIM(specialty) <> ''
        ORDER BY name ASC
      `)
      .all();

    res.json(doctors);
  }
);

/* =========================================================
   LISTAR USUARIOS
========================================================= */

router.get(
  '/',
  allow('ADMINISTRACION'),
  (req, res) => {
    const users = db
      .prepare(`
        SELECT
          id,
          name,
          username,
          role,
          specialty,
          active
        FROM users
        ORDER BY name ASC
      `)
      .all();

    res.json(users);
  }
);

/* =========================================================
   LISTAR MÉDICOS ACTIVOS
========================================================= */

router.get(
  '/doctors',
  allow('RECEPCION', 'MEDICO'),
  (req, res) => {
    const doctors = db
      .prepare(`
        SELECT
          id,
          name,
          username,
          role,
          specialty,
          active
        FROM users
        WHERE role = 'MEDICO'
          AND active = 1
          AND specialty IS NOT NULL
          AND TRIM(specialty) <> ''
        ORDER BY name ASC
      `)
      .all();

    res.json(doctors);
  }
);

/* =========================================================
   CREAR USUARIO
========================================================= */

router.post(
  '/',
  allow('ADMINISTRACION'),
  (req, res) => {
    const parsed =
      userSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message:
          parsed.error.issues[0].message,
      });
    }

    const {
      name,
      username,
      role,
      specialty = null,
      password,
    } = parsed.data;

    try {
      const normalizedUsername =
        username.trim().toLowerCase();

      const existing = db
        .prepare(
          'SELECT id FROM users WHERE username = ?'
        )
        .get(normalizedUsername);

      if (existing) {
        return res.status(409).json({
          message:
            'El nombre de usuario ya existe.',
        });
      }

      const temporaryPassword =
        password ||
        `SV-${crypto.randomUUID().slice(0, 8)}`;

      const passwordHash =
        bcrypt.hashSync(
          temporaryPassword,
          10
        );

      const info = db
        .prepare(`
          INSERT INTO users (
            name,
            username,
            password_hash,
            role,
            specialty,
            active,
            must_change_password
          )
          VALUES (?, ?, ?, ?, ?, 1, 1)
        `)
        .run(
          name.trim(),
          normalizedUsername,
          passwordHash,
          role,
          role === 'MEDICO'
            ? specialty
            : null
        );

      const createdUser =
        db
          .prepare(`
            SELECT
              id,
              name,
              username,
              role,
              specialty,
              active
            FROM users
            WHERE id = ?
          `)
          .get(
            info.lastInsertRowid
          );

      res.status(201).json({
        user: createdUser,
        temporaryPassword,
      });
    } catch (error) {
      console.error(
        'Error creando usuario:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible crear el usuario.',
      });
    }
  }
);

/* =========================================================
   EDITAR USUARIO
========================================================= */

router.put(
  '/:id',
  allow('ADMINISTRACION'),
  (req, res) => {
    const parsed =
      editUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message:
          parsed.error.issues[0].message,
      });
    }

    const userId =
      Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        message:
          'ID de usuario inválido.',
      });
    }

    const existing =
      db
        .prepare(
          'SELECT * FROM users WHERE id = ?'
        )
        .get(userId);

    if (!existing) {
      return res.status(404).json({
        message:
          'Usuario no encontrado.',
      });
    }

    let {
      name = existing.name,
      username = existing.username,
      role = existing.role,
      specialty = existing.specialty || null,
      password,
    } = parsed.data;

    if (
      role === 'MEDICO' &&
      !specialty
    ) {
      return res.status(400).json({
        message:
          'Debes seleccionar la especialidad del médico.',
      });
    }

    if (role !== 'MEDICO') {
      specialty = null;
    }

    try {
      const normalizedUsername =
        username.trim().toLowerCase();

      if (
        normalizedUsername !==
        existing.username
      ) {
        const usernameExists =
          db
            .prepare(`
              SELECT id
              FROM users
              WHERE username = ?
                AND id <> ?
            `)
            .get(
              normalizedUsername,
              userId
            );

        if (usernameExists) {
          return res.status(409).json({
            message:
              'El nombre de usuario ya existe.',
          });
        }
      }

      if (password) {
        const passwordHash =
          bcrypt.hashSync(
            password,
            10
          );

        db.prepare(`
          UPDATE users
          SET
            name = ?,
            username = ?,
            role = ?,
            specialty = ?,
            password_hash = ?
          WHERE id = ?
        `).run(
          name.trim(),
          normalizedUsername,
          role,
          specialty,
          passwordHash,
          userId
        );
      } else {
        db.prepare(`
          UPDATE users
          SET
            name = ?,
            username = ?,
            role = ?,
            specialty = ?
          WHERE id = ?
        `).run(
          name.trim(),
          normalizedUsername,
          role,
          specialty,
          userId
        );
      }

      const updated =
        db
          .prepare(`
            SELECT
              id,
              name,
              username,
              role,
              specialty,
              active
            FROM users
            WHERE id = ?
          `)
          .get(userId);

      res.json(updated);
    } catch (error) {
      console.error(
        'Error actualizando usuario:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible actualizar el usuario.',
      });
    }
  }
);

/* =========================================================
   ACTIVAR / DESACTIVAR
========================================================= */

router.patch(
  '/:id/status',
  allow('ADMINISTRACION'),
  (req, res) => {
    const userId =
      Number(req.params.id);

    const active =
      req.body?.active;

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        message:
          'ID de usuario inválido.',
      });
    }

    if (
      active !== true &&
      active !== false
    ) {
      return res.status(400).json({
        message:
          'Estado inválido.',
      });
    }

    if (
      userId === req.user.id &&
      !active
    ) {
      return res.status(400).json({
        message:
          'No puedes desactivar tu propio usuario.',
      });
    }

    const info =
      db
        .prepare(`
          UPDATE users
          SET active = ?
          WHERE id = ?
        `)
        .run(
          active ? 1 : 0,
          userId
        );

    if (!info.changes) {
      return res.status(404).json({
        message:
          'Usuario no encontrado.',
      });
    }

    res.json({
      ok: true,
      active,
    });
  }
);

/* =========================================================
   REGENERAR CONTRASEÑA TEMPORAL
========================================================= */

router.post(
  '/:id/reset-password',
  allow('ADMINISTRACION'),
  (req, res) => {
    const userId =
      Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        message:
          'ID de usuario inválido.',
      });
    }

    if (
      userId === req.user.id
    ) {
      return res.status(400).json({
        message:
          'No puedes regenerar tu propia contraseña desde esta opción.',
      });
    }

    const user =
      db
        .prepare(`
          SELECT
            id,
            name,
            username,
            active
          FROM users
          WHERE id = ?
        `)
        .get(userId);

    if (!user) {
      return res.status(404).json({
        message:
          'Usuario no encontrado.',
      });
    }

    if (!user.active) {
      return res.status(400).json({
        message:
          'No puedes regenerar la contraseña de un usuario inactivo.',
      });
    }

    const temporaryPassword =
      `SV-${crypto
        .randomUUID()
        .replaceAll('-', '')
        .slice(0, 10)}`;

    const passwordHash =
      bcrypt.hashSync(
        temporaryPassword,
        10
      );

    db.prepare(`
      UPDATE users
      SET
        password_hash = ?,
        must_change_password = 1
      WHERE id = ?
    `).run(
      passwordHash,
      userId
    );

    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
      temporaryPassword,
    });
  }
);

export default router;