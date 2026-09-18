import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api';
import * as I from '../icons';

const INITIAL_FORM = {
  patientId: '',
  date: '',
  time: '',
  service: 'Medicina General',
  professional: '',
  professionalUserId: '',
  notes: '',
};

const SERVICES = [
  'Medicina General',
  'Odontología',
  'Pediatría',
  'Medicina Interna',
  'Laboratorio',
];

const STATUS_LABELS = {
  PROGRAMADA: 'Programada',
  CONFIRMADA: 'Confirmada',
  ATENDIDA: 'Atendida',
  CANCELADA: 'Cancelada',
};

function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem(
        'ips_sv_user'
      ) || 'null'
    );
  } catch {
    return null;
  }
}

function formatDate(dateString) {
  if (!dateString) {
    return '—';
  }

  const date = new Date(
    `${dateString}T00:00:00`
  );

  return new Intl.DateTimeFormat(
    'es-CO',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  ).format(date);
}

function formatTime(time) {
  if (!time) {
    return '—';
  }

  const [hours, minutes] =
    time.split(':');

  const date = new Date();

  date.setHours(
    Number(hours),
    Number(minutes),
    0,
    0
  );

  return new Intl.DateTimeFormat(
    'es-CO',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(date);
}

function todayISO() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    now.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
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

function AppointmentPage() {
  const navigate =
    useNavigate();

  const user =
    getStoredUser();

  const isReception =
    user?.role ===
    'RECEPCION';

  const isDoctor =
    user?.role ===
    'MEDICO';

  const [patients, setPatients] =
    useState([]);

  const [doctors, setDoctors] =
    useState([]);

  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [form, setForm] =
    useState(INITIAL_FORM);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('TODAS');

  const [error, setError] =
    useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        appointmentsResponse,
        patientsResponse,
        doctorsResponse,
      ] = await Promise.all([
        api.get(
          '/appointments'
        ),

        api.get(
          '/patients'
        ),

        api.get(
          '/users/doctors'
        ),
      ]);

      setAppointments(
        Array.isArray(
          appointmentsResponse.data
        )
          ? appointmentsResponse.data
          : []
      );

      setPatients(
        Array.isArray(
          patientsResponse.data
        )
          ? patientsResponse.data
          : []
      );

      setDoctors(
        Array.isArray(
          doctorsResponse.data
        )
          ? doctorsResponse.data
          : []
      );
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'No fue posible cargar la agenda.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableProfessionals =
    useMemo(() => {
      return doctors.filter(
        (doctor) =>
          doctor.specialty ===
            form.service &&
          Boolean(
            doctor.active
          )
      );
    }, [
      doctors,
      form.service,
    ]);

  useEffect(() => {
    const currentDoctor =
      availableProfessionals.find(
        (doctor) =>
          String(doctor.id) ===
          String(
            form.professionalUserId
          )
      );

    if (!currentDoctor) {
      const firstDoctor =
        availableProfessionals[0];

      setForm((current) => ({
        ...current,

        professional:
          firstDoctor?.name ||
          '',

        professionalUserId:
          firstDoctor
            ? String(
                firstDoctor.id
              )
            : '',
      }));

      return;
    }

    if (
      form.professional !==
      currentDoctor.name
    ) {
      setForm((current) => ({
        ...current,

        professional:
          currentDoctor.name,
      }));
    }
  }, [
    availableProfessionals,
    form.professional,
    form.professionalUserId,
  ]);

  const filteredAppointments =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return appointments.filter(
        (appointment) => {
          const matchesSearch =
            !query ||
            [
              appointment.patient,
              appointment.service,
              appointment.professional,
              appointment.date,
              appointment.notes,
            ]
              .filter(Boolean)
              .some(
                (value) =>
                  String(value)
                    .toLowerCase()
                    .includes(
                      query
                    )
              );

          const matchesStatus =
            statusFilter ===
              'TODAS' ||
            appointment.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      appointments,
      search,
      statusFilter,
    ]);

  const stats = useMemo(() => {
    const active =
      appointments.filter(
        (item) =>
          item.status !==
          'CANCELADA'
      );

    const today =
      appointments.filter(
        (item) =>
          item.date ===
            todayISO() &&
          item.status !==
            'CANCELADA'
      );

    const confirmed =
      appointments.filter(
        (item) =>
          item.status ===
          'CONFIRMADA'
      );

    return {
      total:
        appointments.length,

      active:
        active.length,

      today:
        today.length,

      confirmed:
        confirmed.length,
    };
  }, [appointments]);

  const handleFormChange = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  };

  const handleServiceChange = (
    value
  ) => {
    const newDoctors =
      doctors.filter(
        (doctor) =>
          doctor.specialty ===
            value &&
          Boolean(
            doctor.active
          )
      );

    const firstDoctor =
      newDoctors[0];

    setForm((current) => ({
      ...current,

      service: value,

      professional:
        firstDoctor?.name ||
        '',

      professionalUserId:
        firstDoctor
          ? String(
              firstDoctor.id
            )
          : '',
    }));
  };

  const handleProfessionalChange = (
    value
  ) => {
    const doctor =
      availableProfessionals.find(
        (item) =>
          String(item.id) ===
          String(value)
      );

    setForm((current) => ({
      ...current,

      professional:
        doctor?.name || '',

      professionalUserId:
        doctor
          ? String(doctor.id)
          : '',
    }));
  };

  const createAppointment =
    async (event) => {
      event.preventDefault();

      if (!isReception) {
        notify(
          'Solo Recepción puede asignar citas.',
          'error'
        );

        return;
      }

      if (
        !form.professionalUserId
      ) {
        notify(
          'Debes seleccionar un profesional.',
          'error'
        );

        return;
      }

      try {
        setSaving(true);
        setError('');

        await api.post(
          '/appointments',
          {
            patientId: Number(
              form.patientId
            ),

            date:
              form.date,

            time:
              form.time,

            service:
              form.service,

            professional:
              form.professional,

            professionalUserId:
              Number(
                form.professionalUserId
              ),

            status:
              'PROGRAMADA',

            notes:
              form.notes.trim(),
          }
        );

        setForm({
          ...INITIAL_FORM,

          service:
            form.service,

          professional:
            form.professional,

          professionalUserId:
            form.professionalUserId,
        });

        await loadData();

        notify(
          'Cita registrada correctamente.'
        );
      } catch (err) {
        const message =
          err.response?.data
            ?.message ||
          'No fue posible registrar la cita.';

        setError(message);

        notify(
          message,
          'error'
        );
      } finally {
        setSaving(false);
      }
    };

  const changeStatus = async (
  appointment,
  nextStatus,
  attendanceStatus = null
) => {
  /* ---------------------------------------------------------
     CANCELAR:
     Solo recepción puede cancelar.
  --------------------------------------------------------- */
  if (
    nextStatus === 'CANCELADA' &&
    !isReception
  ) {
    notify(
      'Solo Recepción puede cancelar una cita.',
      'error'
    );

    return;
  }

  /* ---------------------------------------------------------
     SEGURIDAD EN FRONTEND:
     Un médico solo puede actuar sobre sus propias citas.
     La seguridad REAL también está en el backend.
  --------------------------------------------------------- */
  if (
    isDoctor &&
    Number(
      appointment.professionalUserId
    ) !== Number(user?.id)
  ) {
    notify(
      'Solo puedes gestionar tus propias citas.',
      'error'
    );

    return;
  }

  try {
    await api.patch(
      `/appointments/${appointment.id}/status`,
      {
        status: nextStatus,
        attendanceStatus,
      }
    );

    await loadData();

    /* -------------------------------------------------------
       MENSAJES ESPECÍFICOS
    ------------------------------------------------------- */

    if (
      nextStatus === 'ATENDIDA' &&
      attendanceStatus === 'ASISTIO'
    ) {
      notify(
        'La atención fue registrada correctamente.'
      );

      return;
    }

    if (
      nextStatus === 'ATENDIDA' &&
      attendanceStatus === 'NO_ASISTIO'
    ) {
      notify(
        'La inasistencia fue registrada correctamente.'
      );

      return;
    }

    const statusText =
      STATUS_LABELS[nextStatus] ||
      nextStatus;

    notify(
      `La cita pasó a estado ${statusText}.`
    );
  } catch (err) {
    notify(
      err.response?.data?.message ||
        'No fue posible actualizar el estado.',
      'error'
    );
  }
};

