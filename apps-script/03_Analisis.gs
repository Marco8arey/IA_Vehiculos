/* ============================================================================
 *  03_Analisis.gs  —  Pipeline completo: datos -> modelo -> resultados
 * ----------------------------------------------------------------------------
 *  Esta es la función que se ejecuta para generar TODOS los entregables de la
 *  hoja de cálculo. Orden de ejecución:
 *
 *     1. Leer respuestas del formulario
 *     2. Convertir y limpiar (dataset)
 *     3. Dividir en entrenamiento (70 %) y prueba (30 %), estratificado
 *     4. Elegir k con leave-one-out (sin tocar el conjunto de prueba)
 *     5. Entrenar y predecir el conjunto de prueba
 *     6. Calcular matriz de confusión y métricas
 *     7. Validación cruzada 5-fold (evidencia adicional, más robusta)
 *     8. Escribir las pestañas: 01 a 10
 * ==========================================================================*/

/**
 * Punto de entrada principal. Ejecutar desde el menú "KNN Vehículos".
 */
function ejecutarAnalisis() {
  var inicio = new Date();
  console.log('=== INICIO DEL ANÁLISIS: ' + inicio.toISOString() + ' ===');

  /* --- 1. Lectura ------------------------------------------------------- */
  var lectura = leerRespuestas();
  console.log('Respuestas encontradas: ' + lectura.total);
  if (lectura.faltantes.length) {
    console.log('ADVERTENCIA: preguntas sin columna -> ' + lectura.faltantes.join(' | '));
  }

  /* --- 2. Dataset ------------------------------------------------------- */
  var construccion = construirDataset(lectura.filas);
  var datos = construccion.datos;

  if (datos.length < CONFIG.MIN_RESPUESTAS) {
    throw new Error(
      'Solo hay ' + datos.length + ' descripciones válidas y se requieren al menos ' +
      CONFIG.MIN_RESPUESTAS + '. Sigue difundiendo el formulario y vuelve a ejecutar el análisis.'
    );
  }

  // Si alguna clase quedó sin ejemplos, la matriz no se puede interpretar bien.
  var dist = distribucionClases(datos);
  var clasesFaltantes = CLASES.filter(function (c) { return !dist[c]; });
  if (clasesFaltantes.length) {
    throw new Error('No hay respuestas para las clases: ' + clasesFaltantes.join(', ') +
      '. El modelo necesita ejemplos de las 5 clases.');
  }

  /* --- 3. Escritura del dataset ----------------------------------------- */
  escribirDataset(obtenerOCrearHoja(CONFIG.HOJAS.DATASET), datos);

  /* --- 4. Partición ----------------------------------------------------- */
  var particion = dividirEstratificado(datos, CONFIG.PROPORCION_PRUEBA, CONFIG.SEMILLA, 'clase');
  escribirDataset(obtenerOCrearHoja(CONFIG.HOJAS.ENTRENAMIENTO), particion.entrenamiento,
    'CONJUNTO DE ENTRENAMIENTO — ' + particion.entrenamiento.length + ' registros (' +
    Math.round((1 - CONFIG.PROPORCION_PRUEBA) * 100) + ' %)');
  escribirDataset(obtenerOCrearHoja(CONFIG.HOJAS.PRUEBA), particion.prueba,
    'CONJUNTO DE PRUEBA — ' + particion.prueba.length + ' registros (' +
    Math.round(CONFIG.PROPORCION_PRUEBA * 100) + ' %)');

  /* --- 5. Selección de k ------------------------------------------------ */
  var seleccion = elegirMejorK(particion.entrenamiento, FEATURES, CONFIG.CANDIDATOS_K);
  var k = CONFIG.K_FIJO > 0 ? CONFIG.K_FIJO : seleccion.mejorK;
  console.log('k elegido: ' + k + ' (LOO)');

  /* --- 6. Evaluación en el conjunto de prueba --------------------------- */
  var holdout = evaluarConjuntoPrueba(particion.entrenamiento, particion.prueba, FEATURES, k);
  ordenarResultadoPorClases(holdout);
  console.log('Exactitud holdout: ' + porcentaje(holdout.metricas.exactitud));

  /* --- 7. Validación cruzada -------------------------------------------- */
  var cruzada = evaluarValidacionCruzada(datos, FEATURES, k, CONFIG.FOLDS, CONFIG.SEMILLA);
  ordenarResultadoPorClases(cruzada);
  console.log('Exactitud validación cruzada: ' + porcentaje(cruzada.metricas.exactitud));

  /* --- 8. Escritura de resultados --------------------------------------- */
  escribirPredicciones(holdout, k);
  escribirHojaMatriz(holdout, k);
  escribirHojaValidacionCruzada(cruzada, k);
  escribirHojaMetricas(holdout, cruzada, seleccion, k, particion);
  escribirHojaResumen(lectura, construccion, datos, particion, inicio);
  escribirHojaReporte({
    lectura: lectura,
    construccion: construccion,
    datos: datos,
    particion: particion,
    seleccion: seleccion,
    k: k,
    holdout: holdout,
    cruzada: cruzada,
    inicio: inicio
  });
  escribirHojaValores({
    lectura: lectura,
    construccion: construccion,
    datos: datos,
    particion: particion,
    seleccion: seleccion,
    k: k,
    holdout: holdout,
    cruzada: cruzada,
    inicio: inicio
  });

  // Deja el cursor en la hoja de reporte, que es la que se copia al documento.
  SpreadsheetApp.getActive().setActiveSheet(obtenerOCrearHoja(CONFIG.HOJAS.REPORTE));

  console.log('=== FIN DEL ANÁLISIS ===');
  avisar(
    'Análisis terminado.\n\n' +
    'Descripciones válidas: ' + datos.length + '\n' +
    'k utilizado: ' + k + '\n' +
    'Exactitud (prueba): ' + porcentaje(holdout.metricas.exactitud) + '\n' +
    'Exactitud (validación cruzada): ' + porcentaje(cruzada.metricas.exactitud) + '\n\n' +
    'Revisa la pestaña "' + CONFIG.HOJAS.REPORTE + '".'
  );
}

