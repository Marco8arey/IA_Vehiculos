/* ============================================================================
 *  knn_core.js  —  Núcleo del clasificador KNN (K-Nearest Neighbors)
 * ----------------------------------------------------------------------------
 *  Proyecto : Clasificación de tipos de vehículo a partir de encuestas
 *  Materia  : Inteligencia Artificial
 *
 *  ¿QUÉ ES ESTE ARCHIVO?
 *  Es el "motor" matemático del proyecto. NO sabe nada de Google Sheets ni del
 *  formulario: recibe arreglos de objetos de JavaScript y devuelve números.
 *  Gracias a esa separación, el MISMO código se usa en tres lugares:
 *
 *      1. Google Apps Script  -> archivo 02_KNN.gs (copia literal)
 *      2. Página web de demo  -> web/knn_demo.html (copiado dentro de <script>)
 *      3. Pruebas locales     -> src/test.mjs (lo carga con Node.js)
 *
 *  Convenciones usadas en todo el archivo
 *  --------------------------------------
 *  - "fila"    : objeto plano {clave: valor}. Ej.: {personas: 4, presupuesto: 3}
 *  - "spec"    : arreglo de especificaciones de normalización, una por feature:
 *                { id, etiqueta, peso, min, max }
 *  - "modelo"  : resultado de entrenar = { spec, X, y, clases }
 *                 X = matriz de features YA normalizadas
 *                 y = arreglo de etiquetas reales (strings)
 *  - Las distancias SIEMPRE se calculan sobre valores normalizados [0, 1] para
 *    que una variable en pesos (ej. 350000) no aplaste a otra en escala 1-5.
 * ==========================================================================*/

/* ----------------------------------------------------------------------------
 * 1) GENERADOR PSEUDOALEATORIO CON SEMILLA
 * ----------------------------------------------------------------------------
 * ¿Por qué no usar Math.random()?  Porque la ciencia debe ser REPRODUCIBLE:
 * si dos personas corren el mismo script con la misma semilla, deben obtener
 * exactamente la misma partición entrenamiento/prueba. Math.random() no se
 * puede repetir; este generador sí.
 *
 * Algoritmo: "mulberry32", un PRNG de 32 bits, rápido y de calidad suficiente
 * para particionar datos. Devuelve números en [0, 1).
 * --------------------------------------------------------------------------*/
function crearPRNG(semilla) {
  var a = semilla >>> 0;                 // fuerza entero sin signo de 32 bits
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;    // avanza el estado interno
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;  // normaliza a [0,1)
  };
}

/* Barajado de Fisher-Yates: recorre el arreglo de atrás hacia adelante e
 * intercambia cada elemento con otro al azar ya "consolidado". Garantiza que
 * todas las permutaciones sean igualmente probables (a diferencia de un
 * `sort(() => Math.random() - 0.5)`, que está sesgado).
 * Devuelve una COPIA: no modifica el arreglo original. */
function barajar(lista, rng) {
  var copia = lista.slice();
  for (var i = copia.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var temporal = copia[i];
    copia[i] = copia[j];
    copia[j] = temporal;
  }
  return copia;
}

/* ----------------------------------------------------------------------------
 * 2) NORMALIZACIÓN MIN-MAX
 * ----------------------------------------------------------------------------
 * Fórmula:  x' = (x - min) / (max - min)     ->  x' queda en [0, 1]
 *
 * REGLA DE ORO (evita "fuga de información" / data leakage):
 * los valores min y max se calculan SOLO con el conjunto de ENTRENAMIENTO y
 * luego se aplican también al de prueba. Si se calcularan con todos los datos,
 * el modelo "vería" el futuro y las métricas saldrían artificialmente buenas.
 * --------------------------------------------------------------------------*/

/* Calcula min, max y peso de cada feature usando únicamente `datos`. */
function calcularEspecificacion(datos, features) {
  return features.map(function (f) {
    var valores = [];
    for (var i = 0; i < datos.length; i++) {
      var v = Number(datos[i][f.id]);
      if (isFinite(v)) valores.push(v);   // ignora vacíos o texto no numérico
    }
    var min = valores.length ? Math.min.apply(null, valores) : 0;
    var max = valores.length ? Math.max.apply(null, valores) : 1;
    return {
      id: f.id,
      etiqueta: f.etiqueta || f.id,
      peso: (f.peso === undefined || f.peso === null) ? 1 : f.peso,
      min: min,
      max: max
    };
  });
}

