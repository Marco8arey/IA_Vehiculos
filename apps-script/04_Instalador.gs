/* ============================================================================
 *  04_Instalador.gs  —  Crea el formulario y la estructura de la hoja
 * ----------------------------------------------------------------------------
 *  Función principal: `instalarTodo()`
 *
 *  Qué crea:
 *    1. El Google Form con las 22 preguntas, dividido en 5 secciones.
 *    2. La vinculación del formulario con ESTA hoja de cálculo, para que las
 *       respuestas lleguen solas a una pestaña nueva.
 *    3. Las pestañas de resultados vacías, con su encabezado.
 *    4. Una pestaña "00_Guia" con instrucciones y el enlace del formulario.
 *
 *  Es idempotente: si lo ejecutas dos veces, reutiliza el formulario ya creado
 *  (guarda su ID en las propiedades del script) y no duplica preguntas.
 * ==========================================================================*/

function instalarTodo() {
  var libro = SpreadsheetApp.getActive();
  libro.rename('KNN Vehículos — Clasificación con encuestas');

  var form = crearOReutilizarFormulario(libro);
  Utilities.sleep(1500);            // da tiempo a Google a crear la pestaña
  crearPestanasBase();
  escribirHojaCodigo();             // publica el código en 09_Codigo
  escribirGuia(form);

  var mensaje =
    'Instalación terminada.\n\n' +
    'Formulario creado y vinculado a esta hoja.\n\n' +
    'Enlace para responder:\n' + form.getPublishedUrl() + '\n\n' +
    'Comparte ese enlace con tus compañeros. Cuando tengas al menos ' +
    CONFIG.MIN_RESPUESTAS + ' descripciones de vehículos, ejecuta "Ejecutar análisis" en el menú.';

  console.log(mensaje);
  avisar(mensaje);

  // Elimina la hoja vacía que Google crea al abrir un libro nuevo.
  eliminarHojasVaciasPredeterminadas();

  return form.getPublishedUrl();
}

/**
 * Borra las hojas vacías llamadas "Hoja 1", "Sheet1", etc. que Google crea por
 * defecto. Solo elimina hojas sin contenido, nunca las del proyecto.
 */
function eliminarHojasVaciasPredeterminadas() {
  var libro = SpreadsheetApp.getActive();
  var nombres = ['Hoja 1', 'Hoja1', 'Sheet1', 'Hoja 2', 'Sheet2'];
  var reservadas = Object.keys(CONFIG.HOJAS).map(function (k) { return CONFIG.HOJAS[k]; });

  for (var i = 0; i < nombres.length; i++) {
    var hoja = libro.getSheetByName(nombres[i]);
    if (!hoja) continue;
    if (reservadas.indexOf(nombres[i]) !== -1) continue;
    if (libro.getSheets().length <= 1) continue;
    if (hoja.getLastRow() === 0 && hoja.getLastColumn() === 0) {
      libro.deleteSheet(hoja);
      console.log('Hoja vacía eliminada: ' + nombres[i]);
    }
  }
}

/* ----------------------------------------------------------------------------
 *  FORMULARIO
 * --------------------------------------------------------------------------*/
function crearOReutilizarFormulario(libro) {
  var props = PropertiesService.getScriptProperties();
  var idGuardado = props.getProperty('ID_FORMULARIO');
  var form = null;

  if (idGuardado) {
    try {
      form = FormApp.openById(idGuardado);
    } catch (e) {
      console.log('El formulario guardado ya no existe; se creará uno nuevo.');
      form = null;
    }
  }

  if (!form) {
    form = FormApp.create(CONFIG.TITULO_FORM);
    props.setProperty('ID_FORMULARIO', form.getId());
  }

  form.setTitle(CONFIG.TITULO_FORM);
  form.setDescription(CONFIG.DESCRIPCION_FORM);
  form.setConfirmationMessage(CONFIG.MENSAJE_CONFIRMACION);
  form.setProgressBar(true);
  form.setCollectEmail(false);              // anonimato
  form.setLimitOneResponsePerUser(false);   // permite varias respuestas por dispositivo (familia)
  form.setShuffleQuestions(false);          // el orden de las preguntas es intencional

  // Solo se agregan las preguntas si el formulario está vacío (idempotencia)
  // Si quedó a medias por un error anterior, se reconstruye, pero NUNCA si ya
  // existen respuestas (borrar ítems desconectaría las respuestas recibidas).
  var items = form.getItems();
  var itemsEsperados = PREGUNTAS.length + (SECCIONES_FORM.length - 1);

  if (items.length !== itemsEsperados) {
    var hayRespuestas = false;
    try { hayRespuestas = form.getResponses().length > 0; } catch (e) { hayRespuestas = false; }

    if (!hayRespuestas) {
      for (var i = 0; i < items.length; i++) form.deleteItem(items[i]);
      agregarPreguntas(form);
    } else {
      console.log('Aviso: el formulario ya tiene respuestas; no se reconstruye.');
    }
  }

  // Vincular a esta hoja de cálculo, si aún no está vinculado
  try {
    var destino = form.getDestinationId();
    if (!destino) {
      form.setDestination(FormApp.DestinationType.SPREADSHEET, libro.getId());
    } else if (destino !== libro.getId()) {
      console.log('Aviso: el formulario ya estaba vinculado a otra hoja (' + destino + ').');
    }
  } catch (e) {
    // getDestinationId() lanza error si nunca se vinculó; se vincula aquí.
    form.setDestination(FormApp.DestinationType.SPREADSHEET, libro.getId());
  }

  // Aplica los textos de ayuda sin tocar títulos ni opciones
  sincronizarAyudas(form);

  return form;
}

