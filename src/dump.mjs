/* ============================================================================
 *  dump.mjs — Ejecuta el proyecto simulado e imprime las pestañas completas
 * ----------------------------------------------------------------------------
 *  Uso:  node src/dump.mjs 10_Reporte 08_Resumen_Datos
 *  Sirve para revisar el texto generado sin abrir Google.
 * ==========================================================================*/
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { crearEntorno } from './mock_appsscript.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '..');
const deseadas = process.argv.slice(2);

const env = crearEntorno();
const contexto = vm.createContext({
  console: { log: () => { } },
  SpreadsheetApp: env.SpreadsheetApp,
  FormApp: env.FormApp,
  PropertiesService: env.PropertiesService,
  Utilities: env.Utilities,
  Session: env.Session,
  Date, Math, JSON, Object, Array, String, Number, Boolean, isFinite
});

for (const archivo of fs.readdirSync(path.join(raiz, 'apps-script')).filter((f) => f.endsWith('.gs')).sort()) {
  vm.runInContext(fs.readFileSync(path.join(raiz, 'apps-script', archivo), 'utf8'), contexto, { filename: archivo });
}

const llamar = (n) => vm.runInContext(n, contexto);
llamar('instalarTodo')();
llamar('activarModoDemo')();
llamar('ejecutarAnalisis')();

for (const nombre of deseadas) {
  const hoja = env.libro.getSheetByName(nombre);
  console.log(`\n================ ${nombre} ================`);
  if (!hoja) { console.log('(no existe)'); continue; }
  hoja.getDataRange().getValues().forEach((fila, i) => {
    const texto = fila.map((v) => (v && v.formula ? '<formula>' : String(v))).join(' | ');
    if (texto.replace(/\|/g, '').trim() !== '') console.log(`${String(i + 1).padStart(3)}: ${texto}`);
  });
}
