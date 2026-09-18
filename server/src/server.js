import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import tariffsRouter from './routes/tariffs.js';
import patientCoverageRouter from './routes/patientCoverage.js';
import morgan from 'morgan';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

import { db } from './db.js';
import {
  login,
  requireAuth,
  allow,
} from './auth.js';

import {
  sendPasswordResetCode,
} from './mailer.js';

import usersRouter from './routes/users.js';


const app = express();

app.use(
  cors({
    origin: true,
  })
);

app.use(express.json());

app.use(morgan('tiny'));

const router =
  express.Router();

/* =========================================================
   ESQUEMAS DE VALIDACIÓN
========================================================= */

const patientSchema =
  z.object({
    document: z
      .string()
      .min(5)
      .max(20),

    name: z
      .string()
      .min(3)
      .max(100),

    phone: z
      .string()
      .max(30)
      .optional()
      .default(''),

    email: z
  .string()
  .trim()
  .email(
    'Debes ingresar un correo electrónico válido.'
  )
  .optional()
  .default(''),

    birthDate: z
      .string()
      .optional()
      .default(''),

    bloodType: z
      .string()
      .max(5)
      .optional()
      .default(''),
  });

const appointmentSchema =
  z.object({
    patientId: z.coerce
      .number()
      .int()
      .positive(),

    date: z
      .string()
      .min(10),

    time: z
      .string()
      .min(4),

    service: z
      .string()
      .min(3),

    professional: z
      .string()
      .min(3),

    professionalUserId: z.coerce
      .number()
      .int()
      .positive()
      .optional(),

    status: z
      .enum([
        'PROGRAMADA',
        'CONFIRMADA',
        'ATENDIDA',
        'CANCELADA',
      ])
      .default('PROGRAMADA'),

    notes: z
      .string()
      .max(500)
      .optional()
      .default(''),
  });

const historySchema =
  z.object({
    patientId: z.coerce
      .number()
      .int()
      .positive(),

    appointmentId: z.coerce
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),

    reason: z
      .string()
      .min(3),

    diagnosis: z
      .string()
      .min(3),

    treatment: z
      .string()
      .min(3),

    observations: z
      .string()
      .max(1000)
      .optional()
      .default(''),

    professional: z
      .string()
      .min(3),
  });

const invoiceSchema =
  z.object({
    patientId: z.coerce
      .number()
      .int()
      .positive(),

    appointmentId: z.coerce
      .number()
      .int()
      .positive()
      .optional(),

    service: z
      .string()
      .min(3),

    amountCop: z.coerce
      .number()
      .int()
      .positive(),

    status: z
      .enum([
        'PENDIENTE',
        'PAGADA',
        'ANULADA',
      ])
      .default('PENDIENTE'),
  });

const PATIENT_SECRET =
  process.env.JWT_SECRET ||
  'ips-salud-vital-dev-secret-cambiar-en-produccion';

/* =========================================================
   SISTEMA CENTRAL DE NOTIFICACIONES
========================================================= */