/* Normaliza un único valor escalar según su especificación. */
function normalizarValor(valor, spec) {
  var rango = spec.max - spec.min;
  // Si la variable es constante en entrenamiento, su rango es 0: no aporta
  // información para separar clases, así que se vuelve 0 (neutro).
  if (!isFinite(rango) || rango === 0) return 0;
  return (Number(valor) - spec.min) / rango;
}

/* Convierte una fila cruda en un vector numérico normalizado. */
function normalizarFila(fila, spec) {
  var vector = [];
  for (var i = 0; i < spec.length; i++) {
    vector.push(normalizarValor(fila[spec[i].id], spec[i]));
  }
  return vector;
}

/* ----------------------------------------------------------------------------
 * 3) DISTANCIA ENTRE DOS PERFILES
 * ----------------------------------------------------------------------------
 * Distancia euclidiana PONDERADA:
 *
 *      d(a,b) = sqrt( Σ  w_i * (a_i - b_i)^2 )
 *
 * - Cada diferencia se eleva al cuadrado (Penaliza más las diferencias grandes).
 * - w_i es el peso de la feature: permite decir que "espacio de carga" importa
 *   más que "rendimiento" para distinguir una Pick-up de un Hatchback.
 * - Si todos los pesos valen 1, es la euclidiana clásica.
 *
 * Se eligió euclidiana porque todas las variables son numéricas/ordinales ya
 * normalizadas; es la métrica estándar de KNN y la más fácil de explicar.
 * --------------------------------------------------------------------------*/
function distanciaEuclidiana(a, b, spec) {
  var suma = 0;
  for (var i = 0; i < a.length; i++) {
    var diferencia = a[i] - b[i];
    suma += spec[i].peso * diferencia * diferencia;
  }
  return Math.sqrt(suma);
}

/* ----------------------------------------------------------------------------
 * 4) ENTRENAMIENTO
 * ----------------------------------------------------------------------------
 * KNN es un algoritmo "perezoso" (lazy learner): no calcula parámetros.
 * "Entrenar" aquí significa únicamente:
 *   (a) aprender la escala de cada variable (min/max) y
 *   (b) guardar los vectores normalizados con su etiqueta.
 * El costo real se paga en la predicción, cuando se calculan distancias.
 * --------------------------------------------------------------------------*/
function entrenarModelo(datosEntrenamiento, features) {
  var spec = calcularEspecificacion(datosEntrenamiento, features);

  var X = [];   // matriz de features normalizadas
  var y = [];   // etiquetas verdaderas
  var ids = []; // identificadores, para poder auditar vecinos

  for (var i = 0; i < datosEntrenamiento.length; i++) {
    var fila = datosEntrenamiento[i];
    X.push(normalizarFila(fila, spec));
    y.push(fila.clase);
    ids.push(fila.id);
  }

  // Lista ordenada de clases (sirve para fijar el orden de la matriz de confusión)
  var clases = [];
  for (var j = 0; j < y.length; j++) {
    if (clases.indexOf(y[j]) === -1) clases.push(y[j]);
  }
  clases.sort();

  return { spec: spec, X: X, y: y, ids: ids, clases: clases };
}

/* ----------------------------------------------------------------------------
 * 5) PREDICCIÓN
 * ----------------------------------------------------------------------------
 * Pasos:
 *   1. Normalizar el perfil nuevo con la MISMA escala del entrenamiento.
 *   2. Calcular la distancia a TODOS los ejemplos de entrenamiento.
 *   3. Ordenar de menor a mayor distancia y quedarse con los k primeros.
 *   4. Votar: cada vecino aporta un voto a su clase.
 *      Variante "ponderada por distancia": el voto vale 1/(d + epsilon), de modo
 *      que el vecino más cercano pesa más. Esto reduce el empate y suele
 *      mejorar con k grandes.
 *   5. En caso de empate, gana la clase del vecino MÁS CERCANO (criterio de
 *      desempate determinista y defendible).
 * --------------------------------------------------------------------------*/
