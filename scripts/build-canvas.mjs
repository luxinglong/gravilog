import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/canvas/excalidraw-app.jsx'],
  bundle: true,
  minify: true,
  sourcemap: false,
  conditions: ['production'],
  format: 'iife',
  globalName: 'GravilogExcalidrawBundle',
  outfile: 'src/canvas/excalidraw.bundle.js',
  loader: {
    '.woff2': 'dataurl',
    '.woff': 'dataurl',
    '.ttf': 'dataurl',
  },
});
