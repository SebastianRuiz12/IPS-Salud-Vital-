import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

/* =========================================================
   CONFIGURACIÓN DE BASE DE DATOS
========================================================= */

const dataDir = path.resolve('data');

fs.mkdirSync(dataDir, {
  recursive: true,
});

export const db = new Database(
  path.join(dataDir, 'ips-salud-vital.db')
);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* =========================================================
   TABLAS PRINCIPALES
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,

    username TEXT UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    role TEXT NOT NULL CHECK (
      role IN (
        'RECEPCION',
        'MEDICO',
        'ADMINISTRACION',
        'FACTURACION'
      )
    ),

    active INTEGER NOT NULL DEFAULT 1,

    must_change_password INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    document TEXT UNIQUE NOT NULL,

    name TEXT NOT NULL,

    phone TEXT,

    email TEXT,

    birth_date TEXT,

    blood_type TEXT,

    password_hash TEXT NOT NULL,

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    patient_id INTEGER NOT NULL,

    date TEXT NOT NULL,

    time TEXT NOT NULL,

    service TEXT NOT NULL,

    professional TEXT NOT NULL,

    professional_user_id INTEGER,

    status TEXT NOT NULL DEFAULT 'PROGRAMADA'
      CHECK (
        status IN (
          'PROGRAMADA',
          'CONFIRMADA',
          'ATENDIDA',
          'CANCELADA'
        )
      ),

    notes TEXT DEFAULT '',

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
      REFERENCES patients(id)
      ON DELETE CASCADE,

    FOREIGN KEY (professional_user_id)
      REFERENCES users(id)
      ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS clinical_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    patient_id INTEGER NOT NULL,

    appointment_id INTEGER,

    reason TEXT NOT NULL,

    diagnosis TEXT NOT NULL,

    treatment TEXT NOT NULL,

    observations TEXT DEFAULT '',

    professional TEXT NOT NULL,

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
      REFERENCES patients(id)
      ON DELETE CASCADE,

    FOREIGN KEY (appointment_id)
      REFERENCES appointments(id)
      ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    patient_id INTEGER NOT NULL,

    appointment_id INTEGER,

    service TEXT NOT NULL,

    amount_cop INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'PENDIENTE'
      CHECK (
        status IN (
          'PENDIENTE',
          'PAGADA',
          'ANULADA'
        )
      ),

    issued_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
      REFERENCES patients(id)
      ON DELETE CASCADE,

    FOREIGN KEY (appointment_id)
      REFERENCES appointments(id)
      ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    patient_id INTEGER,

    title TEXT NOT NULL,

    message TEXT NOT NULL,

    type TEXT NOT NULL DEFAULT 'INFO',

    read_at TEXT,

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
      REFERENCES patients(id)
      ON DELETE CASCADE
  );
`);

/* =========================================================
   MIGRACIÓN DE FACTURAS
   Agrega appointment_id a bases existentes
========================================================= */

const invoiceColumns = db
  .prepare(`PRAGMA table_info(invoices)`)
  .all()
  .map((column) => column.name);

if (!invoiceColumns.includes('appointment_id')) {
  db.exec(`
    ALTER TABLE invoices
    ADD COLUMN appointment_id INTEGER
  `);
}

/*
  Evita que una misma cita tenga dos facturas.

  Las facturas antiguas con appointment_id NULL
  no se ven afectadas.
*/

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
  idx_invoices_appointment_id
  ON invoices(appointment_id)
  WHERE appointment_id IS NOT NULL
`);

/* =========================================================
   MIGRACIÓN DE USUARIOS
========================================================= */

const userColumns = db
  .prepare(`PRAGMA table_info(users)`)
  .all()
  .map((column) => column.name);

if (!userColumns.includes('must_change_password')) {
  db.exec(`
    ALTER TABLE users
    ADD COLUMN must_change_password
    INTEGER NOT NULL DEFAULT 0
  `);
}

/*
  Los usuarios base no necesitan cambiar contraseña.
*/

db.prepare(`
  UPDATE users
  SET must_change_password = 0
  WHERE username IN (
    'admin',
    'recepcion',
    'medico'
  )
`).run();

/* =========================================================
   MIGRACIÓN DE NOTIFICACIONES
========================================================= */

const notificationColumns = db
  .prepare(`PRAGMA table_info(notifications)`)
  .all()
  .map((column) => column.name);

if (!notificationColumns.includes('target_role')) {
  db.exec(`
    ALTER TABLE notifications
    ADD COLUMN target_role TEXT
  `);
}

