import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    server: {
        proxy: {
            "/api": "http://localhost:4000"
        }
    }
});
