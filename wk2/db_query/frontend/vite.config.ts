import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    // Code splitting configuration for optimized bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI library chunk
          'antd-vendor': ['antd', '@ant-design/icons'],

          // Refine framework chunk
          'refine-vendor': ['@refinedev/core', '@refinedev/antd', '@refinedev/react-router-v6'],

          // Monaco Editor chunk (large dependency)
          'monaco-vendor': ['@monaco-editor/react', 'monaco-editor'],
        },
      },
    },
    // Chunk size warning limit (500kb)
    chunkSizeWarningLimit: 1000,

    // Source maps for production debugging (optional)
    sourcemap: false,

    // Minification
    minify: 'esbuild',

    // Target modern browsers for smaller bundle
    target: 'es2020',
  },
});
