import express from 'express';
import { db } from '../db.js';
import {
  requireAuth,
  allow,
} from '../auth.js';

const router = express.Router();

/* =========================================================
   COBERTURAS
========================================================= */

router.get(
  '/coverage-plans',
  requireAuth,
  allow(
    'ADMIN',
    'ADMINISTRACION',
    'RECEPCION'
  ),
  (req, res) => {
    try {
      const rows = db
        .prepare(`
          SELECT
            id,
            name,
            coverage_type AS coverageType,
            active,
            created_at AS createdAt
          FROM coverage_plans
          ORDER BY
            active DESC,
            name ASC
        `)
        .all();

      res.json(rows);
    } catch (error) {
      console.error(
        'Error obteniendo coberturas:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible cargar las coberturas.',
      });
    }
  }
);

/* =========================================================
   CREAR COBERTURA
========================================================= */

router.post(
  '/coverage-plans',
  requireAuth,
  allow(
    'ADMIN',
    'ADMINISTRACION'
  ),
  (req, res) => {
    const name =
      String(req.body?.name || '').trim();

    const coverageType =
      String(
        req.body?.coverageType || ''
      ).trim();

    const allowedTypes = [
      'EPS',
      'PARTICULAR',
      'CONVENIO',
    ];

    if (name.length < 3) {
      return res.status(400).json({
        message:
          'El nombre de la cobertura es obligatorio.',
      });
    }

    if (
      !allowedTypes.includes(
        coverageType
      )
    ) {
      return res.status(400).json({
        message:
          'Tipo de cobertura inválido.',
      });
    }

    try {
      const result = db
        .prepare(`
          INSERT INTO coverage_plans (
            name,
            coverage_type
          )
          VALUES (?, ?)
        `)
        .run(
          name,
          coverageType
        );

      const created =
        db
          .prepare(`
            SELECT
              id,
              name,
              coverage_type AS coverageType,
              active,
              created_at AS createdAt
            FROM coverage_plans
            WHERE id = ?
          `)
          .get(
            result.lastInsertRowid
          );

      res
        .status(201)
        .json(created);
    } catch (error) {
      if (
        String(error?.message || '')
          .toLowerCase()
          .includes(
            'unique'
          )
      ) {
        return res.status(409).json({
          message:
            'Ya existe una cobertura con ese nombre.',
        });
      }

      console.error(
        'Error creando cobertura:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible crear la cobertura.',
      });
    }
  }
);

/* =========================================================
   ACTIVAR / DESACTIVAR COBERTURA
========================================================= */

router.patch(
  '/coverage-plans/:id/status',
  requireAuth,
  allow(
    'ADMIN',
    'ADMINISTRACION'
  ),
  (req, res) => {
    const id = Number(
      req.params.id
    );

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message:
          'Identificador inválido.',
      });
    }

    const coverage =
      db
        .prepare(`
          SELECT
            id,
            active
          FROM coverage_plans
          WHERE id = ?
        `)
        .get(id);

    if (!coverage) {
      return res.status(404).json({
        message:
          'Cobertura no encontrada.',
      });
    }

    const nextActive =
      coverage.active ? 0 : 1;

    db.prepare(`
      UPDATE coverage_plans
      SET active = ?
      WHERE id = ?
    `).run(
      nextActive,
      id
    );

    res.json({
      ok: true,
      active:
        Boolean(nextActive),
    });
  }
);

/* =========================================================
   ENTIDADES DE COBERTURA
========================================================= */

