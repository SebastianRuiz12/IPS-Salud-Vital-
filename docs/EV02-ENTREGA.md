# GA8-220501096-AA1-EV02 — Módulos integrados

## 1. Objetivo
Presentar una versión integrada de IPS Salud Vital que reúna los módulos principales del sistema y evidencie un ambiente funcional de desarrollo y pruebas.

## 2. Módulos implementados
1. Autenticación y control por roles.
2. Dashboard con indicadores.
3. Gestión de pacientes.
4. Gestión de citas.
5. Historia clínica.
6. Facturación.
7. Reportes.
8. API REST y persistencia SQLite.
9. Aplicación Android del paciente.

## 3. Integración
La interfaz web consume la API REST. La API centraliza la lógica de negocio y persiste la información en SQLite. La aplicación Android consume endpoints de autenticación, citas y notificaciones del paciente.

## 4. Tecnologías
- Frontend: React, Vite, JavaScript/JSX, CSS.
- Backend: Node.js, Express, Zod, JWT, bcrypt.
- Base de datos: SQLite mediante better-sqlite3.
- Móvil: Android Studio, Java, Android SDK.
- Control de versiones: Git/GitHub.

## 5. Flujo funcional principal
`Usuario -> Login -> Rol -> Módulo -> API REST -> Base de datos -> Respuesta -> Interfaz`

Para el paciente:
`Paciente -> App Android -> Login de paciente -> API -> Citas/Notificaciones -> SQLite`

## 6. Credenciales de prueba
Ver `README.md`.

## 7. Evidencias sugeridas para capturar
- Login exitoso como Recepción.
- Dashboard con indicadores.
- Alta, edición y búsqueda de paciente.
- Creación y cambio de estado de una cita.
- Registro de historia clínica con usuario médico.
- Generación y actualización de factura con usuario de Facturación.
- Reporte e impresión/PDF.
- Prueba de login y consulta de citas desde Android.
- Repositorio Git con commits.
- Resultado de las pruebas automáticas.

## 8. Entrega documental
La carpeta `docs/` contiene el documento técnico, la matriz de pruebas y el acta de aceptación. Deben completarse con nombres, fechas, capturas y resultados reales de ejecución antes de entregar al instructor.