function createNotification({
  patientId = null,
  targetRole = null,
  targetUserId = null,
  title,
  message,
  type = 'INFO',
  entityType = null,
  entityId = null,
}) {
  db.prepare(`
    INSERT INTO notifications (
      patient_id,
      target_role,
      target_user_id,
      title,
      message,
      type,
      entity_type,
      entity_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    patientId,
    targetRole,
    targetUserId,
    title,
    message,
    type,
    entityType,
    entityId
  );
}

/* =========================================================
   AUTENTICACIÓN
========================================================= */

router.post(
  '/auth/login',
  (req, res) => {
    const {
      username,
      password,
    } = req.body || {};

    if (
      !username ||
      !password
    ) {
      return res.status(400).json({
        message:
          'Usuario y contraseña son obligatorios',
      });
    }

    const result =
      login(
        username,
        password
      );

    if (!result) {
      return res.status(401).json({
        message:
          'Credenciales incorrectas',
      });
    }

    res.json(result);
  }
);

/* =========================================================
   REGISTRO DE PACIENTE
   PÚBLICO - SIN SESIÓN
========================================================= */

const patientRegisterSchema = z
  .object({
    document: z
      .string()
      .trim()
      .min(
        5,
        'El documento debe tener al menos 5 caracteres.'
      )
      .max(
        20,
        'El documento no puede superar 20 caracteres.'
      ),

    name: z
      .string()
      .trim()
      .min(
        3,
        'El nombre debe tener al menos 3 caracteres.'
      )
      .max(
        100,
        'El nombre no puede superar 100 caracteres.'
      ),

    phone: z
      .string()
      .trim()
      .max(
        30,
        'El teléfono no puede superar 30 caracteres.'
      )
      .optional()
      .default(''),

    email: z
      .string()
      .trim()
      .email(
        'Debes ingresar un correo electrónico válido.'
      )
      .optional()
      .default(''),

    birthDate: z
      .string()
      .trim()
      .optional()
      .default(''),

    bloodType: z
      .string()
      .trim()
      .max(
        5,
        'El grupo sanguíneo no es válido.'
      )
      .optional()
      .default(''),

    password: z
      .string()
      .min(
        8,
        'La contraseña debe tener mínimo 8 caracteres.'
      ),

    confirmPassword: z
      .string()
      .min(
        8,
        'Debes confirmar la contraseña.'
      ),
  })
  .superRefine(
    (data, ctx) => {
      if (
        data.password !==
        data.confirmPassword
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            'confirmPassword',
          ],

          message:
            'Las contraseñas no coinciden.',
        });
      }
    }
  );

router.post(
  '/auth/patient-register',
  (req, res) => {
    const parsed =
      patientRegisterSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        message:
          parsed.error.issues[0]
            .message,
      });
    }

    try {
      const {
        document,
        name,
        phone,
        email,
        birthDate,
        bloodType,
        password,
      } = parsed.data;

      const normalizedDocument =
        document.trim();

      const existing =
        db.prepare(`
          SELECT
            id
          FROM patients
          WHERE document = ?
        `).get(
          normalizedDocument
        );

      if (existing) {
        return res.status(409).json({
          message:
            'Este documento ya está registrado. Si ya tienes una cuenta, inicia sesión.',
        });
      }

      const passwordHash =
        bcrypt.hashSync(
          password,
          10
        );

      const info =
        db.prepare(`
          INSERT INTO patients (
            document,
            name,
            phone,
            email,
            birth_date,
            blood_type,
            password_hash
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?
          )
        `).run(
          normalizedDocument,
          name.trim(),
          phone.trim(),
          email.trim(),
          birthDate.trim(),
          bloodType.trim(),
          passwordHash
        );

      const patient =
        db.prepare(`
          SELECT
            id,
            document,
            name,
            phone,
            email,
            birth_date AS birthDate,
            blood_type AS bloodType,
            created_at AS createdAt
          FROM patients
          WHERE id = ?
        `).get(
          info.lastInsertRowid
        );

      res.status(201).json({
        message:
          'Cuenta de paciente creada correctamente.',
        user: {
          id: patient.id,
          name: patient.name,
          document:
            patient.document,
          email:
            patient.email,
          role: 'PACIENTE',
        },
      });
    } catch (error) {
      if (
        error?.code ===
        'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        return res.status(409).json({
          message:
            'Este documento ya está registrado.',
        });
      }

      console.error(
        'Error registrando paciente:',
        error
      );

      return res.status(500).json({
        message:
          'No fue posible crear la cuenta del paciente.',
      });
    }
  }
);

/* =========================================================
   LOGIN PACIENTE
   PÚBLICO - SIN SESIÓN
========================================================= */

router.post(
  '/auth/patient-login',
  (req, res) => {
    const document =
      String(
        req.body?.document || ''
      ).trim();

    const password =
      String(
        req.body?.password || ''
      );

    if (!document || !password) {
      return res.status(400).json({
        message:
          'Documento y contraseña son obligatorios.',
      });
    }

    const patient =
      db.prepare(`
        SELECT
          id,
          document,
          name,
          email,
          password_hash
        FROM patients
        WHERE document = ?
        LIMIT 1
      `).get(
        document
      );

    if (!patient) {
      return res.status(401).json({
        message:
          'Documento o contraseña incorrectos',
      });
    }

    const passwordValid =
      bcrypt.compareSync(
        password,
        patient.password_hash
      );

    if (!passwordValid) {
      return res.status(401).json({
        message:
          'Documento o contraseña incorrectos',
      });
    }

    const user = {
      id: patient.id,
      name: patient.name,
      document: patient.document,
      email: patient.email,
      role: 'PACIENTE',
    };

    const token =
      jwt.sign(
        user,
        PATIENT_SECRET,
        {
          expiresIn: '8h',
        }
      );

    return res.json({
      token,
      user,
    });
  }
);

/* =========================================================
   SOLICITAR RECUPERACIÓN DE CONTRASEÑA
   PÚBLICO - SIN SESIÓN
========================================================= */

router.post(
  '/auth/patient-forgot-password',
  async (req, res) => {
    const document =
      String(
        req.body?.document || ''
      ).trim();

    const email =
      String(
        req.body?.email || ''
      )
        .trim()
        .toLowerCase();

    if (!document || !email) {
      return res.status(400).json({
        message:
          'Documento y correo electrónico son obligatorios.',
      });
    }

    /*
      Siempre devolvemos el mismo mensaje.
      Así no revelamos si el documento existe
      o si el correo pertenece a una cuenta.
    */

    const genericResponse = {
      message:
        'Si los datos coinciden con una cuenta, se generará un código de recuperación.',
    };

    const patient =
      db.prepare(`
        SELECT
          id,
          email
        FROM patients
        WHERE document = ?
        LIMIT 1
      `).get(
        document
      );

    if (
      !patient ||
      !patient.email ||
      patient.email.trim().toLowerCase() !== email
    ) {
      return res.json(
        genericResponse
      );
    }

    /*
      Anulamos códigos anteriores
      del mismo paciente.
    */

    db.prepare(`
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE patient_id = ?
        AND used_at IS NULL
    `).run(
      patient.id
    );

    /*
      Código de 6 dígitos.
    */

    const code =
      crypto
        .randomInt(
          100000,
          1000000
        )
        .toString();

    /*
      Nunca guardamos el código directamente.
      Guardamos un SHA-256.
    */

    const tokenHash =
      crypto
        .createHash('sha256')
        .update(code)
        .digest('hex');

    /*
      El código dura 10 minutos.
    */

    const expiresAt =
      new Date(
        Date.now() +
          10 * 60 * 1000
      ).toISOString();

    db.prepare(`
      INSERT INTO password_reset_tokens (
        patient_id,
        token_hash,
        expires_at
      )
      VALUES (?, ?, ?)
    `).run(
      patient.id,
      tokenHash,
      expiresAt
    );

    /*
      DESARROLLO LOCAL:
      devolvemos temporalmente el código
      para poder probar el flujo sin SMTP.
      
      En producción esto NO debe hacerse.
    */

    try {
  await sendPasswordResetCode({
    to: patient.email,
    code,
  });
} catch (error) {
  console.error(
    'Error enviando código de recuperación:',
    error
  );

  return res.status(500).json({
    message:
      'No fue posible enviar el código de recuperación. Intenta nuevamente más tarde.',
  });
}

return res.json(
  genericResponse
);
  }
);


/* =========================================================
   RESTABLECER CONTRASEÑA DE PACIENTE
   PÚBLICO - SIN SESIÓN
========================================================= */

router.post(
  '/auth/patient-reset-password',
  async (req, res) => {
    const document =
      String(
        req.body?.document || ''
      ).trim();

    const code =
      String(
        req.body?.code || ''
      ).trim();

    const newPassword =
      String(
        req.body?.newPassword || ''
      );

    const confirmPassword =
      String(
        req.body?.confirmPassword || ''
      );

    if (
      !document ||
      !code ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message:
          'Todos los campos son obligatorios.',
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        message:
          'El código debe tener 6 dígitos.',
      });
    }

    if (
      newPassword.length < 8
    ) {
      return res.status(400).json({
        message:
          'La nueva contraseña debe tener mínimo 8 caracteres.',
      });
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      return res.status(400).json({
        message:
          'Las contraseñas no coinciden.',
      });
    }

    const patient =
      db.prepare(`
        SELECT
          id,
          password_hash
        FROM patients
        WHERE document = ?
        LIMIT 1
      `).get(
        document
      );

    if (!patient) {
      return res.status(400).json({
        message:
          'El código de recuperación no es válido o ya expiró.',
      });
    }

    const tokenHash =
      crypto
        .createHash('sha256')
        .update(code)
        .digest('hex');

    const resetToken =
      db.prepare(`
        SELECT
          id,
          patient_id,
          expires_at,
          used_at
        FROM password_reset_tokens
        WHERE patient_id = ?
          AND token_hash = ?
          AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `).get(
        patient.id,
        tokenHash
      );

    if (!resetToken) {
      return res.status(400).json({
        message:
          'El código de recuperación no es válido.',
      });
    }

    if (
      new Date(
        resetToken.expires_at
      ).getTime() <=
      Date.now()
    ) {
      return res.status(400).json({
        message:
          'El código de recuperación expiró. Solicita uno nuevo.',
      });
    }

    if (
      bcrypt.compareSync(
        newPassword,
        patient.password_hash
      )
    ) {
      return res.status(400).json({
        message:
          'La nueva contraseña debe ser diferente a la anterior.',
      });
    }

    const newPasswordHash =
      bcrypt.hashSync(
        newPassword,
        10
      );

    const updatePatient =
      db.prepare(`
        UPDATE patients
        SET password_hash = ?
        WHERE id = ?
      `);

    const markToken =
      db.prepare(`
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

    const resetPassword =
      db.transaction(() => {
        const result =
          updatePatient.run(
            newPasswordHash,
            patient.id
          );

        if (
          result.changes !== 1
        ) {
          throw new Error(
            'No fue posible actualizar la contraseña.'
          );
        }

        markToken.run(
          resetToken.id
        );
      });

    try {
      resetPassword();

      /*
        Limpieza de códigos antiguos
        del mismo paciente.
      */

      db.prepare(`
        DELETE FROM password_reset_tokens
        WHERE patient_id = ?
          AND (
            used_at IS NOT NULL
            OR expires_at <= CURRENT_TIMESTAMP
          )
      `).run(
        patient.id
      );

      return res.json({
        ok: true,
        message:
          'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
      });
    } catch (error) {
      console.error(
        'Error restableciendo contraseña de paciente:',
        error
      );

      return res.status(500).json({
        message:
          'No fue posible restablecer la contraseña.',
      });
    }
  }
);