/* ============================================================================
 *  ORDEN DE LAS CLASES EN LOS RESULTADOS
 * ----------------------------------------------------------------------------
 *  El núcleo ordena las clases alfabéticamente porque no conoce el orden del
 *  proyecto. Aquí se reordenan la matriz y las métricas según CLASES, para que
 *  la hoja, el documento y la presentación usen siempre el mismo orden.
 * ==========================================================================*/
function ordenarResultadoPorClases(resultado) {
  var orden = resultado.clases.slice().sort(function (a, b) {
    return CLASES.indexOf(a) - CLASES.indexOf(b);
  });
  var indices = orden.map(function (c) { return resultado.clases.indexOf(c); });

  var matriz = indices.map(function (i) {
    return indices.map(function (j) { return resultado.matriz[i][j]; });
  });

  var porClase = orden.map(function (c) {
    for (var k = 0; k < resultado.metricas.porClase.length; k++) {
      if (resultado.metricas.porClase[k].clase === c) return resultado.metricas.porClase[k];
    }
    return null;
  }).filter(function (x) { return x !== null; });

  resultado.clases = orden;
  resultado.matriz = matriz;
  resultado.metricas.porClase = porClase;
  return resultado;
}

/* ============================================================================
 *  ESCRITURA DE LA PESTAÑA 04_Predicciones
 * ==========================================================================*/
function escribirPredicciones(holdout, k) {
  var hoja = obtenerOCrearHoja(CONFIG.HOJAS.PREDICCIONES);
  var encabezados = [
    'ID', 'Clase real', 'Clase predicha', '¿Acertó?',
    'Distancia promedio a los k vecinos', 'Vecinos más cercanos (clase y distancia)'
  ];
  var filas = holdout.detalles.map(function (d) {
    return [d.id, d.real, d.predicho, d.acierto ? 'SÍ' : 'NO',
      redondear(d.distanciaPromedio, 4), d.vecinos];
  });

  var pos = escribirTabla(hoja, encabezados, filas, {
    titulo: 'PRUEBAS REALIZADAS — predicciones sobre el conjunto de prueba (k = ' + k + ', n = ' + holdout.metricas.total + ')'
  });

  // Colorea aciertos y errores
  for (var i = 0; i < filas.length; i++) {
    var celda = hoja.getRange(pos.primeraFilaDatos + i, 4);
    celda.setBackground(filas[i][3] === 'SÍ' ? CONFIG.COLOR.ACIERTO : CONFIG.COLOR.ERROR);
  }
  hoja.setColumnWidth(6, 320);
  hoja.getRange(pos.primeraFilaDatos, 6, filas.length, 1).setWrap(true);
}

