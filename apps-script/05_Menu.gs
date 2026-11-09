/* ============================================================================
 *  05_Menu.gs  —  Menú, modo demostración y documentación del código
 * ----------------------------------------------------------------------------
 *  Este archivo mejora la experiencia de uso: agrega un menú propio a la hoja,
 *  permite probar el sistema con datos sintéticos y publica el código en la
 *  pestaña 09_Codigo (requisito del entregable).
 * ==========================================================================*/

/* ----------------------------------------------------------------------------
 *  MENÚ
 * --------------------------------------------------------------------------*/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('KNN Vehículos')
    .addItem('1. Instalar (formulario + hojas)', 'instalarTodo')
    .addSeparator()
    .addItem('2. Ejecutar análisis', 'ejecutarAnalisis')
    .addItem('3. Ver enlace del formulario', 'mostrarEnlaceFormulario')
    .addItem('4. Completar documento con mis datos', 'reemplazarMarcadoresEnDocumento')
    .addSeparator()
    .addItem('Ver guía', 'irAGuia')
    .addItem('Ver código documentado', 'irACodigo')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Datos de demostración')
      .addItem('Activar (datos sintéticos)', 'activarModoDemo')
      .addItem('Desactivar y borrar', 'desactivarModoDemo'))
    .addSeparator()
    .addItem('Borrar resultados del análisis', 'borrarResultados')
    .addItem('Acerca de este proyecto', 'acercaDe')
    .addToUi();
}

function irAGuia() {
  SpreadsheetApp.getActive().setActiveSheet(obtenerOCrearHoja(CONFIG.HOJAS.GUIA));
}

function irACodigo() {
  escribirHojaCodigo();
  SpreadsheetApp.getActive().setActiveSheet(obtenerOCrearHoja(CONFIG.HOJAS.CODIGO));
}

function acercaDe() {
  avisar(
    'PROYECTO KNN — CLASIFICACIÓN DE VEHÍCULOS\n\n' +
    'Algoritmo: K vecinos más cercanos (KNN) con distancia euclidiana ponderada.\n' +
    'Clases: ' + CLASES.join(', ') + '.\n' +
    'Variables: ' + FEATURES.length + ' (normalizadas min-max).\n' +
    'Entrada: descripción de un vehículo real (carrocería, tamaño, carga, motor y uso).\n' +
    'Evaluación: holdout 70/30 + validación cruzada estratificada de ' + CONFIG.FOLDS + ' particiones.\n\n' +
    'Todo el código está comentado en el editor de Apps Script y resumido en la pestaña 09_Codigo.'
  );
}

/* ----------------------------------------------------------------------------
 *  MODO DEMOSTRACIÓN
 * ----------------------------------------------------------------------------
 *  Sirve para ensayar la presentación antes de tener respuestas reales, o para
 *  verificar que el sistema funciona tras instalarlo.
 *
 *  IMPORTANTE: los datos son SINTÉTICOS. Viven en una pestaña aparte
 *  (ZZ_Respuestas_Demo) y NUNCA se mezclan con las respuestas reales. Mientras
 *  el modo esté activo, todos los resultados quedan marcados como demostración.
 * --------------------------------------------------------------------------*/
