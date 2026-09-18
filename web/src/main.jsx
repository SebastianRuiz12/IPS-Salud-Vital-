import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import api from './api';
import * as I from './icons';
import './styles.css';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminPage from './pages/AdminPage';
import AppointmentPageNew from './pages/AppointmentPage';
import AttentionPage from './pages/AttentionPage';
import BillingPageNew from './pages/BillingPage';
import TariffsPage from './pages/TariffsPage';
import PatientRegisterPage from './pages/PatientRegisterPage';
import PatientLoginPage from './pages/PatientLoginPage';
import PatientPortalPage from './pages/PatientPortalPage';
import PatientForgotPasswordPage from './pages/PatientForgotPasswordPage';

/* =========================================================
   CONFIGURACIÓN GENERAL
========================================================= */

const roleLabels = {
  ADMIN: 'Administrador',
  RECEPCION: 'Recepción',
  MEDICO: 'Médico',
};

const roleCan = {
  ADMIN: {
    patients: false,
    appointments: false,
    history: false,
    invoices: false,
    tariffs: true,
    reports: true,
    users: true,
  },

  RECEPCION: {
    patients: true,
    appointments: true,
    history: false,
    invoices: true,
    tariffs: true,
    reports: false,
    users: false,
  },

  MEDICO: {
    patients: true,
    appointments: true,
    history: true,
    invoices: false,
    tariffs: false,
    reports: false,
    users: false,
  },
};

/* =========================================================
   AUTENTICACIÓN
========================================================= */

function useAuth() {
  try {
    return JSON.parse(localStorage.getItem('ips_sv_user') || 'null');
  } catch {
    return null;
  }
}

function RequireAuth({ children }) {
  const user = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token =
      localStorage.getItem('ips_sv_token');

    if (!user || !token) {
      navigate('/login', {
        replace: true,
      });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const mustChange =
    user.role !== 'PACIENTE' &&
    user.mustChangePassword === true;

  if (
    mustChange &&
    location.pathname !==
      '/cambiar-contrasena'
  ) {
    return (
      <Navigate
        to="/cambiar-contrasena"
        replace
      />
    );
  }

  return children;
}

/* =========================================================
   LAYOUT PRINCIPAL
========================================================= */

function Layout({ children }) {
  const user = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const permissions = roleCan[user?.role] || {};

  const unreadNotifications = notifications.filter(
    (notification) => !notification.readAt
  ).length;

  const loadNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  };

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setNotificationsOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const links = [
  ['/', 'Inicio', I.Home, true],

  [
    '/pacientes',
    'Pacientes',
    I.Users,
    permissions.patients,
  ],

  [
    '/citas',
    'Citas',
    I.CalendarDays,
    permissions.appointments,
  ],

  [
    '/atencion',
    'Atención médica',
    I.ClipboardList,
    permissions.history,
  ],

  [
    '/facturacion',
    'Facturación',
    I.CreditCard,
    permissions.invoices,
  ],

  [
    '/tarifas',
    'Tarifas y coberturas',
    I.CreditCard,
    permissions.tariffs,
  ],

  [
    '/reportes',
    'Reportes',
    I.BarChart3,
    permissions.reports,
  ],

  [
    '/administracion',
    'Administración',
    I.Settings,
    permissions.users,
  ],
];

  const logout = () => {
    localStorage.removeItem('ips_sv_token');
    localStorage.removeItem('ips_sv_user');
    localStorage.removeItem('ips_sv_patient_token');
    localStorage.removeItem('ips_sv_patient_user');

    setNotifications([]);
    setNotificationsOpen(false);
    setMenuOpen(false);

    navigate('/login', { replace: true });
  };

  const openNotification = async (notification) => {
  try {
    if (!notification.readAt) {
      await api.patch(
        `/notifications/${notification.id}/read`
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                readAt: new Date().toISOString(),
              }
            : item
        )
      );
    }

    setNotificationsOpen(false);

    switch (notification.entityType) {
      case 'APPOINTMENT':
        navigate(
          `/citas?appointmentId=${notification.entityId}`
        );
        break;

      case 'INVOICE':
        navigate(
          `/facturacion?invoiceId=${notification.entityId}`
        );
        break;

      case 'PATIENT':
        navigate(
          `/pacientes?patientId=${notification.entityId}`
        );
        break;

      case 'HISTORY':
        navigate(
          `/historia?historyId=${notification.entityId}`
        );
        break;

      default:
        break;
    }
  } catch (error) {
    console.error(
      'Error al abrir la notificación:',
      error
    );
  }
};

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <button
            type="button"
            className="icon-btn mobile"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Abrir menú"
          >
            <I.Menu size={20} />
          </button>

          <img
            src={`${import.meta.env.BASE_URL}assets/logo-icon.png`}
            className="brand-logo"
            alt="IPS Salud Vital"
          />

          <div>
            <div className="brand-title">IPS Salud Vital</div>
            <div className="brand-sub">Sistema Integral de Gestión</div>
          </div>
        </div>

        <div className="top-actions">
          <div className="notification-wrapper">
            <button
              type="button"
              className="icon-btn notification-button"
              title="Notificaciones"
              aria-label="Notificaciones"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((value) => !value);
                loadNotifications();
              }}
            >
              <I.Bell size={18} />

              {unreadNotifications > 0 && (
                <span className="notification-badge">
                  {unreadNotifications > 99
                    ? '99+'
                    : unreadNotifications}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="notification-panel">
                <div className="notification-panel-head">
                  <div>
                    <h3>Notificaciones</h3>
                    <span>
                      {unreadNotifications} sin leer
                    </span>
                  </div>

                  <button
                    type="button"
                    className="icon-btn"
                    title="Cerrar notificaciones"
                    aria-label="Cerrar notificaciones"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    <I.X size={16} />
                  </button>
                </div>

                <div className="notification-list">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 10).map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        className={
                          notification.readAt
                            ? 'notification-item read'
                            : 'notification-item unread'
                        }
                        onClick={() =>
  openNotification(notification)
}
                      >
                        <span className="notification-icon">
                          <I.Bell size={16} />
                        </span>

                        <span className="notification-content">
                          <strong>{notification.title}</strong>
                          <small>{notification.message}</small>

                          {!notification.readAt && (
                            <em>Sin leer</em>
                          )}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="notification-empty">
                      <I.Bell size={24} />
                      <span>No tienes notificaciones.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="user-chip">
            <span className="avatar">
              <I.UserRound size={16} />
            </span>

            <div>
              <strong>{user?.name}</strong>
              <small>{roleLabels[user?.role]}</small>
            </div>
          </div>

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

      <div
        className={menuOpen ? 'overlay show' : 'overlay'}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-head">Módulos</div>

        <nav>
          {links.map(([to, label, Icon, allowed]) => {
            if (!allowed) {
              return null;
            }

            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  isActive ? 'nav-item active' : 'nav-item'
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="security-card">
            <I.ShieldCheck size={18} />

            <div>
              <b>Acceso seguro</b>
              <span>Sesión autenticada</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="content">
        {children}
      </main>
    </div>
  );
}

/* =========================================================
   COMPONENTES REUTILIZABLES
========================================================= */

function PageHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="page-header">
      <div className="title-row">
        <div className="title-icon">
          <Icon size={22} />
        </div>

        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      {action}
    </div>
  );
}