/* ============================================================================
 *  ESCRITURA DE UNA MATRIZ DE CONFUSIÓN (se usa en 05 y 06)
 * ==========================================================================*/
/**
 * Dibuja la matriz de confusión a partir de `filaInicio`.
 * @return {number} la siguiente fila libre.
 */
function dibujarMatrizConfusion(hoja, filaInicio, matriz, clases, titulo) {
  // Título
  hoja.getRange(filaInicio, 1, 1, clases.length + 2).merge()
    .setValue(titulo)
    .setFontWeight('bold')
    .setBackground(CONFIG.COLOR.ENCABEZADO)
    .setFontColor(CONFIG.COLOR.TEXTO_ENCABEZADO)
    .setFontSize(11);
  var fila = filaInicio + 1;

  // Encabezado: esquina + clases predichas
  var encabezado = ['REAL ↓  /  PREDICHO →'].concat(clases).concat(['Total real']);
  hoja.getRange(fila, 1, 1, encabezado.length).setValues([encabezado])
    .setFontWeight('bold')
    .setBackground(CONFIG.COLOR.SUBTITULO)
    .setHorizontalAlignment('center');
  hoja.getRange(fila, 1).setHorizontalAlignment('left');
  hoja.getRange(fila, 1, 1, 1).setWrap(true);

  var filaHeader = fila;
  fila++;

  // Filas de la matriz
  for (var i = 0; i < clases.length; i++) {
    var totalFila = matriz[i].reduce(function (a, b) { return a + b; }, 0);
    var valores = [clases[i]].concat(matriz[i]).concat([totalFila]);
    hoja.getRange(fila + i, 1, 1, valores.length).setValues([valores]);
    hoja.getRange(fila + i, 1).setFontWeight('bold');
    hoja.getRange(fila + i, 2, 1, clases.length).setHorizontalAlignment('center');
  }

  // Columna de totales por columna
  var filaTotales = fila + clases.length;
  var totales = ['Total predicho'];
  var granTotal = 0;
  for (var c = 0; c < clases.length; c++) {
    var suma = 0;
    for (var r = 0; r < clases.length; r++) suma += matriz[r][c];
    totales.push(suma);
    granTotal += suma;
  }
  totales.push(granTotal);
  hoja.getRange(filaTotales, 1, 1, totales.length).setValues([totales])
    .setFontWeight('bold')
    .setBackground(CONFIG.COLOR.NEUTRO);
  hoja.getRange(filaTotales, 2, 1, clases.length).setHorizontalAlignment('center');

  // Resaltar la diagonal (aciertos) y dar color a los errores
  for (var d = 0; d < clases.length; d++) {
    hoja.getRange(fila + d, 2 + d).setBackground(CONFIG.COLOR.ACIERTO).setFontWeight('bold');
  }

  // Escala de color: más oscuro = más casos. Ayuda a leer la matriz de un vistazo.
  var rangoMatriz = hoja.getRange(fila, 2, clases.length, clases.length);
  var regla = SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpointWithValue('#FFFFFF', SpreadsheetApp.InterpolationType.NUMBER, '0')
    .setGradientMaxpointWithValue('#8EA9DB', SpreadsheetApp.InterpolationType.NUMBER, String(granTotal))
    .setRanges([rangoMatriz])
    .build();
  hoja.setConditionalFormatRules([regla]);

  // Bordes
  hoja.getRange(filaHeader, 1, clases.length + 2, clases.length + 2)
    .setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);

  // Nota explicativa
  fila = filaTotales + 2;
  hoja.getRange(fila, 1).setValue(
    'Lectura: cada fila es la clase REAL y cada columna la clase PREDICHA. ' +
    'La diagonal (verde) son los aciertos; el resto son errores. ' +
    'Ejemplo: un valor en la fila "Sedán" y columna "Hatchback" significa que un Sedán real fue clasificado como Hatchback.'
  ).setFontStyle('italic').setFontSize(9);
  hoja.getRange(fila, 1, 1, clases.length + 2).merge().setWrap(true);
  hoja.setRowHeight(fila, 44);

  return fila + 2;
}

/* ============================================================================
 *  PESTAÑA 05_Matriz_Confusion  (conjunto de prueba)
 * ==========================================================================*/
