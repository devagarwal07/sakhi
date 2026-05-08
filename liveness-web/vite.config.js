import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    // Served from backend under /liveness
    base: '/liveness/',
    build: {
        outDir: path.resolve(__dirname, '../backend/public/liveness'),
        emptyOutDir: true,
    },
    server: {
        port: 5173,
    },
});