router.get(
  '/coverage-providers',
  requireAuth,
  allow(
    'ADMIN',
    'ADMINISTRACION',
    'RECEPCION'
  ),
  (req, res) => {
    try {
      const rows =
        db
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

      res.json(rows);

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
   TARIFAS
========================================================= */

router.get(
  '/tariffs',
  requireAuth,
  allow(
    'ADMIN',
    'ADMINISTRACION',
    'RECEPCION'
  ),
  (req, res) => {
    try {
      const rows =
        db
          .prepare(`
            SELECT
  t.id,

  t.coverage_plan_id
    AS coveragePlanId,

  c.name
    AS coverageName,

  c.coverage_type
    AS coverageType,

  t.provider_id
    AS providerId,

  cp.name
    AS providerName,

  t.service,

  t.amount_cop
    AS amountCop,

  t.active,

  t.effective_from
    AS effectiveFrom,

  t.created_at
    AS createdAt

FROM service_tariffs t

INNER JOIN coverage_plans c
  ON c.id =
     t.coverage_plan_id

LEFT JOIN coverage_providers cp
  ON cp.id =
     t.provider_id

ORDER BY
  c.name ASC,
  COALESCE(
    cp.name,
    ''
  ) ASC,
  t.service ASC
          `)
          .all();

      res.json(rows);
    } catch (error) {
      console.error(
        'Error obteniendo tarifas:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible cargar las tarifas.',
      });
    }
  }
);

/* =========================================================
   CREAR TARIFA
========================================================= */

router.post(
  '/tariffs',
  requireAuth,
  allow(
    'ADMIN',
    'ADMINISTRACION',
    'RECEPCION'
  ),
  (req, res) => {
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

    const service =
      String(
        req.body?.service || ''
      ).trim();

    const amountCop =
      Number(
        req.body?.amountCop
      );

    if (
      !Number.isInteger(
        coveragePlanId
      ) ||
      coveragePlanId <= 0
    ) {
      return res.status(400).json({
        message:
          'La cobertura seleccionada no es válida.',
      });
    }

    if (
      service.length < 3
    ) {
      return res.status(400).json({
        message:
          'El servicio es obligatorio.',
      });
    }

    if (
      !Number.isInteger(
        amountCop
      ) ||
      amountCop <= 0
    ) {
      return res.status(400).json({
        message:
          'El valor debe ser mayor que cero.',
      });
    }

    const coverage =
      db
        .prepare(`
          SELECT
  id,
  name,
  coverage_type AS coverageType,
  active
FROM coverage_plans
WHERE id = ?
        `)
        .get(
          coveragePlanId
        );

    if (!coverage) {
      return res.status(404).json({
        message:
          'La cobertura no existe.',
      });
    }

    let provider = null;

if (
  coverage.coverageType !==
  'PARTICULAR'
) {
  if (
    !Number.isInteger(
      providerId
    ) ||
    providerId <= 0
  ) {
    return res.status(400).json({
      message:
        'Debes seleccionar una entidad de cobertura.',
    });
  }

  provider =
    db
      .prepare(`
        SELECT
          id,
          name,
          code,
          active
        FROM coverage_providers
        WHERE id = ?
      `)
      .get(
        providerId
      );

  if (!provider) {
    return res.status(404).json({
      message:
        'La entidad de cobertura no existe.',
    });
  }

  if (!provider.active) {
    return res.status(400).json({
      message:
        'La entidad de cobertura está inactiva.',
    });
  }
} else {
  /*
    Particular no utiliza EPS.
  */

  provider = null;
}

    try {
      const result =
        db
          .prepare(`
            INSERT INTO service_tariffs (
  coverage_plan_id,
  provider_id,
  service,
  amount_cop
)
VALUES (?, ?, ?, ?)
          `)
          .run(
            coveragePlanId,
            providerId,
            service,
            amountCop
          );

      const created =
        db
          .prepare(`
            SELECT
              t.id,
              t.coverage_plan_id AS coveragePlanId,
              c.name AS coverageName,
              c.coverage_type AS coverageType,
              t.service,
              t.amount_cop AS amountCop,
              t.active,
              t.effective_from AS effectiveFrom,
              t.created_at AS createdAt
            FROM service_tariffs t
            INNER JOIN coverage_plans c
              ON c.id = t.coverage_plan_id
            WHERE t.id = ?
          `)
          .get(
            result.lastInsertRowid
          );

      res
        .status(201)
        .json(created);
    } catch (error) {
      if (
        String(error?.message || '')
          .toLowerCase()
          .includes(
            'unique'
          )
      ) {
        return res.status(409).json({
          message:
            'Ya existe una tarifa activa para ese servicio y cobertura.',
        });
      }

      console.error(
        'Error creando tarifa:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible crear la tarifa.',
      });
    }
  }
);

/* =========================================================
   EDITAR TARIFA
========================================================= */

router.put(
  '/tariffs/:id',
  requireAuth,
  allow(
    'ADMIN',
    'ADMINISTRACION',
    'RECEPCION'
  ),
  (req, res) => {
    const id = Number(
      req.params.id
    );

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

    const service =
      String(
        req.body?.service || ''
      ).trim();

    const amountCop =
      Number(
        req.body?.amountCop
      );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        message:
          'Identificador inválido.',
      });
    }

    if (
      !Number.isInteger(
        coveragePlanId
      ) ||
      coveragePlanId <= 0
    ) {
      return res.status(400).json({
        message:
          'La cobertura no es válida.',
      });
    }

    if (
      service.length < 3
    ) {
      return res.status(400).json({
        message:
          'El servicio es obligatorio.',
      });
    }

    if (
      !Number.isInteger(
        amountCop
      ) ||
      amountCop <= 0
    ) {
      return res.status(400).json({
        message:
          'El valor debe ser mayor que cero.',
      });
    }

    const existing =
      db
        .prepare(`
          SELECT id
          FROM service_tariffs
          WHERE id = ?
        `)
        .get(id);

    if (!existing) {
      return res.status(404).json({
        message:
          'Tarifa no encontrada.',
      });
    }

    const coverage =
      db
        .prepare(`
          SELECT
  id,
  name,
  coverage_type AS coverageType,
  active
FROM coverage_plans
WHERE id = ?
        `)
        .get(
          coveragePlanId
        );

    if (!coverage) {
      return res.status(404).json({
        message:
          'La cobertura no existe.',
      });
    }

    if (!coverage.active) {
      return res.status(400).json({
        message:
          'La cobertura está inactiva.',
      });
    }

    let provider = null;