function escribirHojaMatriz(holdout, k) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.MATRIZ));

  var fila = 1;
  hoja.getRange(fila, 1).setValue('MATRIZ DE CONFUSIÓN — CONJUNTO DE PRUEBA (k = ' + k + ')')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);
  fila += 2;

  fila = dibujarMatrizConfusion(hoja, fila, holdout.matriz, holdout.clases,
    'Matriz de confusión (n = ' + holdout.metricas.total + ' casos de prueba)');

  // Métricas globales
  escribirSubtitulo(hoja, fila, 'MÉTRICAS GLOBALES', 7); fila++;
  var m = holdout.metricas;
  var filasMetricas = [
    ['Casos evaluados', m.total],
    ['Aciertos', m.aciertos],
    ['Errores', m.errores],
    ['Exactitud (accuracy)', porcentaje(m.exactitud)],
    ['Error de clasificación', porcentaje(m.error)],
    ['Macro-precisión', porcentaje(m.macroPrecision)],
    ['Macro-recall', porcentaje(m.macroRecall)],
    ['Macro-F1', porcentaje(m.macroF1)],
    ['Kappa de Cohen', redondear(m.kappa, 3)]
  ];
  hoja.getRange(fila, 1, filasMetricas.length, 2).setValues(filasMetricas);
  hoja.getRange(fila, 2, filasMetricas.length, 1).setHorizontalAlignment('right');
  fila += filasMetricas.length + 2;

  // Métricas por clase
  escribirSubtitulo(hoja, fila, 'MÉTRICAS POR CLASE (una clase contra el resto)', 7); fila++;
  var encabezados = ['Clase', 'Soporte (reales)', 'VP', 'FP', 'FN', 'Precisión', 'Recall', 'F1'];
  hoja.getRange(fila, 1, 1, encabezados.length).setValues([encabezados])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var filasClase = m.porClase.map(function (c) {
    return [c.clase, c.soporte, c.vp, c.fp, c.fn,
      porcentaje(c.precision), porcentaje(c.recall), porcentaje(c.f1)];
  });
  hoja.getRange(fila, 1, filasClase.length, encabezados.length).setValues(filasClase);
  hoja.getRange(fila, 2, filasClase.length, 5).setHorizontalAlignment('center');

  hoja.autoResizeColumns(1, 8);
}

/* ============================================================================
 *  PESTAÑA 06_Validacion_Cruzada
 * ==========================================================================*/
function escribirHojaValidacionCruzada(cruzada, k) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.CRUZADA));

  hoja.getRange(1, 1)
    .setValue('VALIDACIÓN CRUZADA ESTRATIFICADA (' + CONFIG.FOLDS + ' particiones, k = ' + k + ')')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);

  hoja.getRange(2, 1, 1, 8).merge().setValue(
    'Cada registro se usa exactamente una vez como prueba. Es la evidencia más robusta ' +
    'cuando el dataset es pequeño, porque aprovecha todos los datos para evaluar.'
  ).setFontStyle('italic').setFontSize(9).setWrap(true);
  hoja.setRowHeight(2, 30);

  var fila = 4;

  // Detalle por fold
  escribirSubtitulo(hoja, fila, 'EXACTITUD POR PARTICIÓN (FOLD)', 8); fila++;
  var enc = ['Fold', 'Casos de entrenamiento', 'Casos de prueba', 'Exactitud'];
  hoja.getRange(fila, 1, 1, enc.length).setValues([enc])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var filasFold = cruzada.detalleFolds.map(function (f) {
    return [f.fold, f.nEntrenamiento, f.nPrueba, porcentaje(f.exactitud)];
  });
  hoja.getRange(fila, 1, filasFold.length, 4).setValues(filasFold);
  hoja.getRange(fila, 1, filasFold.length, 4).setHorizontalAlignment('center');

  // Promedio de folds
  var promedio = cruzada.detalleFolds.reduce(function (a, f) { return a + f.exactitud; }, 0) /
    Math.max(1, cruzada.detalleFolds.length);
  hoja.getRange(fila + filasFold.length, 1, 1, 4)
    .setValues([['Promedio', '', '', porcentaje(promedio)]])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.NEUTRO)
    .setHorizontalAlignment('center');

  fila = fila + filasFold.length + 3;

  // Matriz acumulada
  fila = dibujarMatrizConfusion(hoja, fila, cruzada.matriz, cruzada.clases,
    'Matriz de confusión acumulada (n = ' + cruzada.metricas.total + ' predicciones)');

  // Métricas
  escribirSubtitulo(hoja, fila, 'MÉTRICAS GLOBALES (validación cruzada)', 8); fila++;
  var m = cruzada.metricas;
  var filasMetricas = [
    ['Predicciones acumuladas', m.total],
    ['Aciertos', m.aciertos],
    ['Exactitud (accuracy)', porcentaje(m.exactitud)],
    ['Macro-precisión', porcentaje(m.macroPrecision)],
    ['Macro-recall', porcentaje(m.macroRecall)],
    ['Macro-F1', porcentaje(m.macroF1)],
    ['Kappa de Cohen', redondear(m.kappa, 3)]
  ];
  hoja.getRange(fila, 1, filasMetricas.length, 2).setValues(filasMetricas);
  hoja.getRange(fila, 2, filasMetricas.length, 1).setHorizontalAlignment('right');
  fila += filasMetricas.length + 2;

  escribirSubtitulo(hoja, fila, 'MÉTRICAS POR CLASE', 8); fila++;
  var enc2 = ['Clase', 'Soporte', 'Precisión', 'Recall', 'F1'];
  hoja.getRange(fila, 1, 1, enc2.length).setValues([enc2])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var filasClase = m.porClase.map(function (c) {
    return [c.clase, c.soporte, porcentaje(c.precision), porcentaje(c.recall), porcentaje(c.f1)];
  });
  hoja.getRange(fila, 1, filasClase.length, 5).setValues(filasClase);
  hoja.getRange(fila, 2, filasClase.length, 4).setHorizontalAlignment('center');

  hoja.autoResizeColumns(1, 10);
}

