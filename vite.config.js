import { defineConfig } from 'vite';

export default defineConfig({
  // Base path for deployment
  base: './',

  build: {
    // Output directory
    outDir: 'dist',

    // Generate sourcemaps for debugging (optional)
    sourcemap: false,

    // Asset file naming with hash for cache-busting
    rollupOptions: {
      output: {
        entryFileNames: 'assets/js/[name].[hash].js',
        chunkFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          // Keep CSS in assets/css/
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name].[hash][extname]';
          }
          // Keep images/sounds/data in their respective folders
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return 'assets/images/[name].[hash][extname]';
          }
          if (/\.(mp3|wav|ogg)$/i.test(assetInfo.name)) {
            return 'assets/sound/[name].[hash][extname]';
          }
          if (/\.(json|geojson)$/i.test(assetInfo.name)) {
            return 'assets/data/[name].[hash][extname]';
          }
          // Default
          return 'assets/[name].[hash][extname]';
        }
      }
    },

    // Minify for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: true
      }
    },

    // Chunk size warning limit
    chunkSizeWarningLimit: 1000
  },

  // Server config for dev
  server: {
    port: 8000,
    open: true
  },

  // Copy public assets as-is
  publicDir: 'assets',

  // Optimize dependencies
  optimizeDeps: {
    include: []
  }
});
