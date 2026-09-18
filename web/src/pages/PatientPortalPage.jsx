import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import api from '../api';
import * as I from '../icons';

function PatientPortalPage() {
  const navigate =
    useNavigate();

  const [user, setUser] =
    useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            'ips_sv_patient_user'
          ) || 'null'
        );
      } catch {
        return null;
      }
    });

  const [token, setToken] =
    useState(
      () =>
        localStorage.getItem(
          'ips_sv_patient_token'
        ) || ''
    );

  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  useEffect(() => {
    if (!token || !user) {
      navigate(
        '/portal-paciente',
        {
          replace: true,
        }
      );

      return;
    }

    let active = true;

    const loadPatientData =
      async () => {
        try {
          setLoading(true);
          setError('');

          const config = {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          };

          const [
            appointmentsResponse,
            notificationsResponse,
          ] =
            await Promise.all([
              api.get(
                '/patient/appointments',
                config
              ),

              api.get(
                '/patient/notifications',
                config
              ),
            ]);

          if (!active) {
            return;
          }

          setAppointments(
            Array.isArray(
              appointmentsResponse.data
            )
              ? appointmentsResponse.data
              : []
          );

          setNotifications(
            Array.isArray(
              notificationsResponse.data
            )
              ? notificationsResponse.data
              : []
          );
        } catch (requestError) {
          if (!active) {
            return;
          }

          localStorage.removeItem(
            'ips_sv_patient_token'
          );

          localStorage.removeItem(
            'ips_sv_patient_user'
          );

          setToken('');
          setUser(null);

          navigate(
            '/portal-paciente',
            {
              replace: true,
            }
          );
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    loadPatientData();

    return () => {
      active = false;
    };
  }, [
    token,
    user,
    navigate,
  ]);

  const logout = () => {
    localStorage.removeItem(
      'ips_sv_patient_token'
    );

    localStorage.removeItem(
      'ips_sv_patient_user'
    );

    setToken('');
    setUser(null);

    navigate(
      '/portal-paciente',
      {
        replace: true,
      }
    );
  };

  const upcomingAppointments =
    useMemo(() => {
      return appointments.filter(
        (appointment) =>
          appointment.status !==
          'CANCELADA'
      );
    }, [appointments]);

  const unreadNotifications =
    useMemo(() => {
      return notifications.filter(
        (notification) =>
          !notification.readAt
      ).length;
    }, [notifications]);

  if (!user || !token) {
    return null;
  }

  return (
    <div className="patient-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <img
            src={`${import.meta.env.BASE_URL}assets/logo-icon.png`}
            className="brand-logo"
            alt="IPS Salud Vital"
          />

          <div>
            <div className="brand-title">
              IPS Salud Vital
            </div>

            <div className="brand-sub">
              Portal del paciente
            </div>
          </div>
        </div>

        <div className="top-actions">
          <span className="user-chip">
            <span className="avatar">
              <I.UserRound size={16} />
            </span>

            <div>
              <strong>
                {user.name}
              </strong>

              <small>
                {user.document}
              </small>
            </div>
          </span>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={logout}
          >
            <I.LogOut size={16} />
            Salir
          </button>
        </div>
      </header>

      <main
        className="content"
        style={{
          marginLeft: 0,
          maxWidth: 1100,
          margin:
            '0 auto',
        }}
      >
        <div className="page-header">
          <div className="title-row">
            <div className="title-icon">
              <I.HeartPulse
                size={22}
              />
            </div>

            <div>
              <h1>
                Hola,{' '}
                {
                  user.name.split(
                    ' '
                  )[0]
                }
              </h1>

              <p>
                Este es tu resumen
                de atención en IPS
                Salud Vital.
              </p>
            </div>
          </div>
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

        <div
          className="stats-grid"
          style={{
            gridTemplateColumns:
              'repeat(2, 1fr)',
          }}
        >
          <StatCard
            icon={
              I.CalendarDays
            }
            label="Próximas citas"
            value={
              loading
                ? '...'
                : upcomingAppointments.length
            }
            meta="Agenda disponible"
          />

          <StatCard
            icon={I.Bell}
            label="Notificaciones"
            value={
              loading
                ? '...'
                : unreadNotifications
            }
            meta="Mensajes sin leer"
          />
        </div>

        <div className="dashboard-grid">
          <section className="card">
            <div className="card-head">
              <div>
                <h3>
                  Mis citas
                </h3>

                <p>
                  Consulta fecha,
                  servicio y
                  profesional.
                </p>
              </div>
            </div>

            <div className="table-wrap">
              {loading ? (
                <div className="empty">
                  <I.Activity
                    size={26}
                  />

                  <span>
                    Cargando tus
                    citas...
                  </span>
                </div>
              ) : appointments.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>
                        Fecha
                      </th>

                      <th>
                        Hora
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
                    </tr>
                  </thead>

                  <tbody>
                    {appointments.map(
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
                              appointment.date
                            }
                          </td>

                          <td>
                            {
                              appointment.time
                            }
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
                              className={`pill-status ${String(
                                appointment.status ||
                                  ''
                              ).toLowerCase()}`}
                            >
                              {
                                appointment.status
                              }
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              ) : (
                <Empty
                  text="No tienes citas registradas."
                />
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h3>
                  Notificaciones
                </h3>

                <p>
                  Actualizaciones
                  relacionadas
                  con tu atención.
                </p>
              </div>
            </div>

            <div className="module-list">
              {loading ? (
                <div className="empty">
                  <I.Activity
                    size={26}
                  />

                  <span>
                    Cargando...
                  </span>
                </div>
              ) : notifications.length ? (
                notifications
                  .slice(
                    0,
                    8
                  )
                  .map(
                    (
                      notification
                    ) => (
                      <div
                        className="module-row"
                        key={
                          notification.id
                        }
                      >
                        <span className="module-icon">
                          <I.Bell
                            size={16}
                          />
                        </span>

                        <div>
                          <b>
                            {
                              notification.title
                            }
                          </b>

                          <small>
                            {
                              notification.message
                            }
                          </small>
                        </div>
                      </div>
                    )
                  )
              ) : (
                <Empty
                  text="No tienes notificaciones."
                />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  meta,
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={20} />
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {meta}
        </small>
      </div>
    </div>
  );
}

function Empty({
  text,
}) {
  return (
    <div className="empty">
      <I.FileText
        size={26}
      />

      <span>
        {text}
      </span>
    </div>
  );
}

export default PatientPortalPage;