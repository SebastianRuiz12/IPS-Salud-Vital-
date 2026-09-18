import axios from 'axios';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    'http://localhost:4000/api',
});

/* =========================================================
   AUTENTICACIÓN SEGÚN EL TIPO DE USUARIO
========================================================= */

api.interceptors.request.use(
  (config) => {
    const url = config.url || '';

    const isPatientRequest =
      url.startsWith('/patient/') ||
      url.startsWith('patient/');

    const isPatientAuth =
      url.startsWith('/auth/patient-') ||
      url.startsWith('auth/patient-');

    /*
      Rutas del paciente:
      utilizan ips_sv_patient_token
    */

    if (isPatientRequest) {
      const patientToken =
        localStorage.getItem(
          'ips_sv_patient_token'
        );

      if (patientToken) {
        config.headers.Authorization =
          `Bearer ${patientToken}`;
      }

      return config;
    }

    /*
      Login, registro y recuperación
      del paciente son públicos.
      No debemos enviar automáticamente
      el token interno.
    */

    if (isPatientAuth) {
      const patientToken =
        localStorage.getItem(
          'ips_sv_patient_token'
        );

      /*
        Solo añadimos token si realmente existe.
        Para login/registro normalmente
        no existirá.
      */

      if (patientToken) {
        config.headers.Authorization =
          `Bearer ${patientToken}`;
      }

      return config;
    }

    /*
      Resto del sistema:
      usuarios internos utilizan
      ips_sv_token
    */

    const internalToken =
      localStorage.getItem(
        'ips_sv_token'
      );

    if (internalToken) {
      config.headers.Authorization =
        `Bearer ${internalToken}`;
    }

    return config;
  },
  (error) =>
    Promise.reject(error)
);


/* =========================================================
   MANEJO DE SESIONES EXPIRADAS
========================================================= */

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status =
      error.response?.status;

    const url =
      error.config?.url || '';

    const isPatientRequest =
      url.startsWith('/patient/') ||
      url.startsWith('patient/');

    const isPatientAuth =
      url.startsWith('/auth/patient-') ||
      url.startsWith('auth/patient-');

    /*
      Un 401 en login/registro/recuperación
      NO debe redirigir automáticamente.

      La propia pantalla debe mostrar
      el mensaje correspondiente.
    */

    if (
      status === 401 &&
      !isPatientAuth
    ) {
      if (isPatientRequest) {
        /*
          Sesión del paciente inválida
        */

        localStorage.removeItem(
          'ips_sv_patient_token'
        );

        localStorage.removeItem(
          'ips_sv_patient_user'
        );

        window.location.href =
  `${import.meta.env.BASE_URL}portal-paciente`;
      } else {
        /*
          Sesión interna inválida
        */

        localStorage.removeItem(
          'ips_sv_token'
        );

        localStorage.removeItem(
          'ips_sv_user'
        );

        window.location.href =
  `${import.meta.env.BASE_URL}login`;
      }
    }

    return Promise.reject(error);
  }
);

export default api;