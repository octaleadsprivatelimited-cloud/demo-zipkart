import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    watch: {
      // Static generated artwork can be locked briefly by Windows image tools.
      // It does not need hot-reload monitoring and remains served from public/.
      ignored: ['**/public/images/categories/*.png'],
    },
  },
  build: {
    // Target modern browsers for smaller bundle size
    target: 'es2020',

    // Optimize chunk size
    chunkSizeWarningLimit: 1000,

    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
      },
    },

    // Code splitting configuration
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/storage', 'firebase/auth'],
          'maps-vendor': ['@react-google-maps/api'],

          // Marketing components (lazy loaded separately)
          'marketing': [
            './src/components/marketing/NewsletterPopup.jsx',
            './src/components/marketing/ExitIntentPopup.jsx',
            './src/components/marketing/RecentPurchaseNotification.jsx',
          ],
        },

        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // Source maps for debugging (disable in production if not needed)
    sourcemap: false,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/firestore',
      'firebase/storage',
      'firebase/auth',
    ],
  },
})
