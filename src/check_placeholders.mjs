/* ============================================================================
 *  check_placeholders.mjs â€” Verifica que todos los marcadores del documento
 *  tengan un valor en la pestaÃ±a 11_Valores (y viceversa).
 * ==========================================================================*/
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { crearEntorno } from './mock_appsscript.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '..');

const env = crearEntorno();
const contexto = vm.createContext({
  console: { log: () => { } },
  SpreadsheetApp: env.SpreadsheetApp, FormApp: env.FormApp,
  PropertiesService: env.PropertiesService, Utilities: env.Utilities, Session: env.Session,
  Date, Math, JSON, Object, Array, String, Number, Boolean, isFinite
});

for (const a of fs.readdirSync(path.join(raiz, 'apps-script')).filter((f) => f.endsWith('.gs')).sort()) {
  vm.runInContext(fs.readFileSync(path.join(raiz, 'apps-script', a), 'utf8'), contexto, { filename: a });
}

vm.runInContext('instalarTodo', contexto)();
vm.runInContext('activarModoDemo', contexto)();
vm.runInContext('ejecutarAnalisis', contexto)();

const md = fs.readFileSync(path.join(raiz, 'docs', 'Documento_Proyecto.md'), 'utf8');
const enDocumento = new Set(md.match(/{{[^}\n]+}}/g) || []);

const hoja = env.libro.getSheetByName('11_Valores');
const enHoja = new Set(
  hoja.getDataRange().getValues().slice(2).map((f) => String(f[0])).filter((v) => v.startsWith('{{'))
);

const faltan = [...enDocumento].filter((m) => !enHoja.has(m));
const sobran = [...enHoja].filter((m) => !enDocumento.has(m));

console.log(`Marcadores en el documento : ${enDocumento.size}`);
console.log(`Marcadores en 11_Valores   : ${enHoja.size}`);

if (faltan.length) {
  console.log('\nâœ— Sin valor en la hoja:');
  faltan.forEach((m) => console.log('   ' + m));
}
if (sobran.length) {
  console.log('\nÂ· En la hoja pero no en el documento (no es error):');
  sobran.forEach((m) => console.log('   ' + m));
}
console.log(faltan.length === 0 ? '\nâœ… Todos los marcadores del documento tienen valor.' : `\nâŒ ${faltan.length} sin cubrir.`);
process.exit(faltan.length === 0 ? 0 : 1);