if (!notificationColumns.includes('entity_type')) {
  db.exec(`
    ALTER TABLE notifications
    ADD COLUMN entity_type TEXT
  `);
}

if (!notificationColumns.includes('entity_id')) {
  db.exec(`
    ALTER TABLE notifications
    ADD COLUMN entity_id INTEGER
  `);
}

if (!notificationColumns.includes('target_user_id')) {
  db.exec(`
    ALTER TABLE notifications
    ADD COLUMN target_user_id INTEGER
      REFERENCES users(id)
      ON DELETE CASCADE
  `);
}

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_notifications_target_user_id
  ON notifications(target_user_id)
`);


const notificationColumnsAfterMigration = db
  .prepare(`
    PRAGMA table_info(notifications)
  `)
  .all()
  .map((column) => column.name);

if (
  !notificationColumnsAfterMigration.includes(
    'target_user_id'
  )
) {
  db.exec(`
    ALTER TABLE notifications
    ADD COLUMN target_user_id INTEGER
  `);
}

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_notifications_target_user_id
  ON notifications(target_user_id)
`);

/* =========================================================
   RECUPERACIÓN DE CONTRASEÑA DE PACIENTES
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    patient_id INTEGER NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TEXT NOT NULL,

    used_at TEXT,

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
      REFERENCES patients(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS
  idx_password_reset_tokens_patient
  ON password_reset_tokens(patient_id);

  CREATE INDEX IF NOT EXISTS
  idx_password_reset_tokens_expires
  ON password_reset_tokens(expires_at);
`);



/* =========================================================
   TARIFAS Y COBERTURAS
========================================================= */

/*
  Una cobertura representa la forma en que se financia
  la atención del paciente.

  Ejemplos:
  - EPS
  - PARTICULAR
  - CONVENIO
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS coverage_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL UNIQUE,

    coverage_type TEXT NOT NULL CHECK (
      coverage_type IN (
        'EPS',
        'PARTICULAR',
        'CONVENIO'
      )
    ),

    active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP
  );
`);

/*
  Cada servicio puede tener una tarifa diferente
  dependiendo de la cobertura.

  Ejemplo:

  Medicina General + EPS
  Medicina General + Particular
  Odontología + Convenio X
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS service_tariffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    coverage_plan_id INTEGER NOT NULL,

    provider_id INTEGER,

    service TEXT NOT NULL,

    amount_cop INTEGER NOT NULL CHECK (
      amount_cop > 0
    ),

    active INTEGER NOT NULL DEFAULT 1,

    effective_from TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (
      coverage_plan_id
    )
      REFERENCES coverage_plans(id)
      ON DELETE CASCADE
  );
`);

/*
  Evita tener dos tarifas activas para el mismo
  servicio y cobertura.
*/
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
  idx_service_tariffs_unique_active
  ON service_tariffs(
    coverage_plan_id,
    service
  )
  WHERE active = 1
`);

/*
  Índices para acelerar las consultas.
*/
db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_service_tariffs_coverage
  ON service_tariffs(
    coverage_plan_id
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_service_tariffs_service
  ON service_tariffs(
    service
  )
`);

/* =========================================================
   ENTIDADES / EPS / CONVENIOS
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS coverage_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,

    code TEXT,

    active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
  idx_coverage_providers_name
  ON coverage_providers(name);
`);

/*
  Proveedores iniciales de demostración.
  INSERT OR IGNORE evita duplicarlos
  cuando el servidor se reinicia.
*/

db.exec(`
  INSERT OR IGNORE INTO coverage_providers (
    name,
    code,
    active
  )
  VALUES
    ('Nueva EPS', 'NUEVA_EPS', 1),
    ('EPS Sanitas', 'SANITAS', 1),
    ('SURA EPS', 'SURA', 1),
    ('Compensar EPS', 'COMPENSAR', 1),
    ('Salud Total EPS', 'SALUD_TOTAL', 1);
`);


/* =========================================================
   COBERTURA DEL PACIENTE
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS patient_coverages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    patient_id INTEGER NOT NULL,

    coverage_plan_id INTEGER NOT NULL,

    provider_id INTEGER,

    provider_name TEXT,

    membership_number TEXT,

    active INTEGER NOT NULL DEFAULT 1,

    effective_from TEXT,

    effective_to TEXT,

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (
      patient_id
    )
      REFERENCES patients(id)
      ON DELETE CASCADE,

    FOREIGN KEY (
      coverage_plan_id
    )
      REFERENCES coverage_plans(id)
      ON DELETE RESTRICT
  );
`);

/*
  Un paciente solo puede tener
  una cobertura activa.
*/

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
  idx_patient_coverages_one_active
  ON patient_coverages(patient_id)
  WHERE active = 1
