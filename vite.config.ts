import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isGhPages = mode === 'gh-pages';
  const outDir = isGhPages ? 'docs' : 'dist';

  return {
    base: isGhPages ? '/silver-octo-disco/' : '/',
    plugins: [
      vue(),
      {
        name: 'vite-plugin-nojekyll',
        closeBundle() {
          if (!isGhPages) {
            return;
          }

          mkdirSync(outDir, { recursive: true });
          writeFileSync(join(outDir, '.nojekyll'), '');
        }
      }
    ],
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    build: {
      outDir
    }
  };
});