/* =========================================================
   HEALTH
========================================================= */

router.get(
  '/health',
  (req, res) => {
    res.json({
      status: 'ok',
      service:
        'IPS Salud Vital API',
    });
  }
);

/* =========================================================
   AUTENTICACIÓN DE RUTAS
========================================================= */

router.use(
  requireAuth
);

/* =========================================================
   CAMBIO DE CONTRASEÑA
========================================================= */

router.patch(
  '/auth/change-password',
  (req, res) => {
    const {
      currentPassword,
      newPassword,
    } = req.body || {};

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        message:
          'La contraseña actual y la nueva contraseña son obligatorias.',
      });
    }

    if (
      newPassword.length < 8
    ) {
      return res.status(400).json({
        message:
          'La nueva contraseña debe tener mínimo 8 caracteres.',
      });
    }

    if (
      req.user.role ===
      'PACIENTE'
    ) {
      return res.status(403).json({
        message:
          'Esta operación no corresponde al portal del paciente.',
      });
    }

    const user =
      db.prepare(`
        SELECT
          id,
          password_hash,
          must_change_password
        FROM users
        WHERE id = ?
          AND active = 1
      `).get(req.user.id);

    if (!user) {
      return res.status(404).json({
        message:
          'Usuario no encontrado.',
      });
    }

    if (
      !bcrypt.compareSync(
        currentPassword,
        user.password_hash
      )
    ) {
      return res.status(401).json({
        message:
          'La contraseña actual es incorrecta.',
      });
    }

    if (
      bcrypt.compareSync(
        newPassword,
        user.password_hash
      )
    ) {
      return res.status(400).json({
        message:
          'La nueva contraseña debe ser diferente a la actual.',
      });
    }

    const newPasswordHash =
      bcrypt.hashSync(
        newPassword,
        10
      );



    db.prepare(`
      UPDATE users
      SET
        password_hash = ?,
        must_change_password = 0
      WHERE id = ?
    `).run(
      newPasswordHash,
      user.id
    );

    res.json({
      ok: true,
      message:
        'Contraseña actualizada correctamente.',
    });
  }
);

/* =========================================================
   USUARIOS
========================================================= */

router.use(
  '/users',
  usersRouter
);

/* =========================================================
   PERFIL ACTUAL
========================================================= */

router.get(
  '/me',
  (req, res) =>
    res.json(req.user)
);

/* =========================================================
   DASHBOARD
========================================================= */

router.get(
  '/dashboard',
  (req, res) => {
    const patients =
      db.prepare(`
        SELECT COUNT(*) AS c
        FROM patients
      `).get().c;

    const appointments =
      db.prepare(`
        SELECT COUNT(*) AS c
        FROM appointments
        WHERE status <> 'CANCELADA'
      `).get().c;

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const todayAppointments =
      db.prepare(`
        SELECT COUNT(*) AS c
        FROM appointments
        WHERE date = ?
          AND status <> 'CANCELADA'
      `).get(today).c;

    const pendingInvoices =
      db.prepare(`
        SELECT
          COALESCE(
            SUM(amount_cop),
            0
          ) AS total
        FROM invoices
        WHERE status = 'PENDIENTE'
      `).get().total;

    res.json({
      patients,
      appointments,
      todayAppointments,
      pendingInvoices,
    });
  }
);

/* =========================================================
   PACIENTES
========================================================= */

router.get(
  '/patients',
  (req, res) => {
    const rows =
      db.prepare(`
        SELECT
          id,
          document,
          name,
          phone,
          email,
          birth_date AS birthDate,
          blood_type AS bloodType,
          created_at AS createdAt
        FROM patients
        ORDER BY id DESC
      `).all();

    res.json(rows);
  }
);

/* =========================================================
   BUSCAR PACIENTES
   Solo devuelve resultados cuando existe una búsqueda.
========================================================= */

router.get(
  '/patients/search',
  allow('RECEPCION', 'MEDICO'),
  (req, res) => {
    const query = String(
      req.query.q || ''
    ).trim();

    if (query.length < 2) {
      return res.json([]);
    }

    const search = `%${query.toLowerCase()}%`;

    const rows = db.prepare(`
      SELECT
        id,
        document,
        name,
        blood_type AS bloodType
      FROM patients
      WHERE
        LOWER(document) LIKE ?
        OR LOWER(name) LIKE ?
      ORDER BY name ASC
      LIMIT 20
    `).all(
      search,
      search
    );

    res.json(rows);
  }
);

