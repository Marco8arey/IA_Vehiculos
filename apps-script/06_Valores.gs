/* ============================================================================
 *  06_Valores.gs  —  Tabla de valores para completar el documento
 * ----------------------------------------------------------------------------
 *  El documento del proyecto usa marcadores como {{EXACTITUD_CV}} o {{CM_SU}}.
 *  Esta pestaña genera la lista completa "marcador -> valor real" para que se
 *  puedan sustituir sin buscar cifra por cifra en otras hojas.
 *
 *  Además calcula dos explicaciones cualitativas:
 *    - por qué la mejor clase es la mejor;
 *    - por qué se confunden las dos clases más confundidas,
 *      comparando los promedios reales de sus variables.
 * ==========================================================================*/

/** Devuelve el orden de letras usado en los marcadores de la matriz. */
var LETRAS_CLASE = { 'Hatchback': 'H', 'Sedán': 'S', 'SUV': 'U', 'Pick-up': 'P', 'Van': 'V' };

/** Convierte el nombre de una clase en una clave ASCII para los marcadores:
 *  "Sedán" -> "SEDAN", "Pick-up" -> "PICKUP". */
function claveClaseParaMarcador(clase) {
  return normalizarTexto(clase).toUpperCase().replace(/[^A-Z]/g, '');
}

