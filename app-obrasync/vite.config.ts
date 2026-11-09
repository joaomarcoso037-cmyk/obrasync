import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// A porta é fixa de propósito: os dados ficam no navegador, presos ao endereço.
// Mudar a porta faria o app abrir vazio.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 4173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});