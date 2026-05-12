import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// When the app is opened via an external host (cloudflared tunnel, ngrok, etc.),
// the browser obviously can't reach http://127.0.0.1:54321 directly. We proxy
// /supabase/* on the dev server to the local Supabase API so a single tunnel
// covers both the SPA and its backend.
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        // Allow any hostname (tunnels, LAN IPs, etc.). Safe in dev; do not use in prod.
        allowedHosts: true,
        proxy: {
            '/supabase': {
                target: 'http://127.0.0.1:54321',
                changeOrigin: true,
                ws: true,
                rewrite: function (path) { return path.replace(/^\/supabase/, ''); },
            },
        },
    },
});
