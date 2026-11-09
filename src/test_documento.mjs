/* ============================================================================
 *  test_documento.mjs — Prueba el relleno automático del documento
 * ----------------------------------------------------------------------------
 *  Toma el Markdown del documento como si fuera el Google Doc ya pegado,
 *  ejecuta reemplazarMarcadoresEnDocumento() y comprueba que:
 *    - todos los marcadores con valor se sustituyan,
 *    - solo queden los datos que debe escribir el equipo a mano,
 *    - no haya llaves dobles residuales.
 * ==========================================================================*/
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { crearEntorno } from './mock_appsscript.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '..');
const md = fs.readFileSync(path.join(raiz, 'docs', 'Documento_Proyecto.md'), 'utf8');

const env = crearEntorno({ documentoInicial: md });

const contexto = vm.createContext({
  console: { log: () => { }, error: console.error },
  SpreadsheetApp: env.SpreadsheetApp, FormApp: env.FormApp,
  PropertiesService: env.PropertiesService, Utilities: env.Utilities,
  Session: env.Session, DocumentApp: env.DocumentApp,
  Date, Math, JSON, Object, Array, String, Number, Boolean, isFinite
});

for (const a of fs.readdirSync(path.join(raiz, 'apps-script')).filter((f) => f.endsWith('.gs')).sort()) {
  vm.runInContext(fs.readFileSync(path.join(raiz, 'apps-script', a), 'utf8'), contexto, { filename: a });
}

const llamar = (n) => vm.runInContext(n, contexto);
llamar('instalarTodo')();
llamar('activarModoDemo')();
llamar('ejecutarAnalisis')();
llamar('reemplazarMarcadoresEnDocumento')();

const resultado = env.documento.texto;
const restantes = [...new Set(resultado.match(/\{\{[^}\n]+\}\}/g) || [])];

const manualesEsperados = [
  '{{NOMBRE_PROFESOR}}', '{{NOMBRE_INTEGRANTE_1}}', '{{NOMBRE_INTEGRANTE_2}}',
  '{{NOMBRE_INTEGRANTE_3}}', '{{INSTITUCIÓN}}', '{{FECHA_ENTREGA}}',
  '{{FECHA_INICIO}}', '{{FECHA_FIN}}', '{{TIEMPO_PROMEDIO}}'
];

const inesperados = restantes.filter((m) => !manualesEsperados.includes(m));
const noReemplazados = manualesEsperados.filter((m) => !restantes.includes(m));

console.log(`Marcadores que quedan en el documento: ${restantes.length}`);
console.log('  (los manuales que debe escribir el equipo):');
restantes.forEach((m) => console.log('   ' + m));

console.log('\nComprobaciones:');
let fallos = 0;
const comprobar = (d, c) => { console.log(`${c ? '✓' : '✗'} ${d}`); if (!c) fallos++; };

comprobar('No quedan marcadores de datos automáticos', inesperados.length === 0);
comprobar('Los 9 marcadores manuales siguen presentes', noReemplazados.length === 0);
comprobar('El texto conserva contenido narrativo', resultado.includes('Planteamiento del problema'));
comprobar('Las cifras reales aparecieron', /\d+[.,]\d+\s?%/.test(resultado));

if (inesperados.length) {
  console.log('\nInesperados:', inesperados.join(', '));
}
console.log(fallos === 0 ? '\n✅ Relleno automático correcto.' : `\n❌ ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
