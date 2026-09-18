# Documento técnico — IPS Salud Vital 2.0

## 1. Descripción
IPS Salud Vital es un sistema de información orientado a la gestión de pacientes, citas, historia clínica, facturación y reportes. La versión 2.0 separa presentación, servicios y persistencia.

## 2. Arquitectura
### Capa de presentación
Aplicación React/Vite con componentes reutilizables, navegación por módulos y control de sesión.

### Capa de servicios
API REST en Node.js + Express. Aquí se validan datos, se autentican usuarios y se ejecutan operaciones sobre la base de datos.

### Capa de persistencia
SQLite con relaciones entre pacientes, citas, historias, facturas y notificaciones.

### Capa móvil
Aplicación Android nativa en Java para consultar información del paciente por medio de la API.

## 3. Seguridad implementada
- Hash de contraseñas con bcrypt.
- Tokens JWT para sesiones de la API.
- Autorización por rol en operaciones sensibles.
- Validación de entradas con Zod.
- Separación entre usuario administrativo y paciente.
- Recomendación de variables de entorno para secreto JWT y configuración de producción.

## 4. Modelo de datos
### users
Usuarios internos de la IPS y su rol.

### patients
Datos básicos del paciente y credencial móvil.

### appointments
Agenda y estado de las citas.

### clinical_records
Registro de atención profesional.

### invoices
Facturación de servicios.

### notifications
Mensajes asociados a eventos de atención.

## 5. Reglas funcionales principales
- Recepción y Administración pueden crear/editar/eliminar pacientes.
- Recepción y Administración pueden registrar citas.
- Médico y Administración pueden registrar historia clínica.
- Facturación y Administración pueden generar y actualizar facturas.
- Los cambios de estado de citas generan notificaciones cuando corresponde.
- El paciente solo consulta sus propias citas y notificaciones en la app móvil.

## 6. Endpoints principales
- `POST /api/auth/login`
- `POST /api/auth/patient-login`
- `GET /api/dashboard`
- `GET/POST/PUT/DELETE /api/patients`
- `GET/POST /api/appointments`
- `PATCH /api/appointments/:id/status`
- `GET/POST /api/history`
- `GET/POST /api/invoices`
- `PATCH /api/invoices/:id/status`
- `GET /api/patient/appointments`
- `GET /api/patient/notifications`

## 7. Puesta en marcha
Consultar `README.md`.
