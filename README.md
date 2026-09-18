# IPS Salud Vital 2.0

Sistema integral de gestión para una IPS, construido como proyecto académico y preparado como pieza de portafolio.

## Arquitectura
- `web/`: interfaz React + Vite.
- `server/`: API REST con Node.js + Express + SQLite.
- `android/`: aplicación Android nativa en Java para pacientes.
- `docs/`: documentación para la evidencia GA8-220501096-AA1-EV02.
- `tests/`: material de pruebas y aceptación.

## Requisitos
- Node.js 20 o superior.
- npm.
- Android Studio para la aplicación móvil.
- Java 17 o superior para Android Studio.

## Instalación web + API
```bash
npm install
npm run install:all
npm run dev
```
La web queda en `http://localhost:5173` y la API en `http://localhost:4000`.

También puedes ejecutar por separado:
```bash
npm --prefix server run dev
npm --prefix web run dev
```

## Usuarios administrativos de prueba
- recepcion / Recepcion123
- medico / Medico123
- admin / Admin123
- facturacion / Facturacion123

## Pacientes de prueba
- Documento: `1022334455`
- Contraseña: `Paciente123`

También están precargados los documentos `1009988776`, `1033445566` y `52024660` con la misma contraseña.

## Android
1. Abre la carpeta `android/` con Android Studio.
2. Ejecuta la app en un emulador.
3. El emulador usa `10.0.2.2` para acceder al servidor de tu PC en `localhost:4000`.
4. En un celular físico, cambia `ApiClient.BASE_URL` por `http://IP_DE_TU_PC:4000/api` y permite el puerto en el firewall.
5. Usa un paciente de prueba: documento `1022334455`, contraseña `Paciente123`.

## Primera evidencia SENA
La evidencia `GA8-220501096-AA1-EV02` solicita módulos integrados, documento técnico, ambiente de desarrollo y pruebas, control de versiones y acta con pruebas y aceptación. Este proyecto ya incluye una base funcional para esos cinco componentes; revisa `docs/EV02-ENTREGA.md` y `docs/PRUEBAS-Y-ACEPTACION.md`.

> Nota: este sistema es un proyecto académico. No debe usarse para almacenar datos clínicos reales sin controles adicionales de seguridad, privacidad, auditoría y cumplimiento normativo.
