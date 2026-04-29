import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    minify: 'oxc',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // One chunk per vendor group → reduces concurrent HTTP/2 requests on
          // Render free-tier static hosting (ERR_HTTP2_SERVER_REFUSED_STREAM).
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide'
          }
          if (id.includes('node_modules/@radix-ui') || id.includes('node_modules/cmdk')) {
            return 'vendor-radix'
          }
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state'
          }
          if (id.includes('node_modules/axios') || id.includes('node_modules/react-router')) {
            return 'vendor-http'
          }
        },
      },
    },
  },
})
