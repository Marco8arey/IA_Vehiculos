/* ============================================================================
 *  test.mjs â€” Pruebas del nÃºcleo KNN en Node.js
 * ----------------------------------------------------------------------------
 *  Ejecuta:  node src/test.mjs
 *
 *  QuÃ© hace:
 *   1. Carga knn_core.js y esquema.js en un contexto aislado (como si fueran
 *      los archivos .gs de Apps Script).
 *   2. Genera respuestas sintÃ©ticas y las convierte al dataset numÃ©rico.
 *   3. Corre el pipeline completo: particiÃ³n, elecciÃ³n de k, holdout y 5-fold.
 *   4. Escribe datos/dataset_EJEMPLO_sintetico.csv y web/demo_data.json para la demo web.
 *
 *  Sirve para comprobar que el algoritmo funciona ANTES de pegarlo en Google
 *  Apps Script y para obtener una lÃ­nea base con la que comparar los datos
 *  reales de la encuesta.
 * ==========================================================================*/
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '..');

/* --- 1. Cargar los dos archivos compartidos en un Ãºnico contexto --------- */
const contexto = vm.createContext({ console, Math, JSON, String, Number, Object, Array, isFinite });
for (const archivo of ['esquema.js', 'knn_core.js']) {
  const codigo = fs.readFileSync(path.join(__dirname, archivo), 'utf8');
  vm.runInContext(codigo, contexto, { filename: archivo });
}

/* --- 2. Generar respuestas sintÃ©ticas y mapearlas ------------------------ */
const N = Number(process.argv[2] || 60);
const SEMILLA = Number(process.argv[3] || 2026);
const respuestas = vm.runInContext(`generarRespuestasSinteticas(${N}, ${SEMILLA}, 0.06)`, contexto);

const datos = [];
const errores = [];
respuestas.forEach((r, i) => {
  const fila = vm.runInContext('mapearRespuesta', contexto)(r, i);
  if (fila.error) errores.push({ id: r.id, error: fila.error });
  else datos.push(fila);
});

console.log('=========================================================');
console.log(' RESPUESTAS PROCESADAS');
console.log('=========================================================');
console.log(`Generadas        : ${respuestas.length}`);
console.log(`VÃ¡lidas          : ${datos.length}`);
console.log(`Con error        : ${errores.length}`);
if (errores.length) console.log(errores.slice(0, 5));

const conteo = {};
for (const d of datos) conteo[d.clase] = (conteo[d.clase] || 0) + 1;
console.log('DistribuciÃ³n     :', conteo);

/* --- 3. Varianza de cada feature (justifica la selecciÃ³n) ---------------- */
const FEATURES = vm.runInContext('FEATURES', contexto);
console.log('\n--- Varianza de las features usadas (0 = no aporta) ---');
const varianzas = FEATURES.map((f) => {
  const v = datos.map((d) => Number(d[f.id]));
  const media = v.reduce((a, b) => a + b, 0) / v.length;
  const varianza = v.reduce((a, b) => a + (b - media) ** 2, 0) / v.length;
  return { id: f.id, media: media.toFixed(2), varianza: varianza.toFixed(3) };
});
console.table(varianzas);

/* --- 4. Pipeline ------------------------------------------------------- */
const { dividirEstratificado, elegirMejorK, evaluarConjuntoPrueba, evaluarValidacionCruzada } =
  Object.fromEntries(
    ['dividirEstratificado', 'elegirMejorK', 'evaluarConjuntoPrueba', 'evaluarValidacionCruzada']
      .map((n) => [n, vm.runInContext(n, contexto)])
  );

const split = dividirEstratificado(datos, 0.3, 42, 'clase');
console.log('\n--- ParticiÃ³n 70/30 estratificada ---');
console.log(`Entrenamiento: ${split.entrenamiento.length}   Prueba: ${split.prueba.length}`);

const seleccion = elegirMejorK(split.entrenamiento, FEATURES, [1, 3, 5, 7, 9]);
console.log('\n--- SelecciÃ³n de k por leave-one-out (solo con entrenamiento) ---');
console.table(seleccion.tabla.map((t) => ({ k: t.k, exactitud: (t.exactitud * 100).toFixed(1) + '%' })));

const k = seleccion.mejorK;
const holdout = evaluarConjuntoPrueba(split.entrenamiento, split.prueba, FEATURES, k);

function imprimirMatriz(m, clases) {
  const ancho = 11;
  console.log('REAL \\ PRED'.padEnd(ancho) + clases.map((c) => c.padStart(ancho)).join(''));
  clases.forEach((c, i) => {
    console.log(c.padEnd(ancho) + m[i].map((v) => String(v).padStart(ancho)).join(''));
  });
}

console.log(`\n--- Holdout 70/30 con k=${k} ---`);
imprimirMatriz(holdout.matriz, holdout.clases);
console.log(`Exactitud: ${(holdout.metricas.exactitud * 100).toFixed(2)}%  ` +
  `Macro-F1: ${(holdout.metricas.macroF1 * 100).toFixed(2)}%  ` +
  `Kappa: ${holdout.metricas.kappa.toFixed(3)}`);

const cv = evaluarValidacionCruzada(datos, FEATURES, k, 5, 42);
console.log(`\n--- ValidaciÃ³n cruzada 5-fold con k=${k} ---`);
console.log('Folds:', cv.detalleFolds.map((f) => `#${f.fold}:${(f.exactitud * 100).toFixed(0)}%`).join('  '));
imprimirMatriz(cv.matriz, cv.clases);
console.log(`Exactitud: ${(cv.metricas.exactitud * 100).toFixed(2)}%  ` +
  `Macro-F1: ${(cv.metricas.macroF1 * 100).toFixed(2)}%  ` +
  `Kappa: ${cv.metricas.kappa.toFixed(3)}`);
console.log('\n--- MÃ©tricas por clase (validaciÃ³n cruzada) ---');
console.table(cv.metricas.porClase.map((c) => ({
  clase: c.clase,
  soporte: c.soporte,
  precision: (c.precision * 100).toFixed(1) + '%',
  recall: (c.recall * 100).toFixed(1) + '%',
  f1: (c.f1 * 100).toFixed(1) + '%'
})));

/* --- 5. Exportar CSV del dataset demo ---------------------------------- */
const columnas = ['id', 'clase', ...FEATURES.map((f) => f.id)];
const csv = [
  columnas.join(','),
  ...datos.map((d) => columnas.map((c) => `"${d[c]}"`).join(','))
].join('\n');
fs.mkdirSync(path.join(raiz, 'datos'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'datos', 'dataset_EJEMPLO_sintetico.csv'), csv, 'utf8');

console.log('\nArchivo escrito: datos/dataset_EJEMPLO_sintetico.csv');