if (
  coverage.coverageType !==
  'PARTICULAR'
) {
  if (
    !Number.isInteger(
      providerId
    ) ||
    providerId <= 0
  ) {
    return res.status(400).json({
      message:
        'Debes seleccionar una entidad de cobertura.',
    });
  }

  provider =
    db
      .prepare(`
        SELECT
          id,
          name,
          code,
          active
        FROM coverage_providers
        WHERE id = ?
      `)
      .get(
        providerId
      );

  if (!provider) {
    return res.status(404).json({
      message:
        'La entidad de cobertura no existe.',
    });
  }

  if (!provider.active) {
    return res.status(400).json({
      message:
        'La entidad de cobertura está inactiva.',
    });
  }
} else {
  provider = null;
}

    try {
      db.prepare(`
        UPDATE service_tariffs
SET
  coverage_plan_id = ?,
  provider_id = ?,
  service = ?,
  amount_cop = ?
WHERE id = ?
      `).run(
        coveragePlanId,
        providerId,
        service,
        amountCop,
        id
      );

      const updated =
        db
          .prepare(`
            SELECT
  t.id,

  t.coverage_plan_id
    AS coveragePlanId,

  c.name
    AS coverageName,

  c.coverage_type
    AS coverageType,

  t.provider_id
    AS providerId,

  cp.name
    AS providerName,

  t.service,

  t.amount_cop
    AS amountCop,

  t.active,

  t.effective_from
    AS effectiveFrom,

  t.created_at
    AS createdAt

FROM service_tariffs t

INNER JOIN coverage_plans c
  ON c.id =
     t.coverage_plan_id

LEFT JOIN coverage_providers cp
  ON cp.id =
     t.provider_id

WHERE t.id = ?
          `)
          .get(id);

      res.json(updated);
    } catch (error) {
      if (
        String(error?.message || '')
          .toLowerCase()
          .includes(
            'unique'
          )
      ) {
        return res.status(409).json({
          message:
            'Ya existe una tarifa activa para ese servicio y cobertura.',
        });
      }

      console.error(
        'Error actualizando tarifa:',
        error
      );

      res.status(500).json({
        message:
          'No fue posible actualizar la tarifa.',
      });
    }
  }
);

/* =========================================================
   ACTIVAR / DESACTIVAR TARIFA
========================================================= */

router.patch(
  '/tariffs/:id/status',
  requireAuth,
  allow(
    'ADMIN',
    'ADMINISTRACION',
    'RECEPCION'
  ),
  (req, res) => {
    const id = Number(
      req.params.id
    );

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message:
          'Identificador inválido.',
      });
    }

    const tariff =
      db
        .prepare(`
          SELECT
  id,
  coverage_plan_id,
  provider_id,
  service,
  active
FROM service_tariffs
WHERE id = ?
        `)
        .get(id);

    if (!tariff) {
      return res.status(404).json({
        message:
          'Tarifa no encontrada.',
      });
    }

    const nextActive =
      tariff.active ? 0 : 1;

    if (nextActive === 1) {
      const duplicate =
  db
    .prepare(`
      SELECT id

      FROM service_tariffs

      WHERE coverage_plan_id = ?

        AND service = ?

        AND active = 1

        AND id <> ?

        AND (
          (
            provider_id IS NULL
            AND ? IS NULL
          )

          OR

          provider_id = ?
        )

      LIMIT 1
    `)
    .get(
      tariff.coverage_plan_id,
      tariff.service,
      id,
      tariff.provider_id,
      tariff.provider_id
    );

      if (duplicate) {
        return res.status(409).json({
          message:
            'Ya existe otra tarifa activa para ese servicio y cobertura.',
        });
      }
    }

    db.prepare(`
      UPDATE service_tariffs
      SET active = ?
      WHERE id = ?
    `).run(
      nextActive,
      id
    );

    res.json({
      ok: true,
      active:
        Boolean(nextActive),
    });
  }
);

export default router;