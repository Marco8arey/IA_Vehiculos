/* ============================================================================
 *  md2html.mjs — Convierte el documento Markdown a HTML con estilos
 * ----------------------------------------------------------------------------
 *  Uso:  node src/md2html.mjs docs/Documento_Proyecto.md docs/Documento_Proyecto.html
 *
 *  El HTML resultante se abre en Chrome y se copia/pega en Google Docs
 *  conservando títulos, tablas, negritas y resaltado de los marcadores {{ }}.
 *  No pretende ser un conversor de Markdown completo: cubre exactamente los
 *  elementos que usa el documento del proyecto.
 * ==========================================================================*/
import fs from 'node:fs';

const [,, entrada, salida] = process.argv;
if (!entrada || !salida) {
  console.error('Uso: node src/md2html.mjs <entrada.md> <salida.html>');
  process.exit(1);
}

const md = fs.readFileSync(entrada, 'utf8').replace(/\r\n/g, '\n');

/* ---------------------------------------------------------------------------
 * 1) Utilidades de texto
 * -------------------------------------------------------------------------*/
function escaparHtml(t) {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Convierte una expresión LaTeX sencilla a texto legible con Unicode. */
function matematicaLegible(expr) {
  let t = expr.trim();
  t = t.replace(/\\,|\\;|\\ /g, ' ');
  t = t.replace(/\\left|\\right/g, '');
  t = t.replace(/\\cdot/g, '·');
  t = t.replace(/\\times/g, '×');

  // \frac{A}{B}  ->  (A) / (B)   (admite contenido con llaves internas)
  t = procesarComando(t, '\\frac', (args) => `(${args[0]}) / (${args[1]})`, 2);
  // \sqrt{X}  ->  √(X)
  t = procesarComando(t, '\\sqrt', (args) => `√(${args[0]})`, 1);

  // \sum_{i=1}^{n}
  t = t.replace(/\\sum_\{([^}]*)\}\^\{([^}]*)\}/g, 'Σ($1…$2)');
  t = t.replace(/\\sum/g, 'Σ');
  t = t.replace(/\\min/g, 'min').replace(/\\max/g, 'max');

  // Subíndices y superíndices simples
  const sub = { i: 'ᵢ', n: 'ₙ', j: 'ⱼ', 1: '₁', 2: '₂' };
  t = t.replace(/_\{([^}]*)\}/g, (m, g) => g);
  t = t.replace(/_([a-z0-9])/g, (m, g) => sub[g] || g);
  t = t.replace(/\^\{([^}]*)\}/g, (m, g) => superindice(g));
  t = t.replace(/\^2/g, '²').replace(/\^n/g, 'ⁿ');

  return t.replace(/\s+/g, ' ').trim();
}

function superindice(s) {
  const mapa = { '2': '²', '3': '³', n: 'ⁿ', i: 'ⁱ' };
  return String(s).split('').map((c) => mapa[c] || c).join('');
}

/* Reemplaza \comando{arg1}{arg2}... por formato(args), respetando llaves
 * anidadas. Se implementa a mano porque las expresiones regulares no manejan
 * anidamiento de forma fiable. */
function procesarComando(texto, comando, formato, numArgs) {
  let resultado = '';
  let i = 0;

  while (i < texto.length) {
    if (texto.startsWith(comando + '{', i)) {
      i += comando.length;
      const args = [];
      let ok = true;

      for (let a = 0; a < numArgs; a++) {
        if (texto[i] !== '{') { ok = false; break; }
        let nivel = 0;
        let j = i;
        let contenido = '';
        for (; j < texto.length; j++) {
          const c = texto[j];
          if (c === '{') { nivel++; if (nivel === 1) continue; }
          if (c === '}') { nivel--; if (nivel === 0) break; }
          contenido += c;
        }
        args.push(procesarComando(contenido, comando, formato, numArgs));
        i = j + 1;
      }

      if (ok) {
        resultado += formato(args);
        continue;
      }
    }
    resultado += texto[i];
    i++;
  }
  return resultado;
}

/* ---------------------------------------------------------------------------
 * 2) Formato en línea
 * -------------------------------------------------------------------------*/
function enLinea(texto) {
  let t = escaparHtml(texto);

  // Los "$" de precios ($200,000) NO son delimitadores de matemáticas.
  // Se protegen temporalmente los que van seguidos de una cantidad.
  t = t.replace(/\$(\d[\d,]*(?:\.\d+)?)(?![\/\w])/g, '&#36;$1');

  // Matemáticas: $$...$$ y $...$
  t = t.replace(/\$\$([^$]+)\$\$/g, (m, e) => `<em class="mat">${escaparHtml(matematicaLegible(e))}</em>`);
  t = t.replace(/\$([^$\n]+)\$/g, (m, e) => `<em class="mat">${escaparHtml(matematicaLegible(e))}</em>`);

  // Código en línea
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Negritas e itálicas
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

  // Marcadores pendientes de completar
  t = t.replace(/\{\{([^}\n]+)\}\}/g, '<span class="ph">{{$1}}</span>');

  // Restaura los "$" de precios protegidos al inicio
  t = t.replace(/&#36;/g, '$');

  return t;
}

/* Divide una fila de tabla en celdas. */
function celdasDeFila(linea) {
  return linea
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
}

/* ---------------------------------------------------------------------------
 * 3) Conversión por bloques
 * -------------------------------------------------------------------------*/
const lineas = md.split('\n');
const html = [];
let i = 0;