function activarModoDemo() {
  var ui = SpreadsheetApp.getUi();
  var respuesta = ui.alert(
    'Modo demostración',
    'Se crearán 60 descripciones SINTÉTICAS de vehículos para probar el sistema.\n\n' +
    'Estos datos NO sirven para la entrega: son inventados por el script para ' +
    'verificar que todo funciona.\n\n' +
    'Se guardan en una pestaña aparte y no tocan las respuestas reales.\n\n' +
    '¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  if (respuesta !== ui.Button.YES) return;

  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.DEMO));
  var sinteticas = generarRespuestasSinteticas(60, CONFIG.SEMILLA, 0.06);

  var encabezados = ['Marca temporal'];
  for (var p = 0; p < PREGUNTAS.length; p++) encabezados.push(PREGUNTAS[p].titulo);

  var filas = sinteticas.map(function (r) {
    var fila = [new Date()];
    for (var q = 0; q < PREGUNTAS.length; q++) {
      var valor = r[PREGUNTAS[q].id];
      fila.push(valor === undefined || valor === null ? '' : valor);
    }
    return fila;
  });

  // Encabezados en la fila 1 (obligatorio para que leerRespuestas los encuentre)
  hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados])
    .setFontWeight('bold').setBackground('#FFC7CE').setWrap(true);
  if (filas.length) hoja.getRange(2, 1, filas.length, encabezados.length).setValues(filas);
  hoja.setFrozenRows(1);
  hoja.setTabColor('#CC0000');
  hoja.autoResizeColumns(1, Math.min(encabezados.length, 22));

  PropertiesService.getScriptProperties().setProperty('MODO_DEMO', 'true');

  var idForm = PropertiesService.getScriptProperties().getProperty('ID_FORMULARIO');
  try {
    escribirGuia(idForm ? FormApp.openById(idForm) : null);
  } catch (e) { /* si no hay formulario, la guía se reescribe sin enlace */ }

  avisar('Modo demostración activado.\n\nEjecuta ahora "2. Ejecutar análisis".\n\n' +
    'Recuerda desactivarlo antes de generar la entrega final.');
}

function desactivarModoDemo() {
  var ui = SpreadsheetApp.getUi();
  var libro = SpreadsheetApp.getActive();
  var hoja = libro.getSheetByName(CONFIG.HOJAS.DEMO);

  if (hoja) {
    var respuesta = ui.alert('Desactivar demostración',
      'Se eliminará la pestaña "' + CONFIG.HOJAS.DEMO + '" con los datos sintéticos.\n' +
      'Los resultados del análisis seguirán en sus pestañas hasta que vuelvas a ejecutarlo.\n\n¿Continuar?',
      ui.ButtonSet.YES_NO);
    if (respuesta !== ui.Button.YES) return;
    libro.deleteSheet(hoja);
  }

  PropertiesService.getScriptProperties().deleteProperty('MODO_DEMO');

  var idForm = PropertiesService.getScriptProperties().getProperty('ID_FORMULARIO');
  try {
    escribirGuia(idForm ? FormApp.openById(idForm) : null);
  } catch (e) { }

  avisar('Modo demostración desactivado. El análisis volverá a leer las respuestas reales.');
}

/* ----------------------------------------------------------------------------
 *  LIMPIEZA DE RESULTADOS
 * --------------------------------------------------------------------------*/
function borrarResultados() {
  var ui = SpreadsheetApp.getUi();
  var respuesta = ui.alert('Borrar resultados',
    'Se vaciarán las pestañas 01 a 10 (los datos de respuestas NO se tocan).\n\n¿Continuar?',
    ui.ButtonSet.YES_NO);
  if (respuesta !== ui.Button.YES) return;

  var nombres = [
    CONFIG.HOJAS.DATASET, CONFIG.HOJAS.ENTRENAMIENTO, CONFIG.HOJAS.PRUEBA,
    CONFIG.HOJAS.PREDICCIONES, CONFIG.HOJAS.MATRIZ, CONFIG.HOJAS.CRUZADA,
    CONFIG.HOJAS.METRICAS, CONFIG.HOJAS.RESUMEN, CONFIG.HOJAS.REPORTE,
    CONFIG.HOJAS.VALORES
  ];
  for (var i = 0; i < nombres.length; i++) {
    var hoja = SpreadsheetApp.getActive().getSheetByName(nombres[i]);
    if (hoja) limpiarHoja(hoja);
  }
  avisar('Resultados borrados. Las respuestas originales siguen intactas.');
}

/* ----------------------------------------------------------------------------
 *  PESTAÑA 09_Codigo
 * ----------------------------------------------------------------------------
 *  Requisito del entregable: "Código JavaScript altamente documentado" dentro
 *  de la hoja de cálculo. Se publica un índice de archivos y el núcleo del
 *  algoritmo, que es la parte que se explica en la presentación.
 * --------------------------------------------------------------------------*/
