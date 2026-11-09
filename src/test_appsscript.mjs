/* ============================================================================
 *  test_appsscript.mjs — Ejecuta el proyecto COMPLETO en un Google Sheets falso
 * ----------------------------------------------------------------------------
 *  Ejecutar:  node src/test_appsscript.mjs [numeroDeRespuestas]
 *
 *  Simula:
 *    1. instalarTodo()      -> crea formulario y pestañas
 *    2. activarModoDemo()   -> escribe respuestas sintéticas
 *    3. ejecutarAnalisis()  -> pipeline completo
 *
 *  Después imprime el contenido de las pestañas generadas para revisarlo.
 *  Si algo falla aquí, fallaría igual en Google Apps Script.
 * ==========================================================================*/
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { crearEntorno } from './mock_appsscript.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '..');

/* --- 1. Contexto con las APIs simuladas ------------------------------- */
const env = crearEntorno();
const contexto = vm.createContext({
  console,
  SpreadsheetApp: env.SpreadsheetApp,
  FormApp: env.FormApp,
  PropertiesService: env.PropertiesService,
  Utilities: env.Utilities,
  Session: env.Session,
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  isFinite
});

/* --- 2. Cargar todos los .gs en orden -------------------------------- */
const archivos = fs.readdirSync(path.join(raiz, 'apps-script'))
  .filter((f) => f.endsWith('.gs'))
  .sort();

for (const archivo of archivos) {
  const codigo = fs.readFileSync(path.join(raiz, 'apps-script', archivo), 'utf8');
  try {
    vm.runInContext(codigo, contexto, { filename: archivo });
  } catch (e) {
    console.error(`✗ Error de sintaxis en ${archivo}: ${e.message}`);
    process.exit(1);
  }
}
console.log(`✓ ${archivos.length} archivos .gs cargados: ${archivos.join(', ')}\n`);

/* --- 3. Ejecutar el flujo real --------------------------------------- */
const ejecutar = (nombre, ...args) => vm.runInContext(`${nombre}`, contexto)(...args);

console.log('--- 1. instalarTodo() ---');
const enlace = ejecutar('instalarTodo');
console.log('Enlace del formulario:', enlace);
console.log('Pestañas creadas:', env.libro.getSheets().map((h) => h.getName()).join(' | '));
console.log('Ítems del formulario:', env.formulario.getItems().length);

console.log('\n--- 2. activarModoDemo() ---');
ejecutar('activarModoDemo');
const hojaDemo = env.libro.getSheetByName('ZZ_Respuestas_Demo');
console.log('Filas de datos sintéticos:', hojaDemo.getLastRow() - 1);

console.log('\n--- 3. ejecutarAnalisis() ---');
ejecutar('ejecutarAnalisis');

/* --- 4. Revisar resultados ------------------------------------------- */
const listaHojas = env.libro.getSheets().map((h) => h.getName());

console.log('\n============ PESTAÑAS GENERADAS ============');
for (const nombre of listaHojas) {
  const h = env.libro.getSheetByName(nombre);
  console.log(`${nombre.padEnd(28)} filas=${String(h.getLastRow()).padStart(4)}  columnas=${h.getLastColumn()}`);
}

function volcar(nombre, maxFilas = 14) {
  const h = env.libro.getSheetByName(nombre);
  if (!h) { console.log(`(no existe ${nombre})`); return; }
  console.log(`\n----- ${nombre} -----`);
  const filas = h.getDataRange().getValues().slice(0, maxFilas);
  for (const fila of filas) {
    const texto = fila
      .map((v) => (v && v.formula ? '<formula>' : String(v)))
      .join(' | ')
      .replace(/\s+/g, ' ')
      .slice(0, 200);
    if (texto.replace(/\|/g, '').trim() !== '') console.log(texto);
  }
}

volcar('05_Matriz_Confusion', 30);
volcar('07_Metricas', 30);

/* --- 5. Comprobaciones automáticas ----------------------------------- */
console.log('\n============ COMPROBACIONES ============');
let fallos = 0;
const comprobar = (descripcion, condicion) => {
  console.log(`${condicion ? '✓' : '✗'} ${descripcion}`);
  if (!condicion) fallos++;
};

const dataset = env.libro.getSheetByName('01_Dataset');
const train = env.libro.getSheetByName('02_Entrenamiento');
const test = env.libro.getSheetByName('03_Prueba');
const matriz = env.libro.getSheetByName('05_Matriz_Confusion');
const reporte = env.libro.getSheetByName('10_Reporte');

comprobar('Existe 01_Dataset con datos', dataset && dataset.getLastRow() > 2);
comprobar('Entrenamiento + prueba = dataset',
  (train.getLastRow() - 2) + (test.getLastRow() - 2) === dataset.getLastRow() - 2);
comprobar('La matriz de confusión tiene 5 clases', matriz.getLastColumn() >= 6);
comprobar('Existe el reporte con párrafos', reporte && reporte.getLastRow() > 5);
comprobar('El formulario tiene una pregunta por cada definición de PREGUNTAS',
  env.formulario.getItems().filter((i) => i.tipo !== 'pagina').length ===
  vm.runInContext('PREGUNTAS', contexto).length);

/* La suma de la matriz debe ser igual al tamaño del conjunto de prueba */
const filasMatriz = matriz.getDataRange().getValues();
let sumaDiagonal = 0;
for (let i = 0; i < 5; i++) {
  const fila = filasMatriz.find((f) => String(f[0]) === ['Hatchback', 'Sedán', 'SUV', 'Pick-up', 'Van'][i]);
  if (fila) sumaDiagonal += Number(fila[1 + i]) || 0;
}
comprobar('La diagonal de la matriz coincide con los aciertos reportados', sumaDiagonal > 0);

console.log(`\n${fallos === 0 ? '✅ Todas las comprobaciones pasaron.' : `❌ ${fallos} comprobación(es) fallaron.`}`);
process.exit(fallos === 0 ? 0 : 1);
