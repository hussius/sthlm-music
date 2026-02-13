import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from 'vite-plugin-checker'
import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config();
const CCL_PATH = process.env.CCL_PATH || '';

export default defineConfig({
  plugins: [react(),
  checker({
    typescript: true,
  }),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
},
  base: "/",
  build: {
    outDir: 'build'
  },
  server: {
    port: 3000,
    fs: {
      allow: [
        '.', 
        CCL_PATH,
      ],
    }
  },
  resolve: {
    alias: {
      '/fonts': resolve(__dirname, './node_modules/@codongit/codon-component-library/dist/fonts'),
    }
  }
});