function escribirHojaCodigo() {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.CODIGO));
  var fila = 1;

  hoja.getRange(fila, 1).setValue('CÓDIGO JAVASCRIPT DEL PROYECTO (documentado)')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);
  fila += 2;

  hoja.getRange(fila, 1, 1, 3)
    .setValues([['Archivo', 'Contenido', 'Líneas aprox.']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;

  var indice = [
    ['00_Config.gs', 'Parámetros del experimento: semilla, proporción de prueba, k, folds, colores y nombres de hojas.', 90],
    ['01_Datos.gs', 'Preguntas del formulario, codificación de respuestas (texto a número) y definición de las 14 variables.', 350],
    ['01b_Hojas.gs', 'Lectura de respuestas desde Google Sheets, limpieza, duplicados y escritura del dataset.', 330],
    ['02_KNN.gs', 'Núcleo del algoritmo: normalización, distancia, votación, matriz de confusión, métricas y particiones.', 600],
    ['03_Analisis.gs', 'Pipeline completo: divide, entrena, evalúa y genera las pestañas de resultados y el reporte.', 520],
    ['04_Instalador.gs', 'Creación automática del formulario y de la estructura de la hoja.', 190],
    ['05_Menu.gs', 'Menú, modo demostración y esta documentación.', 400],
    ['06_Valores.gs', 'Tabla de valores para completar el documento y explicación de la confusión principal.', 200]
  ];
  hoja.getRange(fila, 1, indice.length, 3).setValues(indice).setWrap(true).setVerticalAlignment('top');
  fila += indice.length + 2;

  hoja.getRange(fila, 1).setValue(
    'El código completo está en el editor (Extensiones > Apps Script). ' +
    'A continuación se reproduce el núcleo del algoritmo, que es la parte que se explica en la presentación.'
  ).setFontStyle('italic');
  hoja.getRange(fila, 1, 1, 3).merge();
  fila += 2;

  var bloques = [
    {
      titulo: '1) DISTANCIA EUCLIDIANA PONDERADA',
      codigo:
        '/* Distancia entre dos perfiles ya normalizados.\n' +
        ' * d(a,b) = raiz( suma( w_i * (a_i - b_i)^2 ) )\n' +
        ' * El peso w_i permite que unas variables influyan mas que otras. */\n' +
        'function distanciaEuclidiana(a, b, spec) {\n' +
        '  var suma = 0;\n' +
        '  for (var i = 0; i < a.length; i++) {\n' +
        '    var diferencia = a[i] - b[i];\n' +
        '    suma += spec[i].peso * diferencia * diferencia;\n' +
        '  }\n' +
        '  return Math.sqrt(suma);\n' +
        '}'
    },
    {
      titulo: '2) PREDICCIÓN KNN (votación de los k vecinos)',
      codigo:
        'function predecirKNN(modelo, perfil, k) {\n' +
        '  var vector = normalizarFila(perfil, modelo.spec);\n' +
        '\n' +
        '  // Paso 1: distancia a TODOS los ejemplos de entrenamiento\n' +
        '  var vecinos = [];\n' +
        '  for (var i = 0; i < modelo.X.length; i++) {\n' +
        '    vecinos.push({\n' +
        '      clase: modelo.y[i],\n' +
        '      distancia: distanciaEuclidiana(vector, modelo.X[i], modelo.spec)\n' +
        '    });\n' +
        '  }\n' +
        '\n' +
        '  // Paso 2: ordenar de menor a mayor y tomar los k primeros\n' +
        '  vecinos.sort(function (a, b) { return a.distancia - b.distancia; });\n' +
        '  var seleccionados = vecinos.slice(0, Math.min(k, vecinos.length));\n' +
        '\n' +
        '  // Paso 3: votar. El voto vale 1/distancia: el vecino mas cercano pesa mas.\n' +
        '  var votos = {};\n' +
        '  seleccionados.forEach(function (v) {\n' +
        '    var aporte = 1 / (v.distancia + 1e-9);\n' +
        '    votos[v.clase] = (votos[v.clase] || 0) + aporte;\n' +
        '  });\n' +
        '\n' +
        '  // Paso 4: ganar la clase con mas votos\n' +
        '  var mejorClase = null, mejorVoto = -Infinity;\n' +
        '  for (var clase in votos) {\n' +
        '    if (votos[clase] > mejorVoto) { mejorVoto = votos[clase]; mejorClase = clase; }\n' +
        '  }\n' +
        '  return { clase: mejorClase, vecinos: seleccionados, votos: votos };\n' +
        '}'
    },
    {
      titulo: '3) NORMALIZACIÓN MIN-MAX',
      codigo:
        '/* x\' = (x - min) / (max - min)\n' +
        ' * min y max se calculan SOLO con entrenamiento (evita fuga de informacion). */\n' +
        'function normalizarValor(valor, spec) {\n' +
        '  var rango = spec.max - spec.min;\n' +
        '  if (rango === 0) return 0;   // variable constante: no aporta\n' +
        '  return (Number(valor) - spec.min) / rango;\n' +
        '}'
    },
    {
      titulo: '4) MATRIZ DE CONFUSIÓN',
      codigo:
        '/* filas = clase real, columnas = clase predicha, diagonal = aciertos */\n' +
        'function calcularMatrizConfusion(reales, predichos, clases) {\n' +
        '  var n = clases.length, matriz = [];\n' +
        '  for (var i = 0; i < n; i++) matriz.push(new Array(n).fill(0));\n' +
        '  for (var m = 0; m < reales.length; m++) {\n' +
        '    var fila = clases.indexOf(reales[m]);\n' +
        '    var col  = clases.indexOf(predichos[m]);\n' +
        '    if (fila !== -1 && col !== -1) matriz[fila][col]++;\n' +
        '  }\n' +
        '  return matriz;\n' +
        '}'
    },
    {
      titulo: '5) MÉTRICAS POR CLASE (precisión, recall y F1)',
      codigo:
        '/* VP = verdaderos positivos, FP = falsos positivos, FN = falsos negativos\n' +
        ' * Precision = VP / (VP + FP)   -> que tan confiable es cuando dice "es X"\n' +
        ' * Recall    = VP / (VP + FN)   -> cuantos X reales logra encontrar\n' +
        ' * F1        = 2PR / (P + R)    -> equilibrio entre ambas */\n' +
        'var precision = (vp + fp) === 0 ? 0 : vp / (vp + fp);\n' +
        'var recall    = soporte === 0 ? 0 : vp / soporte;\n' +
        'var f1        = (precision + recall) === 0 ? 0\n' +
        '              : 2 * precision * recall / (precision + recall);'
    },
    {
      titulo: '6) PARTICIÓN ESTRATIFICADA 70/30 CON SEMILLA',
      codigo:
        '/* Se baraja cada clase por separado y se toma su 30 % para prueba.\n' +
        ' * Asi ninguna clase queda fuera del conjunto de prueba. */\n' +
        'var filas = barajar(grupos[clase], rng);   // rng = PRNG con semilla fija\n' +
        'var nPrueba = Math.round(filas.length * 0.30);\n' +
        'for (var j = 0; j < filas.length; j++) {\n' +
        '  if (j < nPrueba) prueba.push(filas[j]); else entrenamiento.push(filas[j]);\n' +
        '}'
    }
  ];

  for (var b = 0; b < bloques.length; b++) {
    hoja.getRange(fila, 1).setValue(bloques[b].titulo)
      .setFontWeight('bold').setFontColor(CONFIG.COLOR.ENCABEZADO).setFontSize(11);
    fila++;

    var celdas = hoja.getRange(fila, 1).setValue(bloques[b].codigo);
    celdas.setFontFamily('Consolas').setFontSize(9)
      .setBackground('#F5F5F5').setWrap(true).setVerticalAlignment('top');

    var lineas = bloques[b].codigo.split('\n').length;
    hoja.setRowHeight(fila, lineas * 13 + 8);
    fila += 2;
  }

  hoja.setColumnWidth(1, 900);
  for (var c = 2; c <= 3; c++) hoja.setColumnWidth(c, 180);
  hoja.getRange(1, 1, fila, 1).setVerticalAlignment('top');
}
