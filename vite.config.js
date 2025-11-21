import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        host: '0.0.0.0', // 允许局域网访问
        port: 5173,      // 默认端口
        strictPort: false,
        open: false,
    },
    build: {
        outDir: 'dist',
    },
});
