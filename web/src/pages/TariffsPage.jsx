import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import api from '../api';

const SERVICES = [
  'Medicina General',
  'Odontología',
  'Pediatría',
  'Laboratorio',
  'Urgencias',
  'Atención ambulatoria',
  'Procedimiento',
  'Hospitalización',
];

const COVERAGE_TYPES = [
  {
    value: 'EPS',
    label: 'EPS',
  },
  {
    value: 'PARTICULAR',
    label: 'Particular',
  },
  {
    value: 'CONVENIO',
    label: 'Convenio',
  },
];

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat(
    'es-CO',
    {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }
  ).format(amount);
};

export default function TariffsPage() {
  const [coveragePlans, setCoveragePlans] =
    useState([]);

  const [tariffs, setTariffs] =
    useState([]);

  const [coverageProviders, setCoverageProviders] =
  useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [coverageFilter, setCoverageFilter] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('ACTIVAS');

  const [editingId, setEditingId] =
    useState(null);

  const [form, setForm] = useState({
  coveragePlanId: '',
  providerId: '',
  service: SERVICES[0],
  amountCop: '',
});

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
  coverageResponse,
  providersResponse,
  tariffsResponse,
] = await Promise.all([
  api.get('/coverage-plans'),
  api.get('/coverage-providers'),
  api.get('/tariffs'),
]);

      setCoveragePlans(
        Array.isArray(
          coverageResponse.data
        )
          ? coverageResponse.data
          : []
      );

      setCoverageProviders(
  Array.isArray(
    providersResponse.data
  )
    ? providersResponse.data
    : []
);

      setTariffs(
        Array.isArray(
          tariffsResponse.data
        )
          ? tariffsResponse.data
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible cargar las tarifas.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeCoveragePlans =
    useMemo(
      () =>
        coveragePlans.filter(
          (coverage) =>
            Boolean(coverage.active)
        ),
      [coveragePlans]
    );

    const selectedCoverage =
  activeCoveragePlans.find(
    (coverage) =>
      String(
        coverage.id
      ) ===
      String(
        form.coveragePlanId
      )
  );

const requiresProvider =
  Boolean(
    selectedCoverage
  ) &&
  selectedCoverage.coverageType !==
    'PARTICULAR';

  const filteredTariffs =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return tariffs.filter(
        (tariff) => {
          const matchesSearch =
  !query ||
  tariff.service
    .toLowerCase()
    .includes(query) ||
  tariff.coverageName
    .toLowerCase()
    .includes(query) ||
  String(
    tariff.providerName || ''
  )
    .toLowerCase()
    .includes(query);

          const matchesCoverage =
            !coverageFilter ||
            String(
              tariff.coveragePlanId
            ) === String(
              coverageFilter
            );

          const matchesStatus =
            statusFilter === 'TODAS' ||
            (
              statusFilter === 'ACTIVAS' &&
              Boolean(tariff.active)
            ) ||
            (
              statusFilter === 'INACTIVAS' &&
              !Boolean(tariff.active)
            );

          return (
            matchesSearch &&
            matchesCoverage &&
            matchesStatus
          );
        }
      );
    }, [
      tariffs,
      search,
      coverageFilter,
      statusFilter,
    ]);

  const activeTariffsCount =
    tariffs.filter(
      (tariff) =>
        Boolean(tariff.active)
    ).length;

  const inactiveTariffsCount =
    tariffs.filter(
      (tariff) =>
        !Boolean(tariff.active)
    ).length;

  const handleChange = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
  setEditingId(null);

  setForm({
    coveragePlanId:
      activeCoveragePlans[0]?.id ||
      '',

    providerId: '',

    service: SERVICES[0],

    amountCop: '',
  });
};

  const startEdit = (tariff) => {
    setEditingId(tariff.id);

    setForm({
  coveragePlanId:
    tariff.coveragePlanId,

  providerId:
    tariff.providerId
      ? String(
          tariff.providerId
        )
      : '',

  service:
    tariff.service,

  amountCop:
    tariff.amountCop,
});

    setError('');
    setSuccess('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!form.coveragePlanId) {
      setError(
        'Selecciona una cobertura.'
      );
      return;
    }

    if (
  requiresProvider &&
  !form.providerId
) {
  setError(
    'Selecciona la entidad de cobertura.'
  );
  return;
}

    if (!form.service) {
      setError(
        'Selecciona un servicio.'
      );
      return;
    }

    const amount =
      Number(form.amountCop);

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      setError(
        'El valor debe ser un número entero mayor que cero.'
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
  coveragePlanId:
    Number(
      form.coveragePlanId
    ),

  providerId:
    requiresProvider &&
    form.providerId
      ? Number(
          form.providerId
        )
      : null,

  service:
    form.service,

  amountCop:
    amount,
};

      if (editingId) {
        await api.put(
          `/tariffs/${editingId}`,
          payload
        );

        setSuccess(
          'Tarifa actualizada correctamente.'
        );
      } else {
        await api.post(
          '/tariffs',
          payload
        );

        setSuccess(
          'Tarifa creada correctamente.'
        );
      }

      await loadData();

      resetForm();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible guardar la tarifa.'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleTariffStatus = async (
    tariff
  ) => {
    const action =
      tariff.active
        ? 'desactivar'
        : 'activar';

    const confirmed =
      window.confirm(
        `¿Quieres ${action} la tarifa de ${tariff.service} para ${tariff.coverageName}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await api.patch(
        `/tariffs/${tariff.id}/status`
      );

      await loadData();

      setSuccess(
        tariff.active
          ? 'Tarifa desactivada correctamente.'
          : 'Tarifa activada correctamente.'
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible cambiar el estado de la tarifa.'
      );
    }
  };

  const formatDate = (
    value
  ) => {
    if (!value) {
      return '—';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      'es-CO',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    ).format(date);
  };

  return (
    <div className="tariffs-page">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <div className="tariffs-header">
        <div className="tariffs-header-icon">
          $
        </div>

        <div className="tariffs-header-text">
          <h1>
            Tarifas y coberturas
          </h1>

          <p>
            Configura los valores de los servicios según la cobertura del paciente.
          </p>
        </div>
      </div>

      {/* =====================================================
          ALERTAS
      ===================================================== */}

      {error && (
        <div className="tariffs-alert tariffs-alert-error">
          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="tariffs-alert tariffs-alert-success">
          <span>
            {success}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccess('')
            }
          >
            ×
          </button>
        </div>
      )}

      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <div className="tariffs-summary">

        <div className="tariffs-summary-card">
          <span>
            Coberturas
          </span>

          <strong>
            {coveragePlans.length}
          </strong>

          <small>
            Configuradas en el sistema
          </small>
        </div>

        <div className="tariffs-summary-card">
          <span>
            Tarifas activas
          </span>

          <strong>
            {activeTariffsCount}
          </strong>

          <small>
            Disponibles para facturación
          </small>
        </div>

        <div className="tariffs-summary-card">
          <span>
            Tarifas inactivas
          </span>

          <strong>
            {inactiveTariffsCount}
          </strong>

          <small>
            No disponibles actualmente
          </small>
        </div>

      </div>

      {/* =====================================================
          CREAR / EDITAR TARIFA
      ===================================================== */}

      <section className="card tariffs-editor">

        <div className="tariffs-editor-header">

          <div>
            <span className="tariffs-kicker">
              CONFIGURACIÓN
            </span>

            <h2>
              {editingId
                ? 'Editar tarifa'
                : 'Nueva tarifa'}
            </h2>

            <p>
              Define cuánto cuesta un servicio para una cobertura determinada.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={resetForm}
            >
              Cancelar edición
            </button>
          )}

        </div>

        <form
          className="tariffs-form"
          onSubmit={handleSubmit}
        >

          <label>
            Cobertura *

            <select
              value={
                form.coveragePlanId
              }
              onChange={(event) =>
                handleChange(
                  'coveragePlanId',
                  event.target.value
                )
              }
              required
            >
              <option value="">
                Seleccionar cobertura
              </option>

              {activeCoveragePlans.map(
                (coverage) => (
                  <option
                    key={coverage.id}
                    value={coverage.id}
                  >
                    {coverage.name}
                  </option>
                )
              )}
            </select>
          </label>

             {requiresProvider && (
  <label>
    Entidad de cobertura *

    <select
      value={
        form.providerId
      }
      onChange={(event) =>
        handleChange(
          'providerId',
          event.target.value
        )
      }
      required
    >
      <option value="">
        Seleccionar entidad
      </option>

      {coverageProviders.map(
        (provider) => (
          <option
            key={provider.id}
            value={provider.id}
          >
            {provider.name}
          </option>
        )
      )}
    </select>

    <small>
      Selecciona la EPS o entidad
      asociada a esta tarifa.
    </small>
  </label>
)}

          <label>
            Servicio *

            <select
              value={
                form.service
              }
              onChange={(event) =>
                handleChange(
                  'service',
                  event.target.value
                )
              }
              required
            >
              {SERVICES.map(
                (service) => (
                  <option
                    key={service}
                    value={service}
                  >
                    {service}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            Valor del servicio (COP) *

            <input
              type="number"
              min="1"
              step="1"
              value={
                form.amountCop
              }
              onChange={(event) =>
                handleChange(
                  'amountCop',
                  event.target.value
                )
              }
              placeholder="Ej. 4200"
              required
            />

            {form.amountCop && (
              <small>
                {formatCurrency(
                  form.amountCop
                )}
              </small>
            )}
          </label>

          <div className="tariffs-form-actions">

            <button
              type="button"
              className="btn btn-ghost"
              onClick={
                resetForm
              }
              disabled={saving}
            >
              Limpiar
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving
                ? 'Guardando...'
                : editingId
                ? 'Guardar cambios'
                : 'Crear tarifa'}
            </button>

          </div>

        </form>

      </section>

      {/* =====================================================
          COBERTURAS
      ===================================================== */}

      <section className="card tariffs-coverage-card">

        <div className="tariffs-section-header">

          <div>
            <h2>
              Coberturas
            </h2>

            <p>
              Estas opciones determinan cómo se clasifica la atención.
            </p>
          </div>

        </div>

        <div className="tariffs-coverage-grid">

          {coveragePlans.length === 0 ? (
            <div className="tariffs-empty">
              No hay coberturas configuradas.
            </div>
          ) : (
            coveragePlans.map(
              (coverage) => (
                <div
                  className="tariffs-coverage-item"
                  key={coverage.id}
                >
                  <div>
                    <strong>
                      {coverage.name}
                    </strong>

                    <span>
                      {
                        COVERAGE_TYPES.find(
                          (item) =>
                            item.value ===
                            coverage.coverageType
                        )?.label ||
                        coverage.coverageType
                      }
                    </span>
                  </div>

                  <span
                    className={
                      coverage.active
                        ? 'tariffs-status tariffs-status-active'
                        : 'tariffs-status tariffs-status-inactive'
                    }
                  >
                    {coverage.active
                      ? 'Activa'
                      : 'Inactiva'}
                  </span>
                </div>
              )
            )
          )}

        </div>

      </section>

      {/* =====================================================
          LISTADO DE TARIFAS
      ===================================================== */}

      <section className="card tariffs-list-card">

        <div className="tariffs-section-header">

          <div>
            <h2>
              Tarifario
            </h2>

            <p>
              Consulta, edita y controla las tarifas vigentes.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={
              loadData
            }
            disabled={loading}
          >
            Actualizar
          </button>

        </div>

        {/* FILTROS */}

        <div className="tariffs-filters">

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar servicio o cobertura..."
          />

          <select
            value={
              coverageFilter
            }
            onChange={(event) =>
              setCoverageFilter(
                event.target.value
              )
            }
          >
            <option value="">
              Todas las coberturas
            </option>

            {coveragePlans.map(
              (coverage) => (
                <option
                  key={coverage.id}
                  value={coverage.id}
                >
                  {coverage.name}
                </option>
              )
            )}
          </select>

          <select
            value={
              statusFilter
            }
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="ACTIVAS">
              Tarifas activas
            </option>

            <option value="INACTIVAS">
              Tarifas inactivas
            </option>

            <option value="TODAS">
              Todas
            </option>
          </select>

        </div>

        {loading ? (
          <div className="tariffs-empty">
            Cargando tarifas...
          </div>
        ) : filteredTariffs.length === 0 ? (
          <div className="tariffs-empty">
            <strong>
              No hay tarifas para mostrar.
            </strong>

            <span>
              Crea una tarifa o modifica los filtros de búsqueda.
            </span>
          </div>
        ) : (
          <div className="tariffs-table-wrapper">

            <table className="tariffs-table">

              <thead>
                <tr>
                  <th>
                    Cobertura / entidad
                  </th>

                  <th>
                    Tipo
                  </th>

                  <th>
                    Servicio
                  </th>

                  <th>
                    Valor
                  </th>

                  <th>
                    Vigencia
                  </th>

                  <th>
                    Estado
                  </th>

                  <th>
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTariffs.map(
                  (tariff) => (
                    <tr
                      key={
                        tariff.id
                      }
                    >
                      <td>
  <div className="tariff-coverage-cell">

    <strong className="tariff-coverage-name">
      {tariff.coverageName}
    </strong>

    {tariff.providerName && (
      <span className="tariff-provider-name">
        {tariff.providerName}
      </span>
    )}

    {!tariff.providerName &&
      tariff.coverageType ===
        'PARTICULAR' && (
        <span className="tariff-provider-name tariff-provider-particular">
          Atención particular
        </span>
      )}

  </div>
</td>

                      <td>
                        {
                          COVERAGE_TYPES.find(
                            (item) =>
                              item.value ===
                              tariff.coverageType
                          )?.label ||
                          tariff.coverageType
                        }
                      </td>

                      <td>
                        {
                          tariff.service
                        }
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            tariff.amountCop
                          )}
                        </strong>
                      </td>

                      <td>
                        {
                          formatDate(
                            tariff.effectiveFrom
                          )
                        }
                      </td>

                      <td>
                        <span
                          className={
                            tariff.active
                              ? 'tariffs-status tariffs-status-active'
                              : 'tariffs-status tariffs-status-inactive'
                          }
                        >
                          {tariff.active
                            ? 'Activa'
                            : 'Inactiva'}
                        </span>
                      </td>

                      <td>
                        <div className="tariffs-actions">

                          <button
                            type="button"
                            className="btn btn-mini btn-ghost"
                            onClick={() =>
                              startEdit(
                                tariff
                              )
                            }
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className={
                              tariff.active
                                ? 'btn btn-mini btn-danger'
                                : 'btn btn-mini btn-primary'
                            }
                            onClick={() =>
                              toggleTariffStatus(
                                tariff
                              )
                            }
                          >
                            {tariff.active
                              ? 'Desactivar'
                              : 'Activar'}
                          </button>

                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
}