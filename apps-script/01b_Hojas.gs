/* ============================================================================
 *  01b_Hojas.gs  —  Acceso a Google Sheets: lectura y escritura
 * ----------------------------------------------------------------------------
 *  Aquí vive TODO lo que toca la Hoja de cálculo. El algoritmo (02_KNN.gs) no
 *  sabe que existe Google Sheets; esta capa hace de puente.
 *
 *  Funciones principales:
 *    leerRespuestas()      -> lee la pestaña del formulario y devuelve objetos
 *    construirDataset()    -> convierte texto en números y valida
 *    escribirDataset()     -> guarda el dataset limpio en 01_Dataset
 *    utilidades de formato -> encabezados, colores, anchos, bordes
 * ==========================================================================*/

/* ----------------------------------------------------------------------------
 *  UTILIDADES DE LIBRO Y HOJAS
 * --------------------------------------------------------------------------*/

/** Devuelve la hoja con ese nombre; si no existe, la crea. */
function obtenerOCrearHoja(nombre) {
  var libro = SpreadsheetApp.getActive();
  var hoja = libro.getSheetByName(nombre);
  if (!hoja) {
    hoja = libro.insertSheet(nombre);
  }
  return hoja;
}

/** Borra todo el contenido y el formato de una hoja (la deja en blanco). */
function limpiarHoja(hoja) {
  hoja.clear();
  // clear() no elimina reglas de formato condicional ni anchos: se limpian aparte
  hoja.setConditionalFormatRules([]);
  return hoja;
}

/**
 * Escribe una tabla con encabezado y la formatea.
 *
 * @param {Sheet}  hoja
 * @param {Array}  encabezados  Texto de cada columna
 * @param {Array}  filas        Matriz de valores (mismo número de columnas)
 * @param {Object} opciones     { titulo, congelar, anchoPrimeraColumna, numero }
 * @return {Object} { filaEncabezado, primeraFilaDatos, ultimaFila, numColumnas }
 */
function escribirTabla(hoja, encabezados, filas, opciones) {
  opciones = opciones || {};
  limpiarHoja(hoja);

  var numColumnas = encabezados.length;
  var filaActual = 1;

  // Título opcional (fila 1) con fondo de color.
  // No se combina la celda: combinar e inmovilizar columnas es incompatible en
  // Google Sheets ("No puedes inmovilizar columnas que solo contengan parte de
  // una celda combinada"). El texto se desborda sobre el fondo, que es lo que
  // se ve igual.
  if (opciones.titulo) {
    hoja.getRange(1, 1, 1, numColumnas)
      .setBackground(CONFIG.COLOR.ENCABEZADO);
    hoja.getRange(1, 1)
      .setValue(opciones.titulo)
      .setFontWeight('bold')
      .setFontSize(12)
      .setBackground(CONFIG.COLOR.ENCABEZADO)
      .setFontColor(CONFIG.COLOR.TEXTO_ENCABEZADO)
      .setHorizontalAlignment('left')
      .setVerticalAlignment('middle');
    hoja.setRowHeight(1, 28);
    filaActual = 2;
  }

  // Encabezados
  var filaEncabezado = filaActual;
  var rangoEncabezado = hoja.getRange(filaEncabezado, 1, 1, numColumnas);
  rangoEncabezado.setValues([encabezados])
    .setFontWeight('bold')
    .setBackground(CONFIG.COLOR.SUBTITULO)
    .setFontColor('#000000')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  hoja.setRowHeight(filaEncabezado, 34);
  filaActual++;

  // Datos
  var primeraFilaDatos = filaActual;
  if (filas && filas.length) {
    // Columnas que deben guardarse como TEXTO (por ejemplo, "68.18%").
    // Sin esto, Sheets convierte "68.18%" en el número 0.6818 y luego el
    // documento recibe el decimal en lugar del porcentaje.
    if (opciones.columnasTexto) {
      for (var ct = 0; ct < opciones.columnasTexto.length; ct++) {
        hoja.getRange(primeraFilaDatos, opciones.columnasTexto[ct], filas.length, 1)
          .setNumberFormat('@');
      }
    }
    hoja.getRange(primeraFilaDatos, 1, filas.length, numColumnas).setValues(filas);
  }
  var ultimaFila = primeraFilaDatos + Math.max(0, (filas ? filas.length : 0)) - 1;

  // Formato general
  hoja.setFrozenRows(filaEncabezado);
  if (opciones.congelarColumnas) hoja.setFrozenColumns(opciones.congelarColumnas);
  hoja.getRange(filaEncabezado, 1, Math.max(1, ultimaFila - filaEncabezado + 1), numColumnas)
    .setVerticalAlignment('middle');
  hoja.autoResizeColumns(1, numColumnas);

  // Evita columnas gigantes cuando hay mucho texto en la última
  for (var c = 1; c <= numColumnas; c++) {
    var ancho = hoja.getColumnWidth(c);
    if (ancho > 320) hoja.setColumnWidth(c, 320);
    if (ancho < 70) hoja.setColumnWidth(c, 70);
  }

  return {
    filaEncabezado: filaEncabezado,
    primeraFilaDatos: primeraFilaDatos,
    ultimaFila: ultimaFila,
    numColumnas: numColumnas
  };
}