/* =========================================================
   FICHA COMPLETA DEL PACIENTE
   Datos + citas + historia clínica
========================================================= */

router.get(
  '/patients/:id/profile',
  allow('RECEPCION', 'MEDICO'),
  (req, res) => {
    const patientId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(patientId) ||
      patientId <= 0
    ) {
      return res.status(400).json({
        message: 'Paciente inválido.',
      });
    }

    const patient = db.prepare(`
      SELECT
        id,
        document,
        name,
        phone,
        email,
        birth_date AS birthDate,
        blood_type AS bloodType,
        created_at AS createdAt
      FROM patients
      WHERE id = ?
      LIMIT 1
    `).get(patientId);

    if (!patient) {
      return res.status(404).json({
        message: 'Paciente no encontrado.',
      });
    }

    const appointments = db.prepare(`
      SELECT
        a.id,
        a.date,
        a.time,
        a.service,
        a.professional,
        a.status,
        a.notes
      FROM appointments a
      WHERE a.patient_id = ?
      ORDER BY
        a.date DESC,
        a.time DESC
    `).all(patientId);

    const history = db.prepare(`
      SELECT
        h.id,
        h.appointment_id AS appointmentId,
        h.reason,
        h.diagnosis,
        h.treatment,
        h.observations,
        h.professional,
        h.created_at AS createdAt
      FROM clinical_records h
      WHERE h.patient_id = ?
      ORDER BY
        h.created_at DESC
    `).all(patientId);

    return res.json({
      patient,
      appointments,
      history,
    });
  }
);

router.post(
  '/patients',
  allow(
    'RECEPCION'
  ),
  (req, res) => {
    const parsed =
      patientSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        message:
          parsed.error.issues[0].message,
      });
    }

    try {
      const patient =
        parsed.data;

      const passwordHash =
        bcrypt.hashSync(
          'Paciente123',
          10
        );

      const info =
        db.prepare(`
          INSERT INTO patients (
            document,
            name,
            phone,
            email,
            birth_date,
            blood_type,
            password_hash
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?
          )
        `).run(
          patient.document,
          patient.name,
          patient.phone,
          patient.email,
          patient.birthDate,
          patient.bloodType,
          passwordHash
        );

      const created =
        db.prepare(`
          SELECT
            id,
            document,
            name,
            phone,
            email,
            birth_date AS birthDate,
            blood_type AS bloodType,
            created_at AS createdAt
          FROM patients
          WHERE id = ?
        `).get(
          info.lastInsertRowid
        );

      res.status(201).json(
        created
      );
    } catch (error) {
      if (
        error?.code ===
        'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        return res.status(409).json({
          message:
            'El documento ya está registrado.',
        });
      }

      console.error(
        'Error al registrar paciente:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible registrar el paciente.',
      });
    }
  }
);

router.put(
  '/patients/:id',
  allow('RECEPCION'),
  (req, res) => {
    const parsed =
      patientSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        message:
          parsed.error.issues[0].message,
      });
    }

    const patient =
      parsed.data;

    const info =
      db.prepare(`
        UPDATE patients
        SET
          document = ?,
          name = ?,
          phone = ?,
          email = ?,
          birth_date = ?,
          blood_type = ?
        WHERE id = ?
      `).run(
        patient.document,
        patient.name,
        patient.phone,
        patient.email,
        patient.birthDate,
        patient.bloodType,
        req.params.id
      );

    if (!info.changes) {
      return res.status(404).json({
        message:
          'Paciente no encontrado',
      });
    }

    res.json(
      db.prepare(`
        SELECT
          id,
          document,
          name,
          phone,
          email,
          birth_date AS birthDate,
          blood_type AS bloodType,
          created_at AS createdAt
        FROM patients
        WHERE id = ?
      `).get(req.params.id)
    );
  }
);

router.delete(
  '/patients/:id',
  allow('RECEPCION'),
  (req, res) => {
    const info =
      db.prepare(`
        DELETE FROM patients
        WHERE id = ?
      `).run(
        req.params.id
      );

    if (!info.changes) {
      return res.status(404).json({
        message:
          'Paciente no encontrado',
      });
    }

    res.status(204).end();
  }
);

/* =========================================================
   CITAS DEL MÉDICO AUTENTICADO
   Solo devuelve sus propias citas.
========================================================= */

router.get(
  '/appointments/mine',
  allow('MEDICO'),
  (req, res) => {
    const rows = db.prepare(`
      SELECT
        a.id,
        a.patient_id AS patientId,
        p.name AS patient,
        a.date,
        a.time,
        a.service,
        a.professional,
        a.professional_user_id AS professionalUserId,
        a.status,
        a.attendance_status AS attendanceStatus,
        a.notes,
        a.created_at AS createdAt
      FROM appointments a
      JOIN patients p
        ON p.id = a.patient_id
      WHERE
        a.professional_user_id = ?
      ORDER BY
        a.date ASC,
        a.time ASC
    `).all(req.user.id);

    return res.json(rows);
  }
);

/* =========================================================
   CITAS
========================================================= */

router.get(
  '/appointments',
  (req, res) => {
    const rows =
  db.prepare(`
    SELECT
      a.id,
      a.patient_id AS patientId,
      p.name AS patient,
      a.date,
      a.time,
      a.service,
      a.professional,
      a.professional_user_id AS professionalUserId,
      a.status,
      a.attendance_status AS attendanceStatus,
      a.notes,
      a.created_at AS createdAt
      FROM appointments a
      JOIN patients p
      ON p.id = a.patient_id
      ORDER BY
      a.date ASC,
      a.time ASC
  `).all();

    res.json(rows);
  }
);

/* =========================================================
   CREAR CITA
   SOLO RECEPCIÓN
========================================================= */

router.post(
  '/appointments',
  allow('RECEPCION'),
  (req, res) => {
    const parsed =
      appointmentSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        message:
          parsed.error.issues[0].message,
      });
    }

    const appointment =
      parsed.data;

      let professionalUserId =
  appointment.professionalUserId ||
  null;

