import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api';
import * as I from '../icons';

function ChangePasswordPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();

    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (form.newPassword.length < 8) {
      setError(
        'La nueva contraseña debe tener mínimo 8 caracteres.'
      );
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError(
        'La nueva contraseña debe ser diferente a la actual.'
      );
      return;
    }

    try {
      setLoading(true);

      await api.patch('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      const user = JSON.parse(
        localStorage.getItem('ips_sv_user') || 'null'
      );

      if (user) {
        localStorage.setItem(
          'ips_sv_user',
          JSON.stringify({
            ...user,
            mustChangePassword: false,
          })
        );
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible actualizar la contraseña.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-page">
      <section className="password-card">
        <div className="password-icon">
          <I.LockKeyhole size={24} />
        </div>

        <div className="eyebrow">
          Seguridad de la cuenta
        </div>

        <h1>Crear nueva contraseña</h1>

        <p className="password-description">
          Por seguridad, debes cambiar la contraseña
          temporal antes de continuar.
        </p>

        {error && (
          <div className="alert error">
            <I.AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        <form
          className="form-stack"
          onSubmit={submit}
        >
          <label>
            Contraseña actual

            <div className="input-with-action">
              <input
                type={
                  showCurrent
                    ? 'text'
                    : 'password'
                }
                value={form.currentPassword}
                onChange={(event) =>
                  setForm({
                    ...form,
                    currentPassword:
                      event.target.value,
                  })
                }
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="inside-btn"
                onClick={() =>
                  setShowCurrent(
                    (value) => !value
                  )
                }
                aria-label={
                  showCurrent
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                {showCurrent ? (
                  <I.EyeOff size={17} />
                ) : (
                  <I.Eye size={17} />
                )}
              </button>
            </div>
          </label>

          <label>
            Nueva contraseña

            <div className="input-with-action">
              <input
                type={
                  showNew
                    ? 'text'
                    : 'password'
                }
                value={form.newPassword}
                onChange={(event) =>
                  setForm({
                    ...form,
                    newPassword:
                      event.target.value,
                  })
                }
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button
                type="button"
                className="inside-btn"
                onClick={() =>
                  setShowNew(
                    (value) => !value
                  )
                }
                aria-label={
                  showNew
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                {showNew ? (
                  <I.EyeOff size={17} />
                ) : (
                  <I.Eye size={17} />
                )}
              </button>
            </div>

            <small>
              Mínimo 8 caracteres.
            </small>
          </label>

          <label>
            Confirmar nueva contraseña

            <div className="input-with-action">
              <input
                type={
                  showConfirm
                    ? 'text'
                    : 'password'
                }
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm({
                    ...form,
                    confirmPassword:
                      event.target.value,
                  })
                }
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button
                type="button"
                className="inside-btn"
                onClick={() =>
                  setShowConfirm(
                    (value) => !value
                  )
                }
                aria-label={
                  showConfirm
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                {showConfirm ? (
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
              'Actualizando...'
            ) : (
              <>
                <I.ShieldCheck size={17} />
                Actualizar contraseña
              </>
            )}
          </button>
        </form>

        <div className="password-footer">
          <I.ShieldCheck size={16} />
          <span>
            Tu cuenta está protegida mediante
            autenticación segura.
          </span>
        </div>
      </section>
    </div>
  );
}

export default ChangePasswordPage;