`);

/*
  Índices para acelerar consultas.
*/

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_patient_coverages_patient
  ON patient_coverages(patient_id)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_patient_coverages_coverage
  ON patient_coverages(coverage_plan_id)
`);

/* =========================================================
   MIGRACIÓN: PROVEEDOR DE COBERTURA
========================================================= */

const patientCoverageColumns =
  db
    .prepare(
      `PRAGMA table_info(patient_coverages)`
    )
    .all();

const hasProviderId =
  patientCoverageColumns.some(
    (column) =>
      column.name ===
      'provider_id'
  );

if (!hasProviderId) {
  db.exec(`
    ALTER TABLE patient_coverages
    ADD COLUMN provider_id INTEGER;
  `);
}

/* =========================================================
   MIGRACIÓN: PROVEEDOR EN TARIFAS
========================================================= */

/* =========================================================
   MIGRACIÓN DE TARIFAS POR ENTIDAD
========================================================= */

const serviceTariffColumns =
  db
    .prepare(`
      PRAGMA table_info(service_tariffs)
    `)
    .all()
    .map(
      (column) =>
        column.name
    );

if (
  !serviceTariffColumns.includes(
    'provider_id'
  )
) {
  db.exec(`
    ALTER TABLE service_tariffs
    ADD COLUMN provider_id INTEGER
  `);
}


/*
  Quitamos el índice antiguo que no permitía
  tener diferentes tarifas por entidad.
*/

db.exec(`
  DROP INDEX IF EXISTS
  idx_service_tariffs_unique_active
`);


/*
  Tarifa genérica.

  Ejemplo:

  Particular + Medicina General
*/

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
  idx_service_tariffs_unique_generic_active

  ON service_tariffs(
    coverage_plan_id,
    service
  )

  WHERE active = 1
    AND provider_id IS NULL
`);


/*
  Tarifa específica por entidad.

  Ejemplo:

  EPS / Convenio
  Nueva EPS
  Medicina General
*/

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
  idx_service_tariffs_unique_provider_active

  ON service_tariffs(
    coverage_plan_id,
    provider_id,
    service
  )

  WHERE active = 1
    AND provider_id IS NOT NULL
`);


/*
  Índice para buscar rápidamente
  las tarifas por entidad.
*/

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_service_tariffs_provider

  ON service_tariffs(
    provider_id
  )
`);


/*
  Índices que ya utilizaba
  el sistema.
*/

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_service_tariffs_coverage

  ON service_tariffs(
    coverage_plan_id
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_service_tariffs_service

  ON service_tariffs(
    service
  )
`);


/* =========================================================
   COBERTURAS INICIALES
========================================================= */

db.prepare(`
  INSERT OR IGNORE INTO coverage_plans (
    name,
    coverage_type
  )
  VALUES (?, ?)
`).run(
  'Particular',
  'PARTICULAR'
);

db.prepare(`
  INSERT OR IGNORE INTO coverage_plans (
    name,
    coverage_type
  )
  VALUES (?, ?)
`).run(
  'EPS / Convenio',
  'EPS'
);

/* =========================================================
   MIGRACIÓN DE CITAS
   Relaciona cada cita con un médico real
========================================================= */

const appointmentColumns = db
  .prepare(`PRAGMA table_info(appointments)`)
  .all()
  .map((column) => column.name);

if (
  !appointmentColumns.includes(
    'professional_user_id'
  )
) {
  db.exec(`
    ALTER TABLE appointments
    ADD COLUMN professional_user_id INTEGER
      REFERENCES users(id)
      ON DELETE SET NULL
  `);
}

/* =========================================================
   MIGRACIÓN DE ASISTENCIA DE CITAS
========================================================= */

if (
  !appointmentColumns.includes(
    'attendance_status'
  )
) {
  db.exec(`
    ALTER TABLE appointments
    ADD COLUMN attendance_status TEXT
  `);
}

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_appointments_attendance_status
  ON appointments(attendance_status)
