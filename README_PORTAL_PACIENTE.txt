IPS Salud Vital – Portal del Paciente
=====================================

Archivos agregados:
- portal-paciente.html
- portal-paciente-dashboard.html
- assets/patient-portal-hero.jpg

Qué hace:
1. Desde login.html ahora existe el enlace "Ingresar como paciente".
2. portal-paciente.html es una interfaz exclusiva para pacientes.
3. Los pacientes ingresan con número de cédula + contraseña.
4. portal-paciente-dashboard.html muestra:
   - Bienvenida personalizada
   - Mis citas
   - Mis notificaciones
5. El sistema administrativo y el portal del paciente usan sesiones separadas.
6. Cuando desde la interfaz administrativa se programa o cancela una cita,
   el paciente la ve reflejada en su portal.

Claves demo de pacientes:
- 1022334455 -> Paciente123
- 1009988776 -> Paciente123
- 1033445566 -> Paciente123

Conexión con la página administrativa:
- Ambas interfaces comparten localStorage.
- Las citas creadas/canceladas en citas.html generan notificaciones.
- El portal del paciente filtra notificaciones y citas por nombre del paciente.