while (i < lineas.length) {
  const linea = lineas[i];

  /* --- línea en blanco --- */
  if (!linea.trim()) { i++; continue; }

  /* --- separador horizontal --- */
  if (/^---+$/.test(linea.trim())) {
    html.push('<hr>');
    i++;
    continue;
  }

  /* --- títulos --- */
  const titulo = linea.match(/^(#{1,6})\s+(.*)$/);
  if (titulo) {
    const nivel = titulo[1].length;
    html.push(`<h${nivel}>${enLinea(titulo[2])}</h${nivel}>`);
    i++;
    continue;
  }

  /* --- tabla --- */
  if (/^\s*\|/.test(linea) && i + 1 < lineas.length && /^\s*\|[\s:|-]+\|\s*$/.test(lineas[i + 1])) {
    const encabezados = celdasDeFila(linea);
    i += 2;
    const filas = [];
    while (i < lineas.length && /^\s*\|/.test(lineas[i])) {
      filas.push(celdasDeFila(lineas[i]));
      i++;
    }
    html.push('<table>');
    html.push('<thead><tr>' + encabezados.map((h) => `<th>${enLinea(h)}</th>`).join('') + '</tr></thead>');
    html.push('<tbody>');
    for (const fila of filas) {
      html.push('<tr>' + fila.map((c) => `<td>${enLinea(c)}</td>`).join('') + '</tr>');
    }
    html.push('</tbody></table>');
    continue;
  }

  /* --- listas --- */
  if (/^\s*[-*]\s+/.test(linea)) {
    const items = [];
    while (i < lineas.length && /^\s*[-*]\s+/.test(lineas[i])) {
      items.push(lineas[i].replace(/^\s*[-*]\s+/, ''));
      i++;
    }
    html.push('<ul>' + items.map((t) => `<li>${enLinea(t)}</li>`).join('') + '</ul>');
    continue;
  }

  if (/^\s*\d+\.\s+/.test(linea)) {
    const items = [];
    while (i < lineas.length && /^\s*\d+\.\s+/.test(lineas[i])) {
      items.push(lineas[i].replace(/^\s*\d+\.\s+/, ''));
      i++;
    }
    html.push('<ol>' + items.map((t) => `<li>${enLinea(t)}</li>`).join('') + '</ol>');
    continue;
  }

  /* --- cita --- */
  if (/^\s*>\s?/.test(linea)) {
    const contenido = [];
    while (i < lineas.length && /^\s*>\s?/.test(lineas[i])) {
      contenido.push(lineas[i].replace(/^\s*>\s?/, ''));
      i++;
    }
    html.push(`<blockquote>${contenido.map((l) => enLinea(l)).join('<br><br>')}</blockquote>`);
    continue;
  }

  /* --- párrafo (agrupa líneas consecutivas) --- */
  const parrafo = [];
  while (
    i < lineas.length &&
    lineas[i].trim() &&
    !/^(#{1,6})\s/.test(lineas[i]) &&
    !/^\s*[-*]\s+/.test(lineas[i]) &&
    !/^\s*\d+\.\s+/.test(lineas[i]) &&
    !/^\s*\|/.test(lineas[i]) &&
    !/^---+$/.test(lineas[i].trim()) &&
    !/^\s*>\s?/.test(lineas[i])
  ) {
    parrafo.push(lineas[i]);
    i++;
  }
  html.push(`<p>${enLinea(parrafo.join(' '))}</p>`);
}

/* ---------------------------------------------------------------------------
 * 4) Documento final
 * -------------------------------------------------------------------------*/
const documento = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Documento del proyecto KNN</title>
<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #222222;
    max-width: 820px;
    margin: 40px auto;
    padding: 0 24px;
  }
  h1 {
    font-size: 20pt;
    color: #1F3864;
    margin: 28px 0 10px;
    line-height: 1.25;
  }
  h2 {
    font-size: 15pt;
    color: #1F3864;
    border-bottom: 2px solid #8EA9DB;
    padding-bottom: 4px;
    margin: 30px 0 12px;
  }
  h3 {
    font-size: 12pt;
    color: #2F5597;
    margin: 20px 0 8px;
  }
  p { margin: 0 0 10px; text-align: justify; }
  ul, ol { margin: 0 0 12px 0; padding-left: 26px; }
  li { margin-bottom: 5px; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0 18px;
    font-size: 9.5pt;
  }
  th {
    background: #D9E2F3;
    border: 1px solid #8EA9DB;
    padding: 6px 8px;
    text-align: left;
    vertical-align: middle;
  }
  td {
    border: 1px solid #BFBFBF;
    padding: 5px 8px;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #FAFAFA; }
  code {
    font-family: Consolas, 'Courier New', monospace;
    background: #F2F2F2;
    padding: 1px 4px;
    font-size: 9.5pt;
  }
  hr { border: none; border-top: 1px solid #BFBFBF; margin: 24px 0; }
  blockquote {
    border-left: 3px solid #8EA9DB;
    margin: 12px 0;
    padding: 6px 14px;
    background: #F7F9FC;
  }
  .mat { font-family: 'Cambria Math', Georgia, serif; font-style: italic; }
  .ph {
    background: #FFF2CC;
    color: #B45F06;
    font-weight: bold;
  }
  strong { color: #1F3864; }
  td strong { color: inherit; }
</style>
</head>
<body>
${html.join('\n')}
</body>
</html>
`;

fs.writeFileSync(salida, documento, 'utf8');

const tablas = (documento.match(/<table>/g) || []).length;
const marcadores = new Set((documento.match(/\{\{[^}]+\}\}/g) || []));
console.log(`✓ ${salida}`);
console.log(`  Tablas: ${tablas}`);
console.log(`  Marcadores pendientes: ${marcadores.size}`);