function predecirKNN(modelo, perfil, k, opciones) {
  opciones = opciones || {};
  var ponderar = opciones.ponderarPorDistancia !== false; // por defecto: sí
  var epsilon = 1e-9;

  var vector = normalizarFila(perfil, modelo.spec);

  // (2) distancias a todos los ejemplos de entrenamiento
  var vecinos = [];
  for (var i = 0; i < modelo.X.length; i++) {
    vecinos.push({
      indice: i,
      id: modelo.ids[i],
      clase: modelo.y[i],
      distancia: distanciaEuclidiana(vector, modelo.X[i], modelo.spec)
    });
  }

  // (3) orden ascendente por distancia
  vecinos.sort(function (a, b) { return a.distancia - b.distancia; });

  // Si k es mayor que el número de ejemplos disponibles, se recorta.
  var kEfectivo = Math.max(1, Math.min(k, vecinos.length));
  var seleccionados = vecinos.slice(0, kEfectivo);

  // (4) votación
  var votos = {};
  for (var v = 0; v < seleccionados.length; v++) {
    var claseVecino = seleccionados[v].clase;
    var aporte = ponderar ? 1 / (seleccionados[v].distancia + epsilon) : 1;
    votos[claseVecino] = (votos[claseVecino] || 0) + aporte;
  }

  // (5) clase ganadora + desempate por cercanía
  var mejorClase = null;
  var mejorVoto = -Infinity;
  var clases = Object.keys(votos);
  for (var c = 0; c < clases.length; c++) {
    if (votos[clases[c]] > mejorVoto) {
      mejorVoto = votos[clases[c]];
      mejorClase = clases[c];
    }
  }
  // desempate: si hay empate exacto, el vecino más cercano manda
  var hayEmpate = clases.filter(function (cl) { return votos[cl] === mejorVoto; });
  if (hayEmpate.length > 1) {
    for (var s = 0; s < seleccionados.length; s++) {
      if (hayEmpate.indexOf(seleccionados[s].clase) !== -1) {
        mejorClase = seleccionados[s].clase;
        break;
      }
    }
  }

  return {
    clase: mejorClase,
    k: kEfectivo,
    votos: votos,
    vecinos: seleccionados,
    distanciaPromedio: seleccionados.reduce(function (acc, n) {
      return acc + n.distancia;
    }, 0) / seleccionados.length
  };
}

/* ----------------------------------------------------------------------------
 * 6) EVALUACIÓN: MATRIZ DE CONFUSIÓN Y MÉTRICAS
 * ----------------------------------------------------------------------------
 * Matriz de confusión (5x5 para este proyecto):
 *   filas    = clase REAL
 *   columnas = clase PREDICHA
 *   diagonal = aciertos
 *   fuera de la diagonal = errores (y ahí se ve QUÉ se confunde con QUÉ)
 *
 * Métricas por clase (enfoque "una clase contra el resto"):
 *   Precisión = VP / (VP + FP)  -> de lo que predije como X, ¿cuánto era X?
 *   Recall    = VP / (VP + FN)  -> de los X reales, ¿cuántos detecté?
 *   F1        = 2PR / (P + R)   -> media armónica, castiga los extremos
 * Globales:
 *   Exactitud (accuracy) = aciertos / total
 *   Macro-F1 = promedio simple del F1 de las clases (trata igual a clases con
 *              pocos ejemplos, importante aquí porque algunas tendrán 5 casos)
 *   Kappa de Cohen = acuerdo corregido por azar (>0.6 se considera bueno)
 * --------------------------------------------------------------------------*/
function calcularMatrizConfusion(reales, predichos, clases) {
  var n = clases.length;
  var matriz = [];
  for (var i = 0; i < n; i++) {
    matriz.push(new Array(n).fill(0));
  }
  for (var m = 0; m < reales.length; m++) {
    var fila = clases.indexOf(reales[m]);
    var col = clases.indexOf(predichos[m]);
    if (fila !== -1 && col !== -1) matriz[fila][col]++;
  }
  return matriz;
}

