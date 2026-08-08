import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  // Relativer Grundpfad: die ausgelieferte Datei liegt auf GitHub Pages unter
  // /<repo>/ und nicht auf der Wurzel. Bei einer autarken Datei faellt das
  // kaum ins Gewicht, aber es kostet nichts und verhindert eine ganze
  // Fehlerklasse.
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2018',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000,
    reportCompressedSize: false,
  },
});
