import express from 'express';

import { db } from '../db.js';

import {
  requireAuth,
  allow,
} from '../auth.js';

const router = express.Router();

/* =========================================================
   LISTAR EPS / ENTIDADES / CONVENIOS
========================================================= */

router.get(
  '/coverage-providers',
  requireAuth,
  allow(
    'ADMIN',
    'RECEPCION',
    'MEDICO'
  ),
  (req, res) => {
    try {
      const providers = db
        .prepare(`
          SELECT
            id,
            name,
            code,
            active,
            created_at AS createdAt
          FROM coverage_providers
          WHERE active = 1
          ORDER BY name ASC
        `)
        .all();

      res.json(providers);

    } catch (error) {
      console.error(
        'Error obteniendo entidades de cobertura:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible cargar las entidades de cobertura.',
      });
    }
  }
);

/* =========================================================
   CONSULTAR COBERTURA ACTUAL DEL PACIENTE
========================================================= */

router.get(
  '/patients/:id/coverage',
  requireAuth,
  allow(
    'ADMIN',
    'RECEPCION',
    'MEDICO'
  ),
  (req, res) => {
    const patientId =
      Number(req.params.id);

    if (
      !Number.isInteger(patientId) ||
      patientId <= 0
    ) {
      return res.status(400).json({
        message:
          'Identificador de paciente inválido.',
      });
    }

    const patient = db
      .prepare(`
        SELECT
          id
        FROM patients
        WHERE id = ?
      `)
      .get(patientId);

    if (!patient) {
      return res.status(404).json({
        message:
          'Paciente no encontrado.',
      });
    }

    const coverage = db
      .prepare(`
        SELECT
  pc.id,

  pc.patient_id
    AS patientId,

  pc.coverage_plan_id
    AS coveragePlanId,

  cp.name
    AS coverageName,

  cp.coverage_type
    AS coverageType,

  COALESCE(
    cpp.name,
    pc.provider_name
  )
    AS providerName,

  pc.provider_id
    AS providerId,

  pc.membership_number
    AS membershipNumber,

  pc.active,

  pc.effective_from
    AS effectiveFrom,

  pc.effective_to
    AS effectiveTo,

  pc.created_at
    AS createdAt

FROM patient_coverages pc

INNER JOIN coverage_plans cp
  ON cp.id =
     pc.coverage_plan_id

LEFT JOIN coverage_providers cpp
  ON cpp.id =
     pc.provider_id

WHERE pc.patient_id = ?
  AND pc.active = 1

LIMIT 1
      `)
      .get(patientId);

    res.json(
      coverage || null
    );
  }
);

/* =========================================================
   ASIGNAR / CAMBIAR COBERTURA
   SOLO RECEPCIÓN
========================================================= */

