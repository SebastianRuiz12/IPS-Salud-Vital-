# Pruebas manuales rápidas de API

Con la API en `http://localhost:4000`:

## Salud
```http
GET /api/health
```

## Login
```http
POST /api/auth/login
Content-Type: application/json

{"username":"recepcion","password":"Recepcion123"}
```

Usa el token retornado como `Authorization: Bearer TOKEN`.

## Pacientes
```http
GET /api/patients
```

## Paciente móvil
```http
POST /api/auth/patient-login
Content-Type: application/json

{"document":"1022334455","password":"Paciente123"}
```

Después:
```http
GET /api/patient/appointments
GET /api/patient/notifications
```
