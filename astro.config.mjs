// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    // Prevent Vite dep pre-bundling from inlining React's production JSX dev runtime.
    // If `react/jsx-dev-runtime` gets optimized with NODE_ENV=production, `jsxDEV` becomes undefined
    // and React components crash in dev with: "jsxDEV is not a function".
    optimizeDeps: {
      exclude: ['react/jsx-dev-runtime', 'react/jsx-runtime'],
    },
  }
});