/** Pinta un encabezado de sección (subtítulo) dentro de una hoja. */
function escribirSubtitulo(hoja, fila, texto, numColumnas) {
  hoja.getRange(fila, 1, 1, numColumnas).merge()
    .setValue(texto)
    .setFontWeight('bold')
    .setBackground(CONFIG.COLOR.SUBTITULO)
    .setFontColor('#1F3864');
  hoja.getRange(fila, 1, 1, numColumnas).setBorder(null, null, true, null, null, null,
    '#8EA9DB', SpreadsheetApp.BorderStyle.SOLID);
}

/** Aplica formato de porcentaje a un rango. */
function formatoPorcentaje(hoja, fila, columna, filas, columnas) {
  hoja.getRange(fila, columna, filas || 1, columnas || 1).setNumberFormat('0.00%');
}

/* ----------------------------------------------------------------------------
 *  LOCALIZAR LA HOJA DE RESPUESTAS DEL FORMULARIO
 * ----------------------------------------------------------------------------
 *  No se asume un nombre fijo ("Respuestas de formulario 1") porque Google
 *  cambia el nombre según el idioma de la cuenta. En su lugar se busca la hoja
 *  que contenga la pregunta de la clase en su primera fila.
 * --------------------------------------------------------------------------*/
function obtenerHojaRespuestas() {
  var libro = SpreadsheetApp.getActive();
  var hojas = libro.getSheets();
  var nombresReservados = Object.keys(CONFIG.HOJAS).map(function (k) { return CONFIG.HOJAS[k]; });

  // Se usa el título de la pregunta de la clase como "huella" de la hoja de
  // respuestas correcta. Así el código sigue funcionando aunque el formulario
  // cambie de preguntas.
  var huellaClase = '';
  for (var p = 0; p < PREGUNTAS.length; p++) {
    if (PREGUNTAS[p].id === 'clase') huellaClase = normalizarTexto(PREGUNTAS[p].titulo);
  }

  for (var i = 0; i < hojas.length; i++) {
    var hoja = hojas[i];
    var nombre = hoja.getName();
    if (nombresReservados.indexOf(nombre) !== -1) continue;

    var ultimaColumna = Math.max(1, hoja.getLastColumn());
    if (hoja.getLastRow() === 0) continue;

    var encabezados = hoja.getRange(1, 1, 1, ultimaColumna).getValues()[0];
    var textoFila = normalizarTexto(encabezados.join(' | '));

    if (huellaClase && textoFila.indexOf(huellaClase) !== -1) return hoja;
  }

  // Último recurso: una hoja cuyo NOMBRE indique que es la de respuestas.
  for (var j = 0; j < hojas.length; j++) {
    var n = normalizarTexto(hojas[j].getName());
    if (nombresReservados.map(normalizarTexto).indexOf(n) !== -1) continue;
    if (n.indexOf('respuestas de formulario') !== -1 || n.indexOf('form responses') !== -1) {
      return hojas[j];
    }
  }

  return null;
}

