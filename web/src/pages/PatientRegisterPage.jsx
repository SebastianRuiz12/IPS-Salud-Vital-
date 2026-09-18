import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api';
import * as I from '../icons';

const INITIAL_FORM = {
  document: '',
  name: '',
  phone: '',
  email: '',
  birthDate: '',
  bloodType: '',
  password: '',
  confirmPassword: '',
};

const BLOOD_TYPES = [
  'O+',
  'O-',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
];

function todayISO() {
  const today = new Date();

  const year =
    today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    today.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function PatientRegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] =
    useState(INITIAL_FORM);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const handleChange = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (
    event
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        'Las contraseñas no coinciden.'
      );

      return;
    }

    if (
      form.password.length < 8
    ) {
      setError(
        'La contraseña debe tener mínimo 8 caracteres.'
      );

      return;
    }

    try {
      setSaving(true);

      const response =
        await api.post(
          '/auth/patient-register',
          {
            document:
              form.document.trim(),

            name:
              form.name.trim(),

            phone:
              form.phone.trim(),

            email:
              form.email.trim(),

            birthDate:
              form.birthDate,

            bloodType:
              form.bloodType,

            password:
              form.password,

            confirmPassword:
              form.confirmPassword,
          }
        );

      setSuccess(
        response.data?.message ||
          'Cuenta creada correctamente.'
      );

      setForm({
        ...INITIAL_FORM,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No fue posible crear la cuenta.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="patient-auth-page">
      <div className="patient-auth-brand">
        <div className="patient-auth-brand-content">
          <div className="patient-auth-logo">
            <I.HeartPulse
              size={30}
            />
          </div>

          <span className="patient-auth-eyebrow">
            PORTAL DEL PACIENTE
          </span>

          <h1>
            Crea tu acceso a
            IPS Salud Vital
          </h1>

          <p>
            Registra tus datos para
            consultar tus citas y
            recibir información sobre
            tu atención.
          </p>

          <div className="patient-auth-security">
            <I.ShieldCheck
              size={18}
            />

            <span>
              Tu cuenta utiliza
              autenticación segura.
            </span>
          </div>
        </div>
      </div>

      <div className="patient-auth-content">
        <div className="patient-register-card">
          <div className="patient-auth-header">
            <span className="patient-register-label">
              IPS SALUD VITAL
            </span>

            <h2>
              Crear cuenta
            </h2>

            <p>
              Completa tus datos para
              acceder al portal del
              paciente.
            </p>
          </div>

          {error && (
            <div className="patient-form-alert error">
              <I.AlertCircle
                size={18}
              />

              <span>
                {error}
              </span>
            </div>
          )}

          {success && (
            <div className="patient-form-alert success">
              <I.CheckCircle2
                size={18}
              />

              <span>
                {success}
              </span>
            </div>
          )}

          <form
            className="patient-register-form"
            onSubmit={submit}
          >
            <div className="patient-register-grid">
              <label>
                Documento *

                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    form.document
                  }
                  onChange={(
                    event
                  ) =>
                    handleChange(
                      'document',
                      event.target.value
                    )
                  }
                  placeholder="Ingresa tu documento"
                  maxLength={20}
                  autoComplete="username"
                  required
                />
              </label>

              <label>
                Nombre completo *

                <input
                  type="text"
                  value={
                    form.name
                  }
                  onChange={(
                    event
                  ) =>
                    handleChange(
                      'name',
                      event.target.value
                    )
                  }
                  placeholder="Ingresa tu nombre completo"
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                Teléfono

                <input
                  type="tel"
                  value={
                    form.phone
                  }
                  onChange={(
                    event
                  ) =>
                    handleChange(
                      'phone',
                      event.target.value
                    )
                  }
                  placeholder="Ingresa tu teléfono"
                  maxLength={30}
                  autoComplete="tel"
                />
              </label>

              <label>
                Correo electrónico *

                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(
                    event
                  ) =>
                    handleChange(
                      'email',
                      event.target.value
                    )
                  }
                  placeholder="Ingresa tu correo electrónico"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Fecha de nacimiento

                <input
                  type="date"
                  value={
                    form.birthDate
                  }
                  max={todayISO()}
                  onChange={(
                    event
                  ) =>
                    handleChange(
                      'birthDate',
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Grupo sanguíneo

                <select
                  value={
                    form.bloodType
                  }
                  onChange={(
                    event
                  ) =>
                    handleChange(
                      'bloodType',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Seleccionar
                  </option>

                  {BLOOD_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Contraseña *

                <div className="patient-password-field">
                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={
                      form.password
                    }
                    onChange={(
                      event
                    ) =>
                      handleChange(
                        'password',
                        event.target.value
                      )
                    }
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="patient-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    title={
                      showPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                  >
                    {showPassword ? (
                      <I.EyeOff
                        size={18}
                      />
                    ) : (
                      <I.Eye
                        size={18}
                      />
                    )}
                  </button>
                </div>

                <small>
                  Debe tener al menos
                  8 caracteres.
                </small>
              </label>

              <label>
                Confirmar contraseña *

                <div className="patient-password-field">
                  <input
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    value={
                      form.confirmPassword
                    }
                    onChange={(
                      event
                    ) =>
                      handleChange(
                        'confirmPassword',
                        event.target.value
                      )
                    }
                    placeholder="Repite tu contraseña"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="patient-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) =>
                          !current
                      )
                    }
                    title={
                      showConfirmPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                  >
                    {showConfirmPassword ? (
                      <I.EyeOff
                        size={18}
                      />
                    ) : (
                      <I.Eye
                        size={18}
                      />
                    )}
                  </button>
                </div>
              </label>
            </div>

            <div className="patient-register-note">
              <I.LockKeyhole
                size={17}
              />

              <span>
                La contraseña se almacena
                de forma segura y no se
                muestra al personal de la
                IPS.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary patient-register-submit"
              disabled={saving}
            >
              {saving ? (
                'Creando cuenta...'
              ) : (
                <>
                  <I.Users
                    size={17}
                  />

                  Crear cuenta
                </>
              )}
            </button>
          </form>

          <div className="patient-auth-divider">
            <span>
              ¿Ya tienes una cuenta?
            </span>
          </div>

          <button
            type="button"
            className="btn btn-ghost patient-register-login"
            onClick={() =>
              navigate(
                '/portal-paciente'
              )
            }
          >
            Volver al acceso del paciente
            <I.ChevronRight
              size={17}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PatientRegisterPage;