function calcularMetricas(matriz, clases) {
  var n = clases.length;
  var total = 0, aciertos = 0;
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      total += matriz[i][j];
      if (i === j) aciertos += matriz[i][j];
    }
  }

  var porClase = [];
  var sumaF1 = 0, sumaPrecision = 0, sumaRecall = 0, sumaSoporte = 0;

  for (var c = 0; c < n; c++) {
    var vp = matriz[c][c];
    var fn = 0, fp = 0;
    for (var k = 0; k < n; k++) {
      if (k !== c) { fn += matriz[c][k]; fp += matriz[k][c]; }
    }
    var soporte = vp + fn;
    var precision = (vp + fp) === 0 ? 0 : vp / (vp + fp);
    var recall = soporte === 0 ? 0 : vp / soporte;
    var f1 = (precision + recall) === 0 ? 0 : 2 * precision * recall / (precision + recall);

    porClase.push({
      clase: clases[c],
      vp: vp, fp: fp, fn: fn, soporte: soporte,
      precision: precision, recall: recall, f1: f1
    });

    sumaF1 += f1;
    sumaPrecision += precision;
    sumaRecall += recall;
    sumaSoporte += soporte;
  }

  var exactitud = total === 0 ? 0 : aciertos / total;

  // Kappa de Cohen: mide el acuerdo descontando lo que se acertaría por azar.
  var sumaFilas = [], sumaColumnas = [];
  for (var f = 0; f < n; f++) { sumaFilas.push(0); sumaColumnas.push(0); }
  for (var r = 0; r < n; r++) {
    for (var q = 0; q < n; q++) {
      sumaFilas[r] += matriz[r][q];
      sumaColumnas[q] += matriz[r][q];
    }
  }
  var acuerdoEsperado = 0;
  if (total > 0) {
    for (var t = 0; t < n; t++) {
      acuerdoEsperado += (sumaFilas[t] / total) * (sumaColumnas[t] / total);
    }
  }
  var kappa = (acuerdoEsperado === 1) ? 1 : (exactitud - acuerdoEsperado) / (1 - acuerdoEsperado);

  return {
    total: total,
    aciertos: aciertos,
    errores: total - aciertos,
    exactitud: exactitud,
    error: total === 0 ? 0 : 1 - exactitud,
    porClase: porClase,
    macroPrecision: n === 0 ? 0 : sumaPrecision / n,
    macroRecall: n === 0 ? 0 : sumaRecall / n,
    macroF1: n === 0 ? 0 : sumaF1 / n,
    kappa: kappa
  };
}

/* ----------------------------------------------------------------------------
 * 7) PARTICIÓN ENTRENAMIENTO / PRUEBA (ESTRATIFICADA)
 * ----------------------------------------------------------------------------
 * Una partición simple al azar puede dejar una clase sin ejemplos de prueba
 * (con 5 clases y pocas respuestas, es muy probable). La partición
 * ESTRATIFICADA baraja cada clase por separado y toma su porcentaje, así todas
 * las clases quedan representadas en ambos conjuntos. Es lo correcto cuando las
 * clases están desbalanceadas.
 * --------------------------------------------------------------------------*/
function dividirEstratificado(datos, proporcionPrueba, semilla, claveClase) {
  claveClase = claveClase || 'clase';
  var rng = crearPRNG(semilla);

  // agrupar por clase
  var grupos = {};
  for (var i = 0; i < datos.length; i++) {
    var c = datos[i][claveClase];
    if (!grupos[c]) grupos[c] = [];
    grupos[c].push(datos[i]);
  }

  var entrenamiento = [], prueba = [];
  var clases = Object.keys(grupos).sort();

  for (var g = 0; g < clases.length; g++) {
    var filas = barajar(grupos[clases[g]], rng);

    // n pruebas con redondeo, garantizando al menos 1 si la clase tiene 2+
    var nPrueba = Math.round(filas.length * proporcionPrueba);
    if (filas.length >= 2 && nPrueba === 0) nPrueba = 1;
    if (nPrueba >= filas.length) nPrueba = filas.length - 1; // nunca dejar train vacío

    for (var j = 0; j < filas.length; j++) {
      if (j < nPrueba) prueba.push(filas[j]);
      else entrenamiento.push(filas[j]);
    }
  }

  return { entrenamiento: entrenamiento, prueba: prueba };
}