function escribirHojaValores(r) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.VALORES));
  var mH = r.holdout.metricas;
  var mC = r.cruzada.metricas;

  var dist = distribucionClases(r.datos);
  var total = r.datos.length;

  // Clase con mejor y peor F1
  var ordenadas = mC.porClase.slice().sort(function (a, b) { return b.f1 - a.f1; });
  var mejor = ordenadas[0];
  var peor = ordenadas[ordenadas.length - 1];

  // Confusión más frecuente fuera de la diagonal
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

  var ejemplo = r.holdout.detalles.length ? r.holdout.detalles[0] : null;

  /* --- Construcción de la tabla ---------------------------------------- */
  var filas = [];
  function agregar(marcador, valor, origen) {
    filas.push([marcador, valor, origen]);
  }

  /* Datos del equipo (los llena el estudiante a mano) */
  agregar('{{NOMBRE_PROFESOR}}', '(escribe el nombre)', 'Manual');
  agregar('{{NOMBRE_INTEGRANTE_1}}', '(escribe el nombre)', 'Manual');
  agregar('{{NOMBRE_INTEGRANTE_2}}', '(escribe el nombre)', 'Manual');
  agregar('{{NOMBRE_INTEGRANTE_3}}', '(escribe el nombre)', 'Manual');
  agregar('{{INSTITUCIÓN}}', '(escribe la institución)', 'Manual');
  agregar('{{FECHA_ENTREGA}}', '(escribe la fecha)', 'Manual');
  agregar('{{FECHA_INICIO}}', '(fecha en que empezaste a difundir el formulario)', 'Manual');
  agregar('{{FECHA_FIN}}', '(fecha en que cerraste la encuesta)', 'Manual');
  agregar('{{TIEMPO_PROMEDIO}}', '(promedio que muestra Google Forms)', 'Manual');

  /* Recolección */
  agregar('{{TOTAL_RESPUESTAS}}', r.lectura.total, '08_Resumen_Datos');
  agregar('{{VALIDAS}}', r.datos.length, '08_Resumen_Datos');
  agregar('{{DESCARTADAS}}', r.construccion.errores.length, '08_Resumen_Datos');
  agregar('{{DUPLICADOS}}', r.construccion.duplicados, '08_Resumen_Datos');

  /* Distribución */
  CLASES.forEach(function (c) {
    var n = dist[c] || 0;
    var clave = claveClaseParaMarcador(c);
    agregar('{{N_' + clave + '}}', n, '08_Resumen_Datos');
    agregar('{{PCT_' + clave + '}}', porcentaje(n / total), '08_Resumen_Datos');
  });

  /* Partición y k */
  agregar('{{N_ENTRENAMIENTO}}', r.particion.entrenamiento.length, '07_Metricas');
  agregar('{{N_PRUEBA}}', r.particion.prueba.length, '07_Metricas');
  agregar('{{K}}', r.k, '07_Metricas');
  r.seleccion.tabla.forEach(function (t) {
    agregar('{{LOO_K' + t.k + '}}', porcentaje(t.exactitud), '07_Metricas');
  });

  /* Holdout */
  agregar('{{ACIERTOS_HOLDOUT}}', mH.aciertos, '05_Matriz_Confusion');
  agregar('{{ERRORES_HOLDOUT}}', mH.errores, '05_Matriz_Confusion');
  agregar('{{EXACTITUD_HOLDOUT}}', porcentaje(mH.exactitud), '05_Matriz_Confusion');
  agregar('{{MACRO_PRECISION_HOLDOUT}}', porcentaje(mH.macroPrecision), '05_Matriz_Confusion');
  agregar('{{MACRO_RECALL_HOLDOUT}}', porcentaje(mH.macroRecall), '05_Matriz_Confusion');
  agregar('{{MACRO_F1_HOLDOUT}}', porcentaje(mH.macroF1), '05_Matriz_Confusion');
  agregar('{{KAPPA_HOLDOUT}}', redondear(mH.kappa, 3), '05_Matriz_Confusion');

  /* Validación cruzada */
  agregar('{{EXACTITUD_CV}}', porcentaje(mC.exactitud), '06_Validacion_Cruzada');
  agregar('{{MACRO_PRECISION_CV}}', porcentaje(mC.macroPrecision), '06_Validacion_Cruzada');
  agregar('{{MACRO_RECALL_CV}}', porcentaje(mC.macroRecall), '06_Validacion_Cruzada');
  agregar('{{MACRO_F1_CV}}', porcentaje(mC.macroF1), '06_Validacion_Cruzada');
  agregar('{{KAPPA_CV}}', redondear(mC.kappa, 3), '06_Validacion_Cruzada');

  var sumaFolds = 0;
  r.cruzada.detalleFolds.forEach(function (f) {
    agregar('{{FOLD' + f.fold + '_TRAIN}}', f.nEntrenamiento, '06_Validacion_Cruzada');
    agregar('{{FOLD' + f.fold + '_TEST}}', f.nPrueba, '06_Validacion_Cruzada');
    agregar('{{FOLD' + f.fold + '_ACC}}', porcentaje(f.exactitud), '06_Validacion_Cruzada');
    sumaFolds += f.exactitud;
  });
  agregar('{{PROMEDIO_FOLDS}}', porcentaje(sumaFolds / Math.max(1, r.cruzada.detalleFolds.length)), '06_Validacion_Cruzada');

  /* Ejemplo de predicción */
  if (ejemplo) {
    agregar('{{EJEMPLO_ID}}', ejemplo.id.replace('R', ''), '04_Predicciones');
    agregar('{{EJEMPLO_REAL}}', ejemplo.real, '04_Predicciones');
    agregar('{{EJEMPLO_PRED}}', ejemplo.predicho, '04_Predicciones');
    agregar('{{EJEMPLO_ACIERTO}}', ejemplo.acierto ? 'Sí' : 'No', '04_Predicciones');
    agregar('{{EJEMPLO_VECINOS}}', ejemplo.vecinos, '04_Predicciones');
  }

  /* Matriz: CM_<real><predicho> */
  for (var a = 0; a < r.cruzada.clases.length; a++) {
    for (var b = 0; b < r.cruzada.clases.length; b++) {
      var letraReal = LETRAS_CLASE[r.cruzada.clases[a]];
      var letraPred = LETRAS_CLASE[r.cruzada.clases[b]];
      agregar('{{CM_' + letraReal + letraPred + '}}', r.cruzada.matriz[a][b], '06_Validacion_Cruzada');
    }
    agregar('{{CM_' + LETRAS_CLASE[r.cruzada.clases[a]] + 'T}}',
      r.cruzada.matriz[a].reduce(function (x, y) { return x + y; }, 0), '06_Validacion_Cruzada');
  }

  /* Métricas por clase */
  mC.porClase.forEach(function (c) {
    var l = LETRAS_CLASE[c.clase];
    agregar('{{SUP_' + l + '}}', c.soporte, '06_Validacion_Cruzada');
    agregar('{{PRE_' + l + '}}', porcentaje(c.precision), '06_Validacion_Cruzada');
    agregar('{{REC_' + l + '}}', porcentaje(c.recall), '06_Validacion_Cruzada');
    agregar('{{F1_' + l + '}}', porcentaje(c.f1), '06_Validacion_Cruzada');
  });

  /* Textos cualitativos calculados */
  agregar('{{MEJOR_CLASE}}', mejor.clase, 'Calculado');
  agregar('{{MEJOR_F1}}', porcentaje(mejor.f1), 'Calculado');
  agregar('{{PEOR_CLASE}}', peor.clase, 'Calculado');
  agregar('{{PEOR_F1}}', porcentaje(peor.f1), 'Calculado');
  agregar('{{CLASE_REAL}}', peorPar.real, 'Calculado');
  agregar('{{CLASE_PREDICHA}}', peorPar.predicho, 'Calculado');
  agregar('{{CASOS_CONFUSION}}', peorPar.casos, 'Calculado');
  agregar('{{RAZON_MEJOR}}', razonDeClase(mejor.clase), 'Calculado');
  agregar('{{EXPLICACION_CONFUSION}}', explicarConfusion(r.datos, peorPar.real, peorPar.predicho), 'Calculado');

  // Veredicto de la hipótesis: se calcula, no se escribe a mano.
  // Así el documento nunca afirma algo que los números contradicen.
  var umbral = 0.75;
  var alcanzo = mC.exactitud >= umbral;
  agregar('{{VEREDICTO_HIPOTESIS}}', alcanzo ? 'se confirma' : 'no se confirma', 'Calculado');
  agregar('{{EXPLICACION_RESULTADO}}', alcanzo
    ? 'La exactitud supera el umbral del ' + Math.round(umbral * 100) +
      ' %, por lo que la hipótesis se confirma con esta muestra.'
    : 'La exactitud no alcanza el umbral del ' + Math.round(umbral * 100) +
      ' %. La mayor dificultad se concentró en ' + peor.clase + ' (F1 = ' + porcentaje(peor.f1) + ')' +
      (peorPar.casos > 0 ? ', que se confunde con ' + peorPar.predicho + ' en ' + peorPar.casos + ' casos' : '') +
      '. Ambas categorías comparten tamaño, altura y número de asientos, y la muestra es pequeña.',
    'Calculado');

  /* Enlaces */
  agregar('{{URL_FORMULARIO}}', obtenerUrlFormulario(), 'Manual');
  agregar('{{URL_HOJA}}', SpreadsheetApp.getActive().getUrl(), 'Automático');

  /* --- Escritura -------------------------------------------------------- */
  escribirTabla(hoja, ['Marcador en el documento', 'Valor real', 'Origen del dato'], filas, {
    titulo: 'VALORES PARA COMPLETAR EL DOCUMENTO — sustituye cada marcador por su valor',
    columnasTexto: [2]
  });

  hoja.setColumnWidth(1, 260);
  hoja.setColumnWidth(2, 460);
  hoja.setColumnWidth(3, 200);
  hoja.getRange(3, 2, filas.length, 1).setWrap(true);
}

