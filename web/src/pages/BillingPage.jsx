import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import api from '../api';
import * as I from '../icons';

const SERVICES = [
  'Medicina General',
  'Odontología',
  'Pediatría',
  'Medicina Interna',
  'Laboratorio',
];

const STATUS_LABELS = {
  PENDIENTE: 'Pendiente',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
};

const EMPTY_FORM = {
  patientId: '',
  service: 'Medicina General',
  amountCop: '',
  status: 'PENDIENTE',
};

function formatCurrency(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(
    value.replace(' ', 'T')
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function notify(
  message,
  type = 'success'
) {
  window.dispatchEvent(
    new CustomEvent('toast', {
      detail: {
        message,
        type,
      },
    })
  );
}

function BillingPage() {
  const [searchParams] = useSearchParams();

  const appointmentId =
    searchParams.get('appointmentId');

  const [invoices, setInvoices] =
    useState([]);

  const [patients, setPatients] =
    useState([]);

  const [appointments, setAppointments] =
    useState([]);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('TODAS');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        invoicesResponse,
        patientsResponse,
        appointmentsResponse,
      ] = await Promise.all([
        api.get('/invoices'),
        api.get('/patients'),
        api.get('/appointments'),
      ]);

      setInvoices(
        Array.isArray(
          invoicesResponse.data
        )
          ? invoicesResponse.data
          : []
      );

      setPatients(
        Array.isArray(
          patientsResponse.data
        )
          ? patientsResponse.data
          : []
      );

      setAppointments(
        Array.isArray(
          appointmentsResponse.data
        )
          ? appointmentsResponse.data
          : []
      );
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'No fue posible cargar la información de facturación.';

      setError(message);

      notify(
        message,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!appointmentId) {
      return;
    }

    const appointment =
      appointments.find(
        (item) =>
          String(item.id) ===
          String(appointmentId)
      );

    if (!appointment) {
      return;
    }

    setForm({
      patientId:
        String(appointment.patientId),

      service:
        appointment.service ||
        'Medicina General',

      amountCop: '',

      status: 'PENDIENTE',
    });
  }, [
    appointmentId,
    appointments,
  ]);

  const filteredInvoices =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return invoices.filter(
        (invoice) => {
          const matchesSearch =
            !query ||
            [
              invoice.patient,
              invoice.service,
              invoice.status,
              invoice.id,
            ]
              .filter(
                (value) =>
                  value !== undefined &&
                  value !== null
              )
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(query)
              );

          const matchesStatus =
            statusFilter === 'TODAS' ||
            invoice.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      invoices,
      search,
      statusFilter,
    ]);

  const stats = useMemo(() => {
    const pending =
      invoices.filter(
        (item) =>
          item.status ===
          'PENDIENTE'
      );

    const paid =
      invoices.filter(
        (item) =>
          item.status ===
          'PAGADA'
      );

    const pendingAmount =
      pending.reduce(
        (total, item) =>
          total +
          Number(
            item.amountCop || 0
          ),
        0
      );

    const paidAmount =
      paid.reduce(
        (total, item) =>
          total +
          Number(
            item.amountCop || 0
          ),
        0
      );

    return {
      total: invoices.length,
      pending: pending.length,
      paid: paid.length,
      pendingAmount,
      paidAmount,
    };
  }, [invoices]);

  const handleChange = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreate = async (
    event
  ) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      const amount =
        Number(form.amountCop);

      if (!form.patientId) {
        setError(
          'Debes seleccionar un paciente.'
        );
        return;
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        setError(
          'El valor de la factura debe ser mayor que cero.'
        );
        return;
      }

      await api.post('/invoices', {
  patientId: Number(form.patientId),

  ...(appointmentId
    ? {
        appointmentId:
          Number(appointmentId),
      }
    : {}),

  service: form.service,

  amountCop: amount,

  status: 'PENDIENTE',
});

      setForm(EMPTY_FORM);

      await loadData();

      notify(
        'Factura generada correctamente.'
      );
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'No fue posible generar la factura.';

      setError(message);

      notify(
        message,
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (
    invoice,
    nextStatus
  ) => {
    const action =
      nextStatus === 'PAGADA'
        ? 'registrar el pago de'
        : 'anular';

    const confirmed =
      window.confirm(
        `¿Deseas ${action} la factura #${invoice.id}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await api.patch(
        `/invoices/${invoice.id}/status`,
        {
          status:
            nextStatus,
        }
      );

      await loadData();

      notify(
        nextStatus ===
          'PAGADA'
          ? 'Pago registrado correctamente.'
          : 'Factura anulada correctamente.'
      );
    } catch (err) {
      notify(
        err.response?.data?.message ||
          'No fue posible actualizar la factura.',
        'error'
      );
    }
  };

  const appointmentContext =
    appointmentId
      ? appointments.find(
          (appointment) =>
            String(
              appointment.id
            ) === String(
              appointmentId
            )
        )
      : null;

  return (
    <>
      <PageHeader
        icon={I.CreditCard}
        title="Facturación"
        subtitle="Generación y seguimiento de cuentas por servicios."
      />

      <section className="dashboard-stat-grid">
        <StatCard
          icon={I.FileText}
          label="Facturas"
          value={stats.total}
          detail="Registros"
        />

        <StatCard
          icon={I.Clock3}
          label="Pendientes"
          value={stats.pending}
          detail={formatCurrency(
            stats.pendingAmount
          )}
        />

        <StatCard
          icon={I.CheckCircle2}
          label="Pagadas"
          value={stats.paid}
          detail={formatCurrency(
            stats.paidAmount
          )}
        />

        <StatCard
          icon={I.CreditCard}
          label="Cartera pendiente"
          value={formatCurrency(
            stats.pendingAmount
          )}
          detail="Por recaudar"
        />
      </section>

      <section className="card form-card billing-create-card">

  <div className="billing-create-header">
    <div>
      <span className="billing-kicker">
        CITA ASOCIADA
      </span>

      <h3>
        Nueva factura
      </h3>

      <p>
        Registra el servicio prestado y genera la cuenta del paciente.
      </p>
    </div>

    {appointmentContext && (
      <span className="billing-appointment-badge">
        <I.CalendarDays size={15} />
        Cita #{appointmentContext.id}
      </span>
    )}
  </div>

  {appointmentContext && (
    <div className="billing-appointment-context">

      <div className="billing-context-item">
        <span>Paciente</span>

        <strong>
          {appointmentContext.patient}
        </strong>
      </div>

      <div className="billing-context-item">
        <span>Servicio</span>

        <strong>
          {appointmentContext.service}
        </strong>
      </div>

      <div className="billing-context-item">
        <span>Fecha</span>

        <strong>
          {appointmentContext.date}
        </strong>
      </div>

      <div className="billing-context-item">
        <span>Hora</span>

        <strong>
          {appointmentContext.time}
        </strong>
      </div>

    </div>
  )}

  {error && (
    <div className="alert error">
      <I.AlertCircle size={17} />
      <span>{error}</span>
    </div>
  )}

  <form
    className="billing-form-grid"
    onSubmit={handleCreate}
  >

    <label>
      Paciente *

      <select
        value={form.patientId}
        onChange={(event) =>
          handleChange(
            'patientId',
            event.target.value
          )
        }
        required
        disabled={Boolean(appointmentContext)}
      >
        <option value="">
          Seleccionar paciente
        </option>

        {patients.map(
          (patient) => (
            <option
              key={patient.id}
              value={patient.id}
            >
              {patient.name}
              {' · '}
              {patient.document}
            </option>
          )
        )}
      </select>

      {appointmentContext && (
        <small className="billing-field-note">
          Paciente tomado automáticamente de la cita.
        </small>
      )}
    </label>

    <label>
      Servicio *

      <select
        value={form.service}
        onChange={(event) =>
          handleChange(
            'service',
            event.target.value
          )
        }
        required
        disabled={Boolean(appointmentContext)}
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

      {appointmentContext && (
        <small className="billing-field-note">
          Servicio tomado automáticamente de la cita.
        </small>
      )}
    </label>

    <label>
      Valor del servicio (COP) *

      <input
        type="number"
        min="1"
        step="1"
        value={form.amountCop}
        onChange={(event) =>
          handleChange(
            'amountCop',
            event.target.value
          )
        }
        placeholder="Ej. 45000"
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

    <label>
      Estado inicial

      <input
        value="Pendiente"
        disabled
      />
    </label>

    <div className="billing-form-actions">
      <button
        type="submit"
        className="btn btn-primary"
        disabled={saving}
      >
        {saving ? (
          'Generando...'
        ) : (
          <>
            <I.CreditCard size={17} />
            Generar factura
          </>
        )}
      </button>
    </div>

  </form>

</section>

      <section className="card">
        <div className="table-tools">
          <div>
            <h3>
              Facturas
            </h3>

            <p>
              {invoices.length}{' '}
              registros
            </p>
          </div>

          <div className="table-toolbar-actions">
            <div className="search">
              <I.Search size={17} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Buscar factura, paciente o servicio"
              />
            </div>

            <select
              className="toolbar-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="TODAS">
                Todos los estados
              </option>

              <option value="PENDIENTE">
                Pendientes
              </option>

              <option value="PAGADA">
                Pagadas
              </option>

              <option value="ANULADA">
                Anuladas
              </option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="empty">
              <I.Activity size={26} />

              <span>
                Cargando facturación...
              </span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Empty
              icon={I.FileText}
              text="No se encontraron facturas."
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Servicio</th>
                  <th>Valor</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.map(
                  (invoice) => (
                    <tr
                      key={invoice.id}
                    >
                      <td>
                        <b>
                          FV-
                          {String(
                            invoice.id
                          ).padStart(
                            5,
                            '0'
                          )}
                        </b>
                      </td>

                      <td>
                        {
                          formatDateTime(
                            invoice.issuedAt
                          )
                        }
                      </td>

                      <td>
                        <div className="cell-person">
                          <strong>
                            {
                              invoice.patient
                            }
                          </strong>

                          <small>
                            ID #
                            {
                              invoice.patientId
                            }
                          </small>
                        </div>
                      </td>

                      <td>
                        {
                          invoice.service
                        }
                      </td>

                      <td>
                        <b>
                          {formatCurrency(
                            invoice.amountCop
                          )}
                        </b>
                      </td>

                      <td>
                        <span
                          className={`pill-status ${invoice.status.toLowerCase()}`}
                        >
                          {
                            STATUS_LABELS[
                              invoice.status
                            ] ||
                            invoice.status
                          }
                        </span>
                      </td>

                      <td>
                        <div className="row-actions">
                          {invoice.status ===
                            'PENDIENTE' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-mini btn-primary-soft"
                                onClick={() =>
                                  updateStatus(
                                    invoice,
                                    'PAGADA'
                                  )
                                }
                              >
                                <I.CheckCircle2
                                  size={15}
                                />
                                Registrar pago
                              </button>

                              <button
                                type="button"
                                className="btn btn-mini btn-danger"
                                onClick={() =>
                                  updateStatus(
                                    invoice,
                                    'ANULADA'
                                  )
                                }
                              >
                                <I.X size={15} />
                                Anular
                              </button>
                            </>
                          )}

                          {invoice.status ===
                            'PAGADA' && (
                            <span className="muted">
                              Pago registrado
                            </span>
                          )}

                          {invoice.status ===
                            'ANULADA' && (
                            <span className="muted">
                              Factura anulada
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}

function PageHeader({
  icon: Icon,
  title,
  subtitle,
}) {
  return (
    <div className="page-header">
      <div className="title-row">
        <div className="title-icon">
          <Icon size={22} />
        </div>

        <div>
          <h1>
            {title}
          </h1>

          <p>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={19} />
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {detail}
        </small>
      </div>
    </div>
  );
}

function Empty({
  icon: Icon = I.FileText,
  text,
}) {
  return (
    <div className="empty">
      <Icon size={26} />
      <span>{text}</span>
    </div>
  );
}

export default BillingPage;