/* ----------------------------------------------------------------------------
 * 8) VALIDACIÓN CRUZADA ESTRATIFICADA (K-FOLD)
 * ----------------------------------------------------------------------------
 * Con pocas respuestas, un solo 70/30 produce una matriz de confusión con muy
 * pocos casos por celda y conclusiones frágiles. La validación cruzada reparte
 * los datos en "folds": entrena con todos menos uno y prueba con el que queda,
 * rotando hasta que CADA ejemplo fue evaluado exactamente una vez.
 * Resultado: cada respuesta aporta una predicción -> matriz más estable.
 * --------------------------------------------------------------------------*/
function dividirKFoldEstratificado(datos, nFolds, semilla, claveClase) {
  claveClase = claveClase || 'clase';
  nFolds = Math.max(2, nFolds);
  var rng = crearPRNG(semilla);

  var grupos = {};
  for (var i = 0; i < datos.length; i++) {
    var c = datos[i][claveClase];
    if (!grupos[c]) grupos[c] = [];
    grupos[c].push(datos[i]);
  }

  var folds = [];
  for (var f = 0; f < nFolds; f++) folds.push([]);

  var clases = Object.keys(grupos).sort();
  for (var g = 0; g < clases.length; g++) {
    var filas = barajar(grupos[clases[g]], rng);
    // reparto "en ronda": el ejemplo 0 al fold 0, el 1 al fold 1, etc.
    // Así cada fold recibe una porción parecida de cada clase.
    for (var j = 0; j < filas.length; j++) {
      folds[j % nFolds].push(filas[j]);
    }
  }

  var resultado = [];
  for (var k = 0; k < nFolds; k++) {
    var prueba = folds[k];
    var entrenamiento = [];
    for (var m = 0; m < nFolds; m++) {
      if (m !== k) entrenamiento = entrenamiento.concat(folds[m]);
    }
    resultado.push({ fold: k + 1, entrenamiento: entrenamiento, prueba: prueba });
  }
  return resultado;
}

/* ----------------------------------------------------------------------------
 * 9) SELECCIÓN DE k (LEAVE-ONE-OUT SOBRE EL CONJUNTO DE ENTRENAMIENTO)
 * ----------------------------------------------------------------------------
 * ¿Cómo saber qué k usar sin "hacer trampa" mirando el conjunto de prueba?
 * Con leave-one-out: se saca un ejemplo del entrenamiento, se predice usando
 * los demás y se cuenta si acertó. Se repite para cada ejemplo y para cada k
 * candidato. Gana el k con mayor exactitud interna.
 * NUNCA se elige k mirando el conjunto de prueba: eso sería sesgar la
 * evaluación final.
 * --------------------------------------------------------------------------*/
function elegirMejorK(datosEntrenamiento, features, candidatos) {
  var resultados = [];
  candidatos = candidatos || [1, 3, 5, 7, 9, 11];
  var n = datosEntrenamiento.length;

  for (var c = 0; c < candidatos.length; c++) {
    var k = candidatos[c];
    // k no puede ser >= n (no habría con qué comparar)
    if (k >= n) continue;

    var aciertos = 0, evaluados = 0;
    for (var i = 0; i < n; i++) {
      // subconjunto sin el ejemplo i  ->  "leave one out"
      var resto = datosEntrenamiento.slice(0, i).concat(datosEntrenamiento.slice(i + 1));
      var modelo = entrenarModelo(resto, features);
      var p = predecirKNN(modelo, datosEntrenamiento[i], k);
      if (p.clase === datosEntrenamiento[i].clase) aciertos++;
      evaluados++;
    }
    resultados.push({
      k: k,
      exactitud: evaluados ? aciertos / evaluados : 0,
      aciertos: aciertos,
      evaluados: evaluados
    });
  }

  // ordenar por exactitud desc; a igual exactitud, preferir k mayor (más estable)
  resultados.sort(function (a, b) {
    if (b.exactitud !== a.exactitud) return b.exactitud - a.exactitud;
    return b.k - a.k;
  });

  return { tabla: resultados, mejorK: resultados.length ? resultados[0].k : 1 };
}