/** Devuelve la URL pública del formulario o un texto de aviso. */function obtenerUrlFormulario() {
  var id = PropertiesService.getScriptProperties().getProperty('ID_FORMULARIO');
  if (!id) return '(sin formulario)';
  try {
    return FormApp.openById(id).getPublishedUrl();
  } catch (e) {
    return '(formulario no disponible)';
  }
}

/** Frase que justifica por qué una clase es fácil de reconocer. */
function razonDeClase(clase) {
  var razones = {
    'Hatchback': 'tamaño compacto, altura baja y compuerta trasera completa',
    'Sedán': 'cajuela separada, altura baja y longitud media',
    'SUV': 'altura del techo y al suelo, más amplitud y tracción disponible',
    'Pick-up': 'caja de carga abierta, altura al suelo y tracción 4x4',
    'Van': 'número de asientos, tres filas y capacidad para toda la familia'
  };
  return razones[clase] || 'un perfil de variables claramente diferenciado';
}

/**
 * Explica una confusión comparando los promedios reales de ambas clases.
 * Busca las dos variables con menor diferencia promedio entre las clases
 * involucradas: son las que "parecen iguales" para el modelo.
 */
function explicarConfusion(datos, claseA, claseB) {
  var grupoA = datos.filter(function (d) { return d.clase === claseA; });
  var grupoB = datos.filter(function (d) { return d.clase === claseB; });

  if (!grupoA.length || !grupoB.length) {
    return 'Ambas categorías presentan perfiles muy parecidos en las variables medidas.';
  }

  function promedio(grupo, id) {
    return grupo.reduce(function (acc, d) { return acc + Number(d[id]); }, 0) / grupo.length;
  }

  var diferencias = FEATURES.map(function (f) {
    return {
      etiqueta: f.etiqueta,
      diferencia: Math.abs(promedio(grupoA, f.id) - promedio(grupoB, f.id)),
      a: promedio(grupoA, f.id),
      b: promedio(grupoB, f.id)
    };
  }).sort(function (x, y) { return x.diferencia - y.diferencia; });

  var d1 = diferencias[0];
  var d2 = diferencias[1];

  return 'Los perfiles de ' + claseA + ' y ' + claseB + ' son casi idénticos en "' +
    d1.etiqueta + '" (' + redondear(d1.a, 2) + ' frente a ' + redondear(d1.b, 2) + ') y en "' +
    d2.etiqueta + '" (' + redondear(d2.a, 2) + ' frente a ' + redondear(d2.b, 2) + ')';
}