/* ----------------------------------------------------------------------------
 *  LECTURA DE RESPUESTAS
 * ----------------------------------------------------------------------------
 *  Devuelve { filas: [ {id, personas, clase, ...} ], faltantes: [...], total }
 *  La correspondencia columna -> pregunta se hace por el TEXTO del encabezado,
 *  no por posición: así el script sigue funcionando si el formulario agrega o
 *  reordena preguntas.
 * --------------------------------------------------------------------------*/
function leerRespuestas() {
  var props = PropertiesService.getScriptProperties();
  var modoDemo = props.getProperty('MODO_DEMO') === 'true';

  var hoja = modoDemo
    ? SpreadsheetApp.getActive().getSheetByName(CONFIG.HOJAS.DEMO)
    : obtenerHojaRespuestas();

  if (modoDemo && !hoja) {
    throw new Error('El modo demostración está activo pero no existe la pestaña "' +
      CONFIG.HOJAS.DEMO + '". Desactívalo desde el menú.');
  }

  if (!hoja) {
    throw new Error(
      'No se encontró la hoja de respuestas del formulario. ' +
      'Verifica que el formulario esté vinculado a esta hoja de cálculo ' +
      '(Formulario > Respuestas > Vincular a Hojas de cálculo).'
    );
  }

  var ultimaFila = hoja.getLastRow();
  var ultimaColumna = hoja.getLastColumn();
  if (ultimaFila < 2) {
    return { filas: [], faltantes: [], total: 0, hoja: hoja.getName(), modoDemo: modoDemo };
  }

  var valores = hoja.getRange(1, 1, ultimaFila, ultimaColumna).getValues();
  var encabezados = valores[0];

  // --- índice: id de pregunta -> número de columna ---
  var indices = {};
  var faltantes = [];

  for (var p = 0; p < PREGUNTAS.length; p++) {
    var pregunta = PREGUNTAS[p];
    var buscado = normalizarTexto(pregunta.titulo);
    var encontrado = -1;

    for (var c = 0; c < encabezados.length; c++) {
      var tituloColumna = normalizarTexto(encabezados[c]);
      if (tituloColumna === buscado) { encontrado = c; break; }
    }

    // Segundo intento: comparar sin el número inicial ("1. ", "2. "...)
    if (encontrado === -1) {
      var sinNumero = buscado.replace(/^\d+\s*/, '');
      for (var c2 = 0; c2 < encabezados.length; c2++) {
        var t2 = normalizarTexto(encabezados[c2]).replace(/^\d+\s*/, '');
        if (t2 === sinNumero) { encontrado = c2; break; }
      }
    }

    if (encontrado !== -1) indices[pregunta.id] = encontrado;
    else faltantes.push(pregunta.titulo);
  }

  // --- construir objetos ---
  var filas = [];
  for (var f = 1; f < valores.length; f++) {
    var fila = valores[f];
    var vacia = fila.every(function (v) { return v === '' || v === null; });
    if (vacia) continue;

    var registro = { id: 'R' + String(f).padStart(3, '0') };

    for (var q = 0; q < PREGUNTAS.length; q++) {
      var id = PREGUNTAS[q].id;
      if (indices[id] === undefined) {
        registro[id] = '';
      } else {
        var valor = fila[indices[id]];
        registro[id] = (valor === null || valor === undefined) ? '' : valor;
      }
    }
    filas.push(registro);
  }

  return {
    filas: filas,
    faltantes: faltantes,
    total: filas.length,
    hoja: hoja.getName(),
    modoDemo: modoDemo
  };
}

/* ----------------------------------------------------------------------------
 *  CONSTRUCCIÓN DEL DATASET LIMPIO
 * ----------------------------------------------------------------------------
 *  Pasos de preparación (esto es lo que se documenta en el informe):
 *   1. Validar que cada respuesta tenga todas las variables necesarias.
 *   2. Convertir texto -> número según la codificación de 01_Datos.gs.
 *   3. Eliminar duplicados exactos (doble envío del mismo formulario).
 *   4. Descartar (no inventar) los registros con valores no reconocidos.
 * --------------------------------------------------------------------------*/
