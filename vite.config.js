import { defineConfig } from 'vite';

export default defineConfig({
  // relativa sökvägar så bygget fungerar på valfri underadress
  // (t.ex. GitHub Pages https://<user>.github.io/<repo>/)
  base: './'
});