/* ============================================================================
 *  RELLENO AUTOMÁTICO DEL DOCUMENTO
 * ----------------------------------------------------------------------------
 *  Une la pestaña 11_Valores con el Google Doc del proyecto: recorre todos los
 *  marcadores y los sustituye por su valor real con DocumentApp.replaceText.
 *
 *  Uso:
 *    1. Pega el documento en Google Docs (desde Documento_Proyecto.html).
 *    2. Menú KNN Vehículos > "Completar documento con mis datos".
 *    3. Pega la URL del documento.
 *
 *  Los datos que solo puede escribir el equipo (nombre del profesor, fechas de
 *  recolección, etc.) se dejan intactos y se avisa de cuáles son.
 * ==========================================================================*/
function reemplazarMarcadoresEnDocumento() {
  var ui = SpreadsheetApp.getUi();

  var respuesta = ui.prompt(
    'Completar documento',
    'Pega la URL del Google Doc del proyecto.\n' +
    'El documento debe tener permisos de edición para tu cuenta.',
    ui.ButtonSet.OK_CANCEL
  );
  if (respuesta.getSelectedButton() !== ui.Button.OK) return;

  var idDocumento = extraerIdDocumento(respuesta.getResponseText());
  if (!idDocumento) {
    avisar('No pude leer la URL. Debe verse así:\nhttps://docs.google.com/document/d/XXXXX/edit');
    return;
  }

  var r = completarDocumento(idDocumento);

  if (r.error) { avisar(r.error); return; }

  var mensaje;

  if (r.reemplazados === 0 && r.yaConCifras) {
    // Caso normal al ejecutar dos veces: el documento ya está lleno.
    mensaje = 'El documento ya está actualizado con las cifras actuales (' + r.valorClave + ').\n\n' +
      'No quedaban marcadores que reemplazar, así que no se cambió nada. ' +
      'Esto es correcto: el relleno solo se ejecuta una vez por versión del documento.';
  } else if (r.reemplazados === 0) {
    mensaje = 'No encontré ningún marcador en el documento.\n\n' +
      'Si ya habías rellenado una versión anterior, las cifras pueden estar desactualizadas: ' +
      'vuelve a pegar la plantilla HTML y ejecuta de nuevo.';
  } else {
    mensaje = 'Se reemplazaron ' + r.reemplazados + ' marcadores en el documento "' + r.titulo + '".';
    if (r.noEncontrados.length) {
      mensaje += '\n\n' + r.noEncontrados.length + ' marcadores no aparecieron en el documento. ' +
        'Puede que hayas pegado una versión anterior del archivo.';
    }
  }

  if (r.manuales.length) {
    mensaje += '\n\nQuedan ' + r.manuales.length + ' datos que debes escribir a mano:\n' +
      r.manuales.join('\n');
  }

  avisar(mensaje);
}

