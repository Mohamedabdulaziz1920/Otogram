import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // تقسيم الحزم لتحسين الأداء
          if (id.includes('node_modules')) {
            if (id.includes('swiper')) {
              return 'swiper';
            }
            if (id.includes('react')) {
              return 'react-vendor';
            }
            if (id.includes('axios')) {
              return 'axios';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  // إضافة هذا لحل مشاكل البناء
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'swiper']
  },
  // تحديد base URL للإنتاج
  base: '/'
})
