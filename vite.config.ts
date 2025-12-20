import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Set base path for GitHub Pages (change 'rose-sale-shop' to your repo name)
    base: mode === 'production' ? '/celadon-rose-sale/' : '/',
    build: {
      sourcemap: true,
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_SHEET_ID': JSON.stringify(env.GOOGLE_SHEET_ID),
      'process.env.GOOGLE_API_KEY': JSON.stringify(env.GOOGLE_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
