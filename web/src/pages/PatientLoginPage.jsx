import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api';
import * as I from '../icons';

function PatientLoginPage({
  onAuthenticated,
}) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    document: '',
    password: '',
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const login = async (event) => {
    event.preventDefault();

    setError('');

    try {
      setLoading(true);

      const response =
        await api.post(
          '/auth/patient-login',
          form
        );

      const token =
        response.data.token;

      const user =
        response.data.user;

      /*
       * El paciente utiliza una sesión
       * completamente independiente
       * de la sesión interna de la IPS.
       */

      localStorage.removeItem(
        'ips_sv_token'
      );

      localStorage.removeItem(
        'ips_sv_user'
      );

      localStorage.setItem(
        'ips_sv_patient_token',
        token
      );

      localStorage.setItem(
        'ips_sv_patient_user',
        JSON.stringify(user)
      );

      if (
        typeof onAuthenticated ===
        'function'
      ) {
        onAuthenticated(
          user,
          token
        );

        return;
      }

      navigate(
  '/portal-paciente/inicio',
  {
    replace: true,
  }
);
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
            PORTAL DEL PACIENTE
          </span>

          <h1>
            Tu información de atención,
            más cerca.
          </h1>

          <p>
            Consulta tus citas y
            notificaciones desde una
            experiencia sencilla y segura.
          </p>
        </div>
      </div>

      <div className="login-card">
        <div className="mobile-logo">
          <img
            src={`${import.meta.env.BASE_URL}assets/logo-icon.png`}
            alt="IPS Salud Vital"
          />
        </div>

        <div className="eyebrow">
          IPS Salud Vital
        </div>

        <h2>
          Portal del paciente
        </h2>

        <p>
          Ingresa con tu documento y
          contraseña.
        </p>

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
          onSubmit={login}
          className="form-stack"
        >
          <label>
            Documento

            <input
              type="text"
              inputMode="numeric"
              value={form.document}
              onChange={(event) =>
                setForm({
                  ...form,
                  document:
                    event.target.value,
                })
              }
              placeholder="Ingresa tu documento"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Contraseña

            <div className="input-with-action">
              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={
                  form.password
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    password:
                      event.target.value,
                  })
                }
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="inside-btn"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value
                  )
                }
                aria-label={
                  showPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                {showPassword ? (
                  <I.EyeOff
                    size={17}
                  />
                ) : (
                  <I.Eye
                    size={17}
                  />
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
                <I.LockKeyhole
                  size={17}
                />
                Ingresar
              </>
            )}
          </button>

          <button
  type="button"
  className="btn btn-link"
  onClick={() =>
    navigate(
      '/recuperar-contrasena'
    )
  }
>
  ¿Olvidaste tu contraseña?
</button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              navigate('/login')
            }
          >
            Volver al acceso interno
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              navigate(
                '/registro-paciente'
              )
            }
          >
            <I.UserRound
              size={16}
            />
            Crear cuenta de paciente
          </button>
        </form>

        <div className="login-footer">
          Protegemos tus datos y tus
          credenciales de acceso.
        </div>
      </div>
    </div>
  );
}

export default PatientLoginPage;