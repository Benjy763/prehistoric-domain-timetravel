import { defineConfig } from 'vite';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

const contentDataHash = createHash('md5')
  .update(readFileSync('./assets/data/content-data.json'))
  .digest('hex')
  .slice(0, 8);

export default defineConfig({
  define: {
    __CONTENT_DATA_HASH__: JSON.stringify(contentDataHash),
  },

  // Base path for deployment
  base: './',

  build: {
    // Output directory
    outDir: 'dist',

    // Generate sourcemaps for debugging (optional)
    sourcemap: false,

    // Asset file naming with hash for cache-busting
    rollupOptions: {
      input: {
        main: './index.html',
        placement: './placement.html',
        browse: './browse.html'
      },
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

    // Minify for production (esbuild is built-in, no extra dependency)
    minify: 'esbuild',

    // Chunk size warning limit
    chunkSizeWarningLimit: 1000
  },

  // Server config for dev
  server: {
    port: 8000,
    open: '/?premium=true'
  },

  // Disable publicDir — CSS/audio are processed by Vite from HTML tags,
  // JSON data files are copied via the build script (see package.json)
  publicDir: false,

  // Optimize dependencies
  optimizeDeps: {
    include: []
  }
});
