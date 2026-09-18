import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api';
import * as I from '../icons';

function PatientForgotPasswordPage() {
  const navigate =
    useNavigate();

  const [step, setStep] =
    useState(1);

  const [form, setForm] =
    useState({
      document: '',
      email: '',
      code: '',
      newPassword: '',
      confirmPassword: '',
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const handleChange = (
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

  const requestCode =
    async (event) => {
      event.preventDefault();

      setError('');
      setSuccess('');

      if (
        !form.document.trim() ||
        !form.email.trim()
      ) {
        setError(
          'Ingresa tu documento y correo electrónico.'
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await api.post(
            '/auth/patient-forgot-password',
            {
              document:
                form.document.trim(),

              email:
                form.email.trim(),
            }
          );

        /*
          Durante desarrollo local el backend
          devuelve debugCode para poder probar
          el sistema sin configurar correo SMTP.
        */

        if (
          response.data?.debugCode
        ) {
          setForm(
            (current) => ({
              ...current,
              code:
                response.data.debugCode,
            })
          );

          setSuccess(
            `Código de desarrollo: ${response.data.debugCode}. Válido durante 10 minutos.`
          );
        } else {
          setSuccess(
            response.data?.message ||
              'Si los datos coinciden con una cuenta, recibirás instrucciones para recuperar tu acceso.'
          );
        }

        setStep(2);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'No fue posible solicitar la recuperación.'
        );
      } finally {
        setLoading(false);
      }
    };

  const resetPassword =
    async (event) => {
      event.preventDefault();

      setError('');
      setSuccess('');

      if (
        form.code.trim().length !==
        6
      ) {
        setError(
          'Ingresa el código de 6 dígitos.'
        );

        return;
      }

      if (
        form.newPassword.length <
        8
      ) {
        setError(
          'La nueva contraseña debe tener mínimo 8 caracteres.'
        );

        return;
      }

      if (
        form.newPassword !==
        form.confirmPassword
      ) {
        setError(
          'Las contraseñas no coinciden.'
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await api.post(
            '/auth/patient-reset-password',
            {
              document:
                form.document.trim(),

              code:
                form.code.trim(),

              newPassword:
                form.newPassword,

              confirmPassword:
                form.confirmPassword,
            }
          );

        setSuccess(
          response.data?.message ||
            'Contraseña actualizada correctamente.'
        );

        setTimeout(() => {
          navigate(
            '/portal-paciente',
            {
              replace: true,
            }
          );
        }, 1200);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'No fue posible restablecer la contraseña.'
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="patient-auth-page">
      <div className="patient-auth-brand">
        <div className="patient-auth-brand-content">
          <div className="patient-auth-logo">
            <I.LockKeyhole
              size={30}
            />
          </div>

          <span className="patient-auth-eyebrow">
            PORTAL DEL PACIENTE
          </span>

          <h1>
            Recupera tu acceso
            a IPS Salud Vital
          </h1>

          <p>
            Restablece tu contraseña de
            forma segura para volver a
            consultar tu información.
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
          ¿Olvidaste tu contraseña?
        </h2>

        <p>
          {step === 1
            ? 'Verifica tus datos para recibir un código de recuperación.'
            : 'Ingresa el código y establece una nueva contraseña.'}
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

        {success && (
          <div className="alert success">
            <I.CheckCircle2
              size={17}
            />

            <span>
              {success}
            </span>
          </div>
        )}

        {step === 1 ? (
          <form
            onSubmit={requestCode}
            className="form-stack"
          >
            <label>
              Documento

              <input
                value={form.document}
                onChange={(event) =>
                  handleChange(
                    'document',
                    event.target.value
                  )
                }
                inputMode="numeric"
                autoComplete="username"
                placeholder="Ingresa tu documento"
                required
              />
            </label>

            <label>
              Correo electrónico

              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  handleChange(
                    'email',
                    event.target.value
                  )
                }
                autoComplete="email"
                placeholder="Ingresa tu correo electrónico"
                required
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >

              {loading
                ? 'Verificando...'
                : 'Solicitar código'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={resetPassword}
            className="form-stack"
          >
            <label>
              Código de recuperación

              <input
                value={form.code}
                onChange={(event) =>
                  handleChange(
                    'code',
                    event.target.value.replace(
                      /\D/g,
                      ''
                    ).slice(0, 6)
                  )
                }
                inputMode="numeric"
                maxLength={6}
                placeholder="Código de 6 dígitos"
                autoComplete="one-time-code"
                required
              />
            </label>

            <label>
              Nueva contraseña

              <input
                type="password"
                value={
                  form.newPassword
                }
                onChange={(event) =>
                  handleChange(
                    'newPassword',
                    event.target.value
                  )
                }
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                required
              />
            </label>

            <label>
              Confirmar contraseña

              <input
                type="password"
                value={
                  form.confirmPassword
                }
                onChange={(event) =>
                  handleChange(
                    'confirmPassword',
                    event.target.value
                  )
                }
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                minLength={8}
                required
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              <I.LockKeyhole
                size={17}
              />

              {loading
                ? 'Actualizando...'
                : 'Cambiar contraseña'}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setStep(1);
                setError('');
                setSuccess('');
              }}
            >
              Volver
            </button>
          </form>
        )}

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            navigate(
              '/portal-paciente'
            )
          }
        >

          Volver al acceso del paciente
        </button>

        <div className="login-footer">
          Protegemos tus datos y
          tus credenciales de acceso.
        </div>
      </div>
    </div>
  );
}

export default PatientForgotPasswordPage;