let professionalName =
  appointment.professional;

    const patient =
      db.prepare(`
        SELECT id, name
        FROM patients
        WHERE id = ?
      `).get(
        appointment.patientId
      );

    if (!patient) {
      return res.status(404).json({
        message:
          'Paciente no encontrado',
      });
    }

    if (professionalUserId) {
  const doctor =
    db.prepare(`
      SELECT
        id,
        name,
        role,
        specialty,
        active
      FROM users
      WHERE id = ?
    `).get(
      professionalUserId
    );

  if (!doctor) {
    return res.status(404).json({
      message:
        'El médico seleccionado no existe.',
    });
  }

  if (
    doctor.role !== 'MEDICO'
  ) {
    return res.status(400).json({
      message:
        'El usuario seleccionado no es un médico.',
    });
  }

  if (!doctor.active) {
    return res.status(400).json({
      message:
        'El médico seleccionado está inactivo.',
    });
  }

  if (
    doctor.specialty !==
    appointment.service
  ) {
    return res.status(400).json({
      message:
        'El médico no corresponde a la especialidad seleccionada.',
    });
  }

  professionalName =
    doctor.name;
}


    try {
      const info =
        db.prepare(`
          INSERT INTO appointments (
  patient_id,
  date,
  time,
  service,
  professional,
  professional_user_id,
  status,
  notes
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        
`).run(
  appointment.patientId,
  appointment.date,
  appointment.time,
  appointment.service,
  professionalName,
  professionalUserId,
  appointment.status,
  appointment.notes
);

      const appointmentId =
        Number(
          info.lastInsertRowid
        );

      /* Notificación paciente */

      createNotification({
        patientId:
          appointment.patientId,

        targetRole:
          'PACIENTE',

        title:
          'Nueva cita',

        message:
          `Tu cita de ${appointment.service} está programada para el ${appointment.date} a las ${appointment.time}.`,

        type:
          'CITA',

        entityType:
          'APPOINTMENT',

        entityId:
          appointmentId,
      });

      /* Notificación médico */

createNotification({
  targetRole:
    'MEDICO',

  targetUserId:
    professionalUserId,

  title:
    'Nueva cita asignada',

  message:
    `Se asignó una cita de ${appointment.service} para el ${appointment.date} a las ${appointment.time}. Profesional: ${appointment.professional}.`,

  type:
    'CITA',

  entityType:
    'APPOINTMENT',

  entityId:
    appointmentId,
});

      const created =
  db.prepare(`
    SELECT
      a.id,
      a.patient_id AS patientId,
      p.name AS patient,
      a.date,
      a.time,
      a.service,
      a.professional,
      a.professional_user_id AS professionalUserId,
      a.status,
      a.notes,
      a.created_at AS createdAt
    FROM appointments a
    JOIN patients p
      ON p.id = a.patient_id
    WHERE a.id = ?
  `).get(
    appointmentId
  );

      res
        .status(201)
        .json(created);
    } catch (error) {
      console.error(
        'Error al crear cita:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible registrar la cita.',
      });
    }
  }
);

/* =========================================================
   EDITAR CITA
   SOLO RECEPCIÓN
========================================================= */

router.put(
  '/appointments/:id',
  allow('RECEPCION'),
  (req, res) => {
    const parsed =
      appointmentSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        message:
          parsed.error.issues[0].message,
      });
    }

    try {
      const appointment =
        parsed.data;

        let professionalUserId =
  appointment.professionalUserId ||
  null;

let professionalName =
  appointment.professional;

  if (professionalUserId) {
  const doctor =
    db.prepare(`
      SELECT
        id,
        name,
        role,
        specialty,
        active
      FROM users
      WHERE id = ?
    `).get(
      professionalUserId
    );

  if (!doctor) {
    return res.status(404).json({
      message:
        'El médico seleccionado no existe.',
    });
  }

  if (
    doctor.role !== 'MEDICO'
  ) {
    return res.status(400).json({
      message:
        'El usuario seleccionado no es un médico.',
    });
  }

  if (!doctor.active) {
    return res.status(400).json({
      message:
        'El médico seleccionado está inactivo.',
    });
  }

  if (
    doctor.specialty !==
    appointment.service
  ) {
    return res.status(400).json({
      message:
        'El médico no corresponde a la especialidad seleccionada.',
    });
  }

  professionalName =
    doctor.name;
}

      const existing =
        db.prepare(`
          SELECT *
          FROM appointments
          WHERE id = ?
        `).get(
          req.params.id
        );

      if (!existing) {
        return res.status(404).json({
          message:
            'Cita no encontrada.',
        });
      }

      const patient =
        db.prepare(`
          SELECT id
          FROM patients
          WHERE id = ?
        `).get(
          appointment.patientId
        );

      if (!patient) {
        return res.status(404).json({
          message:
            'Paciente no encontrado.',
        });
      }

      db.prepare(`
        UPDATE appointments
SET
  patient_id = ?,
  date = ?,
  time = ?,
  service = ?,
  professional = ?,
  professional_user_id = ?,
  status = ?,
  notes = ?
WHERE id = ?
      `).run(
  appointment.patientId,
  appointment.date,
  appointment.time,
  appointment.service,
  professionalName,
  professionalUserId,
  appointment.status,
  appointment.notes,
  req.params.id
);

      const updated =
        db.prepare(`
          SELECT
            a.id,
            a.patient_id AS patientId,
            p.name AS patient,
            a.date,
            a.time,
            a.service,
            a.professional,
            a.professional_user_id AS professionalUserId,
            a.status,
            a.notes,
            a.created_at AS createdAt
          FROM appointments a
          JOIN patients p
            ON p.id = a.patient_id
          WHERE a.id = ?
        `).get(
          req.params.id
        );

      createNotification({
        patientId:
          appointment.patientId,

        targetRole:
          'PACIENTE',

        title:
          'Cita actualizada',

        message:
          `Tu cita de ${appointment.service} fue actualizada para el ${appointment.date} a las ${appointment.time}.`,

        type:
          'CITA',

        entityType:
          'APPOINTMENT',

        entityId:
          Number(req.params.id),
      });

      res.json(
        updated
      );
    } catch (error) {
      console.error(
        'Error al actualizar cita:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible actualizar la cita.',
      });
    }
  }
);

