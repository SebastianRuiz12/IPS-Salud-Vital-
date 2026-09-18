import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  base: '/IPS-Salud-Vital-/',

  server: {
    port: 5173,
  },
});