const openBilling = (appointment) => {
  navigate(
    `/facturacion?appointmentId=${appointment.id}`
  );
};

const renderActions = (
  appointment
) => {
  const actions = [];

  /* =========================================================
     RECEPCIÓN
  ========================================================= */

  if (
    isReception &&
    appointment.status ===
      'PROGRAMADA'
  ) {
    actions.push(
      <button
        key="confirm"
        type="button"
        className="btn btn-mini btn-ghost"
        onClick={() =>
          changeStatus(
            appointment,
            'CONFIRMADA'
          )
        }
      >
        <I.CheckCircle2
          size={15}
        />
        Confirmar
      </button>
    );
  }

  /* =========================================================
     MÉDICO
     Puede atender SU cita aunque esté PROGRAMADA o CONFIRMADA.
  ========================================================= */

  const isOwnDoctorAppointment =
    isDoctor &&
    Number(
      appointment.professionalUserId
    ) === Number(user?.id);

  const canDoctorAttend =
    isOwnDoctorAppointment &&
    (
      appointment.status ===
        'PROGRAMADA' ||
      appointment.status ===
        'CONFIRMADA'
    );

  if (
    canDoctorAttend
  ) {
    actions.push(
      <button
        key="attend"
        type="button"
        className="btn btn-mini btn-primary"
        onClick={() =>
          changeStatus(
            appointment,
            'ATENDIDA',
            'ASISTIO'
          )
        }
      >
        <I.CheckCircle2
          size={15}
        />
        Atender
      </button>
    );

    actions.push(
      <button
        key="no-show"
        type="button"
        className="btn btn-mini btn-danger"
        onClick={() =>
          changeStatus(
            appointment,
            'ATENDIDA',
            'NO_ASISTIO'
          )
        }
      >
        <I.X
          size={15}
        />
        No asistió
      </button>
    );
  }

  /* =========================================================
     RECEPCIÓN:
     Puede cancelar mientras la cita siga activa.
  ========================================================= */

  if (
    isReception &&
    appointment.status !==
      'CANCELADA' &&
    appointment.status !==
      'ATENDIDA'
  ) {
    actions.push(
      <button
        key="cancel"
        type="button"
        className="btn btn-mini btn-danger"
        onClick={() =>
          changeStatus(
            appointment,
            'CANCELADA'
          )
        }
      >
        <I.X size={15} />
        Cancelar
      </button>
    );
  }

  /* =========================================================
     RECEPCIÓN:
     Facturación.
  ========================================================= */

  if (
    isReception &&
    appointment.status !==
      'CANCELADA'
  ) {
    actions.push(
      <button
        key="billing"
        type="button"
        className="btn btn-mini btn-primary-soft"
        onClick={() =>
          openBilling(
            appointment
          )
        }
      >
        <I.CreditCard
          size={15}
        />
        Facturar
      </button>
    );
  }

  return actions;
};

  return (
    <>
      <PageHeader
        icon={I.CalendarDays}
        title="Gestión de citas"
        subtitle="Agenda, disponibilidad y seguimiento de la atención."
      />

      <section className="dashboard-stat-grid">
        <StatCard
          icon={I.CalendarDays}
          label="Citas registradas"
          value={stats.total}
          detail="Historial de agenda"
        />

        <StatCard
          icon={I.CheckCircle2}
          label="Citas activas"
          value={stats.active}
          detail="Sin contar canceladas"
        />

        <StatCard
          icon={I.Clock3}
          label="Citas de hoy"
          value={stats.today}
          detail="Agenda diaria"
        />

        <StatCard
          icon={I.CheckCircle2}
          label="Confirmadas"
          value={stats.confirmed}
          detail="Preparadas para atención"
        />
      </section>

      {isReception && (
        <section className="card form-card">
          <div className="card-head">
            <div>
              <h3>
                Nueva cita
              </h3>

              <p>
                Registra la cita y
                notifica automáticamente
                al paciente.
              </p>
            </div>

            <span className="section-status">
              <I.ShieldCheck
                size={15}
              />
              Recepción
            </span>
          </div>

          {error && (
            <div className="alert error">
              <I.AlertCircle
                size={17}
              />

              <span>
                {error}
              </span>
            </div>
          )}

          <form
            className="form-grid"
            onSubmit={
              createAppointment
            }
          >
            <label>
              Paciente *

              <select
                value={
                  form.patientId
                }
                onChange={(
                  event
                ) =>
                  handleFormChange(
                    'patientId',
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Seleccionar paciente
                </option>

                {patients.map(
                  (patient) => (
                    <option
                      key={
                        patient.id
                      }
                      value={
                        patient.id
                      }
                    >
                      {
                        patient.name
                      }
                      {' · '}
                      {
                        patient.document
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Fecha *

              <input
                type="date"
                value={
                  form.date
                }
                min={todayISO()}
                onChange={(
                  event
                ) =>
                  handleFormChange(
                    'date',
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Hora *

              <input
                type="time"
                value={
                  form.time
                }
                onChange={(
                  event
                ) =>
                  handleFormChange(
                    'time',
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Servicio *

              <select
                value={
                  form.service
                }
                onChange={(
                  event
                ) =>
                  handleServiceChange(
                    event.target.value
                  )
                }
                required
              >
                {SERVICES.map(
                  (service) => (
                    <option
                      key={
                        service
                      }
                      value={
                        service
                      }
                    >
                      {service}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Profesional *

              <select
                value={
                  form.professionalUserId
                }
                onChange={(
                  event
                ) =>
                  handleProfessionalChange(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Seleccionar profesional
                </option>

                {availableProfessionals.length ===
                0 ? (
                  <option
                    value=""
                    disabled
                  >
                    No hay médicos con
                    esta especialidad
                  </option>
                ) : (
                  availableProfessionals.map(
                    (doctor) => (
                      <option
                        key={
                          doctor.id
                        }
                        value={
                          doctor.id
                        }
                      >
                        {
                          doctor.name
                        }
                      </option>
                    )
                  )
                )}
              </select>
            </label>

            <label>
              Nota para la cita

              <input
                type="text"
                maxLength={500}
                value={
                  form.notes
                }
                onChange={(
                  event
                ) =>
                  handleFormChange(
                    'notes',
                    event.target.value
                  )
                }
                placeholder="Ej. Presentarse 20 minutos antes."
              />
            </label>

            <div className="form-actions span-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  saving ||
                  !form.professionalUserId
                }
              >
                {saving ? (
                  'Guardando...'
                ) : (
                  <>
                    <I.CalendarDays
                      size={17}
                    />

                    Asignar cita
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="table-tools">
          <div>
            <h3>
              Agenda
            </h3>

            <p>
              {
                appointments.length
              }{' '}
              citas registradas
            </p>
          </div>

          <div className="table-toolbar-actions">
            <div className="search">
              <I.Search
                size={17}
              />

              <input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Buscar paciente, servicio o profesional"
              />
            </div>

            <select
              className="toolbar-select"
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="TODAS">
                Todos los estados
              </option>

              <option value="PROGRAMADA">
                Programadas
              </option>

              <option value="CONFIRMADA">
                Confirmadas
              </option>

              <option value="ATENDIDA">
                Atendidas
              </option>

              <option value="CANCELADA">
                Canceladas
              </option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="empty">
              <I.Activity
                size={26}
              />

              <span>
                Cargando agenda...
              </span>
            </div>
          ) : filteredAppointments.length ===
            0 ? (
            <Empty
              icon={
                I.CalendarDays
              }
              text="No se encontraron citas con los filtros seleccionados."
            />
          ) : (
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>
                    Fecha
                  </th>

                  <th>
                    Hora
                  </th>

                  <th>
                    Paciente
                  </th>

                  <th>
                    Servicio
                  </th>

                  <th>
                    Profesional
                  </th>

                  <th>
                    Estado
                  </th>

                  <th>
                    Notas
                  </th>

                  <th>
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredAppointments.map(
                  (
                    appointment
                  ) => (
                    <tr
                      key={
                        appointment.id
                      }
                    >
                      <td>
                        {
                          formatDate(
                            appointment.date
                          )
                        }
                      </td>

                      <td>
                        <b>
                          {
                            formatTime(
                              appointment.time
                            )
                          }
                        </b>
                      </td>

                      <td>
                        <div className="cell-person">
                          <strong>
                            {
                              appointment.patient
                            }
                          </strong>

                          <small>
                            ID de cita #
                            {
                              appointment.id
                            }
                          </small>
                        </div>
                      </td>

                      <td>
                        {
                          appointment.service
                        }
                      </td>

                      <td>
                        {
                          appointment.professional
                        }
                      </td>

                      <td>
                        <span
                          className={`pill-status ${appointment.status.toLowerCase()}`}
                        >
                          {
                            STATUS_LABELS[
                              appointment.status
                            ] ||
                            appointment.status
                          }
                        </span>
                      </td>

                      <td>
                        {appointment.notes ? (
                          <span
                            className="appointment-note"
                            title={
                              appointment.notes
                            }
                          >
                            {
                              appointment.notes
                            }
                          </span>
                        ) : (
                          <span className="muted">
                            Sin notas
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="row-actions">
                          {
                            renderActions(
                              appointment
                            )
                          }
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

      <span>
        {text}
      </span>
    </div>
  );
}

export default AppointmentPage;