/* =========================================================
   REGISTRAR ATENCIÓN MÉDICA COMPLETA
   Crea la historia clínica y marca la cita como atendida
   dentro de una única transacción.
========================================================= */

router.post(
  '/appointments/:id/attend',
  allow('MEDICO'),
  (req, res) => {
    const appointmentId =
      Number(req.params.id);

    if (
      !Number.isInteger(appointmentId) ||
      appointmentId <= 0
    ) {
      return res.status(400).json({
        message: 'Cita inválida.',
      });
    }

    const {
      reason,
      diagnosis,
      treatment,
      observations = '',
    } = req.body || {};

    if (
      !String(reason || '').trim() ||
      !String(diagnosis || '').trim() ||
      !String(treatment || '').trim()
    ) {
      return res.status(400).json({
        message:
          'Motivo, diagnóstico y tratamiento son obligatorios.',
      });
    }

    const appointment =
      db.prepare(`
        SELECT
          id,
          patient_id,
          professional,
          professional_user_id,
          status
        FROM appointments
        WHERE id = ?
        LIMIT 1
      `).get(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        message:
          'La cita no existe.',
      });
    }

    /* -------------------------------------------------------
       SEGURIDAD:
       EL MÉDICO SOLO PUEDE ATENDER SU PROPIA CITA
    ------------------------------------------------------- */

    if (
      appointment.professional_user_id !==
      req.user.id
    ) {
      return res.status(403).json({
        message:
          'Solo puedes atender las citas que te fueron asignadas.',
      });
    }

    /* -------------------------------------------------------
       ESTADOS PERMITIDOS
    ------------------------------------------------------- */

    if (
      appointment.status !==
        'PROGRAMADA' &&
      appointment.status !==
        'CONFIRMADA'
    ) {
      return res.status(400).json({
        message:
          'Esta cita no está disponible para atención.',
      });
    }

    try {
      const transaction =
        db.transaction(() => {
          /* -----------------------------------------------
             CREAR HISTORIA CLÍNICA
          ----------------------------------------------- */

          const historyResult =
            db.prepare(`
              INSERT INTO clinical_records (
                patient_id,
                appointment_id,
                reason,
                diagnosis,
                treatment,
                observations,
                professional
              )
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              appointment.patient_id,
              appointment.id,
              String(reason).trim(),
              String(diagnosis).trim(),
              String(treatment).trim(),
              String(observations || '').trim(),
              appointment.professional
            );

          /* -----------------------------------------------
             MARCAR CITA COMO ATENDIDA
          ----------------------------------------------- */

          db.prepare(`
            UPDATE appointments
            SET
              status = 'ATENDIDA',
              attendance_status = 'ASISTIO'
            WHERE id = ?
          `).run(
            appointment.id
          );

          return historyResult.lastInsertRowid;
        });

      const historyId =
        transaction();

      return res.status(201).json({
        message:
          'Atención registrada correctamente.',
        appointmentId:
          appointment.id,
        historyId,
      });
    } catch (error) {
      console.error(
        'Error registrando atención:',
        error
      );

      return res.status(500).json({
        message:
          'No fue posible registrar la atención.',
      });
    }
  }
);

/* =========================================================
   CAMBIO DE ESTADO DE CITA
========================================================= */

router.patch(
  '/appointments/:id/status',
  allow(
    'RECEPCION',
    'MEDICO'
  ),
  (req, res) => {
    const parsed =
      z.enum([
        'PROGRAMADA',
        'CONFIRMADA',
        'ATENDIDA',
        'CANCELADA',
      ]).safeParse(
        req.body?.status
      );

    if (!parsed.success) {
      return res.status(400).json({
        message:
          'Estado inválido',
      });
    }

    const appointment =
      db.prepare(`
        SELECT *
        FROM appointments
        WHERE id = ?
      `).get(
        req.params.id
      );

    if (!appointment) {
      return res.status(404).json({
        message:
          'Cita no encontrada',
      });
    }

    const nextStatus =
      parsed.data;

const attendanceStatus =
  req.body?.attendanceStatus ||
  null;

if (
  attendanceStatus &&
  ![
    'ASISTIO',
    'NO_ASISTIO',
  ].includes(
    attendanceStatus
  )
) {
  return res.status(400).json({
    message:
      'Estado de asistencia inválido.',
  });
}

/* =========================================================
   SEGURIDAD:
   UN MÉDICO SOLO PUEDE GESTIONAR SUS PROPIAS CITAS
========================================================= */

if (
  req.user.role === 'MEDICO' &&
  appointment.professional_user_id !==
    req.user.id
) {
  return res.status(403).json({
    message:
      'Solo puedes gestionar tus propias citas.',
  });
}

if (
  attendanceStatus &&
  ![
    'ASISTIO',
    'NO_ASISTIO',
  ].includes(
    attendanceStatus
  )
) {
  return res.status(400).json({
    message:
      'Estado de asistencia inválido.',
  });
}

    db.prepare(`
  UPDATE appointments
  SET
    status = ?,
    attendance_status =
      COALESCE(
        ?,
        attendance_status
      )
  WHERE id = ?
`).run(
  nextStatus,
  attendanceStatus,
  req.params.id
);

    if (
      nextStatus ===
      'CANCELADA'
    ) {
      createNotification({
        patientId:
          appointment.patient_id,

        targetRole:
          'PACIENTE',

        title:
          'Cita cancelada',

        message:
          `Tu cita del ${appointment.date} a las ${appointment.time} fue cancelada.`,

        type:
          'CANCELACION',

        entityType:
          'APPOINTMENT',

        entityId:
          appointment.id,
      });

      createNotification({
        targetRole:
          'RECEPCION',

        title:
          'Cita cancelada',

        message:
          `La cita del ${appointment.date} a las ${appointment.time} fue cancelada.`,

        type:
          'CANCELACION',

        entityType:
          'APPOINTMENT',

        entityId:
          appointment.id,
      });
    }

    if (
      nextStatus ===
      'CONFIRMADA'
    ) {
      createNotification({
        patientId:
          appointment.patient_id,

        targetRole:
          'PACIENTE',

        title:
          'Cita confirmada',

        message:
          `Tu cita de ${appointment.service} para el ${appointment.date} a las ${appointment.time} fue confirmada.`,

        type:
          'CITA',

        entityType:
          'APPOINTMENT',

        entityId:
          appointment.id,
      });
    }

    res.json({
      ok: true,
      status: nextStatus,
    });
  }
);

/* =========================================================
   HISTORIA CLÍNICA
========================================================= */

router.get(
  '/history',
  allow(
    'MEDICO'
  ),
  (req, res) => {
    const rows =
      db.prepare(`
        SELECT
          h.id,
          h.patient_id AS patientId,
          p.name AS patient,
          h.appointment_id AS appointmentId,
          h.reason,
          h.diagnosis,
          h.treatment,
          h.observations,
          h.professional,
          h.created_at AS createdAt
        FROM clinical_records h
        JOIN patients p
          ON p.id = h.patient_id
        ORDER BY
          h.created_at DESC
      `).all();

    res.json(rows);
  }
);



router.post(
  '/history',
  allow('MEDICO'),
  (req, res) => {
    const parsed =
      historySchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        message:
          parsed.error.issues[0].message,
      });
    }

    try {
      const history =
        parsed.data;

        if (
  history.appointmentId
) {
  const appointment =
    db.prepare(`
      SELECT
        id,
        patient_id,
        professional_user_id,
        status
      FROM appointments
      WHERE id = ?
      LIMIT 1
    `).get(
      history.appointmentId
    );

  if (!appointment) {
    return res.status(404).json({
      message:
        'La cita asociada no existe.',
    });
  }

  if (
    appointment.patient_id !==
    history.patientId
  ) {
    return res.status(400).json({
      message:
        'La cita no corresponde al paciente seleccionado.',
    });
  }

  if (
    appointment.professional_user_id !==
    req.user.id
  ) {
    return res.status(403).json({
      message:
        'Solo puedes registrar atención sobre tus propias citas.',
    });
  }

  if (
  appointment.status ===
  'CANCELADA'
) {
  return res.status(400).json({
    message:
      'No puedes registrar atención sobre una cita cancelada.',
  });
}

}

      const info =
        db.prepare(`
          INSERT INTO clinical_records (
            patient_id,
            appointment_id,
            reason,
            diagnosis,
            treatment,
            observations,
            professional
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?
          )
        `).run(
          history.patientId,
          history.appointmentId ??
            null,
          history.reason,
          history.diagnosis,
          history.treatment,
          history.observations,
          history.professional
        );

      res.status(201).json(
        db.prepare(`
          SELECT *
          FROM clinical_records
          WHERE id = ?
        `).get(
          info.lastInsertRowid
        )
      );
    } catch (error) {
      console.error(
        'Error guardando historia:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible guardar la historia clínica.',
      });
    }
  }
);

/* =========================================================
   FACTURACIÓN
========================================================= */

router.get(
  '/invoices',
  allow('RECEPCION'),
  (req, res) => {
    const rows =
      db.prepare(`
        SELECT
          i.id,
          i.patient_id AS patientId,
          i.appointment_id AS appointmentId,
          p.name AS patient,
          i.service,
          i.amount_cop AS amountCop,
          i.status,
          i.issued_at AS issuedAt
        FROM invoices i
        JOIN patients p
          ON p.id = i.patient_id
        ORDER BY
          i.issued_at DESC
      `).all();

    res.json(rows);
  }
);

/* =========================================================
   CREAR FACTURA
   SOLO RECEPCIÓN
========================================================= */

router.post(
  '/invoices',
  allow('RECEPCION'),
  (req, res) => {
    const parsed =
      invoiceSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        message:
          parsed.error.issues[0].message,
      });
    }

    const invoice =
      parsed.data;

    try {
      /* -----------------------------------------------------
         VALIDAR CITA
      ----------------------------------------------------- */

      if (
        invoice.appointmentId
      ) {
        const appointment =
          db.prepare(`
            SELECT
              id,
              patient_id,
              service,
              status
            FROM appointments
            WHERE id = ?
          `).get(
            invoice.appointmentId
          );

        if (!appointment) {
          return res.status(404).json({
            message:
              'La cita asociada no existe.',
          });
        }

        /* ---------------------------------------------------
           VALIDAR PACIENTE
        --------------------------------------------------- */

        if (
          Number(
            appointment.patient_id
          ) !==
          Number(
            invoice.patientId
          )
        ) {
          return res.status(400).json({
            message:
              'El paciente de la factura no coincide con la cita.',
          });
        }

        /* ---------------------------------------------------
           EVITAR FACTURA DUPLICADA
        --------------------------------------------------- */

        const existingInvoice =
          db.prepare(`
            SELECT
              id,
              status
            FROM invoices
            WHERE appointment_id = ?
            LIMIT 1
          `).get(
            invoice.appointmentId
          );

        if (existingInvoice) {
          return res.status(409).json({
            message:
              `La cita ya tiene una factura registrada (#${existingInvoice.id}).`,

            invoiceId:
              existingInvoice.id,

            status:
              existingInvoice.status,
          });
        }
      }

      /* -----------------------------------------------------
         CREAR FACTURA
      ----------------------------------------------------- */

      const info =
        db.prepare(`
          INSERT INTO invoices (
            patient_id,
            appointment_id,
            service,
            amount_cop,
            status
          )
          VALUES (
            ?, ?, ?, ?, ?
          )
        `).run(
          invoice.patientId,
          invoice.appointmentId ??
            null,
          invoice.service,
          invoice.amountCop,
          'PENDIENTE'
        );

      const invoiceId =
        Number(
          info.lastInsertRowid
        );

      const createdInvoice =
        db.prepare(`
          SELECT
            i.id,
            i.patient_id AS patientId,
            i.appointment_id AS appointmentId,
            p.name AS patient,
            i.service,
            i.amount_cop AS amountCop,
            i.status,
            i.issued_at AS issuedAt
          FROM invoices i
          JOIN patients p
            ON p.id = i.patient_id
          WHERE i.id = ?
        `).get(
          invoiceId
        );

      /* -----------------------------------------------------
         NOTIFICACIÓN A RECEPCIÓN
      ----------------------------------------------------- */

      createNotification({
        targetRole:
          'RECEPCION',

        title:
          'Nueva factura',

        message:
          `Se generó la factura #${invoiceId} por ${invoice.service}.`,

        type:
          'FACTURACION',

        entityType:
          'INVOICE',

        entityId:
          invoiceId,
      });

      res.status(201).json(
        createdInvoice
      );
    } catch (error) {
      console.error(
        'Error creando factura:',
        error
      );

      if (
        error?.code ===
        'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        return res.status(409).json({
          message:
            'La cita ya tiene una factura registrada.',
        });
      }

      res.status(500).json({
        message:
          'No fue posible generar la factura.',
      });
    }
  }
);