/**
 * Recorre PREGUNTAS y crea cada ítem en el formulario, insertando un salto de
 * página al inicio de cada sección (excepto la primera).
 */
function agregarPreguntas(form) {
  for (var i = 0; i < PREGUNTAS.length; i++) {
    var p = PREGUNTAS[i];

    // ¿Esta pregunta abre una sección nueva?
    for (var s = 0; s < SECCIONES_FORM.length; s++) {
      var seccion = SECCIONES_FORM[s];
      if (seccion.desde === i && s > 0) {
        var pagina = form.addPageBreakItem();
        pagina.setTitle(seccion.titulo);
        if (seccion.descripcion) pagina.setHelpText(seccion.descripcion);
      }
    }

    var item;
    if (p.tipo === 'parrafo') {
      item = form.addParagraphTextItem();
      item.setTitle(p.titulo);
      item.setRequired(false);
    } else if (p.tipo === 'texto') {
      item = form.addTextItem();
      item.setTitle(p.titulo);
      item.setRequired(false);
    } else if (p.tipo === 'escala') {
      item = form.addScaleItem();
      item.setTitle(p.titulo);
      item.setBounds(1, 5);
      item.setLabels('Nada importante', 'Extremadamente importante');
      item.setRequired(true);
    } else {
      item = form.addMultipleChoiceItem();
      item.setTitle(p.titulo);
      item.setChoiceValues(p.opciones);
      item.setRequired(true);
      item.showOtherOption(false);
    }

    // Texto de ayuda: aclara las preguntas que se prestan a confusión sin
    // cambiar el título (que es el encabezado de la hoja de respuestas).
    if (p.descripcion) item.setHelpText(p.descripcion);
  }
}

/**
 * Actualiza el texto de ayuda de las preguntas ya existentes en el formulario.
 * No borra ítems ni cambia títulos, así que NO invalida las respuestas ya
 * recogidas: los encabezados de la hoja siguen siendo los mismos.
 */
function sincronizarAyudas(form) {
  var items = form.getItems();
  var aplicadas = 0;

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item.getType() === FormApp.ItemType.PAGE_BREAK) continue;

    var tituloItem = normalizarTexto(item.getTitle());
    for (var p = 0; p < PREGUNTAS.length; p++) {
      if (normalizarTexto(PREGUNTAS[p].titulo) === tituloItem) {
        if (PREGUNTAS[p].descripcion) {
          item.setHelpText(PREGUNTAS[p].descripcion);
          aplicadas++;
        }
        break;
      }
    }
  }

  console.log('Textos de ayuda aplicados: ' + aplicadas);
  return aplicadas;
}

/* ----------------------------------------------------------------------------
 *  PESTAÑAS
 * --------------------------------------------------------------------------*/
function crearPestanasBase() {
  var estructura = [
    { nombre: CONFIG.HOJAS.GUIA, nota: 'Instrucciones de uso del proyecto.' },
    { nombre: CONFIG.HOJAS.DATASET, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.ENTRENAMIENTO, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.PRUEBA, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.PREDICCIONES, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.MATRIZ, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.CRUZADA, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.METRICAS, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.RESUMEN, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.CODIGO, nota: 'Documentación del código.' },
    { nombre: CONFIG.HOJAS.REPORTE, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.VALORES, nota: 'Se llena al ejecutar el análisis.' }
  ];

  for (var i = 0; i < estructura.length; i++) {
    var hoja = obtenerOCrearHoja(estructura[i].nombre);
    if (hoja.getLastRow() === 0) {
      hoja.getRange(1, 1).setValue(estructura[i].nota).setFontColor('#808080');
      hoja.getRange(1, 1).setFontStyle('italic');
    }
  }
}

/* ----------------------------------------------------------------------------
 *  GUÍA (pestaña 00_Guia)
 * --------------------------------------------------------------------------*/
