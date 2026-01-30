// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import partytown from '@astrojs/partytown';
import sonda from 'sonda/astro';
import compress from '@playform/compress';
import compressor from 'astro-compressor';

// https://astro.build/config
export default defineConfig({
  integrations: [
    preact(), 
    partytown({
      config: {
        // Forward GTM dataLayer.push to web worker
        forward: ['dataLayer.push']
      }
    }),
    sonda(),
    // Aggressive minification (HTML, CSS, JS, SVG)
    compress({
      HTML: true,
      JavaScript: true,
      CSS: true,
      SVG: true
    }),
    // Pre-compression (gzip + Brotli) - runs last after minification
    compressor({
      gzip: true,
      brotli: true,
      zstd: false,
      // Maximum compression settings
      gzipOptions: { level: 9 },
      brotliOptions: { quality: 11 }
    })
  ],

  // Enable prefetching for faster navigation
  prefetch: {
    defaultStrategy: 'viewport',
    prefetchAll: true
  },

  // Performance optimizations
  build: {
    // Inline small CSS files to eliminate render-blocking requests
    inlineStylesheets: 'always'
  },

  vite: {
    plugins: [tailwindcss()]
  }
});