/* =========================================================
   ESTADO DE FACTURA
========================================================= */

router.patch(
  '/invoices/:id/status',
  allow('RECEPCION'),
  (req, res) => {
    const parsed =
      z.enum([
        'PENDIENTE',
        'PAGADA',
        'ANULADA',
      ]).safeParse(
        req.body?.status
      );

    if (!parsed.success) {
      return res.status(400).json({
        message:
          'Estado inválido',
      });
    }

    const nextStatus =
      parsed.data;

    const invoice =
      db.prepare(`
        SELECT
          id,
          patient_id,
          service,
          amount_cop,
          status
        FROM invoices
        WHERE id = ?
      `).get(
        req.params.id
      );

    if (!invoice) {
      return res.status(404).json({
        message:
          'Factura no encontrada',
      });
    }

    if (
      invoice.status ===
        'PAGADA' &&
      nextStatus !==
        'PAGADA'
    ) {
      return res.status(400).json({
        message:
          'Una factura pagada no puede regresar a otro estado.',
      });
    }

    if (
      invoice.status ===
        'ANULADA' &&
      nextStatus !==
        'ANULADA'
    ) {
      return res.status(400).json({
        message:
          'Una factura anulada no puede reactivarse.',
      });
    }

    db.prepare(`
      UPDATE invoices
      SET status = ?
      WHERE id = ?
    `).run(
      nextStatus,
      req.params.id
    );

    if (
      nextStatus ===
      'PAGADA'
    ) {
      createNotification({
        patientId:
          invoice.patient_id,

        targetRole:
          'PACIENTE',

        title:
          'Pago registrado',

        message:
          `El pago correspondiente al servicio ${invoice.service} fue registrado correctamente.`,

        type:
          'PAGO',

        entityType:
          'INVOICE',

        entityId:
          invoice.id,
      });
    }

    if (
      nextStatus ===
      'ANULADA'
    ) {
      createNotification({
        patientId:
          invoice.patient_id,

        targetRole:
          'PACIENTE',

        title:
          'Factura anulada',

        message:
          `La factura correspondiente al servicio ${invoice.service} fue anulada.`,

        type:
          'FACTURACION',

        entityType:
          'INVOICE',

        entityId:
          invoice.id,
      });
    }

    res.json({
      ok: true,
      status:
        nextStatus,
    });
  }
);