function construirDataset(respuestas) {
  var validas = [];
  var errores = [];

  for (var i = 0; i < respuestas.length; i++) {
    var resultado = mapearRespuesta(respuestas[i], i);
    if (resultado.error) {
      errores.push({ id: respuestas[i].id, motivo: resultado.error });
    } else {
      validas.push(resultado);
    }
  }

  // --- duplicados ---
  var duplicados = 0;
  if (CONFIG.ELIMINAR_DUPLICADOS) {
    var vistos = {};
    var sinDuplicados = [];
    for (var j = 0; j < validas.length; j++) {
      var huella = FEATURES.map(function (f) { return validas[j][f.id]; }).join('|') + '#' + validas[j].clase;
      if (vistos[huella]) { duplicados++; continue; }
      vistos[huella] = true;
      sinDuplicados.push(validas[j]);
    }
    validas = sinDuplicados;
  }

  return { datos: validas, errores: errores, duplicados: duplicados };
}

/* ----------------------------------------------------------------------------
 *  ESCRITURA DEL DATASET
 * ----------------------------------------------------------------------------
 *  Columnas: ID | Clase | 14 features del modelo | variables de control
 *  Las variables de control se conservan para el análisis descriptivo, pero el
 *  modelo NO las usa (así se evita ruido y sobreajuste).
 * --------------------------------------------------------------------------*/
function columnasDataset() {
  var columnas = [
    { clave: 'id', etiqueta: 'ID' },
    { clave: 'clase', etiqueta: 'Clase (variable objetivo)' }
  ];
  for (var i = 0; i < FEATURES.length; i++) {
    columnas.push({ clave: FEATURES[i].id, etiqueta: FEATURES[i].etiqueta });
  }
  // variables de control (no entran al modelo)
  columnas.push({ clave: 'propio', etiqueta: '[control] Es propio' });
  columnas.push({ clave: 'puertas', etiqueta: '[control] Puertas laterales' });
  columnas.push({ clave: 'offroad', etiqueta: '[control] Capacidad fuera del pavimento (1-5)' });
  columnas.push({ clave: 'uso_principal_txt', etiqueta: '[control] Uso principal' });
  columnas.push({ clave: 'siete_asientos_txt', etiqueta: '[control] ¿7+ asientos?' });
  return columnas;
}

function escribirDataset(hoja, datos, titulo) {
  var columnas = columnasDataset();
  var encabezados = columnas.map(function (c) { return c.etiqueta; });
  var filas = datos.map(function (d) {
    return columnas.map(function (c) {
      var v = d[c.clave];
      return (v === undefined || v === null) ? '' : v;
    });
  });
  return escribirTabla(hoja, encabezados, filas, {
    titulo: titulo || ('DATASET PREPARADO — ' + datos.length + ' registros válidos'),
    congelarColumnas: 2
  });
}

/** Cuenta cuántos registros hay por clase. */
function distribucionClases(datos) {
  var conteo = {};
  for (var i = 0; i < datos.length; i++) {
    conteo[datos[i].clase] = (conteo[datos[i].clase] || 0) + 1;
  }
  return conteo;
}

/** Calcula media y varianza de cada feature (para el análisis de datos). */
function estadisticasFeatures(datos) {
  return FEATURES.map(function (f) {
    var valores = datos.map(function (d) { return Number(d[f.id]); });
    var media = valores.reduce(function (a, b) { return a + b; }, 0) / valores.length;
    var varianza = valores.reduce(function (a, b) { return a + (b - media) * (b - media); }, 0) / valores.length;
    return {
      id: f.id,
      etiqueta: f.etiqueta,
      peso: f.peso,
      media: media,
      varianza: varianza,
      minimo: Math.min.apply(null, valores),
      maximo: Math.max.apply(null, valores)
    };
  });
}
