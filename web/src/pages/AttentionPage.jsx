import React, {
  useEffect,
  useState,
} from 'react';

import api from '../api';
import * as I from '../icons';

export default function AttentionPage() {
  const [appointments, setAppointments] =
    useState([]);

  const [selectedAppointment, setSelectedAppointment] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] = useState({
    reason: '',
    diagnosis: '',
    treatment: '',
    observations: '',
  });

  const [error, setError] =
    useState('');

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        '/appointments/mine'
      );

      setAppointments(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible cargar tus citas.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const selectAppointment = (
    appointment
  ) => {
    setSelectedAppointment(
      appointment
    );

    setForm({
      reason: '',
      diagnosis: '',
      treatment: '',
      observations: '',
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const markNoShow = async (
    appointment
  ) => {
    const confirmed =
      window.confirm(
        `¿Confirmas que ${appointment.patient} no asistió a la cita?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await api.patch(
        `/appointments/${appointment.id}/status`,
        {
          status: 'ATENDIDA',
          attendanceStatus: 'NO_ASISTIO',
        }
      );

      await loadAppointments();

      if (
        selectedAppointment?.id ===
        appointment.id
      ) {
        setSelectedAppointment(
          null
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible registrar la inasistencia.'
      );
    }
  };

  const updateField = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveAttention = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedAppointment) {
      return;
    }

    if (
      form.reason.trim().length < 3 ||
      form.diagnosis.trim().length < 3 ||
      form.treatment.trim().length < 3
    ) {
      setError(
        'Completa motivo, diagnóstico y tratamiento.'
      );

      return;
    }

    try {
      setSaving(true);
      setError('');

      await api.post(
  `/appointments/${selectedAppointment.id}/attend`,
  {
    reason:
      form.reason.trim(),

    diagnosis:
      form.diagnosis.trim(),

    treatment:
      form.treatment.trim(),

    observations:
      form.observations.trim(),
  }
);

      await loadAppointments();

      setSelectedAppointment(
        null
      );

      setForm({
        reason: '',
        diagnosis: '',
        treatment: '',
        observations: '',
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible guardar la atención.'
      );
    } finally {
      setSaving(false);
    }
  };

  const pendingAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status !==
          'ATENDIDA' &&
        appointment.status !==
          'CANCELADA'
    );

  const finishedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status ===
          'ATENDIDA' ||
        appointment.status ===
          'CANCELADA'
    );

  return (
    <>
      <div className="attention-page-header">
  <div className="attention-page-header-icon">
    <I.ClipboardList
      size={24}
    />
  </div>

  <div className="attention-page-header-text">
    <h1>
      Atención médica
    </h1>

    <p>
      Gestiona tus citas y registra la atención profesional de cada paciente.
    </p>
  </div>
</div>

      {error && (
        <div className="alert alert-error">
          {error}

          <button
            type="button"
            className="icon-btn"
            onClick={() =>
              setError('')
            }
          >
            <I.X size={16} />
          </button>
        </div>
      )}

      {selectedAppointment && (
        <section className="card attention-form-card">
          <div className="attention-patient-header">
            <div className="attention-patient-avatar">
              <I.User size={24} />
            </div>

            <div>
              <span>
                Atención en consulta
              </span>

              <h2>
                {
                  selectedAppointment.patient
                }
              </h2>

              <p>
                {
                  selectedAppointment.service
                }

                {' · '}

                {
                  selectedAppointment.date
                }

                {' · '}

                {
                  selectedAppointment.time
                }
              </p>
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                setSelectedAppointment(
                  null
                )
              }
            >
              <I.X size={16} />
              Cancelar
            </button>
          </div>

          <form
            onSubmit={saveAttention}
            className="attention-form"
          >
            <div className="field">
              <label>
                Motivo de consulta *
              </label>

              <textarea
                value={
                  form.reason
                }
                onChange={(e) =>
                  updateField(
                    'reason',
                    e.target.value
                  )
                }
                placeholder="Describe el motivo por el cual el paciente consulta."
                rows={4}
              />
            </div>

            <div className="field">
              <label>
                Diagnóstico *
              </label>

              <textarea
                value={
                  form.diagnosis
                }
                onChange={(e) =>
                  updateField(
                    'diagnosis',
                    e.target.value
                  )
                }
                placeholder="Registra el diagnóstico profesional."
                rows={4}
              />
            </div>

            <div className="field">
              <label>
                Tratamiento *
              </label>

              <textarea
                value={
                  form.treatment
                }
                onChange={(e) =>
                  updateField(
                    'treatment',
                    e.target.value
                  )
                }
                placeholder="Indica el tratamiento, conducta o manejo recomendado."
                rows={4}
              />
            </div>

            <div className="field">
              <label>
                Observaciones
              </label>

              <textarea
                value={
                  form.observations
                }
                onChange={(e) =>
                  updateField(
                    'observations',
                    e.target.value
                  )
                }
                placeholder="Agrega observaciones, recomendaciones o seguimiento."
                rows={4}
              />
            </div>

            <div className="attention-form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  setSelectedAppointment(
                    null
                  )
                }
                disabled={saving}
              >
                Volver
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                <I.CheckCircle2
                  size={17}
                />

                {saving
                  ? 'Guardando...'
                  : 'Guardar atención'}
              </button>
            </div>
          </form>
        </section>
      )}

      {!selectedAppointment && (
        <>
          <section className="attention-summary-grid">
            <div className="attention-summary-card">
              <div className="attention-summary-icon">
                <I.CalendarDays
                  size={20}
                />
              </div>

              <div>
                <span>
                  Citas pendientes
                </span>

                <strong>
                  {
                    pendingAppointments.length
                  }
                </strong>

                <small>
                  Pendientes de atención
                </small>
              </div>
            </div>

             <div className="attention-summary-card">
              <div className="attention-summary-icon">
                <I.CheckCircle2
                  size={20}
                />
              </div>

              <div>
                <span>
                  Atenciones registradas
                </span>

                <strong>
                  {
                    finishedAppointments.filter(
                      (a) =>
                        a.status ===
                        'ATENDIDA'
                    ).length
                  }
                </strong>

                <small>
                  Atenciones finalizadas
                </small>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="attention-section-head">
              <div>
                <h3>
                  Citas asignadas
                </h3>

                <p>
                  Consulta y gestiona las citas asignadas a tu agenda profesional.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={
                  loadAppointments
                }
              >
                <I.CalendarDays
  size={16}
/>
Actualizar
              </button>
            </div>

            {loading ? (
              <div className="empty">
                <I.CalendarDays
  size={28}
/>

                <span>
                  Cargando tus citas...
                </span>
              </div>
            ) : pendingAppointments.length === 0 ? (
              <div className="empty">
                <I.CalendarDays
                  size={28}
                />

                <strong>
                  No tienes citas pendientes
                </strong>

                <span>
                  Cuando recepción te asigne una
                  cita aparecerá aquí.
                </span>
              </div>
            ) : (
              <div className="attention-appointments">
                {pendingAppointments.map(
                  (appointment) => (
                    <article
                      className="attention-appointment-card"
                      key={
                        appointment.id
                      }
                    >
                      <div className="attention-date-box">
                        <strong>
                          {
                            appointment.date
                          }
                        </strong>

                        <span>
                          {
                            appointment.time
                          }
                        </span>
                      </div>

                      <div className="attention-appointment-main">
                        <span className="attention-kicker">
                          {
                            appointment.service
                          }
                        </span>

                        <h4>
                          {
                            appointment.patient
                          }
                        </h4>

                        <p>
                          {
                            appointment.notes ||
                            'Sin notas registradas.'
                          }
                        </p>
                      </div>

                      <div className="attention-appointment-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() =>
                            selectAppointment(
                              appointment
                            )
                          }
                        >
                          <I.CheckCircle2
  size={16}
/>
Atender
                        </button>

                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() =>
                            markNoShow(
                              appointment
                            )
                          }
                        >
                          <I.X
                            size={16}
                          />
                          No asistió
                        </button>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}