/* ============================================================================
 *  PESTAÑA 07_Metricas  (comparación y selección de k)
 * ==========================================================================*/
function escribirHojaMetricas(holdout, cruzada, seleccion, k, particion) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.METRICAS));

  hoja.getRange(1, 1).setValue('MÉTRICAS Y SELECCIÓN DEL MODELO')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);
  var fila = 3;

  // Resumen comparativo
  escribirSubtitulo(hoja, fila, 'COMPARACIÓN DE LAS DOS EVALUACIONES', 7); fila++;
  var enc = ['Evaluación', 'Casos', 'Exactitud', 'Macro-F1', 'Kappa', 'Observación'];
  hoja.getRange(fila, 1, 1, enc.length).setValues([enc])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var filas = [
    ['Holdout 70/30', holdout.metricas.total, porcentaje(holdout.metricas.exactitud),
      porcentaje(holdout.metricas.macroF1), redondear(holdout.metricas.kappa, 3),
      'Conjunto reservado; no se usó para elegir k.'],
    ['Validación cruzada ' + CONFIG.FOLDS + '-fold', cruzada.metricas.total,
      porcentaje(cruzada.metricas.exactitud), porcentaje(cruzada.metricas.macroF1),
      redondear(cruzada.metricas.kappa, 3),
      'Más estable con pocos datos; se reporta como resultado principal.']
  ];
  hoja.getRange(fila, 1, filas.length, enc.length).setValues(filas);
  hoja.getRange(fila, 3, filas.length, 3).setHorizontalAlignment('center');
  hoja.getRange(fila, 6, filas.length, 1).setWrap(true);
  fila += filas.length + 2;

  // Selección de k
  escribirSubtitulo(hoja, fila, 'SELECCIÓN DE k (LEAVE-ONE-OUT SOBRE ENTRENAMIENTO)', 7); fila++;
  hoja.getRange(fila, 1, 1, 4).setValues([['k', 'Exactitud interna', 'Aciertos', 'Evaluados']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var filasK = seleccion.tabla.map(function (t) {
    return [t.k, porcentaje(t.exactitud), t.aciertos, t.evaluados];
  });
  hoja.getRange(fila, 1, filasK.length, 4).setValues(filasK);
  hoja.getRange(fila, 1, filasK.length, 4).setHorizontalAlignment('center');

  // Marcar el k ganador
  for (var i = 0; i < seleccion.tabla.length; i++) {
    if (seleccion.tabla[i].k === k) {
      hoja.getRange(fila + i, 1, 1, 4).setBackground(CONFIG.COLOR.ACIERTO).setFontWeight('bold');
    }
  }
  fila += filasK.length + 2;

  hoja.getRange(fila, 1).setValue(
    'k utilizado finalmente: ' + k + '  (' +
    (CONFIG.K_FIJO > 0 ? 'fijado manualmente en CONFIG.K_FIJO' : 'elegido automáticamente') + ')'
  ).setFontWeight('bold');
  fila += 2;

  // Distribución de la partición
  escribirSubtitulo(hoja, fila, 'COMPOSICIÓN DE LOS CONJUNTOS', 7); fila++;
  hoja.getRange(fila, 1, 1, 4).setValues([['Conjunto', 'Registros', 'Porcentaje', 'Proporción configurada']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var total = particion.entrenamiento.length + particion.prueba.length;
  hoja.getRange(fila, 1, 2, 4).setValues([
    ['Entrenamiento', particion.entrenamiento.length,
      porcentaje(particion.entrenamiento.length / total),
      porcentaje(1 - CONFIG.PROPORCION_PRUEBA)],
    ['Prueba', particion.prueba.length,
      porcentaje(particion.prueba.length / total),
      porcentaje(CONFIG.PROPORCION_PRUEBA)]
  ]);
  hoja.getRange(fila, 1, 2, 4).setHorizontalAlignment('center');
  fila++;

  hoja.autoResizeColumns(1, 7);
  hoja.getRange(1, 1, fila, 7).setVerticalAlignment('middle');
}

/* ============================================================================
 *  PESTAÑA 08_Resumen_Datos  (calidad y análisis descriptivo)
 * ==========================================================================*/
function escribirHojaResumen(lectura, construccion, datos, particion, inicio) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.RESUMEN));

  hoja.getRange(1, 1).setValue('RESUMEN Y CALIDAD DE LOS DATOS')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);
  var fila = 3;

  /* --- bloque 1: recolección --- */
  escribirSubtitulo(hoja, fila, '1. RECOLECCIÓN', 6); fila++;
  var recoleccion = [
    ['Hoja de respuestas leída', lectura.hoja],
    ['Vehículos descritos', lectura.total],
    ['Descripciones válidas', datos.length],
    ['Descartadas por valores no reconocidos o sin clase', construccion.errores.length],
    ['Duplicados eliminados', construccion.duplicados],
    ['Preguntas sin columna en la hoja', lectura.faltantes.length ? lectura.faltantes.join(' | ') : 'Ninguna'],
    ['Fecha y hora del análisis', Utilities.formatDate(inicio, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss')]
  ];
  hoja.getRange(fila, 1, recoleccion.length, 2).setValues(recoleccion);
  hoja.getRange(fila, 1, recoleccion.length, 1).setFontWeight('bold');
  fila += recoleccion.length + 2;

  /* --- bloque 2: distribución de clases --- */
  escribirSubtitulo(hoja, fila, '2. DISTRIBUCIÓN DE CLASES', 6); fila++;
  hoja.getRange(fila, 1, 1, 4).setValues([['Clase', 'Registros', 'Porcentaje', 'En entrenamiento / prueba']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var dist = distribucionClases(datos);
  var distTrain = distribucionClases(particion.entrenamiento);
  var distTest = distribucionClases(particion.prueba);
  var filasDist = CLASES.map(function (c) {
    var n = dist[c] || 0;
    return [c, n, porcentaje(n / datos.length),
      (distTrain[c] || 0) + ' / ' + (distTest[c] || 0)];
  });
  hoja.getRange(fila, 1, filasDist.length, 4).setValues(filasDist);
  hoja.getRange(fila, 2, filasDist.length, 3).setHorizontalAlignment('center');
  fila += filasDist.length + 2;

  /* --- bloque 3: estadísticas de features --- */
  escribirSubtitulo(hoja, fila, '3. ESTADÍSTICAS DE LAS VARIABLES DEL MODELO', 6); fila++;
  hoja.getRange(fila, 1, 1, 7)
    .setValues([['Variable', 'Peso en la distancia', 'Mínimo', 'Máximo', 'Media', 'Varianza', 'Aporta información']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var stats = estadisticasFeatures(datos);
  var filasStats = stats.map(function (s) {
    return [s.etiqueta, s.peso, s.minimo, s.maximo, redondear(s.media, 2),
      redondear(s.varianza, 3), s.varianza === 0 ? 'NO (constante)' : 'Sí'];
  });
  hoja.getRange(fila, 1, filasStats.length, 7).setValues(filasStats);
  hoja.getRange(fila, 2, filasStats.length, 6).setHorizontalAlignment('center');
  fila += filasStats.length + 2;

  hoja.getRange(fila, 1).setValue(
    'Una varianza de 0 significa que todos los encuestados respondieron lo mismo: ' +
    'esa variable no ayuda a distinguir clases y podría eliminarse sin perder información.'
  ).setFontStyle('italic').setFontSize(9);
  hoja.getRange(fila, 1, 1, 7).merge().setWrap(true);

  hoja.autoResizeColumns(1, 7);
}

/* ============================================================================
 *  PESTAÑA 10_Reporte  (texto listo para pegar en el documento)
 * ==========================================================================*/
function escribirHojaReporte(r) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.REPORTE));

  hoja.getRange(1, 1).setValue('REPORTE AUTOMÁTICO — copia estos párrafos al documento')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);
  hoja.getRange(2, 1, 1, 6).merge().setValue(
    'Este texto se genera con TUS datos reales cada vez que ejecutas "Ejecutar análisis". ' +
    'Revisa y ajusta la redacción antes de entregar; las cifras ya son correctas.'
  ).setFontStyle('italic').setFontSize(9).setWrap(true);
  hoja.setRowHeight(2, 30);

  var parrafos = construirParrafosReporte(r);

  var fila = 4;
  for (var i = 0; i < parrafos.length; i++) {
    // Título de sección
    hoja.getRange(fila, 1).setValue(parrafos[i].titulo)
      .setFontWeight('bold').setFontSize(11).setFontColor(CONFIG.COLOR.ENCABEZADO);
    fila++;

    // Texto envuelto en una celda combinada
    var rango = hoja.getRange(fila, 1, 1, 6).merge();
    rango.setValue(parrafos[i].texto).setWrap(true).setVerticalAlignment('top');
    // Altura estimada: ~15 px por línea de 100 caracteres
    var lineas = Math.ceil(parrafos[i].texto.length / 95);
    hoja.setRowHeight(fila, Math.max(40, lineas * 16));
    fila += 2;
  }

  hoja.setColumnWidth(1, 620);
  for (var c = 2; c <= 6; c++) hoja.setColumnWidth(c, 20);
}

/**
 * Redacta el reporte a partir de los objetos de resultado.
 * Cada párrafo es { titulo, texto }.
 */
function construirParrafosReporte(r) {
  var mH = r.holdout.metricas;
  var mC = r.cruzada.metricas;

  // Clase con mejor y peor F1
  var ordenadas = mC.porClase.slice().sort(function (a, b) { return b.f1 - a.f1; });
  var mejor = ordenadas[0];
  var peor = ordenadas[ordenadas.length - 1];

  // Par de clases más confundido (fuera de la diagonal)
  var peorPar = { real: '-', predicho: '-', casos: 0 };
  for (var i = 0; i < r.cruzada.clases.length; i++) {
    for (var j = 0; j < r.cruzada.clases.length; j++) {
      if (i !== j && r.cruzada.matriz[i][j] > peorPar.casos) {
        peorPar = {
          real: r.cruzada.clases[i],
          predicho: r.cruzada.clases[j],
          casos: r.cruzada.matriz[i][j]
        };
      }
    }
  }

  var dist = distribucionClases(r.datos);
  var listaDist = CLASES.map(function (c) {
    return c + ' (' + (dist[c] || 0) + ')';
  }).join(', ');

  var p = [];

  p.push({
    titulo: '1. RECOLECCIÓN DE DATOS',
    texto: 'Se aplicó una encuesta de 20 preguntas a través de Google Forms. Cada participante ' +
      'describió un vehículo real que conoce (propio o de alguien cercano). Se obtuvieron ' +
      r.lectura.total + ' descripciones, de las cuales ' + r.datos.length + ' resultaron válidas. ' +
      'Se descartaron ' + r.construccion.errores.length + ' registros con valores no reconocidos o ' +
      'sin clasificación declarada y ' + r.construccion.duplicados + ' duplicados exactos. ' +
      'La encuesta no solicitó datos personales sensibles y se explicó su uso académico antes de responder.'
  });

  p.push({
    titulo: '2. PREPARACIÓN DE LOS DATOS',
    texto: 'Cada respuesta de texto se convirtió a un valor numérico mediante una tabla de ' +
      'codificación: las opciones ordenadas (tamaño, altura, capacidad de carga, potencia y ' +
      'rendimiento) se transformaron en escalas de 1 a 4, las preguntas de sí/no en 1 y 0, y el ' +
      'uso principal en dos variables binarias (trabajo/carga y transporte de pasajeros). ' +
      'El dataset final quedó formado por ' + r.datos.length + ' vehículos descritos y 14 variables ' +
      'predictoras. Todas las variables se normalizaron con el método min-max tomando como ' +
      'referencia únicamente el conjunto de entrenamiento, para evitar fuga de información. ' +
      'La distribución de clases fue: ' + listaDist + '.'
  });

  p.push({
    titulo: '3. PARTICIÓN DE LOS DATOS',
    texto: 'Se aplicó una partición estratificada 70/30 con semilla fija ' + CONFIG.SEMILLA +
      ', de modo que el experimento es reproducible: ' + r.particion.entrenamiento.length +
      ' registros para entrenamiento y ' + r.particion.prueba.length + ' para prueba. ' +
      'La estratificación garantiza que las cinco clases estén representadas en ambos conjuntos.'
  });

  p.push({
    titulo: '4. SELECCIÓN DE k',
    texto: 'El valor de k se eligió con validación leave-one-out aplicada exclusivamente al ' +
      'conjunto de entrenamiento, probando k = ' + CONFIG.CANDIDATOS_K.join(', ') + '. ' +
      'El mejor resultado interno se obtuvo con k = ' + r.seleccion.tabla[0].k + ' (' +
      porcentaje(r.seleccion.tabla[0].exactitud) + ' de exactitud interna) y se utilizó k = ' + r.k + '. ' +
      'El conjunto de prueba no se utilizó para esta decisión.'
  });

  p.push({
    titulo: '5. RESULTADOS EN EL CONJUNTO DE PRUEBA',
    texto: 'Con k = ' + r.k + ', el modelo acertó ' + mH.aciertos + ' de ' + mH.total +
      ' casos (' + porcentaje(mH.exactitud) + ' de exactitud). El macro-F1 fue ' +
      porcentaje(mH.macroF1) + ' y el coeficiente kappa de Cohen ' + redondear(mH.kappa, 3) +
      '. Al tratarse de un conjunto pequeño, estas cifras tienen alta variabilidad.'
  });

  p.push({
    titulo: '6. RESULTADOS DE LA VALIDACIÓN CRUZADA',
    texto: 'Para obtener una estimación más estable se aplicó validación cruzada estratificada de ' +
      CONFIG.FOLDS + ' particiones con el mismo k. Cada uno de los ' + mC.total +
      ' registros fue clasificado una vez, con una exactitud global de ' + porcentaje(mC.exactitud) +
      ', macro-F1 de ' + porcentaje(mC.macroF1) + ' y kappa de ' + redondear(mC.kappa, 3) + '.'
  });

  p.push({
    titulo: '7. ANÁLISIS DE LA MATRIZ DE CONFUSIÓN',
    texto: 'La clase con mejor desempeño fue ' + mejor.clase + ' (F1 = ' + porcentaje(mejor.f1) +
      '), mientras que ' + peor.clase + ' obtuvo el F1 más bajo (' + porcentaje(peor.f1) + '). ' +
      (peorPar.casos > 0
        ? 'La confusión más frecuente fue ' + peorPar.real + ' clasificado como ' + peorPar.predicho +
        ' (' + peorPar.casos + ' casos), lo que se explica porque ambos tipos de vehículo ' +
        'comparten valores similares en las variables de tamaño y uso.'
        : 'No se observaron confusiones fuera de la diagonal principal.')
  });

  p.push({
    titulo: '8. CONCLUSIÓN',
    texto: 'El clasificador KNN obtuvo una exactitud de ' + porcentaje(mC.exactitud) +
      ' en validación cruzada, con un kappa de Cohen de ' + redondear(mC.kappa, 3) + '. ' +
      (mC.exactitud >= 0.75
        ? 'El resultado supera el umbral del 75 % planteado y confirma que las características físicas ' +
          'observables de un automóvil contienen información suficiente para identificar su categoría. '
        : 'El resultado NO alcanza el umbral del 75 % planteado en la hipótesis, por lo que esta no se ' +
          'confirma con la muestra actual. La mayor dificultad se concentró en ' + peor.clase +
          ' (F1 = ' + porcentaje(peor.f1) + '), que se confunde con ' + peorPar.predicho +
          ' porque ambas categorías comparten tamaño, altura y número de asientos. ') +
      'Las principales limitaciones son el tamaño reducido de la muestra (' + r.datos.length +
      ' vehículos descritos) y la ambigüedad de algunas preguntas en la primera aplicación. ' +
      'Como trabajo futuro se propone ampliar la muestra a más de 100 vehículos, incluir variables ' +
      'objetivas como longitud y peso exactos, y comparar KNN con otros algoritmos de clasificación.'
  });

  return p;
}
