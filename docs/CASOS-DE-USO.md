# Casos de uso principales

## CU01 — Autenticar personal
Actor: usuario interno.  
Flujo: ingresa usuario y contraseña → API valida credenciales → JWT → dashboard según rol.

## CU02 — Registrar paciente
Actor: Recepción / Administración.  
Flujo: diligencia datos obligatorios → API valida → SQLite almacena → interfaz actualiza tabla.

## CU03 — Programar cita
Actor: Recepción / Administración.  
Flujo: selecciona paciente, fecha, hora, servicio y profesional → sistema registra cita → crea notificación.

## CU04 — Registrar atención
Actor: Médico / Administración.  
Flujo: selecciona paciente → registra motivo, diagnóstico, tratamiento y observaciones → persiste historia.

## CU05 — Facturar servicio
Actor: Facturación / Administración.  
Flujo: selecciona paciente y servicio → registra valor → genera factura → permite marcarla como pagada.

## CU06 — Consultar citas desde Android
Actor: Paciente.  
Flujo: documento + contraseña → API autentica → consulta únicamente las citas asociadas al paciente.
