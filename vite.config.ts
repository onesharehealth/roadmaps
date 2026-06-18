import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'



export default defineConfig(({ isSsrBuild }) => ({

  build: {

    outDir: 'build',

    sourcemap: false,

    target: 'esnext',

    rollupOptions: {

      input: isSsrBuild ? './workers/app.ts' : undefined,

    },

  },

  ssr: {

    optimizeDeps: {

      include: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/server', 'react-router'],

    },

  },

  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), reactRouter(), tsconfigPaths(), tailwindcss()],

}))