/**
 * Rellena un documento por su ID, sin usar la interfaz de la hoja.
 * Devuelve un informe para poder ejecutarse desde el editor de Apps Script.
 */
function completarDocumento(idDocumento) {
  var hoja = SpreadsheetApp.getActive().getSheetByName(CONFIG.HOJAS.VALORES);
  if (!hoja || hoja.getLastRow() < 3) {
    return { error: 'Primero ejecuta "Ejecutar análisis" para generar la pestaña ' + CONFIG.HOJAS.VALORES + '.' };
  }

  var documento;
  try {
    documento = DocumentApp.openById(idDocumento);
  } catch (e) {
    return { error: 'No pude abrir el documento. Revisa la URL y los permisos.\n' + e.message };
  }

  var cuerpo = documento.getBody();
  var valores = hoja.getDataRange().getValues();

  var reemplazados = 0;
  var manuales = [];
  var noEncontrados = [];
  var valorClave = '';

  for (var i = 2; i < valores.length; i++) {
    var marcador = String(valores[i][0]);
    var valor = formatearValorMarcador(marcador, valores[i][1]);

    if (marcador.indexOf('{{') !== 0) continue;
    if (marcador === '{{EXACTITUD_CV}}') valorClave = valor;

    // Los datos que el script no puede inventar se dejan para el equipo
    if (valor.indexOf('(escribe') === 0 || valor.indexOf('(fecha') === 0 ||
      valor.indexOf('(promedio') === 0 || valor.indexOf('(sin formulario') === 0) {
      manuales.push(marcador);
      continue;
    }

    // replaceText interpreta el patrón como expresión regular: hay que escapar
    // las llaves y cualquier carácter especial del marcador.
    var patron = escaparParaRegex(marcador);

    if (cuerpo.findText(patron)) {
      cuerpo.replaceText(patron, valor);
      reemplazados++;
    } else {
      noEncontrados.push(marcador);
    }
  }

  // ¿El documento ya tiene las cifras actuales? Sirve para distinguir
  // "ya está rellenado" de "pegaste una versión vieja".
  var texto = cuerpo.getText();
  var yaConCifras = false;
  if (valorClave) yaConCifras = texto.indexOf(valorClave) !== -1;

  var titulo = documento.getName();
  documento.saveAndClose();

  return {
    reemplazados: reemplazados,
    manuales: manuales,
    noEncontrados: noEncontrados,
    titulo: titulo,
    valorClave: valorClave,
    yaConCifras: yaConCifras
  };
}

/**
 * Convierte el valor almacenado en 11_Valores al texto que debe ir en el doc.
 * Si Sheets guardó un porcentaje como número (0.6818), lo devuelve como "68.18%".
 */
function formatearValorMarcador(marcador, valor) {
  if (typeof valor !== 'number') return String(valor);

  var esPorcentaje = /(EXACTITUD|MACRO_|PCT_|PRE_|REC_|F1_|PROMEDIO_FOLDS|_ACC|LOO_K)/.test(marcador);
  if (esPorcentaje && valor >= 0 && valor <= 1) return (valor * 100).toFixed(2) + '%';

  return String(valor);
}

/** Extrae el ID de un documento desde su URL o lo devuelve si ya es un ID. */
function extraerIdDocumento(texto) {
  var limpio = String(texto || '').trim();
  var coincidencia = limpio.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (coincidencia) return coincidencia[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(limpio)) return limpio;
  return null;
}

/** Escapa todos los caracteres especiales de una expresión regular. */
function escaparParaRegex(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
