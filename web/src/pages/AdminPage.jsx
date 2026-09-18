import { useEffect, useMemo, useState } from 'react';

import api from '../api';
import * as I from '../icons';

const EMPTY_FORM = {
  name: '',
  username: '',
  role: 'RECEPCION',
  specialty: '',
  password: '',
};

const ROLE_LABELS = {
  RECEPCION: 'Recepción',
  MEDICO: 'Médico',
  ADMIN: 'Administrador',
  ADMINISTRACION: 'Administrador',
};

const SPECIALTIES = [
  'Medicina General',
  'Odontología',
  'Pediatría',
  'Medicina Interna',
  'Laboratorio',
];

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [temporaryPassword, setTemporaryPassword] =
    useState('');

  const [resetPassword, setResetPassword] =
    useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/users');

      setUsers(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible cargar los usuarios.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) =>
      `${user.name} ${user.username} ${
        ROLE_LABELS[user.role] || user.role
      } ${user.specialty || ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [users, search]);

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
    });

    setEditingId(null);
    setTemporaryPassword('');
    setResetPassword(null);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError('');
    setTemporaryPassword('');
    setResetPassword(null);

    try {
      const payload = {
        name: form.name.trim(),
        username: form.username
          .trim()
          .toLowerCase(),
        role: form.role,
        specialty:
          form.role === 'MEDICO'
            ? form.specialty
            : null,
        ...(form.password
          ? { password: form.password }
          : {}),
      };

      if (editingId) {
        await api.put(
          `/users/${editingId}`,
          payload
        );

        notify(
          'Usuario actualizado correctamente.'
        );

        await loadUsers();
        resetForm();
      } else {
        const response = await api.post(
          '/users',
          payload
        );

        setTemporaryPassword(
          response.data.temporaryPassword
        );

        notify(
          'Usuario creado correctamente.'
        );

        await loadUsers();

        setForm({
          ...EMPTY_FORM,
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible guardar el usuario.'
      );
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);

    setForm({
      name: user.name || '',
      username: user.username || '',
      role: user.role || 'RECEPCION',
      specialty: user.specialty || '',
      password: '',
    });

    setTemporaryPassword('');
    setResetPassword(null);
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const toggleStatus = async (user) => {
    const nextActive =
      !Boolean(user.active);

    const action = nextActive
      ? 'activar'
      : 'desactivar';

    const confirmed = window.confirm(
      `¿Deseas ${action} el usuario "${user.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.patch(
        `/users/${user.id}/status`,
        {
          active: nextActive,
        }
      );

      await loadUsers();

      notify(
        nextActive
          ? 'Usuario activado correctamente.'
          : 'Usuario desactivado correctamente.'
      );
    } catch (err) {
      notify(
        err.response?.data?.message ||
          'No fue posible actualizar el estado.',
        'error'
      );
    }
  };

  const regeneratePassword = async (user) => {
    const confirmed = window.confirm(
      `¿Deseas generar una nueva contraseña temporal para "${user.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      const response = await api.post(
        `/users/${user.id}/reset-password`
      );

      setResetPassword({
        user: response.data.user,
        password:
          response.data.temporaryPassword,
      });

      notify(
        'Contraseña temporal regenerada correctamente.'
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible regenerar la contraseña.'
      );
    }
  };

  return (
    <>
      <PageHeader
        icon={I.ShieldCheck}
        title="Administración"
        subtitle="Gestión de usuarios, roles y acceso al sistema."
      />

      <section className="card form-card">
        <div className="card-head">
          <div>
            <h3>
              {editingId
                ? 'Editar usuario'
                : 'Crear usuario'}
            </h3>

            <p>
              Crea cuentas para médicos y personal
              administrativo de IPS Salud Vital.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={resetForm}
            >
              <I.X size={16} />
              Cancelar edición
            </button>
          )}
        </div>

        {error && (
          <div className="alert error">
            <I.AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        <form
          className="form-grid"
          onSubmit={submit}
        >
          <label>
            Nombre completo *

            <input
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value,
                })
              }
              placeholder="Ej. Dra. Laura Méndez"
              required
              autoComplete="name"
            />
          </label>

          <label>
            Nombre de usuario *

            <input
              value={form.username}
              onChange={(event) =>
                setForm({
                  ...form,
                  username:
                    event.target.value
                      .toLowerCase()
                      .replace(/\s/g, ''),
                })
              }
              placeholder="Ej. laura.mendez"
              required
              autoComplete="username"
            />
          </label>

          <label>
            Rol *

            <select
              value={form.role}
              onChange={(event) => {
                const nextRole =
                  event.target.value;

                setForm({
                  ...form,
                  role: nextRole,
                  specialty:
                    nextRole === 'MEDICO'
                      ? form.specialty
                      : '',
                });
              }}
              required
            >
              <option value="RECEPCION">
                Recepción
              </option>

              <option value="MEDICO">
                Médico
              </option>

              <option value="ADMINISTRACION">
                Administrador
              </option>
            </select>
          </label>

          {form.role === 'MEDICO' && (
            <label>
              Especialidad *

              <select
                value={form.specialty}
                onChange={(event) =>
                  setForm({
                    ...form,
                    specialty:
                      event.target.value,
                  })
                }
                required
              >
                <option value="">
                  Seleccionar especialidad
                </option>

                {SPECIALTIES.map(
                  (specialty) => (
                    <option
                      key={specialty}
                      value={specialty}
                    >
                      {specialty}
                    </option>
                  )
                )}
              </select>
            </label>
          )}

          <label>
            Contraseña

            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({
                  ...form,
                  password:
                    event.target.value,
                })
              }
              placeholder={
                editingId
                  ? 'Dejar vacío para conservarla'
                  : 'Opcional'
              }
              minLength={8}
              autoComplete="new-password"
            />

            <small>
              {editingId
                ? 'Solo diligénciala si deseas cambiarla.'
                : 'Si la dejas vacía, el sistema generará una contraseña temporal.'}
            </small>
          </label>

          <div className="form-actions span-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? (
                'Guardando...'
              ) : (
                <>
                  {editingId ? (
                    <I.CheckCircle2
                      size={17}
                    />
                  ) : (
                    <I.Plus size={17} />
                  )}

                  {editingId
                    ? 'Actualizar usuario'
                    : 'Crear usuario'}
                </>
              )}
            </button>
          </div>
        </form>

        {(temporaryPassword ||
          resetPassword) && (
          <div className="temporary-password">
            <div className="temporary-password-icon">
              <I.LockKeyhole size={18} />
            </div>

            <div>
              <strong>
                {resetPassword
                  ? 'Contraseña temporal regenerada'
                  : 'Usuario creado correctamente'}
              </strong>

              {resetPassword ? (
                <p>
                  Usuario:{' '}
                  <b>
                    {
                      resetPassword.user
                        .username
                    }
                  </b>
                </p>
              ) : (
                <p>
                  Entrega esta contraseña
                  temporal al usuario.
                </p>
              )}

              <code>
                {resetPassword
                  ? resetPassword.password
                  : temporaryPassword}
              </code>

              <small>
                En la próxima sesión deberá
                cambiarla.
              </small>
            </div>

            <button
              type="button"
              className="icon-btn"
              title="Cerrar"
              onClick={() => {
                setTemporaryPassword('');
                setResetPassword(null);
              }}
            >
              <I.X size={16} />
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <div className="table-tools">
          <div>
            <h3>
              Usuarios del sistema
            </h3>

            <p>
              {users.length} usuarios registrados
            </p>
          </div>

          <div className="search">
            <I.Search size={17} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar usuario, nombre, rol o especialidad"
            />
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="empty">
              <I.Activity size={26} />

              <span>
                Cargando usuarios...
              </span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <Empty text="No se encontraron usuarios." />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Especialidad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map(
                  (user) => (
                    <tr key={user.id}>
                      <td>
                        <b>
                          {user.username}
                        </b>
                      </td>

                      <td>
                        {user.name}
                      </td>

                      <td>
                        <span className="tag">
                          {ROLE_LABELS[
                            user.role
                          ] ||
                            user.role}
                        </span>
                      </td>

                      <td>
                        {user.role ===
                        'MEDICO'
                          ? user.specialty ||
                            'Sin especialidad'
                          : '—'}
                      </td>

                      <td>
                        <span
                          className={
                            user.active
                              ? 'status-pill active'
                              : 'status-pill inactive'
                          }
                        >
                          {user.active
                            ? 'Activo'
                            : 'Inactivo'}
                        </span>
                      </td>

                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Editar usuario"
                            onClick={() =>
                              startEdit(
                                user
                              )
                            }
                          >
                            <I.FileText
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            className="icon-btn"
                            title="Regenerar contraseña temporal"
                            onClick={() =>
                              regeneratePassword(
                                user
                              )
                            }
                          >
                            <I.LockKeyhole
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            className={
                              user.active
                                ? 'icon-btn danger'
                                : 'icon-btn'
                            }
                            title={
                              user.active
                                ? 'Desactivar usuario'
                                : 'Activar usuario'
                            }
                            onClick={() =>
                              toggleStatus(
                                user
                              )
                            }
                          >
                            {user.active ? (
                              <I.X
                                size={16}
                              />
                            ) : (
                              <I.CheckCircle2
                                size={16}
                              />
                            )}
                          </button>
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
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
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

export default AdminPage;