function ToastHost() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleToast = (event) => {
      setToast(event.detail);

      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);

      return () => clearTimeout(timer);
    };

    window.addEventListener('toast', handleToast);

    return () => {
      window.removeEventListener('toast', handleToast);
    };
  }, []);

  if (!toast) {
    return null;
  }

  const icon =
    toast.type === 'error'
      ? I.AlertCircle
      : I.CheckCircle2;

  const ToastIcon = icon;

  return (
    <div className={`toast ${toast.type || 'success'}`}>
      <ToastIcon size={17} />
      <span>{toast.message}</span>
    </div>
  );
}

function notify(message, type = 'success') {
  window.dispatchEvent(
    new CustomEvent('toast', {
      detail: {
        message,
        type,
      },
    })
  );
}

function StatCard({ icon: Icon, label, value, meta }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={20} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{meta}</small>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="empty">
      <I.FileText size={26} />
      <span>{text}</span>
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: 'recepcion',
    password: 'Recepcion123',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', form);

      localStorage.removeItem('ips_sv_patient_token');
      localStorage.removeItem('ips_sv_patient_user');

      localStorage.setItem('ips_sv_token', response.data.token);
      localStorage.setItem(
        'ips_sv_user',
        JSON.stringify(response.data.user)
      );

      if (
  response.data.user.mustChangePassword
) {
  navigate(
    '/cambiar-contrasena',
    { replace: true }
  );
} else {
  navigate('/', {
    replace: true,
  });
}
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible iniciar sesión.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="visual-overlay">
          <img
            src={`${import.meta.env.BASE_URL}assets/logo-icon.png`}
            alt="IPS Salud Vital"
          />

          <span className="visual-kicker">
            IPS SALUD VITAL
          </span>

          <h1>
            Gestión clínica y administrativa en un solo lugar.
          </h1>

          <p>
            Una plataforma diseñada para conectar la atención al
            paciente, la operación interna y la trazabilidad de la IPS.
          </p>

          <div className="feature-grid">
            <div>
              <I.HeartPulse size={18} />
              <span>Atención centrada en el paciente</span>
            </div>

            <div>
              <I.ShieldCheck size={18} />
              <span>Control por roles</span>
            </div>

            <div>
              <I.Activity size={18} />
              <span>Información integrada</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-card">
        <div className="mobile-logo">
          <img
            src={`${import.meta.env.BASE_URL}assets/logo-icon.png`}
            alt="IPS Salud Vital"
          />
        </div>

        <div className="eyebrow">Sistema de gestión</div>

        <h2>Iniciar sesión</h2>

        <p>
          Ingresa con las credenciales de tu perfil operativo.
        </p>

        {error && (
          <div className="alert error">
            <I.AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="form-stack">
          <label>
            Usuario

            <input
              value={form.username}
              onChange={(event) =>
                setForm({
                  ...form,
                  username: event.target.value,
                })
              }
              autoComplete="username"
              required
            />
          </label>

          <label>
            Contraseña

            <div className="input-with-action">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) =>
                  setForm({
                    ...form,
                    password: event.target.value,
                  })
                }
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="inside-btn"
                onClick={() =>
                  setShowPassword((value) => !value)
                }
                aria-label={
                  showPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                {showPassword ? (
                  <I.EyeOff size={17} />
                ) : (
                  <I.Eye size={17} />
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading ? (
              'Validando...'
            ) : (
              <>
                <I.LockKeyhole size={17} />
                Ingresar al sistema
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-ghost login-patient-btn"
          onClick={() => navigate('/portal-paciente')}
        >
          <I.UserRound size={16} />
          Ingresar como paciente
        </button>

        <div className="demo-box">
  <b>Accesos de prueba</b>

  <span>
    Recepción · recepcion / Recepcion123
  </span>

  <span>
    Médico · medico / Medico123
  </span>

  <span>
    Administrador · admin / Admin123
  </span>

  <span>
    Paciente · documento 1022334455 / Paciente123
  </span>
</div>

        <div className="login-footer">
          IPS Salud Vital · Versión 2.0
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {
  const navigate = useNavigate();
  const user = useAuth();
  const permissions = roleCan[user?.role] || {};

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const response = await api.get('/dashboard');

        if (active) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Error cargando dashboard:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const money = data
    ? new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(data.pendingInvoices || 0)
    : '—';

  return (
    <>
      <PageHeader
        icon={I.Home}
        title="Panel principal"
        subtitle="Resumen operativo de IPS Salud Vital."
      />

      <div className="stats-grid">
        <StatCard
          icon={I.Users}
          label="Pacientes registrados"
          value={loading ? '...' : data?.patients ?? 0}
          meta="Base de pacientes"
        />

        <StatCard
          icon={I.CalendarDays}
          label="Citas activas"
          value={loading ? '...' : data?.appointments ?? 0}
          meta="Sin contar canceladas"
        />

        <StatCard
          icon={I.Clock3}
          label="Citas de hoy"
          value={loading ? '...' : data?.todayAppointments ?? 0}
          meta="Agenda diaria"
        />

        <StatCard
          icon={I.CreditCard}
          label="Cartera pendiente"
          value={loading ? '...' : money}
          meta="Facturación"
        />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Arquitectura del proyecto</h3>
              <p>
                Los módulos comparten una API y una base de datos SQLite.
              </p>
            </div>

            <span className="status">
              <span className="status-dot"></span>
              Operativo
            </span>
          </div>

          <div className="architecture">
            <div className="arch-node">
              <I.Smartphone size={21} />
              <b>App Android</b>
              <span>Pacientes</span>
            </div>

            <div className="arch-line"></div>

            <div className="arch-node">
              <I.PanelLeft size={21} />
              <b>Web administrativa</b>
              <span>Personal IPS</span>
            </div>

            <div className="arch-line"></div>

            <div className="arch-node">
              <I.Activity size={21} />
              <b>API</b>
              <span>Servicios</span>
            </div>

            <div className="arch-line"></div>

            <div className="arch-node">
              <I.FileText size={21} />
              <b>SQLite</b>
              <span>Persistencia</span>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3>Módulos integrados</h3>
              <p>
                Primera entrega funcional del sistema.
              </p>
            </div>
          </div>

          <div className="module-list">
            {[
              ['Pacientes', I.Users, 'CRUD y validaciones', '/pacientes', permissions.patients],
              ['Citas', I.CalendarDays, 'Agenda y estados', '/citas', permissions.appointments],
              ['Historia clínica', I.ClipboardList, 'Registro médico', '/historia', permissions.history],
              ['Facturación', I.CreditCard, 'Servicios y estados', '/facturacion', permissions.invoices],
              ['Reportes', I.BarChart3, 'Indicadores del sistema', '/reportes', permissions.reports],
            ]
              .filter(([, , , , allowed]) => allowed)
              .map(([name, Icon, description, path]) => (
                <button
                  type="button"
                  className="module-row module-row-button"
                  key={name}
                  onClick={() => navigate(path)}
                >
                  <span className="module-icon">
                    <Icon size={17} />
                  </span>

                  <div>
                    <b>{name}</b>
                    <small>{description}</small>
                  </div>

                  <I.ChevronRight size={16} />
                </button>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}

/* =========================================================
   SELECTOR DE FECHA MODERNO
========================================================= */

function ModernDatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  min,
}) {
  const [open, setOpen] =
    useState(false);

  const initialDate = value
    ? new Date(`${value}T12:00:00`)
    : new Date();

  const [viewDate, setViewDate] =
    useState(initialDate);

  useEffect(() => {
    if (value) {
      setViewDate(
        new Date(`${value}T12:00:00`)
      );
    }
  }, [value]);

  const year =
    viewDate.getFullYear();

  const month =
    viewDate.getMonth();

  const monthName =
    viewDate.toLocaleDateString(
      'es-CO',
      {
        month: 'long',
        year: 'numeric',
      }
    );

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const mondayOffset =
    firstDay === 0
      ? 6
      : firstDay - 1;

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const daysInPreviousMonth =
    new Date(
      year,
      month,
      0
    ).getDate();

  const calendarDays = [];

  for (
    let i = mondayOffset - 1;
    i >= 0;
    i--
  ) {
    calendarDays.push({
      day:
        daysInPreviousMonth - i,
      currentMonth: false,
    });
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    calendarDays.push({
      day,
      currentMonth: true,
    });
  }

  let nextDay = 1;

  while (
    calendarDays.length < 42
  ) {
    calendarDays.push({
      day: nextDay++,
      currentMonth: false,
    });
  }

  const formatDate = (
    date
  ) => {
    const y =
      date.getFullYear();

    const m =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const d =
      String(
        date.getDate()
      ).padStart(2, '0');

    return `${y}-${m}-${d}`;
  };

  const isSelected = (
    day
  ) => {
    if (!value) {
      return false;
    }

    return (
      value ===
      `${year}-${String(
        month + 1
      ).padStart(
        2,
        '0'
      )}-${String(
        day
      ).padStart(
        2,
        '0'
      )}`
    );
  };

  const today =
    new Date();

  const isToday = (
    day
  ) => {
    return (
      today.getFullYear() ===
        year &&
      today.getMonth() ===
        month &&
      today.getDate() ===
        day
    );
  };

  const selectDay = (
    day
  ) => {
    const date =
      new Date(
        year,
        month,
        day
      );

    const formatted =
      formatDate(date);

    if (
      min &&
      formatted < min
    ) {
      return;
    }

    onChange(formatted);
    setOpen(false);
  };

  const previousMonth =
    () => {
      setViewDate(
        new Date(
          year,
          month - 1,
          1
        )
      );
    };

  const nextMonth =
    () => {
      setViewDate(
        new Date(
          year,
          month + 1,
          1
        )
      );
    };

  const goToday =
    () => {
      const todayDate =
        new Date();

      const formatted =
        formatDate(
          todayDate
        );

      setViewDate(
        todayDate
      );

      onChange(
        formatted
      );

      setOpen(false);
    };

  return (
    <div className="modern-date-picker">

      <button
        type="button"
        className={`modern-date-trigger ${
          open ? 'is-open' : ''
        }`}
        onClick={() =>
          setOpen(
            (current) =>
              !current
          )
        }
      >

        <span className="modern-date-icon">
          ◷
        </span>

        <span className="modern-date-value">
          {value
            ? new Date(
                `${value}T12:00:00`
              ).toLocaleDateString(
                'es-CO',
                {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }
              )
            : placeholder}
        </span>

        <span className="modern-date-chevron">
          {open ? '⌃' : '⌄'}
        </span>

      </button>

      {open && (
        <div className="modern-calendar-popover">

          <div className="modern-calendar-top">

            <div>
              <span>
                Calendario
              </span>

              <strong>
                {monthName}
              </strong>
            </div>

            <div className="modern-calendar-nav">

              <button
                type="button"
                onClick={
                  previousMonth
                }
                aria-label="Mes anterior"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={
                  nextMonth
                }
                aria-label="Mes siguiente"
              >
                ›
              </button>

            </div>

          </div>

          <div className="modern-calendar-weekdays">

            {[
              'LU',
              'MA',
              'MI',
              'JU',
              'VI',
              'SA',
              'DO',
            ].map(
              (day) => (
                <span
                  key={day}
                >
                  {day}
                </span>
              )
            )}

          </div>

          <div className="modern-calendar-grid">

            {calendarDays.map(
              (
                item,
                index
              ) => {

                const dateValue =
                  `${year}-${String(
                    month + 1
                  ).padStart(
                    2,
                    '0'
                  )}-${String(
                    item.day
                  ).padStart(
                    2,
                    '0'
                  )}`;

                const disabled =
                  !item.currentMonth ||
                  Boolean(
                    min &&
                    dateValue < min
                  );

                return (
                  <button
                    key={`${item.day}-${index}`}
                    type="button"
                    className={[
                      'modern-calendar-day',
                      !item.currentMonth
                        ? 'outside'
                        : '',
                      isToday(
                        item.day
                      )
                        ? 'today'
                        : '',
                      isSelected(
                        item.day
                      )
                        ? 'selected'
                        : '',
                    ].join(
                      ' '
                    )}
                    disabled={
                      disabled
                    }
                    onClick={() =>
                      selectDay(
                        item.day
                      )
                    }
                  >
                    {item.day}
                  </button>
                );
              }
            )}

          </div>

          <div className="modern-calendar-footer">

            <button
              type="button"
              className="modern-calendar-today"
              onClick={
                goToday
              }
            >
              Hoy
            </button>

            <button
              type="button"
              className="modern-calendar-clear"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Borrar
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

/* =========================================================
   PACIENTES
========================================================= */

function PatientPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [searched, setSearched] = useState(false);
 /* =========================================================
   COBERTURA DEL PACIENTE
========================================================= */

const [patientCoverage, setPatientCoverage] = useState(null);

const [coveragePlans, setCoveragePlans] = useState([]);

const [coverageProviders, setCoverageProviders] =
  useState([]);

const [loadingCoverage, setLoadingCoverage] = useState(false);

const [savingCoverage, setSavingCoverage] = useState(false);

const [coverageForm, setCoverageForm] = useState({
  coveragePlanId: '',
  providerId: '',
  providerName: '',
  membershipNumber: '',
  effectiveFrom: '',
  effectiveTo: '',
});

   
  const searchPatients = async () => {
    const value = query.trim();

    if (value.length < 2) {
      setResults([]);
      setSearched(false);
      setSelectedPatient(null);
      return;
    }

    try {
      setLoadingSearch(true);
      setSelectedPatient(null);
      setSearched(true);

      const response = await api.get('/patients/search', {
        params: {
          q: value,
        },
      });

      setResults(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'No fue posible buscar el paciente.',
        'error'
      );
      setResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const openProfile = async (patientId) => {
  try {
    setLoadingProfile(true);
    setLoadingCoverage(true);

    setPatientCoverage(null);

    const [
  profileResponse,
  coverageResponse,
  plansResponse,
  providersResponse,
] = await Promise.all([
  api.get(
    `/patients/${patientId}/profile`
  ),

  api.get(
    `/patients/${patientId}/coverage`
  ),

  api.get(
    '/coverage-plans'
  ),

  api.get(
    '/coverage-providers'
  ),
]);

    const profile =
      profileResponse.data;

    const coverage =
      coverageResponse.data;

    const plans =
      Array.isArray(
        plansResponse.data
      )
        ? plansResponse.data
        : [];

        const providers =
  Array.isArray(
    providersResponse.data
  )
    ? providersResponse.data
    : [];

    setSelectedPatient(
      profile
    );

    setPatientCoverage(
      coverage || null
    );

    setCoveragePlans(
      plans
    );

    setCoverageProviders(
  providers
);

    if (coverage) {
      setCoverageForm({
  coveragePlanId:
    String(
      coverage.coveragePlanId
    ),

  providerId:
    matchingProvider
      ? String(
          matchingProvider
        )
      : '',

  providerName:
    coverage.providerName ||
    '',

  membershipNumber:
    coverage.membershipNumber ||
    '',

  effectiveFrom:
    coverage.effectiveFrom ||
    '',

  effectiveTo:
    coverage.effectiveTo ||
    '',
});
    } else {
      setCoverageForm({
        coveragePlanId: '',
        providerName: '',
        membershipNumber: '',
        effectiveFrom: '',
        effectiveTo: '',
      });
    }

  } catch (error) {
    notify(
      error.response?.data?.message ||
        'No fue posible cargar la ficha del paciente.',
      'error'
    );
  } finally {
    setLoadingProfile(false);
    setLoadingCoverage(false);
  }
};

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSelectedPatient(null);
    setSearched(false);
  };

  return (
    <>
      <PageHeader
        icon={I.Users}
        title="Consulta de pacientes"
        subtitle="Busca un paciente para consultar su información y antecedentes de atención."
      />

      {/* =====================================================
          BUSCADOR
      ===================================================== */}

      <section className="card patient-search-card">
        <div className="patient-search-header">
          <div>
            <h3>Buscar paciente</h3>
            <p>
              Busca por número de documento o nombre del paciente.
            </p>
          </div>
        </div>

        <div className="patient-search-row">
          <div className="search patient-search-input">
            <I.Search size={18} />

            <input
              type="text"
              value={query}
              placeholder="Documento o nombre del paciente..."
              autoComplete="off"
              onChange={(event) =>
                setQuery(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  searchPatients();
                }
              }}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={searchPatients}
            disabled={loadingSearch}
          >
            <I.Search size={17} />

            {loadingSearch
              ? 'Buscando...'
              : 'Buscar paciente'}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={clearSearch}
            disabled={
              !query &&
              results.length === 0 &&
              !selectedPatient
            }
          >
            Limpiar
          </button>
        </div>
      </section>

      {/* =====================================================
          ESTADO INICIAL
      ===================================================== */}

      {!searched &&
        !selectedPatient &&
        !loadingProfile && (
          <section className="card patient-empty-card">
            <div className="patient-empty-content">
              <div className="patient-empty-icon">
                <I.Users size={28} />
              </div>

              <h3>Consulta de pacientes</h3>

              <p>
                La información de pacientes no se muestra
                automáticamente.
              </p>

              <span>
                Busca un documento o un nombre para comenzar.
              </span>
            </div>
          </section>
        )}

      {/* =====================================================
          SIN RESULTADOS
      ===================================================== */}

      {searched &&
        !loadingSearch &&
        results.length === 0 &&
        !selectedPatient &&
        !loadingProfile && (
          <section className="card patient-empty-card">
            <div className="patient-empty-content">
              <div className="patient-empty-icon">
                <I.FileText size={28} />
              </div>

              <h3>Paciente no encontrado</h3>

              <p>
                No encontramos coincidencias con la búsqueda.
              </p>

              <span>
                Verifica el documento o escribe el nombre
                completo.
              </span>
            </div>
          </section>
        )}

      {/* =====================================================
          RESULTADOS
      ===================================================== */}

      {results.length > 0 &&
        !selectedPatient && (
          <section className="card patient-results-card">
            <div className="patient-section-head">
              <div>
                <h3>Resultados de búsqueda</h3>

                <p>
                  {results.length}{' '}
                  {results.length === 1
                    ? 'paciente encontrado'
                    : 'pacientes encontrados'}
                </p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Paciente</th>
                    <th>Grupo sanguíneo</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {results.map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <strong className="patient-document">
                          {patient.document}
                        </strong>
                      </td>

                      <td>
                        <div className="patient-name-cell">
                          <span className="patient-mini-avatar">
                            <I.Users size={15} />
                          </span>

                          <strong>
                            {patient.name}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <span className="tag">
                          {patient.bloodType || 'N/D'}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="btn btn-mini btn-ghost"
                          onClick={() =>
                            openProfile(patient.id)
                          }
                        >
                          <I.FileText size={15} />
                          Ver ficha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      {/* =====================================================
          CARGANDO FICHA
      ===================================================== */}

      {loadingProfile && (
        <section className="card patient-loading-card">
          <div className="patient-empty-content">
            <div className="patient-empty-icon">
              <I.FileText size={28} />
            </div>

            <h3>Cargando ficha</h3>

            <p>
              Estamos consultando la información del paciente.
            </p>
          </div>
        </section>
      )}

      {/* =====================================================
          FICHA COMPLETA
      ===================================================== */}

      {selectedPatient && !loadingProfile && (
        <div className="patient-profile">
          <section className="card patient-profile-header">
            <div className="patient-profile-title">
              <div className="patient-profile-avatar">
                <I.Users size={26} />
              </div>

              <div>
                <span className="patient-profile-kicker">
                  Ficha del paciente
                </span>

                <h2>
                  {selectedPatient.patient.name}
                </h2>

                <p>
                  Documento:{' '}
                  <strong>
                    {selectedPatient.patient.document}
                  </strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                setSelectedPatient(null)
              }
            >
              <I.ChevronRight
  size={16}
  style={{ transform: 'rotate(180deg)' }}
/>
              Volver a resultados
            </button>
          </section>

          {/* DATOS PERSONALES */}

          <section className="card">
            <div className="patient-section-head">
              <div>
                <h3>Información del paciente</h3>
                <p>
                  Datos registrados en la IPS.
                </p>
              </div>
            </div>

            <div className="patient-info-grid">
              <div className="patient-info-item">
                <span>Teléfono</span>

                <strong>
                  {selectedPatient.patient.phone || 'No registrado'}
                </strong>
              </div>

              <div className="patient-info-item">
                <span>Correo electrónico</span>

                <strong>
                  {selectedPatient.patient.email || 'No registrado'}
                </strong>
              </div>

              <div className="patient-info-item">
                <span>Fecha de nacimiento</span>

                <strong>
                  {selectedPatient.patient.birthDate || 'No registrada'}
                </strong>
              </div>

              <div className="patient-info-item">
                <span>Grupo sanguíneo</span>

                <strong>
                  {selectedPatient.patient.bloodType || 'N/D'}
                </strong>
              </div>
            </div>
          </section>

          {/* =====================================================
    COBERTURA DE ATENCIÓN
===================================================== */}

<section className="card patient-coverage-card">

  <div className="patient-section-head">

    <div>
      <h3>
        Cobertura de atención
      </h3>

      <p>
        Información administrativa utilizada para determinar la cobertura del servicio.
      </p>
    </div>

    {patientCoverage && (
      <span
        className={
          patientCoverage.coverageType ===
          'PARTICULAR'
            ? 'patient-coverage-badge patient-coverage-particular'
            : 'patient-coverage-badge'
        }
      >
        {patientCoverage.coverageName}
      </span>
    )}

  </div>

  {loadingCoverage ? (
    <div className="patient-coverage-loading">
      Consultando cobertura...
    </div>
  ) : (
    <>
      <div className="patient-coverage-summary">

        <div className="patient-coverage-item">
          <span>
            Tipo de cobertura
          </span>

          <strong>
            {patientCoverage
              ? patientCoverage.coverageName
              : 'Sin cobertura registrada'}
          </strong>
        </div>

        <div className="patient-coverage-item">
          <span>
            Entidad responsable
          </span>

          <strong>
            {patientCoverage?.providerName ||
              (
                patientCoverage?.coverageType ===
                'PARTICULAR'
                  ? 'No aplica'
                  : 'No registrada'
              )}
          </strong>
        </div>

        <div className="patient-coverage-item">
          <span>
            Número de afiliación
          </span>

          <strong>
            {patientCoverage?.membershipNumber ||
              (
                patientCoverage?.coverageType ===
                'PARTICULAR'
                  ? 'No aplica'
                  : 'No registrado'
              )}
          </strong>
        </div>

        <div className="patient-coverage-item">
          <span>
            Vigencia
          </span>

          <strong>
            {patientCoverage?.effectiveFrom
              ? `${patientCoverage.effectiveFrom}${
                  patientCoverage.effectiveTo
                    ? ` → ${patientCoverage.effectiveTo}`
                    : ''
                }`
              : 'No registrada'}
          </strong>
        </div>

      </div>

      {useAuth()?.role === 'RECEPCION' && (
        <div className="patient-coverage-editor">

          <div className="patient-coverage-editor-header">
            <div>
              <h4>
                {patientCoverage
                  ? 'Actualizar cobertura'
                  : 'Asignar cobertura'}
              </h4>

              <p>
                Gestiona la cobertura administrativa del paciente.
              </p>
            </div>
          </div>

          <div className="patient-coverage-form">

            <label>
              Tipo de cobertura *

              <select
                value={
                  coverageForm.coveragePlanId
                }
                onChange={(event) => {
                  const value =
                    event.target.value;

                  setCoverageForm(
                    (current) => ({
                      ...current,
                      coveragePlanId:
                        value,
                    })
                  );
                }}
                required
              >
                <option value="">
                  Seleccionar cobertura
                </option>

                {coveragePlans
                  .filter(
                    (plan) =>
                      Boolean(plan.active)
                  )
                  .map(
                    (plan) => (
                      <option
                        key={plan.id}
                        value={plan.id}
                      >
                        {plan.name}
                      </option>
                    )
                  )}
              </select>
            </label>

            <label>
              Entidad responsable

              <select
                value={
                  coverageForm.providerName
                }
                onChange={(event) =>
                  setCoverageForm(
                    (current) => ({
                      ...current,
                      providerName:
                        event.target.value,
                    })
                  )
                }
                placeholder="Ej. EPS / entidad"
              />
            </label>

            <label>
              Número de afiliación

              <input
                value={
                  coverageForm.membershipNumber
                }
                onChange={(event) =>
                  setCoverageForm(
                    (current) => ({
                      ...current,
                      membershipNumber:
                        event.target.value,
                    })
                  )
                }
                placeholder="Número de afiliación"
              />
            </label>

            <label>
  Fecha de inicio

  <ModernDatePicker
    value={
      coverageForm.effectiveFrom
    }
    onChange={(value) =>
      setCoverageForm(
        (current) => ({
          ...current,
          effectiveFrom:
            value,
        })
      )
    }
    placeholder="Seleccionar fecha"
  />
</label>

            <label>
  Fecha de finalización

  <ModernDatePicker
    value={
      coverageForm.effectiveTo
    }
    onChange={(value) =>
      setCoverageForm(
        (current) => ({
          ...current,
          effectiveTo:
            value,
        })
      )
    }
    min={
      coverageForm.effectiveFrom
    }
    placeholder="Seleccionar fecha"
  />
</label>

          </div>

          <div className="patient-coverage-actions">

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (patientCoverage) {
                  setCoverageForm({
                    coveragePlanId:
                      String(
                        patientCoverage.coveragePlanId
                      ),

                    providerName:
                      patientCoverage.providerName ||
                      '',

                    membershipNumber:
                      patientCoverage.membershipNumber ||
                      '',

                    effectiveFrom:
                      patientCoverage.effectiveFrom ||
                      '',

                    effectiveTo:
                      patientCoverage.effectiveTo ||
                      '',
                  });
                } else {
                  setCoverageForm({
                    coveragePlanId: '',
                    providerName: '',
                    membershipNumber: '',
                    effectiveFrom: '',
                    effectiveTo: '',
                  });
                }
              }}
              disabled={savingCoverage}
            >
              Restablecer
            </button>

            <button
              type="button"
              className="btn btn-primary"
              disabled={
                savingCoverage ||
                !coverageForm.coveragePlanId
              }
              onClick={async () => {

                try {
                  setSavingCoverage(
                    true
                  );

                  const response =
  await api.put(
    `/patients/${selectedPatient.patient.id}/coverage`,
    {
      coveragePlanId:
        Number(
          coverageForm.coveragePlanId
        ),

      providerId:
        coverageForm.providerId
          ? Number(
              coverageForm.providerId
            )
          : null,

      providerName:
        coverageForm.providerName,

      membershipNumber:
        coverageForm.membershipNumber,

      effectiveFrom:
        coverageForm.effectiveFrom,

      effectiveTo:
        coverageForm.effectiveTo,
    }
  );

                  setPatientCoverage(
                    response.data
                  );

                  notify(
                    'Cobertura del paciente actualizada correctamente.'
                  );

                } catch (error) {
                  notify(
                    error.response?.data?.message ||
                      'No fue posible actualizar la cobertura.',
                    'error'
                  );
                } finally {
                  setSavingCoverage(
                    false
                  );
                }

              }}
            >
              {savingCoverage
                ? 'Guardando...'
                : 'Guardar cobertura'}
            </button>

          </div>

        </div>
      )}

    </>
  )}

</section>

          {/* CITAS */}

          <section className="card">
            <div className="patient-section-head">
              <div>
                <h3>Citas del paciente</h3>

                <p>
                  Historial de citas registradas en la IPS.
                </p>
              </div>

              <span className="patient-count-badge">
                {selectedPatient.appointments?.length || 0}
              </span>
            </div>

            {selectedPatient.appointments?.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Servicio</th>
                      <th>Profesional</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedPatient.appointments.map(
                      (appointment) => (
                        <tr key={appointment.id}>
                          <td>
                            {appointment.date}
                          </td>

                          <td>
                            <strong>
                              {appointment.time}
                            </strong>
                          </td>

                          <td>
                            {appointment.service}
                          </td>

                          <td>
                            {appointment.professional}
                          </td>

                          <td>
                            <span
                              className={`pill-status ${String(
                                appointment.status || ''
                              ).toLowerCase()}`}
                            >
                              {appointment.status}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty text="Este paciente no tiene citas registradas." />
            )}
          </section>

          {/* HISTORIA */}

          <section className="card">
            <div className="patient-section-head">
              <div>
                <h3>Historia clínica</h3>

                <p>
                  Atenciones registradas por los profesionales.
                </p>
              </div>

              <span className="patient-count-badge">
                {selectedPatient.history?.length || 0}
              </span>
            </div>

            {selectedPatient.history?.length > 0 ? (
              <div className="patient-history-list">
                {selectedPatient.history.map(
                  (record) => (
                    <article
                      className="patient-history-card"
                      key={record.id}
                    >
                      <div className="patient-history-top">
                        <div>
                          <span className="patient-history-date">
                            {record.createdAt}
                          </span>

                          <h4>
                            {record.professional}
                          </h4>
                        </div>

                        <span className="patient-history-badge">
                          Atención
                        </span>
                      </div>

                      <div className="patient-history-grid">
                        <div>
                          <span>Motivo de consulta</span>
                          <p>{record.reason}</p>
                        </div>

                        <div>
                          <span>Diagnóstico</span>
                          <p>{record.diagnosis}</p>
                        </div>

                        <div>
                          <span>Tratamiento</span>
                          <p>{record.treatment}</p>
                        </div>

                        <div>
                          <span>Observaciones</span>
                          <p>
                            {record.observations ||
                              'Sin observaciones'}
                          </p>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            ) : (
              <Empty text="Este paciente todavía no tiene registros de atención." />
            )}
          </section>
        </div>
      )}
    </>
  );
}

/* =========================================================
   CITAS
========================================================= */

function AppointmentPage() {
  const [patients, setPatients] = useState([]);
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    patientId: '',
    date: '',
    time: '',
    service: 'Medicina General',
    professional: 'Dra. Laura Méndez',
    status: 'PROGRAMADA',
    notes: '',
  });

  const user = useAuth();

  const canWrite = user?.role === 'RECEPCION';

  const load = async () => {
    try {
      const [
        appointmentsResponse,
        patientsResponse,
      ] = await Promise.all([
        api.get('/appointments'),
        api.get('/patients'),
      ]);

      setRows(appointmentsResponse.data);
      setPatients(patientsResponse.data);
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'No fue posible cargar las citas.',
        'error'
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditing(null);

    setForm({
      patientId: '',
      date: '',
      time: '',
      service: 'Medicina General',
      professional: 'Dra. Laura Méndez',
      status: 'PROGRAMADA',
      notes: '',
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    try {
      if (editing) {
        await api.put(
          `/appointments/${editing}`,
          form
        );

        notify('Cita actualizada correctamente.');
      } else {
        await api.post('/appointments', form);

        notify(
          'Cita registrada y notificación creada.'
        );
      }

      resetForm();
      await load();
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'No fue posible guardar la cita.',
        'error'
      );
    }
  };

  const edit = (appointment) => {
    setEditing(appointment.id);

    setForm({
      patientId: String(
        appointment.patientId
      ),
      date: appointment.date || '',
      time: appointment.time || '',
      service: appointment.service || 'Medicina General',
      professional:
        appointment.professional ||
        'Dra. Laura Méndez',
      status:
        appointment.status ||
        'PROGRAMADA',
      notes: appointment.notes || '',
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const changeStatus = async (id, status) => {
    try {
      await api.patch(
        `/appointments/${id}/status`,
        { status }
      );

      await load();

      notify(
        status === 'CANCELADA'
          ? 'Cita cancelada correctamente.'
          : 'Estado de la cita actualizado.'
      );
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'No fue posible actualizar la cita.',
        'error'
      );
    }
  };

  return (
    <>
      <PageHeader
        icon={I.CalendarDays}
        title="Gestión de citas"
        subtitle="Agenda, disponibilidad y estados de atención."
      />

      {canWrite && (
        <section className="card form-card">
          <div className="card-head">
            <div>
              <h3>
                {editing
                  ? 'Editar cita'
                  : 'Nueva cita'}
              </h3>

              <p>
                {editing
                  ? 'Modifica los datos de la cita seleccionada.'
                  : 'La creación genera una notificación para el paciente.'}
              </p>
            </div>
          </div>

          <form
            className="form-grid"
            onSubmit={submit}
          >
            <label>
              Paciente *

              <select
                value={form.patientId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    patientId:
                      event.target.value,
                  })
                }
                required
              >
                <option value="">
                  Seleccionar paciente
                </option>

                {patients.map((patient) => (
                  <option
                    key={patient.id}
                    value={patient.id}
                  >
                    {patient.name} · {patient.document}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fecha *

              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Hora *

              <input
                type="time"
                value={form.time}
                onChange={(event) =>
                  setForm({
                    ...form,
                    time: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Servicio *

              <select
                value={form.service}
                onChange={(event) =>
                  setForm({
                    ...form,
                    service: event.target.value,
                  })
                }
              >
                <option>
                  Medicina General
                </option>

                <option>
                  Odontología
                </option>

                <option>
                  Pediatría
                </option>

                <option>
                  Medicina Interna
                </option>

                <option>
                  Laboratorio
                </option>
              </select>
            </label>

            <label>
              Profesional *

              <input
                value={form.professional}
                onChange={(event) =>
                  setForm({
                    ...form,
                    professional:
                      event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Estado *

              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status:
                      event.target.value,
                  })
                }
              >
                <option value="PROGRAMADA">
                  Programada
                </option>

                <option value="CONFIRMADA">
                  Confirmada
                </option>

                <option value="ATENDIDA">
                  Atendida
                </option>

                <option value="CANCELADA">
                  Cancelada
                </option>
              </select>
            </label>

            <label className="span-2">
              Notas

              <textarea
                rows="3"
                maxLength="500"
                placeholder="Ejemplo: llegar 20 minutos antes."
                value={form.notes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    notes: event.target.value,
                  })
                }
              />

              <small>
                {form.notes.length}/500 caracteres
              </small>
            </label>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
              >
                {editing ? (
                  <>
                    <I.RefreshCcw size={17} />
                    Actualizar cita
                  </>
                ) : (
                  <>
                    <I.CalendarDays size={17} />
                    Asignar cita
                  </>
                )}
              </button>

              {editing && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={resetForm}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="table-tools">
          <div>
            <h3>Agenda</h3>
            <p>{rows.length} citas</p>
          </div>
        </div>

        <div className="table-wrap">
          {rows.length ? (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Servicio</th>
                  <th>Profesional</th>
                  <th>Estado</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>

                    <td>{row.time}</td>

                    <td>
                      <b>{row.patient}</b>
                    </td>

                    <td>{row.service}</td>

                    <td>{row.professional}</td>

                    <td>
                      <span
                        className={`pill-status ${row.status.toLowerCase()}`}
                      >
                        {row.status}
                      </span>
                    </td>

                    <td>
                      {row.notes ? (
                        <span
                          title={row.notes}
                          className="appointment-note"
                        >
                          {row.notes}
                        </span>
                      ) : (
                        <span className="muted">
                          Sin notas
                        </span>
                      )}
                    </td>

                    <td>
                      {canWrite && (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Editar cita"
                            onClick={() =>
                              edit(row)
                            }
                          >
                            <I.FileText size={16} />
                          </button>

                          {row.status !==
                            'CANCELADA' && (
                            <button
                              type="button"
                              className="btn btn-mini btn-danger"
                              onClick={() =>
                                changeStatus(
                                  row.id,
                                  'CANCELADA'
                                )
                              }
                            >
                              Cancelar
                            </button>
                          )}

                          {row.status ===
                            'PROGRAMADA' && (
                            <button
                              type="button"
                              className="btn btn-mini btn-ghost"
                              onClick={() =>
                                changeStatus(
                                  row.id,
                                  'CONFIRMADA'
                                )
                              }
                            >
                              Confirmar
                            </button>
                          )}

                          {row.status ===
                            'CONFIRMADA' && (
                            <button
                              type="button"
                              className="btn btn-mini btn-ghost"
                              onClick={() =>
                                changeStatus(
                                  row.id,
                                  'ATENDIDA'
                                )
                              }
                            >
                              Atendida
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="No hay citas registradas." />
          )}
        </div>
      </section>
    </>
  );
}

/* =========================================================
   HISTORIA CLÍNICA
========================================================= */

function HistoryPage() {
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);

  const user = useAuth();

  const canWrite = user?.role === 'MEDICO';

  const [form, setForm] = useState({
    patientId: '',
    reason: '',
    diagnosis: '',
    treatment: '',
    observations: '',
    professional: user?.name || '',
  });

  const load = async () => {
    try {
      const [historyResponse, patientsResponse] =
        await Promise.all([
          api.get('/history'),
          api.get('/patients'),
        ]);

      setRows(historyResponse.data);
      setPatients(patientsResponse.data);
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'No fue posible cargar la historia clínica.',
        'error'
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (event) => {
    event.preventDefault();

    try {
      await api.post('/history', form);

      setForm((current) => ({
        ...current,
        patientId: '',
        reason: '',
        diagnosis: '',
        treatment: '',
        observations: '',
      }));

      await load();

      notify(
        'Registro de historia clínica guardado.'
      );
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'No fue posible guardar la historia.',
        'error'
      );
    }
  };

  return (
    <>
      <PageHeader
        icon={I.ClipboardList}
        title="Historia clínica"
        subtitle="Registro estructurado de la atención profesional."
      />

      {canWrite && (
        <section className="card form-card">
          <div className="card-head">
            <div>
              <h3>Nuevo registro clínico</h3>
              <p>
                Registra diagnóstico, tratamiento y observaciones.
              </p>
            </div>
          </div>

          <form
            className="form-grid"
            onSubmit={add}
          >
            <label>
              Paciente *

              <select
                value={form.patientId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    patientId: event.target.value,
                  })
                }
                required
              >
                <option value="">
                  Seleccionar paciente
                </option>

                {patients.map((patient) => (
                  <option
                    key={patient.id}
                    value={patient.id}
                  >
                    {patient.name} · {patient.document}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Motivo de consulta *

              <input
                value={form.reason}
                onChange={(event) =>
                  setForm({
                    ...form,
                    reason: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Diagnóstico *

              <input
                value={form.diagnosis}
                onChange={(event) =>
                  setForm({
                    ...form,
                    diagnosis: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Tratamiento *

              <input
                value={form.treatment}
                onChange={(event) =>
                  setForm({
                    ...form,
                    treatment: event.target.value,
                  })
                }
                required
              />
            </label>

            <label className="span-2">
              Observaciones

              <textarea
                rows="4"
                value={form.observations}
                onChange={(event) =>
                  setForm({
                    ...form,
                    observations: event.target.value,
                  })
                }
              />
            </label>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
              >
                <I.ClipboardCheck size={17} />
                Guardar registro
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="table-tools">
          <div>
            <h3>Registros clínicos</h3>
            <p>
              Información registrada por los profesionales.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          {rows.length ? (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Motivo</th>
                  <th>Diagnóstico</th>
                  <th>Tratamiento</th>
                  <th>Profesional</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.createdAt}</td>

                    <td>
                      <b>{row.patient}</b>
                    </td>

                    <td>{row.reason}</td>
                    <td>{row.diagnosis}</td>
                    <td>{row.treatment}</td>
                    <td>{row.professional}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="No existen registros clínicos." />
          )}
        </div>
      </section>
    </>
  );
}

/* =========================================================
   FACTURACIÓN
========================================================= */

function BillingPage() {
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);

  const user = useAuth();

  const canWrite = user?.role === 'RECEPCION';

  const [form, setForm] = useState({
    patientId: '',
    service: 'Medicina General',
    amountCop: '',
    status: 'PENDIENTE',
  });

  const load = async () => {
    try {
      const [invoicesResponse, patientsResponse] =
        await Promise.all([
          api.get('/invoices'),
          api.get('/patients'),
        ]);

      setRows(invoicesResponse.data);
      setPatients(patientsResponse.data);
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'No fue posible cargar las facturas.',
        'error'
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (event) => {
    event.preventDefault();

    try {
      await api.post('/invoices', form);

      setForm((current) => ({
        ...current,
        patientId: '',
        amountCop: '',
      }));

      await load();

      notify('Factura generada correctamente.');
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'No fue posible generar la factura.',
        'error'
      );
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(
        `/invoices/${id}/status`,
        { status }
      );

      await load();

      notify(
        'Estado de factura actualizado.'
      );
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'No fue posible actualizar la factura.',
        'error'
      );
    }
  };

  const money = (value) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value || 0);

  return (
    <>
      <PageHeader
        icon={I.CreditCard}
        title="Facturación"
        subtitle="Generación y seguimiento de cuentas por servicios."
      />

      {canWrite && (
        <section className="card form-card">
          <div className="card-head">
            <div>
              <h3>Nueva factura</h3>
              <p>
                Registra el servicio prestado y su valor.
              </p>
            </div>
          </div>

          <form
            className="form-grid"
            onSubmit={add}
          >
            <label>
              Paciente *

              <select
                value={form.patientId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    patientId: event.target.value,
                  })
                }
                required
              >
                <option value="">
                  Seleccionar paciente
                </option>

                {patients.map((patient) => (
                  <option
                    key={patient.id}
                    value={patient.id}
                  >
                    {patient.name} · {patient.document}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Servicio *

              <select
                value={form.service}
                onChange={(event) =>
                  setForm({
                    ...form,
                    service: event.target.value,
                  })
                }
              >
                <option>Medicina General</option>
                <option>Odontología</option>
                <option>Pediatría</option>
                <option>Medicina Interna</option>
                <option>Laboratorio</option>
              </select>
            </label>

            <label>
              Valor (COP) *

              <input
                type="number"
                min="1"
                value={form.amountCop}
                onChange={(event) =>
                  setForm({
                    ...form,
                    amountCop: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Estado

              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value,
                  })
                }
              >
                <option>PENDIENTE</option>
                <option>PAGADA</option>
              </select>
            </label>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
              >
                <I.CreditCard size={17} />
                Generar factura
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="table-tools">
          <div>
            <h3>Facturas</h3>
            <p>{rows.length} registros</p>
          </div>
        </div>

        <div className="table-wrap">
          {rows.length ? (
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Servicio</th>
                  <th>Valor</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      FV-{String(row.id).padStart(5, '0')}
                    </td>

                    <td>{row.issuedAt}</td>

                    <td>
                      <b>{row.patient}</b>
                    </td>

                    <td>{row.service}</td>

                    <td>
                      {money(row.amountCop)}
                    </td>

                    <td>
                      <span
                        className={`pill-status ${row.status.toLowerCase()}`}
                      >
                        {row.status}
                      </span>
                    </td>

                    <td>
                      {canWrite &&
                        row.status === 'PENDIENTE' && (
                          <button
                            type="button"
                            className="btn btn-mini btn-ghost"
                            onClick={() =>
                              updateStatus(
                                row.id,
                                'PAGADA'
                              )
                            }
                          >
                            Marcar pagada
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="No existen facturas registradas." />
          )}
        </div>
      </section>
    </>
  );
}

/* =========================================================
   REPORTES
========================================================= */

function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadReports = async () => {
      try {
        const response = await api.get('/dashboard');

        if (active) {
          setData(response.data);
        }
      } catch (error) {
        notify(
          error.response?.data?.message ||
            'No fue posible cargar los reportes.',
          'error'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      active = false;
    };
  }, []);

  const money = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(data?.pendingInvoices || 0);

  return (
    <>
      <PageHeader
        icon={I.BarChart3}
        title="Reportes"
        subtitle="Indicadores operativos para seguimiento de la IPS."
        action={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => window.print()}
          >
            <I.Download size={16} />
            Imprimir / PDF
          </button>
        }
      />

      <div className="stats-grid">
        <StatCard
          icon={I.Users}
          label="Pacientes"
          value={
            loading
              ? '...'
              : data?.patients || 0
          }
          meta="Indicador actual"
        />

        <StatCard
          icon={I.CalendarDays}
          label="Citas activas"
          value={
            loading
              ? '...'
              : data?.appointments || 0
          }
          meta="Indicador actual"
        />

        <StatCard
          icon={I.Clock3}
          label="Citas de hoy"
          value={
            loading
              ? '...'
              : data?.todayAppointments || 0
          }
          meta="Indicador actual"
        />

        <StatCard
          icon={I.CreditCard}
          label="Pendiente cartera"
          value={
            loading
              ? '...'
              : money
          }
          meta="Indicador actual"
        />
      </div>

      <section className="card report-card">
        <div className="card-head">
          <div>
            <h3>Lectura ejecutiva</h3>
            <p>
              Indicadores generados directamente desde la base de datos.
            </p>
          </div>
        </div>

        <div className="report-grid">
          <div>
            <span>Base de pacientes</span>
            <strong>
              {loading ? '...' : data?.patients || 0}
            </strong>
            <small>Registros activos</small>
          </div>

          <div>
            <span>Agenda</span>
            <strong>
              {loading ? '...' : data?.appointments || 0}
            </strong>
            <small>Citas no canceladas</small>
          </div>

          <div>
            <span>Actividad diaria</span>
            <strong>
              {loading
                ? '...'
                : data?.todayAppointments || 0}
            </strong>
            <small>Citas del día</small>
          </div>

          <div>
            <span>Cartera</span>
            <strong>
              {loading ? '...' : money}
            </strong>
            <small>Facturas pendientes</small>
          </div>
        </div>
      </section>
    </>
  );
}


/* =========================================================
   ROUTER PRINCIPAL
========================================================= */

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
  path="/portal-paciente"
  element={<PatientLoginPage />}
/>

<Route
  path="/portal-paciente/inicio"
  element={<PatientPortalPage />}
/>

      <Route
  path="/registro-paciente"
  element={<PatientRegisterPage />}
/>

      <Route
  path="/cambiar-contrasena"
  element={
    <RequireAuth>
      <ChangePasswordPage />
    </RequireAuth>
  }
/>

<Route
  path="/recuperar-contrasena"
  element={
    <PatientForgotPasswordPage />
  }
/>

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout>
              <Dashboard />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/pacientes"
        element={
          <RequireAuth>
            <Layout>
              <PatientPage />
            </Layout>
          </RequireAuth>
        }
      />


      <Route
        path="/citas"
        element={
          <RequireAuth>
            <Layout>
              <AppointmentPageNew />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/historia"
        element={
          <RequireAuth>
            <Layout>
              <HistoryPage />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
  path="/atencion"
  element={
    <RequireAuth>
      <Layout>
        <AttentionPage />
      </Layout>
    </RequireAuth>
  }
/>

      <Route
        path="/facturacion"
        element={
          <RequireAuth>
            <Layout>
              <BillingPageNew />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
  path="/tarifas"
  element={
    <RequireAuth>
      <Layout>
        <TariffsPage />
      </Layout>
    </RequireAuth>
  }
/>

      <Route
        path="/reportes"
        element={
          <RequireAuth>
            <Layout>
              <ReportsPage />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
  path="/administracion"
  element={
    <RequireAuth>
      <Layout>
        <AdminPage />
      </Layout>
    </RequireAuth>
  }
/>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

/* =========================================================
   ARRANQUE DE REACT
========================================================= */

createRoot(
  document.getElementById('root')
).render(
  <BrowserRouter basename="/IPS-Salud-Vital-">
  <App />
</BrowserRouter>
);