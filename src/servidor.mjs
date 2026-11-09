/* Servidor estático mínimo para revisar el HTML en el navegador.
 * Uso: node src/servidor.mjs [puerto]  -> http://localhost:8123/ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puerto = Number(process.argv[2] || 8123);

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const archivo = path.join(raiz, url === '/' ? 'web/knn_demo.html' : url);
  if (!archivo.startsWith(raiz)) { res.writeHead(403).end(); return; }
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404).end('No encontrado'); return; }
    res.writeHead(200, {
      'Content-Type': tipos[path.extname(archivo)] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(datos);
  });
}).listen(puerto, () => console.log(`http://localhost:${puerto}/`));