/* =========================================================
   PORTAL DEL PACIENTE
========================================================= */

router.get(
  '/patient/appointments',
  (req, res) => {
    if (
      req.user.role !==
      'PACIENTE'
    ) {
      return res.status(403).json({
        message:
          'Ruta exclusiva para pacientes',
      });
    }

    const rows =
      db.prepare(`
        SELECT
          a.id,
          a.date,
          a.time,
          a.service,
          a.professional,
          a.status,
          a.notes
        FROM appointments a
        WHERE a.patient_id = ?
        ORDER BY
          a.date ASC,
          a.time ASC
      `).all(
  req.user.id,
  req.user.role
);

    res.json(rows);
  }
);

router.get(
  '/patient/notifications',
  (req, res) => {
    if (
      req.user.role !==
      'PACIENTE'
    ) {
      return res.status(403).json({
        message:
          'Ruta exclusiva para pacientes',
      });
    }

    const rows =
      db.prepare(`
        SELECT
          id,
          title,
          message,
          type,
          read_at AS readAt,
          created_at AS createdAt
        FROM notifications
        WHERE patient_id = ?
        ORDER BY
          created_at DESC
      `).all(
  req.user.id,
  req.user.role
);

    res.json(rows);
  }
);

/* =========================================================
   NOTIFICACIONES PERSONAL IPS
========================================================= */

router.get(
  '/notifications',
  (req, res) => {
    const normalizedRole =
      req.user.role === 'ADMIN'
        ? 'ADMINISTRACION'
        : req.user.role;

    const allowedRoles = [
      'ADMINISTRACION',
      'RECEPCION',
      'MEDICO',
    ];

    if (
      !allowedRoles.includes(
        normalizedRole
      )
    ) {
      return res.status(403).json({
        message:
          'No tienes permisos para consultar estas notificaciones.',
      });
    }

    const rows =
      db.prepare(`
        SELECT
          n.id,
          n.patient_id AS patientId,
          p.name AS patient,

          n.target_role AS targetRole,

          n.target_user_id
            AS targetUserId,

          n.title,
          n.message,
          n.type,

          n.entity_type
            AS entityType,

          n.entity_id
            AS entityId,

          n.read_at
            AS readAt,

          n.created_at
            AS createdAt

        FROM notifications n

        LEFT JOIN patients p
          ON p.id = n.patient_id

        WHERE
          (
            n.target_user_id = ?
          )
          OR
          (
            n.target_user_id IS NULL
            AND
            (
              n.target_role = ?
              OR n.target_role IS NULL
            )
          )

        ORDER BY
          n.created_at DESC

        LIMIT 50
      `).all(
        req.user.id,
        normalizedRole
      );

    res.json(rows);
  }
);

/* =========================================================
   MARCAR NOTIFICACIÓN COMO LEÍDA
========================================================= */

router.patch(
  '/notifications/:id/read',
  (req, res) => {
    const info =
      db.prepare(`
        UPDATE notifications
        SET read_at =
          CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        req.params.id
      );

    if (!info.changes) {
      return res.status(404).json({
        message:
          'Notificación no encontrada.',
      });
    }

    res.json({
      ok: true,
    });
  }
);

/* =========================================================
   API
========================================================= */

app.use(
  '/api',
  tariffsRouter
);

app.use(
  '/api',
  patientCoverageRouter
);

app.use(
  '/api',
  router
);
/* =========================================================
   MANEJO DE ERRORES
========================================================= */

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(err);

    res.status(500).json({
      message:
        'Error interno del servidor',
    });
  }
);

/* =========================================================
   SERVIDOR
========================================================= */

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `IPS Salud Vital API ejecutándose en http://0.0.0.0:${PORT}`
  );
});

export default app;