router.put(
  '/patients/:id/coverage',
  requireAuth,
  allow(
    'RECEPCION'
  ),
  (req, res) => {
    const patientId =
      Number(req.params.id);

    if (
      !Number.isInteger(patientId) ||
      patientId <= 0
    ) {
      return res.status(400).json({
        message:
          'Identificador de paciente inválido.',
      });
    }

    const coveragePlanId =
      Number(
        req.body?.coveragePlanId
      );

      const providerId =
  req.body?.providerId
    ? Number(
        req.body.providerId
      )
    : null;

    const providerName =
      String(
        req.body?.providerName || ''
      ).trim();

    const membershipNumber =
      String(
        req.body?.membershipNumber || ''
      ).trim();

    const effectiveFrom =
      String(
        req.body?.effectiveFrom || ''
      ).trim();

    const effectiveTo =
      String(
        req.body?.effectiveTo || ''
      ).trim();

    if (
      !Number.isInteger(
        coveragePlanId
      ) ||
      coveragePlanId <= 0
    ) {
      return res.status(400).json({
        message:
          'Selecciona una cobertura válida.',
      });
    }

    const patient = db
      .prepare(`
        SELECT
          id
        FROM patients
        WHERE id = ?
      `)
      .get(patientId);

    if (!patient) {
      return res.status(404).json({
        message:
          'Paciente no encontrado.',
      });
    }

    const plan = db
      .prepare(`
        SELECT
          id,
          name,
          coverage_type AS coverageType,
          active
        FROM coverage_plans
        WHERE id = ?
      `)
      .get(coveragePlanId);

    if (!plan) {
      return res.status(404).json({
        message:
          'La cobertura seleccionada no existe.',
      });
    }

    if (!plan.active) {
      return res.status(400).json({
        message:
          'La cobertura seleccionada está inactiva.',
      });
    }

    /*
      Si el paciente es PARTICULAR,
      no necesitamos EPS ni número
      de afiliación.
    */

    if (
      plan.coverageType !==
        'PARTICULAR' &&
      providerName.length < 2
    ) {
      return res.status(400).json({
        message:
          'Debes indicar la entidad responsable de la cobertura.',
      });
    }

    if (
      plan.coverageType !==
        'PARTICULAR' &&
      membershipNumber.length < 3
    ) {
      return res.status(400).json({
        message:
          'Debes indicar el número de afiliación.',
      });
    }

    let provider = null;

if (
  plan.coverageType !==
    'PARTICULAR'
) {
  if (
    !Number.isInteger(
      providerId
    )
  ) {
    return res.status(400).json({
      message:
        'Debes seleccionar una entidad de cobertura.',
    });
  }

  provider = db
    .prepare(`
      SELECT
        id,
        name,
        code,
        active
      FROM coverage_providers
      WHERE id = ?
    `)
    .get(providerId);

  if (!provider) {
    return res.status(404).json({
      message:
        'La entidad seleccionada no existe.',
    });
  }

  if (!provider.active) {
    return res.status(400).json({
      message:
        'La entidad seleccionada está inactiva.',
    });
  }
}

    try {
      const saveCoverage =
  db.transaction(() => {

    /*
      Cerramos la cobertura
      activa anterior.
    */

    db.prepare(`
      UPDATE patient_coverages

      SET
        active = 0,

        effective_to =
          CASE
            WHEN ? <> ''
            THEN ?
            ELSE
              COALESCE(
                effective_to,
                DATE('now')
              )
          END

      WHERE patient_id = ?
        AND active = 1
    `).run(
      effectiveFrom,
      effectiveFrom,
      patientId
    );

    /*
      Creamos la nueva cobertura.
    */

    const result =
      db.prepare(`
        INSERT INTO patient_coverages (
  patient_id,
  coverage_plan_id,
  provider_id,
  provider_name,
  membership_number,
          active,
          effective_from,
          effective_to
        )

        VALUES (
  ?,
  ?,
  ?,
  ?,
  ?,
  1,
  ?,
  ?
)
      `).run(
        patientId,
        coveragePlanId,
        providerId,

        plan.coverageType ===
          'PARTICULAR'
          ? null
          : provider?.name || null,

        plan.coverageType ===
          'PARTICULAR'
          ? null
          : membershipNumber,

        effectiveFrom || null,
        effectiveTo || null
      );

    return result.lastInsertRowid;

  })();

      const created =
        db.prepare(`
          SELECT
            pc.id,

            pc.patient_id
              AS patientId,

            pc.coverage_plan_id
              AS coveragePlanId,

            cp.name
              AS coverageName,

            cp.coverage_type
              AS coverageType,

            COALESCE(
  cpp.name,
  pc.provider_name
)
  AS providerName,

pc.provider_id
  AS providerId,

            pc.membership_number
              AS membershipNumber,

            pc.active,

            pc.effective_from
              AS effectiveFrom,

            pc.effective_to
              AS effectiveTo,

            pc.created_at
              AS createdAt

          FROM patient_coverages pc

          INNER JOIN coverage_plans cp
            ON cp.id =
               pc.coverage_plan_id

               LEFT JOIN coverage_providers cpp
  ON cpp.id =
     pc.provider_id

          WHERE pc.id = ?
        `)
        .get(saveCoverage);

      res.status(201).json(
        created
      );

    } catch (error) {
      console.error(
        'Error asignando cobertura:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible guardar la cobertura del paciente.',
      });
    }
  }
);

/* =========================================================
   RETIRAR COBERTURA ACTIVA
   SOLO RECEPCIÓN
========================================================= */

router.delete(
  '/patients/:id/coverage',
  requireAuth,
  allow(
    'RECEPCION'
  ),
  (req, res) => {
    const patientId =
      Number(req.params.id);

    if (
      !Number.isInteger(patientId) ||
      patientId <= 0
    ) {
      return res.status(400).json({
        message:
          'Identificador de paciente inválido.',
      });
    }

    const result = db
      .prepare(`
        UPDATE patient_coverages

        SET
          active = 0,

          effective_to =
            COALESCE(
              effective_to,
              DATE('now')
            )

        WHERE patient_id = ?
          AND active = 1
      `)
      .run(patientId);

    res.json({
      ok: true,
      changed:
        result.changes > 0,
    });
  }
);

export default router;