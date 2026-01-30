// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import partytown from '@astrojs/partytown';
import sonda from 'sonda/astro';

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
    sonda()
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