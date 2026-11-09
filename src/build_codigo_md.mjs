/* ============================================================================
 *  build_codigo_md.mjs — Junta los 9 archivos .gs en un solo Markdown
 * ----------------------------------------------------------------------------
 *  Uso:  node src/build_codigo_md.mjs
 *  Salida: docs/Codigo_AppScript.md
 *
 *  Sirve para entregar el código completo en un documento legible, sin tener
 *  que abrir el editor de Apps Script.
 * ==========================================================================*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '..');
const carpeta = path.join(raiz, 'apps-script');

const descripciones = {
  '00_Config.gs': 'Parámetros del experimento y función de avisos.',
  '00_LEEME.gs': 'Documentación interna del proyecto (no contiene funciones).',
  '01_Datos.gs': 'Las 20 preguntas, la codificación texto→número y las 14 variables.',
  '01b_Hojas.gs': 'Lectura de respuestas y escritura/formato en Google Sheets.',
  '02_KNN.gs': 'Núcleo del algoritmo: distancia, votación, matriz de confusión, métricas y particiones.',
  '03_Analisis.gs': 'Pipeline completo que genera las pestañas de resultados.',
  '04_Instalador.gs': 'Creación del formulario y de la estructura del libro.',
  '05_Menu.gs': 'Menú de la hoja, modo demostración y pestaña de código.',
  '06_Valores.gs': 'Tabla de valores y relleno automático del documento.'
};

const archivos = fs.readdirSync(carpeta).filter((f) => f.endsWith('.gs')).sort();

let md = '';
md += '# Código completo de Google Apps Script\n\n';
md += 'Proyecto **KNN — Clasificación de vehículos a partir de sus características**.\n\n';
md += 'Este documento reúne los nueve archivos del proyecto tal como están en el editor de Apps Script. ';
md += 'Para reproducirlo: abre la hoja de cálculo → **Extensiones → Apps Script** → crea un archivo con ';
md += 'el mismo nombre y pega el contenido del bloque correspondiente.\n\n';
md += `> Total: ${archivos.length} archivos. Generado automáticamente desde \`apps-script/\`.\n\n`;

md += '## Índice\n\n';
md += '| Archivo | Contenido | Líneas |\n|---|---|---|\n';
for (const archivo of archivos) {
  const contenido = fs.readFileSync(path.join(carpeta, archivo), 'utf8');
  const lineas = contenido.split('\n').length;
  md += `| [\`${archivo}\`](#${archivo.toLowerCase().replace(/[^a-z0-9]/g, '')}) | ${descripciones[archivo] || ''} | ${lineas} |\n`;
}
md += '\n---\n\n';

for (const archivo of archivos) {
  const contenido = fs.readFileSync(path.join(carpeta, archivo), 'utf8');
  const lineas = contenido.split('\n').length;

  md += `## ${archivo}\n\n`;
  md += `${descripciones[archivo] || ''}\n\n`;
  md += `*${lineas} líneas.*\n\n`;
  // Cuatro comillas invertidas para no chocar con posibles bloques internos
  md += '````javascript\n';
  md += contenido.replace(/\s+$/, '');
  md += '\n````\n\n';
}

md += '---\n\n';
md += '*Documento generado con `node src/build_codigo_md.mjs` a partir de los archivos de `apps-script/`.*\n';

const salida = path.join(raiz, 'docs', 'Codigo_AppScript.md');
fs.writeFileSync(salida, md, 'utf8');

console.log(`✓ ${salida}`);
console.log(`  Archivos: ${archivos.length}`);
console.log(`  Tamaño: ${Math.round(md.length / 1024)} KB`);
console.log(`  Líneas: ${md.split('\n').length}`);