`);

/* =========================================================
   VINCULAR CITAS ANTIGUAS CON SU MÉDICO
========================================================= */

db.exec(`
  UPDATE appointments
  SET professional_user_id = (
    SELECT u.id
    FROM users u
    WHERE u.name = appointments.professional
      AND u.role = 'MEDICO'
    LIMIT 1
  )
  WHERE professional_user_id IS NULL
`);

/*
  Índice para acelerar las consultas
  de citas por médico.
*/

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_appointments_professional_user_id
  ON appointments(professional_user_id)
`);

/* =========================================================
   NORMALIZAR NOTIFICACIONES ANTIGUAS
========================================================= */

db.prepare(`
  UPDATE notifications
  SET target_role = 'PACIENTE'
  WHERE patient_id IS NOT NULL
    AND target_role IS NULL
`).run();

/* =========================================================
   MIGRACIÓN DE ROLES ANTIGUOS
========================================================= */

/*
  Eliminamos la cuenta antigua de facturación
  porque facturación ahora pertenece a RECEPCIÓN.
*/

db.prepare(`
  DELETE FROM users
  WHERE username = 'facturacion'
`).run();

/* =========================================================
   USUARIOS INICIALES
========================================================= */

const userCount = db
  .prepare(
    'SELECT COUNT(*) AS count FROM users'
  )
  .get().count;

if (userCount === 0) {
  const insert = db.prepare(`
    INSERT INTO users (
      name,
      username,
      password_hash,
      role
    )
    VALUES (?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    const rows = [
      [
        'Recepción Salud Vital',
        'recepcion',
        'Recepcion123',
        'RECEPCION',
      ],

      [
        'Dra. Laura Méndez',
        'medico',
        'Medico123',
        'MEDICO',
      ],

      [
        'Administrador IPS',
        'admin',
        'Admin123',
        'ADMINISTRACION',
      ],
    ];

    rows.forEach(
      ([
        name,
        username,
        password,
        role,
      ]) => {
        insert.run(
          name,
          username,
          bcrypt.hashSync(
            password,
            10
          ),
          role
        );
      }
    );
  });

  seed();
}

/* =========================================================
   PACIENTES INICIALES
========================================================= */

const patientCount = db
  .prepare(
    'SELECT COUNT(*) AS count FROM patients'
  )
  .get().count;

if (patientCount === 0) {
  const insert = db.prepare(`
    INSERT INTO patients (
      document,
      name,
      phone,
      email,
      birth_date,
      blood_type,
      password_hash
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    insert.run(
      '1022334455',
      'María Camila Rojas',
      '3124567890',
      'maria.rojas@mail.com',
      '1995-04-12',
      'O+',
      bcrypt.hashSync(
        'Paciente123',
        10
      )
    );

    insert.run(
      '1009988776',
      'Juan David Pérez',
      '3001234567',
      'juan.perez@mail.com',
      '1990-08-21',
      'A+',
      bcrypt.hashSync(
        'Paciente123',
        10
      )
    );

    insert.run(
      '1033445566',
      'Ana Sofía Torres',
      '3205556677',
      'ana.torres@mail.com',
      '2012-02-10',
      'B+',
      bcrypt.hashSync(
        'Paciente123',
        10
      )
    );

    insert.run(
      '52024660',
      'Luz Marina Ruiz Camargo',
      '3123964568',
      'luz.ruiz@mail.com',
      '1968-11-04',
      'O+',
      bcrypt.hashSync(
        'Paciente123',
        10
      )
    );
  });

  seed();
}

/* =========================================================
   CITAS INICIALES
========================================================= */

const appointmentCount = db
  .prepare(
    'SELECT COUNT(*) AS count FROM appointments'
  )
  .get().count;

if (appointmentCount === 0) {
  const patients = db
    .prepare(
      'SELECT id, name FROM patients ORDER BY id'
    )
    .all();

  const insert = db.prepare(`
    INSERT INTO appointments (
      patient_id,
      date,
      time,
      service,
      professional,
      status,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  if (patients.length >= 3) {
    insert.run(
      patients[0].id,
      '2026-09-10',
      '09:00',
      'Medicina General',
      'Dra. Laura Méndez',
      'CONFIRMADA',
      'Control general'
    );

    insert.run(
      patients[1].id,
      '2026-09-11',
      '10:30',
      'Odontología',
      'Dr. Andrés Silva',
      'PROGRAMADA',
      'Valoración inicial'
    );

    insert.run(
      patients[2].id,
      '2026-09-12',
      '14:00',
      'Pediatría',
      'Dra. Natalia Gómez',
      'PROGRAMADA',
      'Control'
    );
  }
}