import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Em desenvolvimento, /api vai para o backend: sem CORS e sem URL fixa no código
    proxy: {
      '/api': { target: 'http://localhost:3333', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas grandes em arquivos separados: melhor cache no navegador
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'charts';
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
});