/* ----------------------------------------------------------------------------
 * 10) PUNTO DE ENTRADA DE ALTO NIVEL
 * ----------------------------------------------------------------------------
 * Entrena con `datosEntrenamiento`, predice `datosPrueba` y devuelve todo lo
 * necesario para graficar/reportar: predicciones fila por fila, matriz y
 * métricas. Es la función que llama el pipeline de Google Sheets.
 * --------------------------------------------------------------------------*/
function evaluarConjuntoPrueba(datosEntrenamiento, datosPrueba, features, k, opciones) {
  var modelo = entrenarModelo(datosEntrenamiento, features);

  var detalles = [], reales = [], predichos = [];

  for (var i = 0; i < datosPrueba.length; i++) {
    var fila = datosPrueba[i];
    var p = predecirKNN(modelo, fila, k, opciones);
    reales.push(fila.clase);
    predichos.push(p.clase);
    detalles.push({
      id: fila.id,
      real: fila.clase,
      predicho: p.clase,
      acierto: p.clase === fila.clase,
      distanciaPromedio: p.distanciaPromedio,
      vecinos: p.vecinos.map(function (v) {
        return v.clase + ' (' + v.distancia.toFixed(3) + ')';
      }).join(' | ')
    });
  }

  var matriz = calcularMatrizConfusion(reales, predichos, modelo.clases);
  var metricas = calcularMetricas(matriz, modelo.clases);

  return {
    modelo: modelo,
    detalles: detalles,
    reales: reales,
    predichos: predichos,
    matriz: matriz,
    clases: modelo.clases,
    metricas: metricas
  };
}

/* Validación cruzada completa: devuelve la matriz acumulada de TODOS los folds
 * (cada ejemplo predicho una vez) y las métricas globales. */
function evaluarValidacionCruzada(datos, features, k, nFolds, semilla) {
  var folds = dividirKFoldEstratificado(datos, nFolds, semilla);
  var todosReales = [], todosPredichos = [];
  var detalleFolds = [];

  for (var i = 0; i < folds.length; i++) {
    var f = folds[i];
    if (f.entrenamiento.length === 0 || f.prueba.length === 0) continue;

    var modelo = entrenarModelo(f.entrenamiento, features);
    var reales = [], predichos = [];

    for (var j = 0; j < f.prueba.length; j++) {
      var p = predecirKNN(modelo, f.prueba[j], k);
      reales.push(f.prueba[j].clase);
      predichos.push(p.clase);
    }

    todosReales = todosReales.concat(reales);
    todosPredichos = todosPredichos.concat(predichos);

    var mFold = calcularMatrizConfusion(reales, predichos, modelo.clases);
    var metFold = calcularMetricas(mFold, modelo.clases);
    detalleFolds.push({
      fold: f.fold,
      nEntrenamiento: f.entrenamiento.length,
      nPrueba: f.prueba.length,
      exactitud: metFold.exactitud
    });
  }

  // clases = unión ordenada de todas las etiquetas observadas
  var clases = [];
  for (var a = 0; a < todosReales.length; a++) {
    if (clases.indexOf(todosReales[a]) === -1) clases.push(todosReales[a]);
    if (clases.indexOf(todosPredichos[a]) === -1) clases.push(todosPredichos[a]);
  }
  clases.sort();

  var matriz = calcularMatrizConfusion(todosReales, todosPredichos, clases);
  return {
    detalleFolds: detalleFolds,
    matriz: matriz,
    clases: clases,
    metricas: calcularMetricas(matriz, clases),
    predicciones: todosReales.map(function (r, idx) {
      return { real: r, predicho: todosPredichos[idx] };
    })
  };
}

/* ----------------------------------------------------------------------------
 * 11) UTILIDADES DE FORMATO
 * --------------------------------------------------------------------------*/
function porcentaje(x, decimales) {
  var d = (decimales === undefined) ? 2 : decimales;
  return (x * 100).toFixed(d) + '%';
}

function redondear(x, decimales) {
  var d = (decimales === undefined) ? 3 : decimales;
  var factor = Math.pow(10, d);
  return Math.round(x * factor) / factor;
}