function escribirGuia(form) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.GUIA));
  var fila = 1;

  hoja.getRange(fila, 1).setValue('PROYECTO KNN — CLASIFICACIÓN DE VEHÍCULOS')
    .setFontWeight('bold').setFontSize(16).setFontColor(CONFIG.COLOR.ENCABEZADO);
  fila += 2;

  var enlace = form ? form.getPublishedUrl() : '(formulario no disponible)';
  var edicion = form ? form.getEditUrl() : '';

  var pasos = [
    ['1. Difundir el formulario', 'Comparte el enlace con compañeros, familiares y conocidos. NO uses datos de internet: las respuestas deben ser de personas reales.'],
    ['2. Revisar respuestas', 'Cada envío aparece automáticamente en la pestaña de respuestas del formulario.'],
    ['3. Ejecutar el análisis', 'Menú "KNN Vehículos" > "Ejecutar análisis". Se generan las pestañas 01 a 10.'],
    ['4. Revisar resultados', 'La pestaña 10_Reporte contiene párrafos listos para pegar en el documento.'],
    ['5. Documentar evidencia', 'Toma capturas de pantalla del formulario, de la hoja y de la matriz de confusión.'],
    ['6. Presentar', 'Usa la página web de demostración (web/knn_demo.html) para mostrar el modelo en vivo.']
  ];

  hoja.getRange(fila, 1, 1, 2).setValues([['Paso', 'Qué hacer']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  hoja.getRange(fila, 1, pasos.length, 2).setValues(pasos);
  hoja.getRange(fila, 1, pasos.length, 2).setVerticalAlignment('top').setWrap(true);
  for (var i = 0; i < pasos.length; i++) hoja.setRowHeight(fila + i, 44);
  fila += pasos.length + 2;

  hoja.getRange(fila, 1).setValue('ENLACES').setFontWeight('bold').setFontSize(12)
    .setFontColor(CONFIG.COLOR.ENCABEZADO);
  fila++;
  hoja.getRange(fila, 1).setValue('Responder la encuesta:').setFontWeight('bold');
  hoja.getRange(fila, 2).setFormula('=HYPERLINK("' + enlace + '";"Abrir formulario")');
  fila++;
  if (edicion) {
    hoja.getRange(fila, 1).setValue('Editar el formulario:').setFontWeight('bold');
    hoja.getRange(fila, 2).setFormula('=HYPERLINK("' + edicion + '";"Abrir editor del formulario")');
    fila++;
  }
  fila += 1;

  var estado = [
    ['Última instalación', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')],
    ['Respuestas mínimas requeridas', CONFIG.MIN_RESPUESTAS],
    ['Semilla de la partición', CONFIG.SEMILLA],
    ['Proporción de prueba', Math.round(CONFIG.PROPORCION_PRUEBA * 100) + ' %'],
    ['Modo demostración', PropertiesService.getScriptProperties().getProperty('MODO_DEMO') === 'true'
      ? 'ACTIVO — los datos NO son reales' : 'Desactivado (datos reales)']
  ];
  hoja.getRange(fila, 1).setValue('ESTADO ACTUAL').setFontWeight('bold').setFontSize(12)
    .setFontColor(CONFIG.COLOR.ENCABEZADO);
  fila++;
  hoja.getRange(fila, 1, estado.length, 2).setValues(estado);
  hoja.getRange(fila, 1, estado.length, 1).setFontWeight('bold');

  hoja.setColumnWidth(1, 300);
  hoja.setColumnWidth(2, 520);

  if (PropertiesService.getScriptProperties().getProperty('MODO_DEMO') === 'true') {
    hoja.getRange(fila + estado.length, 1, 1, 2).merge().setValue(
      '⚠ MODO DEMOSTRACIÓN ACTIVO: el análisis está leyendo datos SINTÉTICOS de la pestaña "' +
      CONFIG.HOJAS.DEMO + '". Estos datos no sirven para la entrega. Desactívalo desde el menú.'
    ).setBackground(CONFIG.COLOR.ERROR).setFontWeight('bold').setWrap(true);
    hoja.setRowHeight(fila + estado.length, 44);
  }
}

/* Muestra en pantalla el enlace del formulario. */
function mostrarEnlaceFormulario() {
  var id = PropertiesService.getScriptProperties().getProperty('ID_FORMULARIO');
  if (!id) {
    SpreadsheetApp.getUi().alert('Todavía no hay formulario. Ejecuta primero "Instalar".');
    return;
  }
  var form = FormApp.openById(id);
  avisar(
    'Enlace para responder:\n\n' + form.getPublishedUrl() +
    '\n\nEditar:\n' + form.getEditUrl()
  );
}
