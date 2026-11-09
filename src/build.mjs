/* ============================================================================
 *  build.mjs — Ensambla los archivos de Google Apps Script
 * ----------------------------------------------------------------------------
 *  Los archivos 01_Datos.gs y 02_KNN.gs son COPIAS LITERALES de src/esquema.js
 *  y src/knn_core.js. Así el mismo código se prueba en Node y corre en Google
 *  sin diferencias.
 *
 *  Ejecutar:  node src/build.mjs
 * ==========================================================================*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '..');

const encabezados = {
  '01_Datos.gs': `/* ============================================================================
 *  01_Datos.gs — Preguntas del formulario, codificación y variables
 * ----------------------------------------------------------------------------
 *  Copia de src/esquema.js (misma versión que se prueba con Node.js).
 *  Contiene: PREGUNTAS, CLASES, ESCALA, REGLAS de codificación, FEATURES,
 *  mapearRespuesta() y el generador de datos sintéticos para demostración.
 * ==========================================================================*/
`,
  '02_KNN.gs': `/* ============================================================================
 *  02_KNN.gs — Núcleo del algoritmo KNN
 * ----------------------------------------------------------------------------
 *  Copia de src/knn_core.js (misma versión que se prueba con Node.js).
 *  No depende de Google Sheets: recibe arreglos y devuelve números. Por eso
 *  puede probarse por separado, que es la base de un diseño limpio.
 * ==========================================================================*/
`
};

const copias = [
  ['src/esquema.js', 'apps-script/01_Datos.gs'],
  ['src/knn_core.js', 'apps-script/02_KNN.gs']
];

for (const [origen, destino] of copias) {
  const contenido = fs.readFileSync(path.join(raiz, origen), 'utf8');
  const nombre = path.basename(destino);
  fs.writeFileSync(path.join(raiz, destino), encabezados[nombre] + contenido, 'utf8');
  console.log(`✓ ${origen}  ->  ${destino}  (${contenido.split('\n').length} líneas)`);
}

/* --- Demo web autocontenida ------------------------------------------- */
const plantilla = fs.readFileSync(path.join(raiz, 'web', 'plantilla_demo.html'), 'utf8');
const esquema = fs.readFileSync(path.join(raiz, 'src', 'esquema.js'), 'utf8');
const nucleo = fs.readFileSync(path.join(raiz, 'src', 'knn_core.js'), 'utf8');

const demo = plantilla
  .replace('/*__ESQUEMA__*/', () => esquema)
  .replace('/*__KNN_CORE__*/', () => nucleo);

fs.writeFileSync(path.join(raiz, 'web', 'knn_demo.html'), demo, 'utf8');
console.log(`✓ web/plantilla_demo.html  ->  web/knn_demo.html  (${Math.round(demo.length / 1024)} KB, sin dependencias)`);
