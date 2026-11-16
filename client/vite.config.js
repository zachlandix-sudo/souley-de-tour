import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  build: {
    // The 3D town map (maplibre, about 1 MB, 290 kB gzipped) is its own chunk and only loads when the "Explore by town" section nears the screen.
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        // Split big libraries so the app code stays small and browsers can cache them.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('leaflet')) return 'leaflet';
          if (id.includes('maplibre-gl')) return 'maplibre';
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    css: false,
  },
});
