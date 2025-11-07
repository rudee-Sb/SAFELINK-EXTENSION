import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from "path";

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                popup: resolve(__dirname, "src/popup.html"),
            },
            output: {
                entryFileNames: `[name].js`,
            },
        },
        outDir: 'dist',
        emptyOutDir: false
    },
    root: './',
    server: {
        port: 5173,
    },
});
